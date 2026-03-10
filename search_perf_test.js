const pdfs = [];
for (let i = 0; i < 1000; i++) {
    pdfs.push({
        title: "Introduction to Organic Chemistry",
        description: "A comprehensive guide to organic chemistry principles.",
        category: "Organic",
        author: "John Doe"
    });
}

const searchTerm = "organic";

console.time('search_split');
for(let i = 0; i < 10; i++) {
    pdfs.filter(pdf => {
        return pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);
    });
}
console.timeEnd('search_split');

console.time('precalc_searchStr');
pdfs.forEach(p => {
    p._searchStr = `${p.title} ${p.description} ${p.category} ${p.author}`.toLowerCase();
});
console.timeEnd('precalc_searchStr');

console.time('search_precalc');
for(let i = 0; i < 10; i++) {
    pdfs.filter(pdf => {
        return pdf._searchStr.includes(searchTerm);
    });
}
console.timeEnd('search_precalc');
