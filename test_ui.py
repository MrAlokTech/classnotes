import asyncio
from playwright.async_api import async_playwright
import time
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Mock Firebase to prevent network requests and errors
        await page.route("**/*firebase*", lambda route: route.abort())
        await page.route("**/*google*", lambda route: route.abort())

        # Load the page first to allow us to interact with the DOM
        await page.goto("http://localhost:8000/", wait_until="domcontentloaded")

        # Mock Data for LocalStorage
        mock_data = {
            "timestamp": int(time.time() * 1000),
            "data": [
                {
                    "id": "pdf1",
                    "title": "Organic Chemistry Fundamentals",
                    "description": "Introduction to organic chemistry, alkanes, and alkenes.",
                    "category": "Organic",
                    "author": "Dr. Smith",
                    "semester": 1,
                    "class": "MSc Chemistry",
                    "uploadDate": "2023-10-01T12:00:00Z"
                },
                {
                    "id": "pdf2",
                    "title": "Quantum Mechanics Physics",
                    "description": "Schrodinger equation and wave functions.",
                    "category": "Physical",
                    "author": "Dr. Einstein",
                    "semester": 1,
                    "class": "MSc Chemistry",
                    "uploadDate": "2023-10-05T12:00:00Z"
                },
                 {
                    "id": "pdf3",
                    "title": "Inorganic Reactions",
                    "description": "Transition metals and coordination compounds.",
                    "category": "Inorganic",
                    "author": "Dr. Marie",
                    "semester": 1,
                    "class": "MSc Chemistry",
                    "uploadDate": "2023-10-10T12:00:00Z"
                }
            ]
        }

        # Inject our mock data into localStorage
        await page.evaluate(f"""
            localStorage.setItem('classnotes_db_cache', JSON.stringify({json.dumps(mock_data)}));
            localStorage.setItem('currentClass', 'MSc Chemistry');
            localStorage.setItem('currentSemester', '1');
        """)

        # We need to reload to trigger the application's initialization with the mocked localStorage
        await page.goto("http://localhost:8000/", wait_until="domcontentloaded")

        # Hide overlays that might block interactions
        await page.evaluate("""
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.classList.add('hidden');
            const holiday = document.getElementById('holidayOverlay');
            if (holiday) holiday.classList.add('hidden');
            const content = document.getElementById('contentWrapper');
            if (content) content.classList.add('active');

            // Bypass fetch and maintenance check, directly load mock data
            pdfDatabase = JSON.parse(localStorage.getItem('classnotes_db_cache')).data;
            prepareSearchIndex(pdfDatabase);
            syncClassSwitcher();
            renderSemesterTabs();
            renderCategoryFilters();
            renderPDFs();
        """)

        # Wait for the grid to populate with the 3 initial items
        await page.wait_for_selector(".pdf-card", state="visible", timeout=5000)
        cards = await page.locator(".pdf-card").count()
        print(f"Initial cards loaded: {cards}")
        assert cards == 3, f"Expected 3 cards initially, got {cards}"

        # Type into the search input to trigger filtering
        search_input = page.locator("#searchInput")
        await search_input.fill("quantum")

        # Wait for debounce and re-render
        # Manually trigger the renderPDFs event
        await page.evaluate("renderPDFs();")
        await page.wait_for_timeout(500)

        filtered_cards = await page.locator(".pdf-card:visible").count()
        print(f"Cards after search 'quantum': {filtered_cards}")
        assert filtered_cards == 1, f"Expected 1 card after search, got {filtered_cards}"

        # Check text in the remaining card
        title_text = await page.locator(".pdf-card:visible .pdf-info h3").inner_text()
        assert "Quantum Mechanics Physics" in title_text, f"Unexpected title text: {title_text}"

        print("Playwright test passed successfully.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
