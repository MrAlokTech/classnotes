## 2024-03-26 - [Search and Render Performance Optimization]
**Learning:** In a vanilla JS SPA that lacks a virtual DOM, running heavy string concatenations (e.g. for search index preparation) and new `Date` object initializations for every item during every keystroke causes significant rendering stutter.
**Action:** Move derived data calculations to an initialization phase (`prepareSearchIndex`) but ensure they are attached to the data *after* `localStorage` persistence. Bloating `localStorage` with runtime derivatives can cause QuotaExceeded errors, so in-memory only is best.
