# tonnage

CI-first runtime JavaScript bundle measurement with checked-in README reports.

- Tonnage measures emitted minified JavaScript and level-9 gzip bytes. Do not include declarations, source maps, CSS, or other assets in those figures.
- Public-module rows retain the complete runtime export surface. Recipe rows use reviewable entry files and tree-shake unused exports.
- Treat each recipe as one realistic runtime boundary. Keep server and client recipes separate, and count shared modules once within each bundle.
- Peer dependencies stay external by default. Use explicit `external` entries only for additional dependencies intentionally supplied by consumers.
- Run `tonnage write` to update a generated README section and `tonnage check` in CI to detect drift.
- Keep marker names stable and use the `tonnage:<name>:start` and `tonnage:<name>:end` comment forms.
