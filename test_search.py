import asyncio
from playwright.async_api import async_playwright
import http.server
import socketserver
import threading
import time

# Serve the current directory
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

PORT = 8004

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1) # wait for server to start

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        await page.route("**/*", lambda route: route.abort() if any(x in route.request.url for x in ["firebasejs", "firestore.googleapis.com", "gstatic.com"]) else route.continue_())

        await page.add_init_script("""
            const style = document.createElement('style');
            style.innerHTML = '* { font-family: sans-serif !important; }';
            document.head.appendChild(style);

            window.firebase = {
                apps: [],
                initializeApp: () => {},
                auth: () => ({
                    onAuthStateChanged: (cb) => { cb({ uid: 'mock_uid', isAnonymous: false }); },
                    signInAnonymously: () => Promise.resolve({ user: { uid: 'mock_uid' } })
                }),
                firestore: () => ({
                    collection: (name) => {
                        if (name === 'controll') {
                            return {
                                doc: () => ({
                                    onSnapshot: (cb) => { cb({ exists: true, data: () => ({ isMaintenance: false }) }); }
                                })
                            }
                        }
                        if (name === 'analytics') {
                            return {
                                doc: () => ({
                                    set: () => Promise.resolve(),
                                    collection: () => ({ doc: () => ({ set: () => Promise.resolve() }), add: () => Promise.resolve() })
                                })
                            }
                        }
                        return {
                            doc: () => ({
                                get: () => Promise.resolve({ exists: true, data: () => ({ isVerified: true }) }),
                                set: () => Promise.resolve()
                            }),
                            orderBy: () => ({
                                limit: () => ({
                                    get: () => Promise.resolve({ empty: true }) // force fresh fetch
                                }),
                                get: () => Promise.resolve({
                                    forEach: (cb) => {
                                        cb({ id: 'doc1', data: () => ({
                                            title: "Quantum Mechanics",
                                            description: "Advanced physics notes",
                                            category: "Physics",
                                            author: "Einstein",
                                            class: "MSc Chemistry",
                                            semester: 1,
                                            uploadDate: new Date().toISOString()
                                        })});
                                        cb({ id: 'doc2', data: () => ({
                                            title: "Organic Synthesis",
                                            description: "Carbon compounds",
                                            category: "Organic",
                                            author: "Curie",
                                            class: "MSc Chemistry",
                                            semester: 1,
                                            uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
                                        })});
                                        cb({ id: 'doc3', data: () => ({
                                            title: "Quantum Chemistry",
                                            description: "Where chem meets physics",
                                            category: "Physical",
                                            author: "Bohr",
                                            class: "MSc Chemistry",
                                            semester: 1,
                                            uploadDate: new Date().toISOString()
                                        })});
                                    }
                                })
                            })
                        }
                    }
                })
            };
            window.firebase.firestore.FieldValue = {
                serverTimestamp: () => new Date()
            };

            window.checkHolidayMode = () => false;
        """)

        await page.goto("http://localhost:8004", wait_until="domcontentloaded")

        # Manually force UI initialization and clear localStorage to ensure fresh fetch
        await page.evaluate("""
            localStorage.clear();
            setTimeout(() => {
                document.getElementById('preloader')?.classList.add('hidden');
                document.getElementById('contentWrapper')?.classList.add('active');
            }, 500);
        """)

        try:
            await page.wait_for_selector(".pdf-card", timeout=5000)

            # Initial render should have 3 cards
            cards = await page.locator(".pdf-card").count()
            print(f"Initial cards count: {cards}")

            if cards > 0:
                # Check "NEW" badge on first card (should be new)
                new_badge_doc1 = await page.locator(".pdf-card").nth(0).locator("span:has-text('NEW')").count()
                print(f"Doc 1 NEW badge count: {new_badge_doc1}")

                # Check "NEW" badge on second card (should NOT be new)
                new_badge_doc2 = await page.locator(".pdf-card").nth(1).locator("span:has-text('NEW')").count()
                print(f"Doc 2 NEW badge count: {new_badge_doc2}")

            # Search for "quantum"
            await page.fill("#searchInput", "quantum")
            await page.wait_for_timeout(1000) # give it a moment to filter

            # Should filter to 2 cards
            cards_after_search = await page.locator(".pdf-card").count()
            print(f"Cards after search 'quantum': {cards_after_search}")

            # Search for "einstein" (author)
            await page.fill("#searchInput", "einstein")
            await page.wait_for_timeout(1000)

            # Should filter to 1 card
            cards_after_search_author = await page.locator(".pdf-card").count()
            print(f"Cards after search 'einstein': {cards_after_search_author}")

        except Exception as e:
            print("Error rendering UI.")

        finally:
            await browser.close()

asyncio.run(main())
