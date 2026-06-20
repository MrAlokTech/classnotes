## 2025-04-27 - [Pre-calculate derived properties for list rendering]
**Learning:** Instantiating `Date` objects repeatedly inside a render or filter loop for large lists causes massive UI slowdowns. Calculating string concatenations and multiple `.toLowerCase()` calls for search fields per item per keypress exacerbates this issue.
**Action:** Always pre-calculate and store formatted date properties and search strings directly on the data objects during initial load, ensuring that expensive loops operate on pre-computed values, leading to O(1) attribute access per cycle.
