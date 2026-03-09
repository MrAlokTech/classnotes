
## 2025-02-17 - Pre-calculating Expensive Runtime Properties for Render Loops
**Learning:** Instantiating `new Date()`, date arithmetic, and multiple `toLowerCase()` string concatenations inside a hot loop (`renderPDFs` filter and `createPDFCard` mapping) creates a significant CPU bottleneck on the main thread, especially as the size of `pdfDatabase` grows.
**Action:** Move all static and predictable calculations (search string indexing, date formatting, and boolean states like `_isNew`) to an initialization step (`prepareSearchIndex`) executed exactly once per document during data loading. The render loop can then fast-path using cheap boolean/string property lookups.
