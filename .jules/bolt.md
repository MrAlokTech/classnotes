
## 2024-04-13 - [Pre-calculating derived search strings and date formatting]
**Learning:** High-frequency loop performance in lists like `renderPDFs` can degrade severely when performing string concatenations (`pdf.title + pdf.description + ...`), `toLowerCase()` conversions, or `Intl.DateTimeFormat` evaluations dynamically for every item during every render.
**Action:** Always pre-calculate these derived properties (e.g., `_searchStr`, `_formattedDate`, `_isNew`) iteratively immediately after the data completes loading, keeping the render loop extremely lightweight and purely responsible for DOM updates.
