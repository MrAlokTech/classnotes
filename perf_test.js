const pdfs = [];
for (let i = 0; i < 1000; i++) {
    pdfs.push({ uploadDate: "2023-10-15T12:00:00Z" });
}

console.time('date_format');
for(let i = 0; i < pdfs.length; i++) {
    const uploadDateObj = new Date(pdfs[i].uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
    const formattedDate = new Date(pdfs[i].uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}
console.timeEnd('date_format');

console.time('precalc');
// Simulate pre-calculated property
pdfs.forEach(p => {
    const uploadDateObj = new Date(p.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    p._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
    p._formattedDate = new Date(p.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
});
console.timeEnd('precalc');

console.time('precalc_read');
for(let i = 0; i < pdfs.length; i++) {
    const isNew = pdfs[i]._isNew;
    const formattedDate = pdfs[i]._formattedDate;
}
console.timeEnd('precalc_read');
