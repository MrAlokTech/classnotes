from playwright.sync_api import sync_playwright
import json
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Block external requests
        page.route("**/*", lambda route: route.continue_() if not any(x in route.request.url for x in ["firestore", "google", "firebase", "unpkg"]) else route.abort())

        # Load page
        page.goto("http://localhost:8000")

        mock_data = {
            "timestamp": 9999999999999,
            "data": [
                {
                    "id": "pdf1",
                    "title": "Organic Chemistry Basics",
                    "description": "Introductory concepts",
                    "category": "Organic",
                    "author": "Dr. Smith",
                    "class": "MSc Chemistry",
                    "semester": 1,
                    "uploadDate": "2024-03-01T00:00:00.000Z",
                    "pdfUrl": "https://example.com/pdf1"
                },
                {
                    "id": "pdf2",
                    "title": "Quantum Mechanics",
                    "description": "Advanced physics",
                    "category": "Physics",
                    "author": "Dr. Heisenberg",
                    "class": "MSc Physics",
                    "semester": 2,
                    "uploadDate": "2023-01-01T00:00:00.000Z",
                    "pdfUrl": "https://example.com/pdf2"
                }
            ]
        }

        # Set mocked local storage
        page.evaluate(f"localStorage.setItem('classnotes_db_cache', '{json.dumps(mock_data)}')")
        page.evaluate("localStorage.setItem('currentClass', 'MSc Chemistry')")
        page.evaluate("localStorage.setItem('currentSemester', '1')")

        # Override firebase and maintenance checks
        page.evaluate("""
            window.isMaintenanceActive = false;
            window.initMaintenanceListener = function() {};
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

        # Trigger data load and wait for DOM updates
        page.evaluate("loadPDFDatabase()")
        page.wait_for_timeout(2000)

        # Hide holiday mode and preloader just in case
        page.evaluate("document.getElementById('holidayOverlay')?.classList.add('hidden')")
        page.evaluate("document.getElementById('preloader')?.classList.add('hidden')")

        # Force render
        page.evaluate("renderPDFs()")
        page.wait_for_timeout(1000)

        # Take screenshot of the initial loaded state
        page.screenshot(path="verification.png", full_page=True)
        print("Screenshot taken: verification.png")

        # Search for quantum
        page.locator("#searchInput").fill("quantum")
        page.evaluate("renderPDFs()")
        page.wait_for_timeout(1000)

        # Take screenshot of empty state
        page.screenshot(path="verification_empty.png", full_page=True)
        print("Screenshot taken: verification_empty.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
