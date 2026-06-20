const assert = require('assert');

// Mock data
const pdfDatabase = [];
for (let i = 0; i < 5000; i++) {
    pdfDatabase.push({
        id: `pdf_${i}`,
        title: `Mock PDF Title ${i}`,
        description: `This is a mock description for pdf ${i}. It contains some keywords.`,
        category: i % 2 === 0 ? 'Organic' : 'Inorganic',
        author: `Author ${i}`,
        uploadDate: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    });
}

const searchTerm = 'keyword';

// --- Before Optimization ---
console.time('Before Render/Filter 1');
const filtered1 = pdfDatabase.filter(pdf => {
    return pdf.title.toLowerCase().includes(searchTerm) ||
        pdf.description.toLowerCase().includes(searchTerm) ||
        pdf.category.toLowerCase().includes(searchTerm) ||
        pdf.author.toLowerCase().includes(searchTerm);
});
console.timeEnd('Before Render/Filter 1');

console.time('Before CreateCard');
filtered1.forEach(pdf => {
    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);

    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
});
console.timeEnd('Before CreateCard');

// --- After Optimization ---
console.time('Prepare Index');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
});
const now = new Date();
pdfDatabase.forEach(pdf => {
    pdf._searchStr = `${pdf.title || ''} ${pdf.description || ''} ${pdf.category || ''} ${pdf.author || ''}`.toLowerCase();
    if (pdf.uploadDate) {
        const uploadDateObj = new Date(pdf.uploadDate);
        if (!isNaN(uploadDateObj)) {
            pdf._formattedDate = dateFormatter.format(uploadDateObj);
            const timeDiff = now - uploadDateObj;
            pdf._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
        }
    }
});
console.timeEnd('Prepare Index');

console.time('After Render/Filter 1');
const filtered2 = pdfDatabase.filter(pdf => {
    return pdf._searchStr ? pdf._searchStr.includes(searchTerm) : false;
});
console.timeEnd('After Render/Filter 1');

console.time('After CreateCard');
filtered2.forEach(pdf => {
    let isNew = pdf._isNew;
    let formattedDate = pdf._formattedDate;
});
console.timeEnd('After CreateCard');
