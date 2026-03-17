from playwright.sync_api import sync_playwright

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Block external dependencies
        page.route("**/*", lambda route: route.continue_() if "127.0.0.1" in route.request.url or "localhost" in route.request.url or route.request.url.startswith("file://") else route.abort())

        # Seed local storage and block requests
        page.goto("file:///app/index.html", wait_until="domcontentloaded")

        page.evaluate("""
            localStorage.setItem('currentClass', 'MSc Chemistry');
            localStorage.setItem('currentSemester', '1');

            // Provide a mock cached database
            const mockDb = {
                timestamp: new Date().getTime(),
                data: [
                    {
                        id: 'pdf1',
                        title: 'Organic Synthesis Note',
                        description: 'Detailed reactions',
                        category: 'Organic',
                        author: 'Dr. John',
                        class: 'MSc Chemistry',
                        semester: 1,
                        uploadDate: new Date().toISOString()
                    },
                    {
                        id: 'pdf2',
                        title: 'Quantum Mechanics',
                        description: 'Schrodinger equation',
                        category: 'Physical',
                        author: 'Dr. Smith',
                        class: 'MSc Chemistry',
                        semester: 1,
                        uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days old
                    }
                ]
            };
            localStorage.setItem('classnotes_db_cache', JSON.stringify(mockDb));
        """)

        # Reload to apply mock
        page.goto("file:///app/index.html", wait_until="networkidle")

        # Console output for debugging
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Mock Firestore and other variables missing since external JS is blocked
        page.evaluate("""
            window.firebase = {
                apps: [{ name: 'mock' }],
                initializeApp: () => {},
                auth: () => ({
                    signInAnonymously: () => Promise.resolve({ user: { uid: 'mock_uid' } }),
                    onAuthStateChanged: (cb) => cb(null)
                }),
                firestore: () => {
                    const mockFirestore = () => ({
                        collection: (colName) => ({
                            doc: () => ({
                                set: () => Promise.resolve(),
                                onSnapshot: () => {}
                            }),
                            orderBy: () => ({
                                limit: () => ({
                                    get: () => Promise.resolve({
                                        empty: false,
                                        docs: [{ id: 'pdf1' }] // Match cache ID to bypass "empty" logic and use cache
                                    })
                                }),
                                get: () => Promise.resolve({
                                    forEach: () => {}
                                })
                            })
                        })
                    });
                    mockFirestore.FieldValue = {
                        serverTimestamp: () => 'mock_timestamp',
                        increment: () => 'mock_increment'
                    };
                    return mockFirestore();
                }
            };
            window.db = window.firebase.firestore();

            // Remove preloader
            document.getElementById('preloader').classList.add('hidden');
            document.getElementById('contentWrapper').classList.add('active');

            // Programmatically call init manually as we mocked after domcontentloaded
            if (typeof loadPDFDatabase === 'function') {
               loadPDFDatabase().then(() => console.log('loadPDFDatabase finished'));
            } else {
               console.log('loadPDFDatabase not found!');
            }
        """)

        page.wait_for_timeout(2000) # wait for render

        # Check if items are rendered
        cards_count = page.locator('.pdf-card').count()
        print(f"Number of PDF cards rendered: {cards_count}")
        assert cards_count == 2, f"Expected 2 cards, got {cards_count}"

        # Check text in cards to verify _isNew and _formattedDate logic didn't break them
        card1_text = page.locator('.pdf-card').nth(0).inner_text()
        print("Card 1 text:", card1_text)
        assert "Organic Synthesis Note" in card1_text
        assert "NEW" in card1_text # 1st one is new

        card2_text = page.locator('.pdf-card').nth(1).inner_text()
        print("Card 2 text:", card2_text)
        assert "Quantum Mechanics" in card2_text
        assert "NEW" not in card2_text # 2nd one is 10 days old

        # Test search logic refactoring
        page.fill('#searchInput', 'Quantum')

        # We need to trigger input event as Playwright's fill doesn't always trigger standard input listeners that we hooked on
        page.evaluate("document.getElementById('searchInput').dispatchEvent(new Event('input', { bubbles: true }))")

        page.wait_for_timeout(500)

        cards_count = page.locator('.pdf-card').count()
        print(f"Number of PDF cards after search 'Quantum': {cards_count}")
        assert cards_count == 1, f"Expected 1 card after search, got {cards_count}"

        browser.close()

if __name__ == "__main__":
    test_frontend()
