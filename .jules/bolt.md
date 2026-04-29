## 2024-05-18 - [Optimized render loop strings and dates]
**Learning:** Instantiating `Intl.DateTimeFormat` and parsing dates in `createPDFCard` on every render creates massive JS heap overhead on large sets, blocking typing and scrolling.
**Action:** Created `prepareSearchIndex(data)` that runs exactly once when `pdfDatabase` is populated, assigning private variables `_searchStr`, `_isNew`, and `_formattedDate`. `renderPDFs` now falls back to standard rendering only if properties don't exist.
