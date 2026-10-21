# Galley snapshot

`galley.md-0.0.0.tgz` is an npm package built from the standalone Galley repository at commit `111d6eb132f09237e181daa79b86aecefc98f21b`. It keeps tonnage installable before Galley's first npm publication; it includes the source and MPL-2.0 license.

Source checkout: `../galley`. Regenerate it with `pnpm --dir ../galley --filter galley.md pack --pack-destination "$PWD/vendor"` from the tonnage repository root, then run `pnpm install` to update the lockfile integrity. Replace this snapshot with a registry dependency after Galley is published.
