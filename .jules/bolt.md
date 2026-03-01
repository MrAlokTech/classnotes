## 2025-02-14 - Redundant Synchronous localStorage Reads in Render Loop
**Learning:** Calling `localStorage.getItem` and `JSON.parse` inside high-frequency render loops (like `renderPDFs` triggered on input events) causes unnecessary synchronous I/O and garbage collection overhead, bottlenecking the main thread.
**Action:** Cache the results of expensive operations (like `localStorage` reads) in a memory variable (e.g., `favoritesCache`) and manually synchronize the cache when updates occur, completely skipping disk reads on subsequent renders.
