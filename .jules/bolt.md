
## 2026-03-04 - [Caching localStorage for High-Frequency Loops]
**Learning:** Found a performance bottleneck where `localStorage.getItem` and `JSON.parse()` were being called synchronously inside `getFavorites()`, which was executed on every keystroke during `renderPDFs` search filtering.
**Action:** Always cache expensive synchronous operations (like `localStorage` parsing) in a variable when they are accessed in high-frequency rendering or filtering loops. Ensure state updating functions like `toggleFavorite` update both the cache and persistent storage.
