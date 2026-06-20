## 2024-05-18 - [Optimize List Filtering and Card Rendering]
**Learning:** Instantiating `Date` objects and concatenating strings inside a filter/render loop for large datasets creates significant CPU overhead and garbage collection pauses.
**Action:** Always pre-index derived strings (like lowercased text for search) and pre-calculate expensive derivations like `Intl.DateTimeFormat` into the initial data loading pipeline (`prepareSearchIndex`) rather than calculating them inline in high-frequency rendering functions.
