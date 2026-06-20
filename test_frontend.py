from playwright.sync_api import sync_playwright

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Setup mock data for Playwright
        page.route("**/*", lambda route: route.continue_())

        page.goto("http://localhost:8000")

        # Wait for the page to load
        page.wait_for_timeout(2000)

        # Verify the application title to check it's loaded
        assert "ClassNotes" in page.title()
        print("Frontend loaded successfully!")

        browser.close()

if __name__ == "__main__":
    test_frontend()
