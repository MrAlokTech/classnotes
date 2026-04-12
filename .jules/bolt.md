## 2023-10-27 - Date Instantiation in Hot Paths
**Learning:** Instantiating `new Date(item.uploadDate)` repeatedly inside high-frequency render loops (like `createPDFCard`) or filter loops causes measurable CPU overhead and UI slowdowns (~200x slower in benchmarks).
**Action:** Always pre-calculate and store formatted date properties and relative date flags (like `_isNew`) on the raw data objects during the initial database fetch or cache load using a helper like `prepareSearchIndex`. Ensure you validate the parsed date to handle malformed historical records (e.g., `!isNaN(timestamp)`).
