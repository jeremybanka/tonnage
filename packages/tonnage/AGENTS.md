# tonnage

Runtime JavaScript bundle measurement for Galley documents.

- Install `galley.md@^0.3.0` alongside tonnage. Galley is a required peer.
- Import `Tonnage` from `tonnage` in an MDX document. Pass measurement options through `config`, using `defineConfig` for reusable configurations if desired.
- Paths default to the containing document's directory. Set `directory` to measure another package; relative overrides resolve from the document. Resolve `packageJson` from that directory and recipe entries from the selected manifest's directory. Imported configuration files do not change these bases.
- Run `galley write` to generate Markdown and `galley check` in CI to detect missing or stale output. Maintain the MDX source and commit the generated Markdown.
- Tonnage measures emitted minified JavaScript and level-9 gzip bytes. Do not include declarations, source maps, CSS, or other assets in those figures.
- Public-module rows retain the complete runtime export surface. Recipe rows use reviewable entry files and tree-shake unused exports.
- Treat each recipe as one realistic runtime boundary. Keep server and client recipes separate, and count shared modules once per bundle.
- Build workspace packages before measuring them and point their public exports at the published output. Package imports ignore TypeScript `paths` aliases and `baseUrl` lookups, including for dependencies, peers, and JSX runtimes. Recipe compilation preserves applicable tsconfig JSX settings; use relative imports for recipe helpers.
- Peer dependencies stay external by default. Set `includePeers: true` to count imported peers in export and recipe bundles; install them in the measured package's environment first. Explicit report-wide and recipe `external` entries still exclude matching imports, including peer subpaths.
- The component returns Galley elements without writing files. Reports use explicit Markdown nodes and `Markdown.Table`. Its tables escape literal text and align byte columns to the right.
