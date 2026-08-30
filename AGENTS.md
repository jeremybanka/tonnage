# tonnage workspace

- Keep consumer guidance in `packages/tonnage/AGENTS.md`; keep contributor, maintenance, release, and documentation-placement instructions here.
- Prefer `.ts` for source files and Node scripts. Do not create `.js`, `.cjs`, `.mjs`, or `.mts` source files; modern Node can run erasable TypeScript directly.
- Do not put line breaks in the bodies of changeset files; keep each changeset body on a single line.
- Before 1.0.0, use patch releases for features and bug fixes, and minor releases for breaking changes.
- Treat `packages/tonnage/README.md` as the canonical user guide and keep its examples synchronized with the public API.
