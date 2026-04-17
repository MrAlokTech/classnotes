
## 2024-11-20 - [Pre-calculating List Processing Properties]
**Learning:** Pre-calculating derived properties (search strings, date formatting) on objects *once* during initial fetch significantly speeds up high-frequency filter and render loops (like `renderPDFs`), reducing per-iteration overhead.
**Action:** Always pre-calculate complex derived data structures if they will be repeatedly used in tight loops, but remember to add a fallback mechanism in render functions to handle unindexed or legacy cached data gracefully.
