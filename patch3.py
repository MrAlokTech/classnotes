import sys

def apply_patch():
    with open('script.js', 'r') as f:
        content = f.read()

    search_str = """    const filteredPdfs = pdfDatabase.filter(pdf => {
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
    });"""

    replace_str = """    // ⚡ Bolt: Fast-path filtering using early returns and pre-calculated index
    const filteredPdfs = pdfDatabase.filter(pdf => {
        // 1. Cheap Equality Checks First
        if (pdf.class !== currentClass) return false;
        if (pdf.semester !== currentSemester) return false;

        // 2. Category Check
        if (currentCategory === 'favorites') {
            if (!favorites.includes(pdf.id)) return false;
        } else if (currentCategory !== 'all') {
            if (pdf.category !== currentCategory) return false;
        }

        // 3. Expensive String Match Last (Using pre-calculated string)
        if (searchTerm) {
            return pdf._searchStr.includes(searchTerm);
        }

        return true;
    });"""

    if search_str in content:
        content = content.replace(search_str, replace_str)
        with open('script.js', 'w') as f:
            f.write(content)
        print("Patch 3 applied successfully.")
    else:
        print("Could not find renderPDFs filter block.")

if __name__ == "__main__":
    apply_patch()
