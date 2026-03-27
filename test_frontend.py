import asyncio
from playwright.async_api import async_playwright
import time
import subprocess

async def run():
    # Start the HTTP server
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8000"])

    # Wait for the server to start
    time.sleep(2)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # Go to the local server
            await page.goto("http://localhost:8000")
            print("Page loaded successfully.")

            # Wait for any critical content to load, ensuring it runs
            await page.wait_for_timeout(3000)

            # Check if pdf grid exists
            pdf_grid = await page.query_selector("#pdfGrid")
            if pdf_grid:
                print("PDF grid found.")
            else:
                print("Error: PDF grid not found.")

            # Perform a search
            search_input = await page.query_selector("#searchInput")
            if search_input:
                await search_input.fill("physics")
                await page.wait_for_timeout(1000)  # Wait for debounce and rendering
                print("Search input filled and processed.")
            else:
                print("Error: Search input not found.")

        except Exception as e:
            print(f"Test failed: {e}")

        finally:
            await browser.close()
            # Terminate the server
            server_process.terminate()

asyncio.run(run())
