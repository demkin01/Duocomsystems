/* ============================================================
   DUOCOM SYSTEMS - ADMIN QUOTATION TOOL (logic)
   Two storage modes, chosen automatically:
     - CLOUD  : firebase-config.js is filled in -> login + same data on every device
     - LOCAL  : firebase-config.js not filled in -> saved on this device only
   ============================================================ */
(function () {
    const $ = id => document.getElementById(id);
    const COUNTER_KEY = 'duocom_admin_counter_v1', DRAFT_KEY = 'duocom_admin_draft_v1', HIST_KEY = 'duocom_admin_history_v1';
    const formatDocNo = n => 'DOC A' + String(n).padStart(4, '0');
    const keyOf = no => (no || '').replace(/[^A-Za-z0-9_-]/g, '');
    const newId = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
    const isoToDisplay = iso => { const [y, m, d] = (iso || isoToday()).split('-'); return `${d}/${m}/${y}`; };

    let counter = 48;          // next quotation number (kept in sync with the store)
    let history = [];          // saved quotations, newest first
    let S = null;              // the quotation being edited
    let store = null;          // LocalStore or CloudStore

    const blank = () => ({ quoteId: newId(), docNo: formatDocNo(counter), date: isoToday(), service: 0, name: '', loc: '', contact: '', items: [], taxOn: false, labour: '' });

    function toast(msg, err) {
        const t = $('toast'); t.classList.toggle('error', !!err);
        t.querySelector('i').className = err ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        $('toastMsg').textContent = msg; t.classList.add('show');
        clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 4200);
    }
    function setSync(text, kind) { const p = $('syncPill'); p.textContent = text; p.className = 'pill ' + (kind || ''); }

    const cb = {
        onCounter(n) { counter = n; $('counter').value = n; },
        onHistory(list) { history = list; renderHistory(); }
    };

    /* ───────────── LOCAL STORE (this device only) ───────────── */
    const LocalStore = {
        mode: 'local',
        async init() {
            counter = Number(storeGet(COUNTER_KEY, 48)) || 48;
            history = storeGet(HIST_KEY, []);
            cb.onCounter(counter); cb.onHistory(history);
            return storeGet(DRAFT_KEY, null);
        },
        async saveDraft(draft) { storeSet(DRAFT_KEY, draft); },
        async commit(q, meta) {
            let no = q.docNo.trim() || formatDocNo(counter);
            if (history.some(h => h.docNo === no && h.quoteId !== q.quoteId)) no = formatDocNo(counter);
            if (no === formatDocNo(counter)) { counter += 1; storeSet(COUNTER_KEY, counter); cb.onCounter(counter); }
            const entry = { quoteId: q.quoteId, docNo: no, client: meta.client, total: meta.total, date: meta.dateStr, updatedAt: Date.now(), snapshot: JSON.stringify(Object.assign({}, q, { docNo: no })) };
            history = [entry].concat(history.filter(h => h.quoteId !== q.quoteId)).slice(0, 50);
            storeSet(HIST_KEY, history); cb.onHistory(history);
            return no;
        },
        async remove(quoteId) { history = history.filter(h => h.quoteId !== quoteId); storeSet(HIST_KEY, history); cb.onHistory(history); },
        async clearAll() { history = []; storeSet(HIST_KEY, history); cb.onHistory(history); },
        async setCounter(n) { counter = n; storeSet(COUNTER_KEY, n); cb.onCounter(n); },
        stop() {}
    };

    /* ───────────── CLOUD STORE (Firebase, same on every device) ───────────── */
    const CloudStore = {
        mode: 'cloud', db: null, unsubs: [],
        async init() {
            const db = this.db = firebase.firestore();
            const cSnap = await db.collection('meta').doc('counter').get();
            counter = cSnap.exists ? (Number(cSnap.data().next) || 48) : 48; cb.onCounter(counter);
            const dSnap = await db.collection('meta').doc('draft').get();
            const draft = dSnap.exists ? JSON.parse(dSnap.data().json) : null;
            this.unsubs.push(db.collection('meta').doc('counter').onSnapshot(s => { if (s.exists) cb.onCounter(Number(s.data().next) || 48); }));
            this.unsubs.push(db.collection('quotes').orderBy('updatedAt', 'desc').limit(50).onSnapshot(s => cb.onHistory(s.docs.map(d => d.data()))));
            return draft;
        },
        async saveDraft(draft) { await this.db.collection('meta').doc('draft').set({ json: JSON.stringify(draft), updatedAt: Date.now() }); },
        async commit(q, meta) {
            const db = this.db, counterRef = db.collection('meta').doc('counter');
            let finalNo = q.docNo.trim();
            await db.runTransaction(async tx => {
                const cSnap = await tx.get(counterRef);
                let next = cSnap.exists ? (Number(cSnap.data().next) || 48) : 48;
                let no = q.docNo.trim() || formatDocNo(next);
                let ref = db.collection('quotes').doc(keyOf(no));
                const ex = await tx.get(ref);
                if (ex.exists && ex.data().quoteId !== q.quoteId) {
                    // that number already belongs to a different quotation (e.g. made on another device)
                    no = formatDocNo(next);
                    ref = db.collection('quotes').doc(keyOf(no));
                    const ex2 = await tx.get(ref);
                    if (ex2.exists && ex2.data().quoteId !== q.quoteId) throw new Error('NUMBER_CLASH');
                }
                if (no === formatDocNo(next)) next += 1;
                tx.set(ref, { quoteId: q.quoteId, docNo: no, client: meta.client, total: meta.total, date: meta.dateStr, updatedAt: Date.now(), snapshot: JSON.stringify(Object.assign({}, q, { docNo: no })) });
                tx.set(counterRef, { next }, { merge: true });
                finalNo = no;
            });
            return finalNo;
        },
        async remove(quoteId) {
            const h = history.find(x => x.quoteId === quoteId);
            if (h) await this.db.collection('quotes').doc(keyOf(h.docNo)).delete();
        },
        async clearAll() { for (const h of history.slice()) await this.db.collection('quotes').doc(keyOf(h.docNo)).delete(); },
        async setCounter(n) { await this.db.collection('meta').doc('counter').set({ next: n }, { merge: true }); },
        stop() { this.unsubs.forEach(u => { try { u(); } catch (e) { /* ignore */ } }); this.unsubs = []; }
    };

    /* ───────────── Draft auto-save ───────────── */
    let draftTimer = null;
    function saveDraft() {
        if (!S || !store) return;
        if (store.mode === 'local') { store.saveDraft(S); return; }
        setSync('Saving\u2026', 'warn');
        clearTimeout(draftTimer);
        draftTimer = setTimeout(() => {
            store.saveDraft(S).then(() => setSync('Synced \u2713', 'ok')).catch(() => setSync('Not synced', 'bad'));
        }, 900);
    }

    /* ───────────── Form wiring (runs once) ───────────── */
    SERVICES.forEach((s, i) => { const o = document.createElement('option'); o.value = i; o.textContent = s.label; $('service').appendChild(o); });
    CATEGORIES.forEach(cat => {
        const g = document.createElement('optgroup'); g.label = cat;
        PRICE_LIST.filter(p => p.category === cat).forEach(p => {
            const o = document.createElement('option'); o.value = p.id; o.textContent = `${p.name} - KES ${p.rate.toLocaleString('en-KE')}`; g.appendChild(o);
        });
        $('quickAdd').appendChild(g);
    });

    function loadFields() {
        $('docNo').value = S.docNo; $('qDate').value = S.date; $('service').value = S.service;
        $('cName').value = S.name; $('cLoc').value = S.loc; $('cContact').value = S.contact;
        $('taxOn').checked = S.taxOn; $('labour').value = S.labour; $('counter').value = counter;
    }
    const bind = (id, key, conv) => { $(id).oninput = $(id).onchange = e => { if (!S) return; S[key] = conv ? conv(e.target) : e.target.value; e.target.classList.remove('invalid'); saveDraft(); updateTotals(); }; };
    bind('docNo', 'docNo'); bind('qDate', 'date'); bind('service', 'service', el => Number(el.value));
    bind('cName', 'name'); bind('cLoc', 'loc'); bind('cContact', 'contact');
    bind('taxOn', 'taxOn', el => el.checked); bind('labour', 'labour');
    $('counter').onchange = async e => {
        const n = Math.max(1, Math.floor(Number(e.target.value) || 1)); e.target.value = n;
        try { await store.setCounter(n); } catch (err) { toast('Could not change the number.', true); return; }
        S.docNo = formatDocNo(n); $('docNo').value = S.docNo; saveDraft();
    };

    /* ───────────── Items ───────────── */
    function renderRows() {
        const tb = $('rows'); tb.innerHTML = '';
        S.items.forEach((it, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td class="c-n" data-label=""></td>' +
                '<td class="c-i" data-label="Item"><input type="text" placeholder="Item description"></td>' +
                '<td class="c-q" data-label="Qty"><input type="number" min="0" step="any" placeholder="0"></td>' +
                '<td class="c-r" data-label="Rate"><input type="number" min="0" step="any" placeholder="0.00"></td>' +
                '<td class="c-a" data-label="Amount"><span class="amt">KES 0.00</span></td>' +
                '<td class="c-d" data-label=""><button type="button" class="del" aria-label="Remove item"><i class="fas fa-times"></i></button></td>';
            tr.cells[0].textContent = (i + 1) + '.';
            const [name, qty, rate] = tr.querySelectorAll('input');
            name.value = it.name; qty.value = it.qty; rate.value = it.rate;
            name.oninput = () => { it.name = name.value; saveDraft(); };
            qty.oninput = () => { it.qty = qty.value; saveDraft(); updateTotals(); };
            rate.oninput = () => { it.rate = rate.value; saveDraft(); updateTotals(); };
            tr.querySelector('.del').onclick = () => { S.items.splice(i, 1); saveDraft(); renderRows(); };
            tb.appendChild(tr);
        });
        $('emptyMsg').hidden = S.items.length > 0;
        updateTotals();
    }
    const itemsOf = st => st.items.map(it => { const qty = parseFloat(it.qty) || 0, rate = parseFloat(it.rate) || 0; return { name: (it.name || '').trim(), qty, rate, amount: qty * rate }; });
    function updateTotals() {
        const items = itemsOf(S);
        const t = computeTotals(items, S.taxOn, parseFloat(S.labour) || 0);
        Array.from($('rows').rows).forEach((tr, i) => { if (items[i]) tr.querySelector('.amt').textContent = fmtKES(items[i].amount); });
        $('tSub').textContent = fmtKES(t.sub);
        $('tTax').textContent = S.taxOn ? fmtKES(t.tax) : '\u2014';
        $('tGrand').textContent = fmtKES(t.grand);
        $('tWords').textContent = wordsFor(t.grand);
    }
    $('btnQuick').onclick = () => {
        if (!S) return;
        const p = PRICE_LIST.find(x => x.id === $('quickAdd').value);
        if (!p) { toast('Choose an item from the list first.', true); return; }
        S.items.push({ name: p.name, qty: 1, rate: p.rate }); saveDraft(); renderRows(); $('quickAdd').value = '';
    };
    $('btnBlank').onclick = () => { if (!S) return; S.items.push({ name: '', qty: '', rate: '' }); saveDraft(); renderRows(); };

    /* ───────────── Save / PDF ───────────── */
    function buildQuoteFrom(st) {
        const items = itemsOf(st).filter(it => it.name || it.amount > 0);
        return {
            title: SERVICES[st.service].title + ' QUOTATION', docNo: st.docNo.trim(), dateStr: isoToDisplay(st.date),
            client: { name: st.name.trim(), location: st.loc.trim(), contact: st.contact.trim(), service: SERVICES[st.service].label },
            items, taxOn: st.taxOn, labour: parseFloat(st.labour) || 0, footnote: ''
        };
    }
    function checkReady() {
        if (!S.name.trim()) { $('cName').classList.add('invalid'); $('cName').focus(); toast('Enter the client name first.', true); return null; }
        const q = buildQuoteFrom(S);
        if (!q.items.length) { toast('Add at least one item.', true); return null; }
        return q;
    }
    /* Saves to history and makes sure the number is unique. Returns the final number or null on failure. */
    async function saveToHistory(q) {
        const t = computeTotals(q.items, q.taxOn, q.labour);
        setSync('Saving\u2026', 'warn');
        try {
            const finalNo = await store.commit(S, { client: q.client.name, total: t.grand, dateStr: q.dateStr });
            if (finalNo !== S.docNo.trim()) {
                toast(`Number ${S.docNo.trim() || '(blank)'} was already used by another quotation, so this one is now ${finalNo}.`);
                S.docNo = finalNo; $('docNo').value = finalNo;
            }
            saveDraft();
            if (store.mode === 'cloud') setSync('Synced \u2713', 'ok');
            return finalNo;
        } catch (e) {
            setSync('Not synced', 'bad');
            return null;
        }
    }
    $('btnSave').onclick = async () => {
        if (!S) return;
        const q = checkReady(); if (!q) return;
        const no = await saveToHistory(q);
        if (no) toast(`${no} saved.`); else toast('Could not save. Check your internet connection and try again.', true);
    };
    $('btnPdf').onclick = async () => {
        if (!S) return;
        let q = checkReady(); if (!q) return;
        const no = await saveToHistory(q);
        if (no) q = buildQuoteFrom(S);          // pick up the final number
        else toast('Not saved online (no connection?). PDF made anyway - press Save when you are back online.', true);
        try {
            buildQuotePDF(q).save(`Quotation_${safeName(q.client.name)}_${q.docNo.replace(/\s+/g, '')}.pdf`);
            if (no) toast(`${no} downloaded and saved.`);
        } catch (e) { toast('Could not create the PDF. Check your internet connection.', true); }
    };
    $('btnNew').onclick = () => {
        if (!S) return;
        if (S.items.length && !confirm('Start a new quotation? (Saved quotations stay in the list below.)')) return;
        S = blank(); saveDraft(); loadFields(); renderRows();
    };

    /* ───────────── History ───────────── */
    function renderHistory() {
        const box = $('history'); box.innerHTML = '';
        history.forEach(h => {
            const row = document.createElement('div'); row.className = 'hist-row';
            row.innerHTML = '<div class="meta"><b></b><small></small></div><div class="tot"></div>' +
                '<button type="button" class="btn btn-outline btn-sm open"><i class="fas fa-folder-open"></i> Open</button>' +
                '<button type="button" class="btn btn-outline btn-sm rm" aria-label="Delete"><i class="fas fa-trash"></i></button>';
            row.querySelector('b').textContent = `${h.docNo} - ${h.client}`;
            row.querySelector('small').textContent = h.date;
            row.querySelector('.tot').textContent = fmtKES(h.total);
            row.querySelector('.open').onclick = () => {
                S = Object.assign(blank(), JSON.parse(h.snapshot)); saveDraft(); loadFields(); renderRows();
                window.scrollTo({ top: 0, behavior: 'smooth' }); toast(`${h.docNo} opened. Change what you need, then Save or Download.`);
            };
            row.querySelector('.rm').onclick = async () => {
                if (!confirm(`Delete ${h.docNo}?`)) return;
                try { await store.remove(h.quoteId); } catch (e) { toast('Could not delete.', true); }
            };
            box.appendChild(row);
        });
        $('histEmpty').hidden = history.length > 0; $('histActions').hidden = history.length === 0;
    }
    $('btnClearHist').onclick = async () => {
        if (!confirm('Delete ALL saved quotations? This cannot be undone.')) return;
        try { await store.clearAll(); } catch (e) { toast('Could not clear history.', true); }
    };

    /* ───────────── Start-up ───────────── */
    async function boot(st) {
        store = st;
        try {
            const draft = await st.init();
            S = Object.assign(blank(), draft || {});
            if (!Array.isArray(S.items)) S.items = [];
            if (!SERVICES[S.service]) S.service = 0;
            if (!S.quoteId) S.quoteId = newId();
            loadFields(); renderRows(); renderHistory();
            $('authWrap').hidden = true; $('appWrap').hidden = false;
            if (st.mode === 'cloud') setSync('Synced \u2713', 'ok');
        } catch (e) {
            const denied = e && /permission|insufficient/i.test(String(e.code || e.message));
            $('appWrap').hidden = true; $('authWrap').hidden = false;
            showAuthError(denied
                ? 'Signed in, but this account is not allowed to open the data. Check the Firestore rules and the email you signed in with.'
                : 'Could not load your quotations. Check your internet connection and refresh.');
        }
    }
    function showAuthError(msg) { const el = $('authErr'); el.textContent = msg; el.hidden = !msg; }

    const configured = typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey && !/^PASTE/i.test(FIREBASE_CONFIG.apiKey);
    $('statusBar').hidden = false;

    if (!configured) {
        // LOCAL MODE
        $('modePill').textContent = 'Local mode'; $('modePill').className = 'pill warn';
        $('syncPill').hidden = true; $('localBanner').hidden = false;
        boot(LocalStore);
    } else if (typeof firebase === 'undefined') {
        $('modePill').textContent = 'Cloud sync'; $('syncPill').hidden = true;
        $('authWrap').hidden = false;
        showAuthError('Could not load the sign-in tools. Check your internet connection and refresh the page.');
        $('btnSignIn').disabled = true;
    } else {
        // CLOUD MODE
        $('modePill').textContent = 'Cloud sync'; $('modePill').className = 'pill ok';
        firebase.initializeApp(FIREBASE_CONFIG);
        const auth = firebase.auth();
        let booted = false;
        auth.onAuthStateChanged(user => {
            if (user) {
                $('userEmail').textContent = user.email; $('btnSignOut').hidden = false;
                if (!booted) { booted = true; boot(CloudStore); }
            } else {
                booted = false; CloudStore.stop(); S = null;
                $('userEmail').textContent = ''; $('btnSignOut').hidden = true; $('syncPill').textContent = '';
                $('appWrap').hidden = true; $('authWrap').hidden = false;
            }
        });
        const friendly = code => ({
            'auth/invalid-credential': 'Wrong email or password.', 'auth/wrong-password': 'Wrong email or password.',
            'auth/user-not-found': 'Wrong email or password.', 'auth/invalid-email': 'That email address does not look right.',
            'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
            'auth/network-request-failed': 'No internet connection.'
        }[code] || 'Could not sign in. Please try again.');
        const doSignIn = async () => {
            showAuthError('');
            const email = $('authEmail').value.trim(), pass = $('authPass').value;
            if (!email || !pass) { showAuthError('Enter your email and password.'); return; }
            $('btnSignIn').disabled = true;
            try { await auth.signInWithEmailAndPassword(email, pass); $('authPass').value = ''; }
            catch (e) { showAuthError(friendly(e && e.code)); }
            finally { $('btnSignIn').disabled = false; }
        };
        $('btnSignIn').onclick = doSignIn;
        $('authPass').onkeydown = e => { if (e.key === 'Enter') doSignIn(); };
        $('btnReset').onclick = async () => {
            const email = $('authEmail').value.trim();
            if (!email) { showAuthError('Type your email above first, then tap "Forgot password?".'); return; }
            try { await auth.sendPasswordResetEmail(email); showAuthError(''); toast('If that email has an account, a reset link is on its way.'); }
            catch (e) { showAuthError(friendly(e && e.code)); }
        };
        $('btnSignOut').onclick = () => auth.signOut();
    }
})();
