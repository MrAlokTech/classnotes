const { performance } = require('perf_hooks');

// Generate mock data
const pdfDatabase = [];
for (let i = 0; i < 5000; i++) {
    pdfDatabase.push({
        id: `doc_${i}`,
        semester: i % 2 === 0 ? '1' : '2',
        class: i % 3 === 0 ? 'Math' : 'Science',
        category: i % 4 === 0 ? 'favorites' : 'all',
        title: `PDF Title ${i}`,
        description: `This is a description for PDF ${i}. It has some text.`,
        author: `Author ${i}`,
        uploadDate: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    });
}

const currentSemester = '1';
const currentClass = 'Math';
const currentCategory = 'all';
const searchTerm = 'title 1';
const favorites = ['doc_0', 'doc_4'];

function oldFilter(pdfDatabase) {
    return pdfDatabase.filter(pdf => {
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
}

function prepareSearchIndex(data) {
    const now = Date.now();
    const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    data.forEach(pdf => {
        pdf._searchStr = `${pdf.title||''} ${pdf.description||''} ${pdf.category||''} ${pdf.author||''}`.toLowerCase();
        const d = new Date(pdf.uploadDate);
        if (!isNaN(d)) {
            pdf._isNew = (now - d) < 604800000;
            pdf._formattedDate = formatter.format(d);
        }
    });
}

function newFilter(pdfDatabase) {
    return pdfDatabase.filter(pdf => {
        if (pdf.semester !== currentSemester) return false;
        if (pdf.class !== currentClass) return false;

        if (currentCategory === 'favorites') {
            if (!favorites.includes(pdf.id)) return false;
        } else if (currentCategory !== 'all' && pdf.category !== currentCategory) {
            return false;
        }

        if (searchTerm) {
            if (pdf._searchStr) {
                if (!pdf._searchStr.includes(searchTerm)) return false;
            } else {
                const fallbackSearchStr = `${pdf.title || ''} ${pdf.description || ''} ${pdf.category || ''} ${pdf.author || ''}`.toLowerCase();
                if (!fallbackSearchStr.includes(searchTerm)) return false;
            }
        }
        return true;
    });
}

function oldCardLoop(filteredPdfs) {
    filteredPdfs.forEach(pdf => {
        const uploadDateObj = new Date(pdf.uploadDate);
        const timeDiff = new Date() - uploadDateObj;
        const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
        const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    });
}

function newCardLoop(filteredPdfs) {
    filteredPdfs.forEach(pdf => {
        let isNew = pdf._isNew;
        if (isNew === undefined) {
            const uploadDateObj = new Date(pdf.uploadDate);
            if (!isNaN(uploadDateObj.getTime())) {
                const timeDiff = new Date() - uploadDateObj;
                isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days
            } else {
                isNew = false;
            }
        }
        let formattedDate = pdf._formattedDate;
        if (formattedDate === undefined) {
            const uploadDateObj = new Date(pdf.uploadDate);
            if (!isNaN(uploadDateObj.getTime())) {
                formattedDate = uploadDateObj.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
            } else {
                formattedDate = 'Unknown Date';
            }
        }
    });
}


console.log("Warming up...");
oldFilter(pdfDatabase);
prepareSearchIndex(pdfDatabase);
newFilter(pdfDatabase);
oldCardLoop(pdfDatabase);
newCardLoop(pdfDatabase);

const ITERATIONS = 100;

console.log("\nTesting Filter:");
let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) oldFilter(pdfDatabase);
let oldTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) newFilter(pdfDatabase);
let newTime = performance.now() - start;

console.log(`Old Filter: ${oldTime.toFixed(2)}ms`);
console.log(`New Filter: ${newTime.toFixed(2)}ms`);
console.log(`Speedup: ${(oldTime/newTime).toFixed(2)}x`);

console.log("\nTesting Card Rendering (Date logic):");
start = performance.now();
for (let i = 0; i < ITERATIONS; i++) oldCardLoop(pdfDatabase);
let oldCardTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) newCardLoop(pdfDatabase);
let newCardTime = performance.now() - start;

console.log(`Old Card Loop: ${oldCardTime.toFixed(2)}ms`);
console.log(`New Card Loop: ${newCardTime.toFixed(2)}ms`);
console.log(`Speedup: ${(oldCardTime/newCardTime).toFixed(2)}x`);
