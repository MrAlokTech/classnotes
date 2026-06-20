## 2024-05-19 - Adding _searchStr derived field
**Learning:** We need to add `_searchStr` for performance so `renderPDFs` doesn't do multiple `toLowerCase` conversions for each record per keystroke.
**Action:** Add `prepareSearchIndex` and calculate runtime derived fields.
