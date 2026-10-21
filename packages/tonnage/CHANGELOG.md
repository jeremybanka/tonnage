# tonnage

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
