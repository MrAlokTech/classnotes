## 2026-04-06 - Pre-calculate expensive properties before render loop
**Learning:** Instantiating `Date` objects and performing string `.toLowerCase()` conversions on multiple fields inside a high-frequency render/filter loop (like `renderPDFs` and `createPDFCard`) causes unnecessary overhead and slows down UI interactions (e.g. typing in search).
**Action:** Always pre-calculate and cache derived properties (`_searchStr`, `_formattedDate`, `_isNew`) onto the data objects immediately after fetching data or during initial load (`prepareSearchIndex`).
