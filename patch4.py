import sys

def apply_patch():
    with open('script.js', 'r') as f:
        content = f.read()

    search_str = """    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days"""

    replace_str = """    // ⚡ Bolt: Use pre-calculated values
    const isNew = pdf._isNew;"""

    if search_str in content:
        content = content.replace(search_str, replace_str)
        print("Patch 4 applied successfully (part 1).")
    else:
        print("Could not find new badge block.")

    search_str2 = """    // Formatting Date
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });"""

    replace_str2 = """    // Formatting Date
    // ⚡ Bolt: Use pre-calculated date string
    const formattedDate = pdf._formattedDate || new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });"""

    if search_str2 in content:
        content = content.replace(search_str2, replace_str2)
        print("Patch 4 applied successfully (part 2).")
    else:
        print("Could not find formatted date block.")

    with open('script.js', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    apply_patch()
