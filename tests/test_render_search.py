# Ah, 'inorganic' contains 'organic'. My test search term was ambiguous!

import json

def run_tests():
    global_state = {
        'currentSemester': 1,
        'currentClass': 'MSc Chemistry',
        'currentCategory': 'all',
        'searchTerm': 'alcohols', # Changed search term
        'favorites': []
    }

    pdfs = [
        {
            "id": "pdf1",
            "class": "MSc Chemistry",
            "semester": 1,
            "category": "Organic",
            "title": "Alcohols and Phenols",
            "description": "Notes on Alcohols and Phenols",
            "author": "Dr. Smith",
            "uploadDate": "2024-01-01T00:00:00.000Z"
        },
        {
            "id": "pdf2",
            "class": "MSc Chemistry",
            "semester": 1,
            "category": "Inorganic",
            "title": "Coordination Compounds",
            "description": "Notes on Coordination Compounds",
            "author": "Dr. Jones",
            "uploadDate": "2024-02-01T00:00:00.000Z"
        }
    ]

    # Simulate prepareSearchIndex
    for pdf in pdfs:
        title = pdf.get('title', '')
        desc = pdf.get('description', '')
        cat = pdf.get('category', '')
        author = pdf.get('author', '')
        pdf['_searchStr'] = f"{title} {desc} {cat} {author}".lower()
        pdf['_isNew'] = False
        pdf['_formattedDate'] = 'Jan 1, 2024'

    # Simulate renderPDFs filter logic
    filtered = []
    for pdf in pdfs:
        if pdf['semester'] != global_state['currentSemester']: continue
        if pdf['class'] != global_state['currentClass']: continue
        if global_state['currentCategory'] == 'favorites':
            if pdf['id'] not in global_state['favorites']: continue
        elif global_state['currentCategory'] != 'all':
            if pdf['category'] != global_state['currentCategory']: continue
        if not pdf.get('_searchStr'): continue
        if global_state['searchTerm'] not in pdf['_searchStr']: continue
        filtered.append(pdf)

    assert len(filtered) == 1, f"Expected 1 item, got {len(filtered)}"
    assert filtered[0]['id'] == 'pdf1', "Wrong item filtered"

    print("Logic verification PASSED")

if __name__ == '__main__':
    run_tests()
