import sys

def apply_patch():
    with open('script.js', 'r') as f:
        content = f.read()

    # Apply to Cached Data
    search_str1 = """        if (shouldUseCache) {
            pdfDatabase = cachedData;"""
    replace_str1 = """        if (shouldUseCache) {
            // ⚡ Bolt: Apply pre-calculations to cached data
            pdfDatabase = cachedData.map(pdf => prepareSearchIndex(pdf));"""

    if search_str1 in content:
        content = content.replace(search_str1, replace_str1)
    else:
        print("Could not find cache block.")

    # Apply to Fresh Fetch
    search_str2 = """        pdfDatabase = [];
        snapshot.forEach(doc => {
            pdfDatabase.push({ id: doc.id, ...doc.data() });
        });"""
    replace_str2 = """        pdfDatabase = [];
        snapshot.forEach(doc => {
            // ⚡ Bolt: Prepare search index immediately on fetch
            let pdf = { id: doc.id, ...doc.data() };
            pdfDatabase.push(prepareSearchIndex(pdf));
        });"""

    if search_str2 in content:
        content = content.replace(search_str2, replace_str2)
    else:
        print("Could not find fresh fetch block.")

    with open('script.js', 'w') as f:
        f.write(content)
    print("Patch 2 applied successfully.")

if __name__ == "__main__":
    apply_patch()
