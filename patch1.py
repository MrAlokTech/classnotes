import sys

def apply_patch():
    with open('script.js', 'r') as f:
        content = f.read()

    prepare_func = """
/* =========================================
   NEW: PERFORMANCE OPTIMIZATION (BOLT)
   ========================================= */
// ⚡ Bolt: Pre-calculating expensive runtime properties to speed up the render loop.
function prepareSearchIndex(pdf) {
    // 1. Handle dates efficiently
    let uploadDateObj;
    if (pdf.uploadDate && typeof pdf.uploadDate.toDate === 'function') {
        uploadDateObj = pdf.uploadDate.toDate();
    } else {
        uploadDateObj = new Date(pdf.uploadDate);
    }

    // 2. Pre-calculate "New" badge (7 days)
    const timeDiff = new Date() - uploadDateObj;
    pdf._isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);

    // 3. Pre-format date string
    pdf._formattedDate = uploadDateObj.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    // 4. Create a single combined lowercase string for O(1) search operations
    const safeStr = (str) => (str || '').toString().toLowerCase();
    pdf._searchStr = `${safeStr(pdf.title)} ${safeStr(pdf.description)} ${safeStr(pdf.category)} ${safeStr(pdf.author)}`;

    return pdf;
}
"""
    # Insert before loadPDFDatabase
    target_str = "async function syncClassSwitcher() {"

    if target_str in content:
        content = content.replace(target_str, prepare_func + "\n" + target_str)
        with open('script.js', 'w') as f:
            f.write(content)
        print("Patch applied successfully.")
    else:
        print("Could not find target string.")

if __name__ == "__main__":
    apply_patch()
