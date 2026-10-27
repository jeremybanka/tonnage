# tonnage

## 0.5.0

### Minor Changes

- 8046bb1: Require Galley 0.3 and use its explicit Markdown nodes and Markdown.Table API to preserve report headings, links, escaping, and aligned pipe tables; Galley 0.1 and 0.2 are no longer supported.

## 0.4.0

### Minor Changes

- fffad43: Make tonnage a Galley component package: import Tonnage from tonnage and use galley write/check to generate and validate README files from MDX. Remove the tonnage executable and shell completion, tonnage/galley subpath, marker-based README editing, marker/readme config fields, and standalone measurement, report, and rendering exports. Keep defineConfig and component configuration types; migrate existing README content to README.mdx and replace generated-section markers with a Tonnage component.

## 0.3.0

### Minor Changes

- 02567f0: Make galley.md ^0.1.1 a required peer dependency so consumers control the Galley version used by report rendering and MDX components. Install a compatible galley.md version alongside tonnage, including for standalone CLI use.

## 0.2.0

### Minor Changes

- 0521e43: Render reports through galley.md 0.1.1 native table elements and expose a Tonnage component from tonnage/galley for MDX documents. Galley is now a runtime dependency, renderTonnageMarkdown returns a Promise and must be awaited, and inline code and table text use Galley's Markdown escaping and column alignment.

## 0.1.3

### Patch Changes

- 9866ade: Upgrade comline, pass full runtime argv, add command and config-path completion with shell installation commands, and report ignored-option warnings on stderr while preserving asynchronous config loading.

## 0.1.2

### Patch Changes

- 1ca268e: Link generated reports back to the tonnage repository.

## 0.1.1

### Patch Changes

- d7015e2: Adapt generated README reports to the measurements they contain, omitting irrelevant methodology and redundant single-table subsection headings.
- c1457b3: Resolve measured packages without self-dependencies and support main-only packages on the default neutral platform.

## 0.1.0

### Minor Changes

- 687fcd5: Refactor the CLI onto Comline, add generated command help, and remove the `make` and `test` command aliases.

## 0.0.0

Initial release.
