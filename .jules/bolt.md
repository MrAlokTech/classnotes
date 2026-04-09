## 2024-11-23 - [Pre-calculate derived properties for render loops]
**Learning:** Instantiating `Date` objects repeatedly inside a render or filter loop for large lists causes measurable UI slowdowns. Calculating derived search properties (e.g., lowercased text) during initial data load avoids per-render recalculations.
**Action:** Always pre-calculate and store formatted date properties and search strings on the data objects during initial load. Use explicit early returns (`if (!condition) return false;`) instead of grouped boolean expressions for optimal list filtering performance.
