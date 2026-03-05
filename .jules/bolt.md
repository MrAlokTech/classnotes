## 2024-05-24 - Avoid Object Serialization in DOM Attributes
**Learning:** During list rendering (`createPDFCard`), executing `JSON.stringify(object).replace(...)` to pass an entire object to an `onclick` inline handler creates massive performance overhead. Not only is serialization expensive, but it also generates huge string sizes in the DOM resulting in increased memory use.
**Action:** Instead of inline full-object serialization, pass a simple unique ID (`data-id="123"`) and rely on the event handler (`viewPDF(id)`) to look up the object reference in the data store (`pdfDatabase`).
