const mockDB = [];
for(let i=0; i<100; i++) {
    mockDB.push({
        id: `pdf_${i}`,
        uploadDate: new Date(Date.now() - (i * 10000000)).toISOString()
    });
}

const RUNS = 1000;

console.time('Old Date Formatting (Inline)');
for(let i=0; i<RUNS; i++) {
    mockDB.forEach(pdf => {
        const uploadDateObj = new Date(pdf.uploadDate);
        const timeDiff = new Date() - uploadDateObj;
        const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days

        const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    });
}
console.timeEnd('Old Date Formatting (Inline)');

console.time('New Date Formatting (Intl)');
for(let i=0; i<RUNS; i++) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    mockDB.forEach(pdf => {
        const uploadDateObj = new Date(pdf.uploadDate);
        const isNew = (now - uploadDateObj.getTime()) < SEVEN_DAYS;
        const formattedDate = formatter.format(uploadDateObj);
    });
}
console.timeEnd('New Date Formatting (Intl)');

console.time('New Date Formatting (Pre-calculated)');
const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
});
const now = Date.now();
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

mockDB.forEach(pdf => {
    const uploadDateObj = new Date(pdf.uploadDate);
    pdf._isNew = (now - uploadDateObj.getTime()) < SEVEN_DAYS;
    pdf._formattedDate = formatter.format(uploadDateObj);
});

for(let i=0; i<RUNS; i++) {
    mockDB.forEach(pdf => {
        const isNew = pdf._isNew;
        const formattedDate = pdf._formattedDate;
    });
}
console.timeEnd('New Date Formatting (Pre-calculated)');
