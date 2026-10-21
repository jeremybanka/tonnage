---
"tonnage": minor
---

Render reports through galley.md 0.1.1 native table elements and expose a Tonnage component from tonnage/galley for MDX documents. Galley is now a runtime dependency, renderTonnageMarkdown returns a Promise and must be awaited, and inline code and table text use Galley's Markdown escaping and column alignment.
