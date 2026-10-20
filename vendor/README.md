# Galley snapshot

`galley.md-0.0.0.tgz` is an npm package built from the standalone Galley repository at commit `44819e4647c770d613251bce6440fd76b208aad7`. It keeps tonnage installable before Galley's first npm publication; it includes the source and MPL-2.0 license.

Source checkout: `../galley.md`. Regenerate it with `pnpm --dir ../galley.md --filter galley.md pack --pack-destination "$PWD/vendor"` from the tonnage repository root, then run `pnpm install` to update the lockfile integrity. Replace this snapshot with a registry dependency after Galley is published.
