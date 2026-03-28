import asyncio
from playwright.async_api import async_playwright
import time

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Block firebase/google to prevent hanging in playwright and overwriting our mock DB
        await page.route("**/*firebase*", lambda route: route.abort())
        await page.route("**/*google*", lambda route: route.abort())

        # Seed local storage with mock data so it renders immediately
        await page.goto('http://127.0.0.1:8000', wait_until="commit")

        await page.evaluate('''() => {
            const timestamp = new Date().getTime();
            const pastDate = new Date(timestamp - 1000 * 60 * 60 * 24 * 2).toISOString(); // 2 days old (new)
            const oldDate = new Date(timestamp - 1000 * 60 * 60 * 24 * 10).toISOString(); // 10 days old (not new)

            const mockData = [
                { id: '1', title: 'Organic Chemistry Basics', description: 'Intro to alkanes', category: 'Organic', author: 'Dr. Smith', uploadDate: pastDate, semester: 1, class: 'MSc Chemistry' },
                { id: '2', title: 'Quantum Mechanics', description: 'Schrodinger equation', category: 'Physical', author: 'Dr. Jones', uploadDate: oldDate, semester: 1, class: 'MSc Chemistry' }
            ];

            localStorage.setItem('classnotes_db_cache', JSON.stringify({ timestamp, data: mockData }));
            localStorage.setItem('currentClass', 'MSc Chemistry');
            localStorage.setItem('currentSemester', '1');

            // Mock firestore globally before app init
            window.firebase = {
                apps: [{ name: '[DEFAULT]' }],
                initializeApp: () => {},
                firestore: () => ({
                    collection: (col) => ({
                        doc: (id) => ({
                            onSnapshot: (cb) => { cb({ exists: false, data: () => ({}) }); return () => {}; },
                            set: async () => {},
                            collection: () => ({ add: async () => {}, doc: () => ({ set: async () => {} }) })
                        }),
                        orderBy: () => ({
                            limit: () => ({
                                get: async () => ({ empty: true })
                            }),
                            get: async () => ({
                                forEach: (cb) => {
                                   const data = JSON.parse(localStorage.getItem('classnotes_db_cache') || "{}").data || [];
                                   data.forEach(d => cb({ id: d.id, data: () => d }));
                                }
                            })
                        })
                    })
                }),
                auth: () => ({
                    onAuthStateChanged: (cb) => { cb(null); },
                    signInAnonymously: async () => ({ user: { uid: 'mock_uid' } })
                })
            };
            window.firebase.firestore.FieldValue = {
                serverTimestamp: () => new Date(),
                increment: () => 1
            };
        }''')

        # Reload page with seeded data and mock
        await page.goto('http://127.0.0.1:8000', wait_until="domcontentloaded")

        # Force script initialization if needed (mock data)
        await page.evaluate('''() => {
            if (typeof loadPDFDatabase === 'function') {
                pdfDatabase = JSON.parse(localStorage.getItem('classnotes_db_cache') || "{}").data || [];
                prepareSearchIndex();
                renderPDFs();
            }
        }''')

        # Hide UI blockers
        await page.evaluate("() => document.getElementById('preloader')?.classList.add('hidden')")
        await page.evaluate("() => document.getElementById('holidayOverlay')?.classList.add('hidden')")
        await page.evaluate("() => document.getElementById('contentWrapper')?.classList.add('active')")

        # Wait for the grid to render
        await page.wait_for_selector('.pdf-card', timeout=5000)

        # Get count
        cards = await page.locator('.pdf-card').count()
        print(f"Rendered {cards} cards")

        # Take screenshot
        await page.screenshot(path="screenshot.png")
        print("Screenshot saved to screenshot.png")

        # Search test
        await page.fill('#searchInput', 'Organic')
        await page.wait_for_timeout(1000) # wait for debounce & render
        organic_cards = await page.locator('.pdf-card').count()
        print(f"Rendered {organic_cards} cards after searching 'Organic'")

        await browser.close()

asyncio.run(verify())
