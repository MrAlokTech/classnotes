from playwright.sync_api import sync_playwright

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("http://localhost:8000")

        # Override firebase to prevent issues
        page.evaluate("""
            window.firebase = {
                apps: [1],
                firestore: () => ({
                    collection: () => ({
                        doc: () => ({ onSnapshot: () => {} }),
                        orderBy: () => ({
                            limit: () => ({
                                get: () => Promise.resolve({ empty: true })
                            })
                        })
                    })
                }),
                auth: () => ({ onAuthStateChanged: () => {} })
            }
        """)

        page.evaluate("""
            localStorage.setItem('classnotes_db_cache', JSON.stringify({
                timestamp: 9999999999999,
                data: [
                    {
                        id: 'pdf1',
                        title: 'Organic Chemistry Basics',
                        description: 'Introductory concepts',
                        category: 'Organic',
                        author: 'Dr. Smith',
                        class: 'MSc Chemistry',
                        semester: 1,
                        uploadDate: '2024-03-01T00:00:00.000Z',
                        pdfUrl: 'https://example.com/pdf1'
                    },
                    {
                        id: 'pdf2',
                        title: 'Quantum Mechanics',
                        description: 'Advanced physics',
                        category: 'Physics',
                        author: 'Dr. Heisenberg',
                        class: 'MSc Physics',
                        semester: 2,
                        uploadDate: '2023-01-01T00:00:00.000Z',
                        pdfUrl: 'https://example.com/pdf2'
                    }
                ]
            }));
            localStorage.setItem('currentClass', 'MSc Chemistry');
            localStorage.setItem('currentSemester', '1');
        """)

        # Manually load the script execution to prevent timing issues
        page.evaluate("""
            window.isMaintenanceActive = false;
            document.getElementById('holidayOverlay')?.classList.add('hidden');
            loadPDFDatabase();
        """)
        page.wait_for_timeout(2000)

        # Force render
        page.evaluate("renderPDFs()")
        page.wait_for_timeout(1000)

        # Check if organic chemistry card rendered
        try:
            card_text = page.locator(".pdf-card").first.inner_text()
            print("Card text:", card_text)
            assert "Organic Chemistry Basics" in card_text, "Organic chemistry card should be rendered"

            # Test Search
            search_input = page.locator("#searchInput")
            search_input.fill("quantum")
            page.evaluate("renderPDFs()") # force render without timeout
            page.wait_for_timeout(1000)

            empty_state = page.locator("#emptyState").is_visible()
            print("Empty state visible:", empty_state)
            assert empty_state, "Should show empty state for quantum in MSc Chemistry"

            search_input.fill("organic")
            page.evaluate("renderPDFs()") # force render
            page.wait_for_timeout(1000)
            assert page.locator(".pdf-card").is_visible(), "Should show organic card when searching 'organic'"

            print("All tests passed!")
        except Exception as e:
            print("Failed:", e)
            print(page.evaluate("document.body.innerHTML"))

        browser.close()

if __name__ == "__main__":
    test_frontend()
