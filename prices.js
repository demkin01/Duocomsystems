/* ============================================================
   DUOCOM SYSTEMS - PRICE LIST & SETTINGS
   Edit prices and settings HERE ONLY. Both quote pages read this file.
   ============================================================ */

const SITE_CONFIG = {
    companyName: 'DUOCOM SYSTEMS',
    location: 'NAIROBI, Kenya',
    phones: '0741475808 / 0100480559',
    email: 'info@duocomsystems.com',
    whatsapp: '254100480559',                 // WhatsApp number, no + or spaces
    requestEmail: 'info@duocomsystems.com',   // where quote requests are delivered
    vatRate: 0.16,                            // 16% VAT (applied to materials only)
    estimateNote: 'Materials estimate only. Installation labour is quoted separately after a site assessment.'
};

/* Services (used for the quotation title and the service dropdown) */
const SERVICES = [
    { label: 'CCTV Installation & Maintenance', title: 'CCTV', key: 'cctv' },
    { label: 'Biometric Access Control',        title: 'ACCESS CONTROL', key: 'access' },
    { label: 'Burglar & Fire Alarm',            title: 'ALARM SYSTEM', key: 'alarm' },
    { label: 'Smoke Detectors & Safety',        title: 'SMOKE DETECTION', key: 'smoke' },
    { label: 'WiFi & Networking',               title: 'NETWORKING', key: 'wifi' },
    { label: 'Intercom & Door Phone',           title: 'INTERCOM', key: 'intercom' },
    { label: 'General Maintenance',             title: 'MAINTENANCE', key: 'maintenance' }
];

/* Order the categories appear on the page */
const CATEGORIES = ['Cameras', 'Recording & Storage', 'Cabling & Accessories', 'Display & Peripherals', 'Racks & Power'];

/* PRICE LIST - rate is in KES. "id" must be unique and should not change once in use. */
const PRICE_LIST = [
    // Cameras
    { id: 'dome-2mp',    category: 'Cameras',               name: '2MP IP Dome Camera (indoor)',        unit: 'each',   rate: 3800 },
    { id: 'bullet-2mp',  category: 'Cameras',               name: '2MP IP Bullet Camera (outdoor)',     unit: 'each',   rate: 3800 },
    { id: 'ptz-mini',    category: 'Cameras',               name: 'Mini PTZ Camera',                    unit: 'each',   rate: 22000 },

    // Recording & Storage
    { id: 'nvr-16poe',   category: 'Recording & Storage',   name: 'NVR POE 16 Port',                    unit: 'each',   rate: 26000 },
    { id: 'hdd-4tb',     category: 'Recording & Storage',   name: 'Hard Disk 4TB (surveillance)',       unit: 'each',   rate: 16000 },
    { id: 'hdd-1tb',     category: 'Recording & Storage',   name: 'Hard Disk 1TB (surveillance)',       unit: 'each',   rate: 5200 },

    // Cabling & Accessories
    { id: 'cat6-roll',   category: 'Cabling & Accessories', name: 'CAT6 Cable (305m roll)',             unit: 'per roll', rate: 8000 },
    { id: 'rj45',        category: 'Cabling & Accessories', name: 'RJ45 Connector',                     unit: 'each',   rate: 10 },
    { id: 'adapter-box', category: 'Cabling & Accessories', name: 'Adapter Box',                        unit: 'each',   rate: 150 },
    { id: 'bnc-power',   category: 'Cabling & Accessories', name: 'BNC & Power Jack',                   unit: 'each',   rate: 50 },
    { id: 'trunking',    category: 'Cabling & Accessories', name: 'Trunking 1 x 1',                     unit: 'each',   rate: 350 },
    { id: 'pvc-pipe',    category: 'Cabling & Accessories', name: 'PVC Pipe 20"',                       unit: 'each',   rate: 150 },
    { id: 'roll-bolt',   category: 'Cabling & Accessories', name: 'M8 Roll Bolt',                       unit: 'each',   rate: 100 },

    // Display & Peripherals
    { id: 'monitor-32',  category: 'Display & Peripherals', name: '32" Monitor',                        unit: 'each',   rate: 13000 },
    { id: 'hdmi',        category: 'Display & Peripherals', name: 'HDMI Cable',                         unit: 'each',   rate: 250 },
    { id: 'vga',         category: 'Display & Peripherals', name: 'VGA Cable',                          unit: 'each',   rate: 250 },
    { id: 'mouse',       category: 'Display & Peripherals', name: 'Mouse',                              unit: 'each',   rate: 650 },

    // Racks & Power
    { id: 'cabinet-9u',  category: 'Racks & Power',         name: '9U Data Cabinet',                    unit: 'each',   rate: 10000 },
    { id: 'pdu',         category: 'Racks & Power',         name: 'Power Distribution Unit (PDU)',      unit: 'each',   rate: 1200 }
];
