const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Read script.js
const code = fs.readFileSync('script.js', 'utf8');

// Mock DOM and Global Variables
const context = {
    document: {
        getElementById: () => ({ innerHTML: '', classList: { add: ()=>{}, remove: ()=>{} }, style: {} }),
        querySelectorAll: () => [],
        addEventListener: () => {},
        body: { style: {} },
        documentElement: { getAttribute: () => '', setAttribute: () => {} },
        querySelector: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, style: {} }),
    },
    window: {
        matchMedia: () => ({ matches: false }),
        location: { search: '' },
        addEventListener: () => {},
        history: { pushState: () => {}, replaceState: () => {} },
        scrollTo: () => {},
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
    },
    navigator: { userAgent: 'test', platform: 'test' },
    firebase: {
        auth: () => ({ onAuthStateChanged: () => {} }),
        firestore: () => ({ collection: () => ({ doc: () => ({ onSnapshot: () => {} }) }) }),
        apps: [],
        initializeApp: () => {},
    },
    // Mock UI Elements
    searchInput: { value: '', addEventListener: () => {} },
    pdfGrid: { style: {}, innerHTML: '' },
    pdfCount: { textContent: '' },
    emptyState: { style: {} },
    tabBtns: [],
    filterBtns: [],
    pdfModal: { addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} } },
    shareModal: { addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} } },
    modalShareBtn: { addEventListener: () => {} },
    pdfViewer: { src: '' },
    modalTitle: { textContent: '' },
    shareLink: { value: '' },
    toast: { style: {}, classList: { add: ()=>{}, remove: ()=>{} } },
    toastMessage: { textContent: '' },
    commentSidebar: { classList: { add: ()=>{}, remove: ()=>{} } },
    commentsList: { innerHTML: '', appendChild: ()=>{} },
    commentCount: { textContent: '' },
    commentForm: { addEventListener: () => {} },
    commentInput: { value: '' },
    commentAuthor: { value: '' },
    alomolePromo: { classList: { add: ()=>{}, remove: ()=>{} } },
    closeAlomolePromo: { addEventListener: () => {} },
    goToTopBtn: { addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} } },
    maintenanceScreen: { classList: { add: ()=>{}, remove: ()=>{} } },
    openCommentsBtn: { addEventListener: () => {} },
    closeCommentsBtn: { addEventListener: () => {} },
    classSelect: { addEventListener: () => {}, innerHTML: '', value: '' },

    // Globals
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date,
    parseInt: parseInt,
    isNaN: isNaN,
    Math: Math,
    fetch: () => Promise.resolve(),
    URLSearchParams: class { get() { return null; } },
};

// Create Context
vm.createContext(context);
try {
    vm.runInContext(code, context);
} catch (e) {
    console.error("Error running script.js in VM:", e);
}

// Access functions from context
const { prepareSearchIndex, debounce } = context;

// --- TEST 1: prepareSearchIndex ---
console.log('Test 1: prepareSearchIndex');
const rawData = [
    { id: '1', title: 'Organic Chemistry', description: 'Reactions', category: 'Organic', author: 'Dr. Bond', uploadDate: new Date().toISOString() },
    { id: '2', title: 'Calculus', description: 'Integrals', category: 'Math', author: 'Newton', uploadDate: new Date('2020-01-01').toISOString() }
];

const processed = prepareSearchIndex(rawData);

try {
    assert(processed[0]._searchStr.includes('organic chemistry'), 'Search string missing title');
    assert(processed[0]._searchStr.includes('dr. bond'), 'Search string missing author');
    assert(processed[0]._formattedDate, 'Formatted date missing');
    assert(processed[0]._isNew === true, 'Should be new');
    assert(processed[1]._isNew === false, 'Should be old');
    console.log('PASS: prepareSearchIndex');
} catch (e) {
    console.error('FAIL: prepareSearchIndex', e);
    process.exit(1);
}

// --- TEST 2: debounce ---
console.log('Test 2: debounce');
let counter = 0;
const increment = () => counter++;
const debouncedInc = debounce(increment, 50);

debouncedInc();
debouncedInc();
debouncedInc();

setTimeout(() => {
    try {
        assert.strictEqual(counter, 1, 'Debounce should only execute once');
        console.log('PASS: debounce');
    } catch (e) {
        console.error('FAIL: debounce', e);
        process.exit(1);
    }
}, 100);
