import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # We will directly read the script and evaluate it to avoid loading dependencies or the full HTML
        with open('script.js', 'r') as f:
            script_content = f.read()

        await page.set_content("""
            <html>
                <body>
                    <input id="searchInput" type="text" />
                    <div id="pdfGrid"></div>
                    <div id="pdfCount"></div>
                    <div id="emptyState" style="display:none"></div>
                </body>
            </html>
        """)

        # We define only the parts we need
        await page.evaluate("""
            window.pdfDatabase = [];
            window.currentClass = 'MSc Chemistry';
            window.currentSemester = 1;
            window.currentCategory = 'all';
            window.pdfCount = document.getElementById('pdfCount');
            window.pdfGrid = document.getElementById('pdfGrid');
            window.emptyState = document.getElementById('emptyState');
            window.searchInput = document.getElementById('searchInput');
            window.searchTimeout = null;
            window.GAS_URL = '';

            window.getFavorites = () => [];
            window.updatePDFCount = (c) => window.pdfCount.textContent = c;
            window.logInteraction = () => {};
            window.escapeHtml = (text) => text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : '';
        """)

        # Evaluate script.js logic (only the needed functions)
        await page.evaluate("""
            window.prepareSearchIndex = function(data) {
                const dateFormatter = new Intl.DateTimeFormat('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const now = new Date().getTime();
                const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

                for (let i = 0; i < data.length; i++) {
                    const pdf = data[i];

                    pdf._searchStr = (
                        (pdf.title || '') + ' ' +
                        (pdf.description || '') + ' ' +
                        (pdf.category || '') + ' ' +
                        (pdf.author || '')
                    ).toLowerCase();

                    const uploadDateObj = new Date(pdf.uploadDate);
                    if (!isNaN(uploadDateObj)) {
                        pdf._formattedDate = dateFormatter.format(uploadDateObj);
                        pdf._isNew = (now - uploadDateObj.getTime()) < SEVEN_DAYS;
                    } else {
                        pdf._formattedDate = 'Unknown Date';
                        pdf._isNew = false;
                    }
                }
            };

            window.createPDFCard = function(pdf, favoritesList, index = 0, highlightRegex = null) {
                const favorites = favoritesList || window.getFavorites();
                const isFav = favorites.includes(pdf.id);
                const heartIconClass = isFav ? 'fas' : 'far';
                const btnActiveClass = isFav ? 'active' : '';

                let isNew = pdf._isNew;
                let formattedDate = pdf._formattedDate;

                if (isNew === undefined || !formattedDate) {
                    const uploadDateObj = new Date(pdf.uploadDate);
                    if (!isNaN(uploadDateObj)) {
                        const timeDiff = new Date() - uploadDateObj;
                        isNew = timeDiff < (7 * 24 * 60 * 60 * 1000);
                        formattedDate = uploadDateObj.toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                        });
                    } else {
                        isNew = false;
                        formattedDate = 'Unknown Date';
                    }
                }

                const newBadgeHTML = isNew
                    ? `<span style="background:var(--error-color); color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle;">NEW</span>`
                    : '';

                const highlightText = (text) => {
                    const safeText = window.escapeHtml(text);
                    if (!highlightRegex) return safeText;
                    return safeText.replace(highlightRegex, '<span class="highlight">$1</span>');
                };

                return `
                    <div class="pdf-card" data-category="${pdf.category}">
                        <div class="pdf-header">
                            <div class="pdf-info"><h3>${highlightText(pdf.title)} ${newBadgeHTML}</h3></div>
                        </div>
                        <div class="pdf-meta">
                            <div class="pdf-date">${formattedDate}</div>
                        </div>
                    </div>
                `;
            };

            window.renderPDFs = function() {
                const searchTerm = searchInput.value.toLowerCase();
                const favorites = getFavorites();
                const rawSearchTerm = searchInput.value.trim();
                let highlightRegex = null;

                const filteredPdfs = pdfDatabase.filter(pdf => {
                    if (pdf.semester !== currentSemester) return false;
                    if (pdf.class !== currentClass) return false;

                    if (currentCategory === 'favorites') {
                        if (!favorites.includes(pdf.id)) return false;
                    } else if (currentCategory !== 'all' && pdf.category !== currentCategory) {
                        return false;
                    }

                    if (searchTerm) {
                        if (!pdf._searchStr) return false;
                        if (!pdf._searchStr.includes(searchTerm)) return false;
                    }

                    return true;
                });

                updatePDFCount(filteredPdfs.length);

                if (filteredPdfs.length === 0) {
                    pdfGrid.style.display = 'none';
                    emptyState.style.display = 'block';
                    return;
                }

                pdfGrid.style.display = 'grid';
                emptyState.style.display = 'none';

                let gridHTML = "";
                filteredPdfs.forEach((pdf, index) => {
                    gridHTML += createPDFCard(pdf, favorites, index, highlightRegex);
                });

                pdfGrid.innerHTML = gridHTML;
            };
        """)

        # Test 1: Basic Rendering
        await page.evaluate("""
            window.pdfDatabase = [
                { id: '1', title: 'Organic Chemistry Notes', class: 'MSc Chemistry', semester: 1, category: 'Organic', uploadDate: '2023-01-01', description: 'Notes on organic chemistry', author: 'Dr. Smith' },
                { id: '2', title: 'Inorganic Chemistry Notes', class: 'MSc Chemistry', semester: 1, category: 'Inorganic', uploadDate: '2023-01-02', description: 'Notes on inorganic chemistry', author: 'Dr. Jones' }
            ];
            window.prepareSearchIndex(window.pdfDatabase);
            window.renderPDFs();
        """)

        pdf_count = await page.evaluate("document.querySelectorAll('.pdf-card').length")
        print(f"Initial PDF count: {pdf_count}")

        # Test 2: Search Rendering
        await page.fill('#searchInput', 'organic')
        await page.evaluate("window.renderPDFs()")

        pdf_count_search = await page.evaluate("document.querySelectorAll('.pdf-card').length")
        print(f"PDF count after search 'organic': {pdf_count_search}")

        indexed_item = await page.evaluate("pdfDatabase[0]._searchStr")
        print(f"Indexed item search string: {indexed_item}")

        is_new_calculated = await page.evaluate("pdfDatabase[0]._isNew !== undefined")
        print(f"Is new calculated: {is_new_calculated}")

        formatted_date_calculated = await page.evaluate("pdfDatabase[0]._formattedDate !== undefined")
        print(f"Formatted date calculated: {formatted_date_calculated}")

        await browser.close()

asyncio.run(main())
