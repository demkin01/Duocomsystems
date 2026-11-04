        // Mobile Menu Toggle

        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = answer.classList.contains('active');
                
                // Close all answers
                document.querySelectorAll('.faq-answer').forEach(ans => {
                    ans.classList.remove('active');
                });
                
                // If the clicked question wasn't active, open it
                if (!isActive) {
                    answer.classList.add('active');
                }
            });
        });

        // Header background on scroll
        window.addEventListener('scroll', function() {
            const header = document.querySelector('header');
            if(window.scrollY > 100) {
                header.style.backgroundColor='rgb(10, 29, 61)';
                header.style.backdropFilter = 'none';
            } else {
                header.style.backgroundColor='rgb(10, 29, 61)';
                header.style.backdropFilter = 'none';
            }
        });