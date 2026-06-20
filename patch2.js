const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

code = code.replace(
`    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;

        // NEW: Check if the PDF class matches the UI's current class selection
        // Note: If old documents don't have this field, they will be hidden.
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

        // Update return statement to include matchesClass
        return matchesSemester && matchesClass && matchesCategory && matchesSearch;
    });`,
`    const filteredPdfs = pdfDatabase.filter(pdf => {
        if (pdf.semester !== currentSemester) return false;

        // NEW: Check if the PDF class matches the UI's current class selection
        // Note: If old documents don't have this field, they will be hidden.
        if (pdf.class !== currentClass) return false;

        if (currentCategory === 'favorites') {
            if (!favorites.includes(pdf.id)) return false;
        } else if (currentCategory !== 'all') {
            if (pdf.category !== currentCategory) return false;
        }

        if (searchTerm && pdf._searchStr) {
            if (!pdf._searchStr.includes(searchTerm)) return false;
        }

        return true;
    });`
);

code = code.replace(
`    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days

    const newBadgeHTML = isNew
        ? \`<span style="background:var(--error-color); color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle;">NEW</span>\`
        : '';

    const categoryIcons = {
        'Organic': 'fa-flask',
        'Inorganic': 'fa-atom',
        'Physical': 'fa-calculator',
        'Physics': 'fa-infinity' // Ensure Physics icon is mapped if used
    };
    const categoryIcon = categoryIcons[pdf.category] || 'fa-file-pdf';

    // Formatting Date
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });`,
`    const newBadgeHTML = pdf._isNew
        ? \`<span style="background:var(--error-color); color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle;">NEW</span>\`
        : '';

    const categoryIcons = {
        'Organic': 'fa-flask',
        'Inorganic': 'fa-atom',
        'Physical': 'fa-calculator',
        'Physics': 'fa-infinity' // Ensure Physics icon is mapped if used
    };
    const categoryIcon = categoryIcons[pdf.category] || 'fa-file-pdf';
    const formattedDate = pdf._formattedDate || '';`
);

// Add prepareSearchIndex only once!
if (!code.includes('function prepareSearchIndex(data)')) {
code = code.replace(
`/* =========================================
   6. MAINTENANCE & HOLIDAYS
   ========================================= */`,
`function prepareSearchIndex(data) {
    const now = new Date();
    data.forEach(pdf => {
        const title = pdf.title || '';
        const desc = pdf.description || '';
        const cat = pdf.category || '';
        const author = pdf.author || '';
        pdf._searchStr = \`\${title} \${desc} \${cat} \${author}\`.toLowerCase();

        let uploadDateObj;
        if (pdf.uploadDate && typeof pdf.uploadDate.toDate === 'function') {
            uploadDateObj = pdf.uploadDate.toDate();
        } else if (pdf.uploadDate) {
            uploadDateObj = new Date(pdf.uploadDate);
        } else {
            uploadDateObj = new Date(0);
        }

        const timeDiff = now - uploadDateObj;
        pdf._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
        pdf._formattedDate = uploadDateObj.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    });
}

/* =========================================
   6. MAINTENANCE & HOLIDAYS
   ========================================= */`
);
}

code = code.replace(
`        if (shouldUseCache) {
            pdfDatabase = cachedData;
            // --- FIX: CALL THIS TO POPULATE UI ---
            syncClassSwitcher();`,
`        if (shouldUseCache) {
            pdfDatabase = cachedData;
            prepareSearchIndex(pdfDatabase);
            // --- FIX: CALL THIS TO POPULATE UI ---
            syncClassSwitcher();`
);

code = code.replace(
`        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: new Date().getTime(),
            data: pdfDatabase
        }));

        // --- FIX: CALL THIS TO POPULATE UI ---
        syncClassSwitcher();`,
`        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: new Date().getTime(),
            data: pdfDatabase
        }));

        prepareSearchIndex(pdfDatabase);

        // --- FIX: CALL THIS TO POPULATE UI ---
        syncClassSwitcher();`
);

fs.writeFileSync('script.js', code);
