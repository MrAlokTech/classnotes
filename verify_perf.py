import asyncio
from playwright.async_api import async_playwright
import time
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Mock Firebase to prevent network requests and overwrite local cache
        await page.route("**/*firebase*", lambda route: route.abort())
        await page.route("**/*googleapis*", lambda route: route.abort())
        await page.route("**/*gstatic*", lambda route: route.abort())

        # Seed local storage with mock data
        mock_data = {
            "timestamp": int(time.time() * 1000),
            "data": [
                {
                    "id": "1",
                    "title": "Organic Chemistry Notes",
                    "description": "Notes for organic chemistry.",
                    "category": "Organic",
                    "author": "Alice",
                    "class": "MSc Chemistry",
                    "semester": 1,
                    "uploadDate": "2023-10-01T00:00:00.000Z"
                },
                {
                    "id": "2",
                    "title": "Inorganic Chemistry Notes",
                    "description": "Notes for inorganic chemistry.",
                    "category": "Inorganic",
                    "author": "Bob",
                    "class": "MSc Chemistry",
                    "semester": 1,
                    "uploadDate": "2023-10-02T00:00:00.000Z"
                },
                {
                     "id": "3",
                     "title": "Physics Notes",
                     "description": "Basic physics.",
                     "category": "Physics",
                     "author": "Charlie",
                     "class": "BSc Physics",
                     "semester": 2,
                     "uploadDate": "2023-10-03T00:00:00.000Z"
                }
            ]
        }

        # Navigate to a blank page on the same origin first to set localStorage
        await page.goto("http://localhost:8000/", wait_until="domcontentloaded")

        await page.evaluate(f"localStorage.setItem('classnotes_db_cache', '{json.dumps(mock_data)}');")
        await page.evaluate("localStorage.setItem('currentClass', 'MSc Chemistry');")
        await page.evaluate("localStorage.setItem('currentSemester', '1');")

        # Mock snapshot empty check (simulate cache use)
        # Because we abort firebase requests, window.firebase is undefined, and the app waits.
        # So we evaluate window.firebase mock so that app can proceed.
        await page.evaluate("""
            window.firebase = {
                apps: [{name: 'mock'}],
                initializeApp: function() {},
                auth: function() { return { onAuthStateChanged: function(cb) { cb({uid: '123'}); }, signInAnonymously: function() { return Promise.resolve({user: {uid: '123'}}); } } },
                firestore: function() {
                    return {
                        collection: function(c) {
                            return {
                                doc: function(d) {
                                    return {
                                        set: function() {},
                                        onSnapshot: function(cb, errCb) { errCb('mock error'); }
                                    };
                                },
                                orderBy: function() {
                                    return {
                                        limit: function() {
                                            return {
                                                get: function() {
                                                    return Promise.resolve({ empty: false, docs: [{id: '1'}] });
                                                }
                                            }
                                        },
                                        get: function() {
                                            return Promise.resolve({
                                                forEach: function(cb) {}
                                            });
                                        }
                                    }
                                }
                            };
                        }
                    };
                }
            };
            window.firebase.firestore.FieldValue = {
                serverTimestamp: function() { return new Date(); },
                increment: function(v) { return v; }
            };
        """)

        # Reload to let app load from cache
        await page.reload(wait_until="domcontentloaded")

        # Inject the mock again immediately
        await page.evaluate("""
            window.firebase = {
                apps: [{name: 'mock'}],
                initializeApp: function() {},
                auth: function() { return { onAuthStateChanged: function(cb) { cb({uid: '123'}); }, signInAnonymously: function() { return Promise.resolve({user: {uid: '123'}}); } } },
                firestore: function() {
                    return {
                        collection: function(c) {
                            return {
                                doc: function(d) {
                                    return {
                                        set: function() {},
                                        onSnapshot: function(cb, errCb) { errCb('mock error'); }
                                    };
                                },
                                orderBy: function() {
                                    return {
                                        limit: function() {
                                            return {
                                                get: function() {
                                                    return Promise.resolve({ empty: false, docs: [{id: '1'}] });
                                                }
                                            }
                                        },
                                        get: function() {
                                            return Promise.resolve({
                                                forEach: function(cb) {}
                                            });
                                        }
                                    }
                                }
                            };
                        }
                    };
                }
            };
            window.firebase.firestore.FieldValue = {
                serverTimestamp: function() { return new Date(); },
                increment: function(v) { return v; }
            };
        """)

        # Wait for the app to initialize
        await page.wait_for_timeout(2000)

        # Hide full screen overlays
        await page.evaluate("document.getElementById('preloader')?.classList.add('hidden');")
        await page.evaluate("document.getElementById('holidayOverlay')?.classList.add('hidden');")
        await page.evaluate("document.getElementById('contentWrapper')?.classList.add('active');")

        # Wait a bit for DOM updates
        await page.wait_for_timeout(500)

        # Let's inspect what is in pdfDatabase
        pdf_count_db = await page.evaluate("pdfDatabase.length")
        print(f"pdfDatabase length: {pdf_count_db}")

        # Verify initial rendering (MSc Chemistry, Semester 1)
        pdf_count = await page.evaluate("document.querySelectorAll('.pdf-card').length")
        print(f"Initial PDF count: {pdf_count} (expected 2)")

        # Verify prepareSearchIndex populated _searchStr
        if pdf_count_db > 0:
            search_str_exists = await page.evaluate("pdfDatabase[0]._searchStr !== undefined")
            print(f"_searchStr calculated: {search_str_exists} (expected True)")

        # Test Search (should match Organic Chemistry)
        await page.fill("#searchInput", "organic")
        # trigger input event
        await page.evaluate("document.getElementById('searchInput').dispatchEvent(new Event('input'))")
        await page.wait_for_timeout(500)
        pdf_count_search = await page.evaluate("document.querySelectorAll('.pdf-card').length")
        print(f"PDF count after search 'organic': {pdf_count_search} (expected 1)")

        # Test filter mismatch
        await page.fill("#searchInput", "notfoundxyz")
        await page.evaluate("document.getElementById('searchInput').dispatchEvent(new Event('input'))")
        await page.wait_for_timeout(500)
        pdf_count_search = await page.evaluate("document.querySelectorAll('.pdf-card').length")
        print(f"PDF count after search 'notfoundxyz': {pdf_count_search} (expected 0)")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())