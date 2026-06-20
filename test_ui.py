import asyncio
from playwright.async_api import async_playwright
import urllib.request
from urllib.error import URLError

async def main():
    # Start a simple HTTP server in the background
    import subprocess
    import time

    # Kill any existing server
    subprocess.run("kill $(lsof -t -i :8081) 2>/dev/null || true", shell=True)

    server = subprocess.Popen(["python3", "-m", "http.server", "8081"])

    # Wait for server to start
    for _ in range(30):
        try:
            urllib.request.urlopen("http://localhost:8081")
            break
        except URLError:
            time.sleep(0.1)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Setup network interception to block Firebase/Fonts and inject mock data
            await page.route("**/*", lambda route:
                route.abort() if any(domain in route.request.url for domain in [
                    "firebase", "firestore", "googleapis", "gstatic", "google-analytics"
                ]) else route.continue_()
            )

            # Navigate to the page
            await page.goto("http://localhost:8081")

            # Inject mock data and remove preloader
            await page.evaluate("""
                window.firebase = {
                    apps: [{name: '[DEFAULT]'}],
                    initializeApp: () => {},
                    auth: () => ({
                        onAuthStateChanged: (cb) => { cb({ uid: 'mock-user-123', isAnonymous: false }); }
                    }),
                    firestore: () => ({
                        collection: (name) => ({
                            doc: () => ({
                                onSnapshot: () => {},
                                set: async () => {},
                                get: async () => ({ exists: false, data: () => ({}) })
                            }),
                            where: () => ({
                                orderBy: () => ({
                                    get: async () => ({ empty: true, docs: [], forEach: () => {} })
                                })
                            }),
                            orderBy: () => ({
                                limit: () => ({
                                    get: async () => ({ empty: true, docs: [] })
                                }),
                                get: async () => ({
                                    empty: false,
                                    docs: [
                                        { id: '1', data: () => ({ title: 'Organic Chem', description: 'desc', category: 'Organic', author: 'Dr. Smith', semester: 1, class: 'MSc Chemistry', uploadDate: new Date().toISOString() }) },
                                        { id: '2', data: () => ({ title: 'Inorganic Chem', description: 'desc', category: 'Inorganic', author: 'Dr. Jones', semester: 1, class: 'MSc Chemistry', uploadDate: new Date(Date.now() - 10*24*60*60*1000).toISOString() }) },
                                        { id: '3', data: () => ({ title: 'Physical Chem', description: 'desc', category: 'Physical', author: 'Dr. Brown', semester: 1, class: 'MSc Chemistry', uploadDate: new Date().toISOString() }) }
                                    ],
                                    forEach: function(cb) { this.docs.forEach(cb) }
                                })
                            })
                        })
                    })
                };
                // Mock FieldValue
                window.firebase.firestore.FieldValue = {
                    serverTimestamp: () => new Date(),
                    increment: () => {}
                };

                // Clear cache so it fetches fresh mock data
                localStorage.removeItem('classnotes_db_cache');
                localStorage.setItem('currentClass', 'MSc Chemistry');
                localStorage.setItem('currentSemester', '1');
            """)

            # We must trigger DOMContentLoaded logic manually since we blocked the real firebase
            await page.evaluate("""
                // Manually trigger initialization if it got stuck
                if (!window.pdfDatabase || window.pdfDatabase.length === 0) {
                    loadPDFDatabase();
                }
            """)

            await page.wait_for_timeout(1000)

            # Hide preloader and overlays manually for clean screenshot
            await page.evaluate("""
                document.getElementById('preloader').classList.add('hidden');
                document.getElementById('contentWrapper').classList.add('active');
                if(document.getElementById('holidayOverlay')) {
                    document.getElementById('holidayOverlay').classList.add('hidden');
                }
                document.body.style.overflow = 'auto';
            """)

            await page.wait_for_timeout(500)

            # Test that filtering to 'organic' worked in the frontend
            await page.fill("#searchInput", "Organic")
            await page.wait_for_timeout(500)

            visible_cards = await page.evaluate("document.querySelectorAll('.pdf-card').length")
            print(f"Visible cards after search 'Organic': {visible_cards}")

            await browser.close()
    finally:
        server.terminate()

if __name__ == "__main__":
    asyncio.run(main())
