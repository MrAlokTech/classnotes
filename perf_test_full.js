const mockDB = [];
for(let i=0; i<5000; i++) {
    mockDB.push({
        id: `pdf_${i}`,
        title: `Note ${i} about Organic Chemistry`,
        description: `This is a long description for note ${i} that contains lots of text to search through when filtering the database.`,
        category: i % 4 === 0 ? 'Organic' : (i % 4 === 1 ? 'Inorganic' : 'Physical'),
        author: `Author ${i}`,
        semester: (i % 6) + 1,
        class: i % 2 === 0 ? 'MSc Chemistry' : 'BSc Chemistry',
        uploadDate: new Date(Date.now() - (i * 10000000)).toISOString()
    });
}

function oldFilter(pdfDatabase, currentSemester, currentClass, currentCategory, favorites, searchTerm) {
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
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    data.forEach(pdf => {
        pdf._searchStr = `${pdf.title} ${pdf.description} ${pdf.category} ${pdf.author}`.toLowerCase();
        const uploadDateObj = new Date(pdf.uploadDate);
        pdf._isNew = (now - uploadDateObj) < SEVEN_DAYS;
        pdf._formattedDate = formatter.format(uploadDateObj);
    });
}

function newFilter(pdfDatabase, currentSemester, currentClass, currentCategory, favorites, searchTerm) {
    return pdfDatabase.filter(pdf => {
        if (pdf.semester !== currentSemester) return false;
        if (pdf.class !== currentClass) return false;

        if (currentCategory === 'favorites') {
            if (!favorites.includes(pdf.id)) return false;
        } else if (currentCategory !== 'all') {
            if (pdf.category !== currentCategory) return false;
        }

        if (!searchTerm) return true;

        if (!pdf._searchStr) return false;

        return pdf._searchStr.includes(searchTerm);
    });
}

console.time('Prepare Index');
prepareSearchIndex(mockDB);
console.timeEnd('Prepare Index');

const RUNS = 100;

console.time('Old Filter');
for(let i=0; i<RUNS; i++) {
    oldFilter(mockDB, 1, 'MSc Chemistry', 'all', [], 'organic');
}
console.timeEnd('Old Filter');

console.time('New Filter');
for(let i=0; i<RUNS; i++) {
    newFilter(mockDB, 1, 'MSc Chemistry', 'all', [], 'organic');
}
console.timeEnd('New Filter');
