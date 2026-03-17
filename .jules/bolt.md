## 2024-05-17 - [Optimizing Render Loop]
**Learning:** Moving string concatenation and object creations (like `Date`) out of the loop and precalculating derived fields into object properties avoids overhead per render.
**Action:** Use precalculated properties during data fetches.
