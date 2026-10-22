---
"tonnage": minor
---

Make tonnage a Galley component package: import Tonnage from tonnage and use galley write/check to generate and validate README files from MDX. Remove the tonnage executable and shell completion, tonnage/galley subpath, marker-based README editing, marker/readme config fields, and standalone measurement, report, and rendering exports. Keep defineConfig and component configuration types; migrate existing README content to README.mdx and replace generated-section markers with a Tonnage component.
