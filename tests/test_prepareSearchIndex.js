const assert = require('assert');

function prepareSearchIndex(data) {
    if (!Array.isArray(data)) return;
    const now = new Date();
    data.forEach(pdf => {
        // 1. Pre-calculate search string
        const t = pdf.title || '';
        const d = pdf.description || '';
        const c = pdf.category || '';
        const a = pdf.author || '';
        pdf._searchStr = `${t} ${d} ${c} ${a}`.toLowerCase();

        // 2. Pre-calculate Date and New status
        let uploadDateObj;
        if (pdf.uploadDate && typeof pdf.uploadDate.toDate === 'function') {
            uploadDateObj = pdf.uploadDate.toDate();
        } else {
            uploadDateObj = new Date(pdf.uploadDate);
        }

        const timeDiff = now - uploadDateObj;
        pdf._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);

        pdf._formattedDate = uploadDateObj.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    });
}

const data = [
    { title: 'Title1', description: 'Desc1', category: 'Cat1', author: 'Author1', uploadDate: new Date() }
];
prepareSearchIndex(data);
assert.strictEqual(data[0]._searchStr, 'title1 desc1 cat1 author1');
assert.strictEqual(data[0]._isNew, true);
console.log('test pass');
