# Galley snapshot

`galley.md-0.1.0.tgz` is an npm package built from the standalone Galley repository at commit `d9f4fbdf37e59d4274e33c68d77f1dda24ef2313`. It keeps tonnage installable before Galley's first npm publication; it includes the source and MPL-2.0 license.

Source checkout: `../galley.md`. Regenerate it with `pnpm --dir ../galley.md pack --pack-destination ../tonnage/vendor` from the tonnage repository root, then run `pnpm install` to update the lockfile integrity. Replace this snapshot with a registry dependency after Galley is published.
