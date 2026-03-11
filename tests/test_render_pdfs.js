const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const scriptContent = fs.readFileSync('script.js', 'utf8');

const context = {
    document: {
        getElementById: () => ({
            value: 'quantum',
            textContent: '',
            style: { display: '' },
            innerHTML: '',
            classList: { add: () => {}, remove: () => {} }
        }),
        querySelectorAll: () => []
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    console: console,
    fetch: () => {},
    window: {},
    navigator: { userAgent: '' }
};

vm.createContext(context);
try {
    vm.runInContext(`
        // Stub missing functions from script.js that renderPDFs might call
        function logInteraction() {}
        function createPDFCard() { return "cardHTML"; }
        function createAdHTML() { return ""; }
        function createFallbackHTML() { return ""; }
        function getAdData() { return null; }
        function getFavorites() { return []; }
        function updatePDFCount(c) { filteredCount = c; }

        var currentClass = 'MSc Chemistry';
        var currentSemester = 1;
        var currentCategory = 'all';
        var searchTimeout;
        var pdfDatabase = [];
        var emptyState = document.getElementById('emptyState');
        var pdfGrid = document.getElementById('pdfGrid');
        var pdfCount = document.getElementById('pdfCount');
        var searchInput = document.getElementById('searchInput');
        var GAS_URL = '';
        var filteredCount = 0;

        // Extract the renderPDFs function body
        ${scriptContent.match(/function renderPDFs\([\s\S]*?^}/m)[0]}

    `, context);
} catch (e) {
    console.error("Setup error:", e);
}

// Test with mock data
context.pdfDatabase = [
    {
        id: "1",
        title: "Quantum Mechanics",
        category: "Physics",
        class: "MSc Chemistry",
        semester: 1,
        _searchStr: "quantum mechanics physics dr. smith"
    },
    {
        id: "2",
        title: "Organic Synthesis",
        category: "Organic",
        class: "MSc Chemistry",
        semester: 1,
        _searchStr: "organic synthesis organic dr. jones"
    }
];

context.renderPDFs();
console.log("Filtered count after search for 'quantum':", context.filteredCount);

context.searchInput.value = 'invalidsearch';
context.renderPDFs();
console.log("Filtered count after invalid search:", context.filteredCount);

context.searchInput.value = '';
context.renderPDFs();
console.log("Filtered count after empty search:", context.filteredCount);
