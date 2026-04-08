const assert = require('assert');

// Mock data
const mockPdfs = [];
for (let i = 0; i < 5000; i++) {
    mockPdfs.push({
        id: `pdf_${i}`,
        title: `Introduction to Organic Chemistry Part ${i}`,
        description: `This is a detailed description of organic chemistry concepts for part ${i}. It covers alkanes, alkenes, and alkynes.`,
        category: 'Organic',
        author: 'Dr. John Doe',
        uploadDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 14 days
        class: 'MSc Chemistry',
        semester: 1
    });
}

const searchTerm = 'alkynes'.toLowerCase();

function oldWay() {
    const start = performance.now();
    let count = 0;

    const filtered = mockPdfs.filter(pdf => {
        const matchesSearch = pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);
        return matchesSearch;
    });

    // Simulate render
    filtered.forEach(pdf => {
        const uploadDateObj = new Date(pdf.uploadDate);
        const timeDiff = new Date() - uploadDateObj;
        const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days
        const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        count++;
    });

    return performance.now() - start;
}

function newWay() {
    const startIndex = performance.now();

    // prepareSearchIndex
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    mockPdfs.forEach(pdf => {
        pdf._searchStr = `${pdf.title || ''} ${pdf.description || ''} ${pdf.category || ''} ${pdf.author || ''}`.toLowerCase();
        if (pdf.uploadDate) {
            const uploadDateObj = new Date(pdf.uploadDate);
            pdf._formattedDate = dateFormatter.format(uploadDateObj);
            pdf._isNew = (now - uploadDateObj) < SEVEN_DAYS;
        }
    });

    const timeIndex = performance.now() - startIndex;

    const startFilter = performance.now();
    let count = 0;
    const filtered = mockPdfs.filter(pdf => {
        if (!pdf._searchStr) return false;
        return pdf._searchStr.includes(searchTerm);
    });

    // Simulate render
    filtered.forEach(pdf => {
        const isNew = pdf._isNew;
        const formattedDate = pdf._formattedDate;
        count++;
    });

    const timeFilter = performance.now() - startFilter;

    return {
        index: timeIndex,
        filter: timeFilter,
        total: timeIndex + timeFilter
    };
}

console.log("Benchmarking rendering 5000 items:");

// Warmup
for(let i=0; i<5; i++) oldWay();
for(let i=0; i<5; i++) newWay();

let oldTotal = 0;
let newTotal = 0;
let newFilterTotal = 0;
const iter = 50;

for(let i=0; i<iter; i++) {
    oldTotal += oldWay();
    const n = newWay();
    newTotal += n.total;
    newFilterTotal += n.filter;
}

console.log(`Old way (avg): ${(oldTotal / iter).toFixed(2)}ms per filter/render loop`);
console.log(`New way (avg total with index): ${(newTotal / iter).toFixed(2)}ms`);
console.log(`New way (avg filter/render loop only): ${(newFilterTotal / iter).toFixed(2)}ms`);
console.log(`Speedup for filter/render loop: ~${((oldTotal / iter) / (newFilterTotal / iter)).toFixed(1)}x faster`);
