const fs = require('fs');

// Generate mock data
const mockDB = [];
for(let i=0; i<5000; i++) {
    mockDB.push({
        id: `pdf_${i}`,
        title: `Note ${i} about Organic Chemistry`,
        description: `This is a long description for note ${i} that contains lots of text to search through when filtering the database.`,
        category: i % 4 === 0 ? 'Organic' : (i % 4 === 1 ? 'Inorganic' : 'Physical'),
        author: `Author ${i}`,
        semester: (i % 6) + 1,
        class: i % 2 === 0 ? 'MSc Chemistry' : 'BSc Chemistry'
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

        return pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);
    });
}

// Warmup
for(let i=0; i<100; i++) {
    oldFilter(mockDB, 1, 'MSc Chemistry', 'Organic', [], 'chemistry');
    newFilter(mockDB, 1, 'MSc Chemistry', 'Organic', [], 'chemistry');
}

const RUNS = 1000;

console.time('Old Filter (No Search Term)');
for(let i=0; i<RUNS; i++) {
    oldFilter(mockDB, 1, 'MSc Chemistry', 'all', [], '');
}
console.timeEnd('Old Filter (No Search Term)');

console.time('New Filter (No Search Term)');
for(let i=0; i<RUNS; i++) {
    newFilter(mockDB, 1, 'MSc Chemistry', 'all', [], '');
}
console.timeEnd('New Filter (No Search Term)');

console.time('Old Filter (With Search Term)');
for(let i=0; i<RUNS; i++) {
    oldFilter(mockDB, 1, 'MSc Chemistry', 'all', [], 'organic');
}
console.timeEnd('Old Filter (With Search Term)');

console.time('New Filter (With Search Term)');
for(let i=0; i<RUNS; i++) {
    newFilter(mockDB, 1, 'MSc Chemistry', 'all', [], 'organic');
}
console.timeEnd('New Filter (With Search Term)');
