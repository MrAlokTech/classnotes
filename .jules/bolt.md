## 2024-04-14 - Pre-calculate derived search fields for filter loops
**Learning:** High-frequency render/filter loops can be severely bottlenecked by inline string and date manipulation functions (like `.toLowerCase()` and `new Date().toLocaleDateString()`).
**Action:** Always pre-calculate and index derived properties (like search strings and formatted dates) immediately after data load and attach them to the objects, reducing the cost of per-render calculations and significantly improving list rendering/filtering performance.
