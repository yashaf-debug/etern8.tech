document.addEventListener('DOMContentLoaded', () => {
    const languageSwitcherButtons = document.querySelectorAll('.language-switcher button, .language-switcher-footer button');
    let translations = {};
    let currentLang = 'en'; // Default language

    // Function to fetch translations
    async function fetchTranslations() {
        try {
            const response = await fetch('js/translations.json');
            if (!response.ok) {
                console.error('Failed to load translations:', response.statusText);
                return;
            }
            translations = await response.json();
            setLanguage(currentLang); // Set initial language
        } catch (error) {
            console.error('Error fetching translations:', error);
        }
    }

    // Function to set the language
    function setLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; // Set text direction for Arabic

        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            } else {
                // Fallback to English if translation is missing for the current key
                if (translations['en'] && translations['en'][key]) {
                    element.textContent = translations['en'][key];
                }
            }
        });
        
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            if (translations[lang] && translations[lang][key]) {
                element.placeholder = translations[lang][key];
            } else {
                 // Fallback to English if translation is missing for the current key
                if (translations['en'] && translations['en'][key]) {
                    element.placeholder = translations['en'][key];
                }
            }
        });

        // Update active button state
        languageSwitcherButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-lang') === lang) {
                button.classList.add('active');
            }
        });
    }

    // Event listeners for language switcher buttons
    languageSwitcherButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const selectedLang = event.target.getAttribute('data-lang');
            setLanguage(selectedLang);
        });
    });

    // Load translations and set initial language
    fetchTranslations();

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Contact Form Submission (Placeholder - actual submission logic needs backend)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // In a real scenario, you would gather form data and send it to a backend server
            // For this static site, we'll just log to console and show an alert
            const formData = new FormData(contactForm);
            let formEntries = "";
            for (let [key, value] of formData.entries()) {
                formEntries += `${key}: ${value}\n`;
            }
            console.log("Form Submitted:\n" + formEntries);
            alert("Thank you for your message! We will get back to you soon. (This is a demo, no email was sent)");
            contactForm.reset();
        });
    }
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.querySelector('.site-nav');
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
});

