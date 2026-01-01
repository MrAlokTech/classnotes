/* =========================================
   LEGAL PAGES LOGIC (legal.js)
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {
    initFooterYear();
    initTheme();
    // initFirebaseAndMaintenance(); <--- REMOVE THIS CALL for legal pages
});

/* --- 1. Dynamic Copyright Year --- */
function initFooterYear() {
    const START_YEAR = 2025;
    const CURRENT_YEAR = new Date().getFullYear();
    const copyrightElement = document.getElementById("copyright-year");

    if (copyrightElement) {
        let yearText = `© ${START_YEAR}`;
        if (CURRENT_YEAR > START_YEAR) {
            yearText += ` - ${CURRENT_YEAR.toString().slice(-2)}`;
        }
        yearText += ` ClassNotes. All rights reserved.`;
        copyrightElement.innerHTML = yearText;
    }
}

/* --- 2. Theme Synchronization --- */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}