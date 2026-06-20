## 2024-05-24 - [List Rendering Optimization]
**Learning:** Pre-calculating derived properties `_searchStr`, `_formattedDate` and `_isNew` and using `Intl.DateTimeFormat` on load is way faster than inline computations during frequent filtering and rendering loop for large list. Early return with simplified conditionals in filters also leads to considerable speed up.
**Action:** Always pre-calculate derived search properties for list and add them directly into the object immediately after data fetches.
