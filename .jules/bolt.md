## 2024-04-21 - [Pre-calculate derived search and date properties]
**Learning:** Instantiating `Date` objects repeatedly inside a render or filter loop for large lists causes measurable UI slowdowns. Calculating lowercase search strings for each field of every PDF on each keystroke or filter change is also expensive and redundant.
**Action:** Always pre-calculate and store such formatted date properties and search strings on the data objects during initial load to achieve a measurable speedup. Keep derived properties out of cache to prevent bloating.
