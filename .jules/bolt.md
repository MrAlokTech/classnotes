
## 2024-03-08 - PDF Search & Rendering Performance
**Learning:** The `renderPDFs` filter loop was running `toLowerCase()` on multiple fields for every PDF, every keystroke, and constructing new `Date` objects in `createPDFCard` during DOM generation. This caused significant lag during searching and initial rendering, especially as the database grows.
**Action:** Implement a `prepareSearchIndex` pass immediately after `loadPDFDatabase` to pre-calculate `_searchStr` and `_formattedDate` once. This eliminates string allocations in the hot search loop and date formatting during DOM rendering.
