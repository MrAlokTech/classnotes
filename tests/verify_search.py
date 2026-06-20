import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Seed local storage with test data
        await page.goto('http://localhost:8000')

        mock_data = """
        {"timestamp": 9999999999999, "data": [
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
        ]}
        """

        await page.evaluate(f"localStorage.setItem('classnotes_db_cache', `{mock_data}`);")
        await page.evaluate(f"localStorage.setItem('currentClass', 'MSc Chemistry');")
        await page.evaluate(f"localStorage.setItem('currentSemester', '1');")

        # Mock Firebase network requests to avoid overwriting cache
        await page.route("**/firestore.googleapis.com/**", lambda route: route.abort())

        # Mock Firebase app script to avoid hanging
        await page.route("**/firebase-app.js", lambda route: route.fulfill(body="window.firebase = { apps: [], initializeApp: () => {}, firestore: () => ({ collection: () => ({ doc: () => ({ onSnapshot: () => {} }) }) }) };", status=200))
        await page.route("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js", lambda route: route.fulfill(body="window.firebase = { apps: [], initializeApp: () => {} };", status=200))
        await page.route("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js", lambda route: route.fulfill(body="window.firebase.firestore = () => ({ collection: () => ({ doc: () => ({ onSnapshot: () => {} }), orderBy: () => ({ get: async () => ({ empty: true }) }) }) });", status=200))
        await page.route("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js", lambda route: route.fulfill(body="window.firebase.auth = () => ({ signInAnonymously: async () => ({ user: { uid: 'mock' } }), onAuthStateChanged: (cb) => { cb(null); } });", status=200))

        # Reload to use the seeded mock data
        await page.goto('http://localhost:8000', wait_until="domcontentloaded")

        # Force load the db to trigger render directly
        await page.evaluate("""
            window.db = {
                collection: () => ({
                    doc: () => ({ onSnapshot: () => {} }),
                    orderBy: () => ({
                        get: async () => ({
                            empty: true
                        }),
                        limit: () => ({ get: async () => ({ empty: true }) })
                    })
                })
            };
            if(window.loadPDFDatabase) {
               window.loadPDFDatabase().catch(e => console.error(e));
            }
        """)

        # Wait for the database to load and render
        await page.wait_for_selector('.pdf-card', state='attached', timeout=5000)

        # Check initial render count
        cards = await page.locator('.pdf-card').all()
        assert len(cards) == 2, f"Expected 2 cards initially, got {len(cards)}"
        print("Initial render: PASSED (2 cards)")

        # Test searching
        await page.fill('#searchInput', 'Organic')
        await page.wait_for_timeout(1000) # wait for debounce/render

        cards_after_search = await page.locator('.pdf-card').all()
        assert len(cards_after_search) == 1, f"Expected 1 card after search, got {len(cards_after_search)}"

        text = await cards_after_search[0].inner_text()
        assert 'Alcohols' in text, "The wrong card was filtered"
        print("Search filtering: PASSED")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
