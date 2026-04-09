from playwright.sync_api import sync_playwright
import time

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Block external resources that might timeout
        page.route("**/*", lambda route: route.abort() if route.request.url.startswith("https://firestore.googleapis.com") or route.request.url.startswith("https://www.gstatic.com") else route.continue_())

        page.goto("http://localhost:8000")

        # We expect it to load, possibly failing to fetch firebase but syntax should be fine
        time.sleep(2)

        # Check if basic elements are present
        assert page.locator("#searchInput").is_visible(), "Search input should be visible"

        print("Frontend test passed!")
        browser.close()

if __name__ == "__main__":
    test_frontend()
