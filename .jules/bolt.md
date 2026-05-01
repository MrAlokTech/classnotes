
## 2025-02-18 - [Optimizing List Filtering]
**Learning:** Pre-calculating derived search strings and dates immediately after data load and explicitly indexing it dramatically improves performance during list filtering compared to recalculating on the fly. Doing inline calculations or object cloning on large array iterations is costly.
**Action:** When filtering or looping over large datasets frequently, proactively calculate common string concatenation or boolean derivation into the object beforehand.
