import sys
import time
import urllib.request
from urllib.error import URLError
from playwright.sync_api import sync_playwright

def wait_for_server(url, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url)
            print("Server is up!")
            return True
        except URLError:
            time.sleep(0.5)
    print("Server failed to start")
    return False

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        page.route("**/*firebase*", lambda route: route.abort())
        page.route("**/*gstatic*", lambda route: route.abort())
        page.route("**/*googleapis*", lambda route: route.abort())
        page.route("**/*googletagmanager*", lambda route: route.abort())

        # Create mock data
        mock_pdfs = [
            {
                "id": "pdf1",
                "title": "Quantum Mechanics",
                "description": "Introduction to Quantum Physics",
                "category": "Physics",
                "author": "Dr. Smith",
                "class": "MSc Physics",
                "semester": 1,
                "uploadDate": "2023-10-01T10:00:00Z"
            },
            {
                "id": "pdf2",
                "title": "Organic Chemistry Basics",
                "description": "Fundamentals of carbon compounds",
                "category": "Organic",
                "author": "Prof. Jones",
                "class": "MSc Chemistry",
                "semester": 1,
                "uploadDate": "2023-10-05T10:00:00Z"
            }
        ]

        # Inject initial state
        page.add_init_script("""
            window.firebase = {
                apps: [{ name: '[DEFAULT]' }],
                initializeApp: function() {},
                auth: function() {
                    return {
                        onAuthStateChanged: function(cb) { cb(null); },
                        signInAnonymously: function() { return Promise.resolve({ user: { uid: 'guest123' } }); }
                    };
                },
                firestore: function() {
                    const firestoreObj = function() {};
                    window.firebase.firestore.FieldValue = {
                        serverTimestamp: function() { return new Date(); },
                        increment: function(n) { return n; }
                    };

                    return {
                        collection: function(colName) {
                            return {
                                doc: function(docId) {
                                    return {
                                        set: function() { return Promise.resolve(); },
                                        onSnapshot: function() { return function() {}; },
                                        collection: function() {
                                            return {
                                                doc: function() {
                                                    return { set: function() { return Promise.resolve(); } };
                                                },
                                                add: function() { return Promise.resolve(); }
                                            };
                                        }
                                    };
                                },
                                orderBy: function() {
                                    return {
                                        limit: function() {
                                            return {
                                                get: function() {
                                                    return Promise.resolve({
                                                        empty: false,
                                                        docs: [{id: 'pdf1'}],
                                                        forEach: function(cb) {}
                                                    });
                                                }
                                            };
                                        },
                                        get: function() {
                                            return Promise.resolve({
                                                empty: false,
                                                docs: [{id: 'pdf1'}],
                                                forEach: function(cb) {}
                                            });
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };

            const NativeDate = window.Date;
            window.Date = function(...args) {
                if (args.length === 0) return new NativeDate('2024-03-15T10:00:00Z');
                return new NativeDate(...args);
            };
            window.Date.now = NativeDate.now;
        """)

        print("Navigating to page...")
        page.goto("http://localhost:8000", wait_until="domcontentloaded")

        # Populate localStorage with mock data
        page.evaluate("""(data) => {
            localStorage.setItem('currentClass', 'MSc Chemistry');
            localStorage.setItem('currentSemester', '1');
            localStorage.setItem('classnotes_db_cache', JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        }""", mock_pdfs)

        # Reload to apply localStorage
        page.reload(wait_until="domcontentloaded")

        # Force initialization and preparation
        page.evaluate("""
            const p = document.getElementById('preloader');
            if(p) p.classList.add('hidden');
            const h = document.getElementById('holidayOverlay');
            if(h) h.classList.add('hidden');
            const cw = document.getElementById('contentWrapper');
            if(cw) cw.classList.add('active');

            if (typeof window.loadPDFDatabase === 'function') {
                window.loadPDFDatabase();
            }
        """)

        # Wait for the UI to settle
        time.sleep(2)

        print("Checking rendered PDFs...")
        pdf_cards = page.locator(".pdf-card").count()
        if pdf_cards != 1:
            print("❌ Expected 1 PDF for MSc Chemistry!")
            browser.close()
            sys.exit(1)

        print("Checking search functionality...")
        # We need to dispatch the proper event or set the value and call renderPDFs manually
        # The script.js checks searchInput.value.toLowerCase() inside renderPDFs()

        page.evaluate("""
            document.getElementById('searchInput').value = 'organic';
            window.renderPDFs();
        """)
        time.sleep(1)

        pdf_cards = page.locator(".pdf-card").count()
        if pdf_cards != 1:
            print("❌ Expected 1 PDF after search!")
            browser.close()
            sys.exit(1)

        print("Searching for non-existent term...")
        page.evaluate("""
            document.getElementById('searchInput').value = 'quantum';
            window.renderPDFs();
        """)
        time.sleep(1)

        # Wait for any potential DOM updates
        page.wait_for_function("document.getElementById('pdfGrid').style.display === 'none'")

        pdf_cards = page.locator(".pdf-card:visible").count()
        if pdf_cards != 0:
            print(f"❌ Expected 0 visible PDFs after search! Got {pdf_cards}")
            browser.close()
            sys.exit(1)

        print("✅ Frontend verification passed!")
        browser.close()

if __name__ == "__main__":
    if wait_for_server("http://localhost:8000"):
        run_test()
    else:
        sys.exit(1)
