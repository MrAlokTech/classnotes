## 2025-05-18 - [Pre-calculating derived properties]
**Learning:** Moving date parsing, string concatenation, and lowercasing out of the render loop (which runs on every keystroke) into a one-time data load step significantly reduces CPU overhead and avoids unnecessary garbage collection during search filtering.
**Action:** Use a `prepareSearchIndex` function to map over incoming data to add runtime properties like `_searchStr`, `_formattedDate`, and `_isNew`.
