# tonnage workspace

- Keep consumer guidance in `packages/tonnage/AGENTS.md`; keep contributor, maintenance, release, and documentation-placement instructions here.
- Prefer `.ts` for source files and Node scripts. Do not create `.js`, `.cjs`, `.mjs`, or `.mts` source files; modern Node can run erasable TypeScript directly.
- Do not put line breaks in the bodies of changeset files; keep each changeset body on a single line.
- Before 1.0.0, use patch releases for features and bug fixes, and minor releases for breaking changes.
- Treat `packages/tonnage/README.md` as the canonical user guide and keep its examples synchronized with the public API.

## Vite Plus Upgrades

Use the target release's official `vp migrate --no-interactive` for Vite Plus upgrades. Preserve the old lockfile until migration runs, and let the migrator own toolchain version alignment and supported source/configuration changes. Review its manual migration findings and run the repository's formatter and checks; do not maintain a separate dependency synchronization implementation.

## Repository commands

Use the canonical command names in `docs/commands.md`: `fmt` writes formatting, `check` aggregates `check:*` validators, `test` runs once, and `verify` runs the complete repository verification sequence. Coverage commands use the `cov` prefix where implemented. Keep CI and documentation references aligned when changing commands.
