const fs = require('fs');

const scriptContent = fs.readFileSync('script.js', 'utf8');

// We'll mock the DOM and some globals to test performance.
const domMock = `
const document = {
    getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {}, dataset: {}, value: 'test' }),
    querySelectorAll: () => [],
    querySelector: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} }),
    createElement: () => ({ classList: { add: () => {} }, style: {} }),
};
const window = {
    location: { search: '' },
    addEventListener: () => {},
    matchMedia: () => ({ matches: false }),
    scrollY: 0,
};
const localStorage = { getItem: () => null, setItem: () => {} };
const sessionStorage = { getItem: () => null, setItem: () => {} };
const navigator = { userAgent: 'test', platform: 'test' };
const searchInput = { value: 'test', trim: () => 'test' };
const getFavorites = () => ['1', '2'];
const escapeHtml = (t) => t;
let pdfDatabase = [];
let currentSemester = 1;
let currentClass = 'MSc Chemistry';
let currentCategory = 'all';

function createPDFCard(pdf, favoritesList, index = 0, highlightRegex = null) {
    const favorites = favoritesList || getFavorites();
    const isFav = favorites.includes(pdf.id);
    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    return 'card';
}

function renderPDFsBefore() {
    const searchTerm = searchInput.value.toLowerCase();
    const favorites = getFavorites();

    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;
        const matchesClass = pdf.class === currentClass;

        let matchesCategory = false;
        if (currentCategory === 'favorites') {
            matchesCategory = favorites.includes(pdf.id);
        } else {
            matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;
        }

        const matchesSearch = pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);

        return matchesSemester && matchesClass && matchesCategory && matchesSearch;
    });

    let gridHTML = "";
    filteredPdfs.forEach((pdf, index) => {
        gridHTML += createPDFCard(pdf, favorites, index, null);
    });
}

function prepareSearchIndex(data) {
    const now = new Date();
    data.forEach(pdf => {
        if (!pdf._searchStr) {
            pdf._searchStr = \`\${pdf.title || ''} \${pdf.description || ''} \${pdf.category || ''} \${pdf.author || ''}\`.toLowerCase();
        }
        if (!pdf._formattedDate) {
            let dateVal = pdf.uploadDate;
            if (dateVal && typeof dateVal.toDate === 'function') {
                dateVal = dateVal.toDate();
            } else {
                dateVal = new Date(dateVal);
            }
            pdf._formattedDate = dateVal.toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const timeDiff = now - dateVal;
            pdf._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
        }
    });
}

function createPDFCardAfter(pdf, favoritesList, index = 0, highlightRegex = null) {
    const favorites = favoritesList || getFavorites();
    const isFav = favorites.includes(pdf.id);
    const isNew = pdf._isNew;
    const formattedDate = pdf._formattedDate;
    return 'card';
}

function renderPDFsAfter() {
    const searchTerm = searchInput.value.toLowerCase();
    const favorites = getFavorites();

    const filteredPdfs = pdfDatabase.filter(pdf => {
        if (pdf.semester !== currentSemester) return false;
        if (pdf.class !== currentClass) return false;

        if (currentCategory === 'favorites') {
            if (!favorites.includes(pdf.id)) return false;
        } else if (currentCategory !== 'all') {
            if (pdf.category !== currentCategory) return false;
        }

        if (searchTerm) {
            if (!pdf._searchStr || !pdf._searchStr.includes(searchTerm)) return false;
        }

        return true;
    });

    let gridHTML = "";
    filteredPdfs.forEach((pdf, index) => {
        gridHTML += createPDFCardAfter(pdf, favorites, index, null);
    });
}

// Create 10000 mock PDFs
for (let i = 0; i < 10000; i++) {
    pdfDatabase.push({
        id: i.toString(),
        title: 'Test Title ' + i,
        description: 'Test description goes here ' + i,
        category: 'Organic',
        author: 'John Doe',
        semester: 1,
        class: 'MSc Chemistry',
        uploadDate: new Date().toISOString()
    });
}

console.log("Benchmarking before...");
const startBefore = performance.now();
for (let i = 0; i < 100; i++) renderPDFsBefore();
const endBefore = performance.now();
console.log("Before:", endBefore - startBefore, "ms");

console.log("Benchmarking after...");
const startPrepare = performance.now();
prepareSearchIndex(pdfDatabase);
const endPrepare = performance.now();
console.log("Prepare time:", endPrepare - startPrepare, "ms");

const startAfter = performance.now();
for (let i = 0; i < 100; i++) renderPDFsAfter();
const endAfter = performance.now();
console.log("After:", endAfter - startAfter, "ms");
`;

eval(domMock);
