# Galley snapshot

`galley.mdx-0.1.0.tgz` is an npm package built from the standalone Galley repository at commit `912f57ccc262640a0da2546275a4910518472253`. It keeps tonnage installable before Galley's first npm publication; it includes the source and MPL-2.0 license.

Source checkout: `../galley.mdx`. Regenerate it with `pnpm --dir ../galley.mdx pack --pack-destination ../tonnage/vendor` from the tonnage repository root, then run `pnpm install` to update the lockfile integrity. Replace this snapshot with a registry dependency after Galley is published.
