# tonnage

Bundle size reports for [Galley](https://www.npmjs.com/package/galley.md) documents.

Tonnage bundles real public package imports with esbuild, minifies the result,
and reports JavaScript bytes before and after level-9 gzip. Embed its component
in a README source document, then use Galley to generate Markdown and detect
stale reports in CI.

## Install

Install tonnage and its required Galley 0.3 peer:

```sh
pnpm add -D tonnage 'galley.md@^0.3.0'
```

## Use

Create `README.mdx` beside your package manifest:

```mdx
import { Tonnage } from "tonnage"

# My package

<Tonnage config={{ platform: "node" }} />
```

Run `galley write` to generate `README.md`. Run `galley check` in CI to evaluate
the document again and exit nonzero if its output is missing or stale. Keep the
MDX source and generated Markdown in version control.

The component defaults to measuring every public export except `./package.json`.
Paths resolve relative to the containing document. To measure another package,
pass `directory`, such as `<Tonnage directory="../my-package" />`; relative
values resolve from the document's directory. The `packageJson` path resolves
from that measurement directory; recipe entry paths resolve from the selected
manifest's directory.

Galley owns document evaluation and output files. See its
[user guide](https://github.com/jeremybanka/galley#readme) for document composition
and command options.

## Configure

Pass configuration inline or import a reusable configuration using `defineConfig`.
The complete configuration exhibit is in
[examples/tonnage.config.ts](./examples/tonnage.config.ts).

```ts
import { defineConfig, type TonnageConfig } from "tonnage"

// @exhibit-region start config
const config: TonnageConfig = defineConfig({
	exports: {
		exclude: [`./package.json`],
	},
	includePeers: true,
	recipes: [
		{
			entry: `examples/recipes/react-app.ts`,
			name: `React app`,
			platform: `browser`,
		},
	],
})

export default config
// @exhibit-region end config

```

Import it explicitly in your document:

```mdx
import { Tonnage } from "tonnage"
import config from "./examples/tonnage.config.ts"

<Tonnage config={config} />
```

Importing configuration from another folder does not change path resolution.
Set `packageJson` to
select a manifest, `exports.include` or `exports.exclude` to select subpaths,
and `exports: false` to report only recipes. Use `heading` to customize the report
heading and `target` to set esbuild's JavaScript target. Use `external` for
additional imports intentionally supplied by consumers; peer dependencies are
external by default.

Set `includePeers: true` to include imported peer dependencies in both package
export and recipe sizes:

```mdx
<Tonnage config={{ includePeers: true }} />
```

Install the peers in the measured package's environment first. Tonnage bundles
their resolved installed versions and tree-shakes unused code; it does not add
unimported peers to the bundle. Explicit `external` entries still take precedence,
including recipe-specific entries, so you can exclude individual peers and their
subpaths even when `includePeers` is enabled. An imported peer that cannot be
resolved causes measurement to fail unless it is external.

Each recipe points to a reviewable entry file such as
[examples/recipes/react-app.ts](./examples/recipes/react-app.ts). Use named
imports to represent the runtime surface a real application uses; unused package
exports are tree-shaken. Keep server and client recipes separate.

```ts
// @exhibit-region start recipe
export { atom } from "my-package"
export { useO } from "my-package/react"
// @exhibit-region end recipe

```

The public API consists of `Tonnage`, `defineConfig`, and the `TonnageProps`,
`TonnageConfig`, `TonnageExports`, `TonnageRecipe`, and `BundlePlatform` types.

## Report layout

Public-module rows retain the complete runtime export surface. Recipe rows
bundle their entry files and tree-shake unused exports. Exports-only and
recipes-only reports put their table directly below the report heading; a report
with both labels its tables `Package exports` and `Usage examples`.

Sizes count minified JavaScript and level-9 gzip bytes. Declarations, source
maps, CSS, and other assets are excluded. Peer dependencies stay external by
default; enable `includePeers` to count their bundled code. The report notes
which policy is configured, and
shared modules are counted once per bundle. Reports use Galley's native table
elements, with right-aligned byte columns and literal escaping for import names,
entry paths, and recipe labels.

## Package resolution and platforms

Tonnage resolves the package's own public import name from the selected manifest;
a workspace package does not need to install itself as a dependency. Root and
subpath imports go through esbuild's package resolver, so export restrictions
and conditions apply. Runtime dependencies resolve from the measured package.

Package imports, including imported dependencies, included peers, and JSX
runtimes, ignore workspace TypeScript `paths` aliases and `baseUrl` lookups.
They use the installed packages' public exports instead. Build workspace
packages before measuring them, and point their exports at the output you
publish; Tonnage follows those declarations without assuming an output directory.
Shared imports resolving to the same file are counted once per bundle.

Recipe compilation still uses the applicable tsconfig settings, including
inherited JSX mode, factory, fragment factory, and import source. Use relative
paths for recipe helpers rather than development-only aliases. Peer inclusion
and explicit `external` exclusions continue to apply.

The default `platform` is `neutral`. For packages without `exports`, neutral
resolution tries `module` and then `main`. With conditional `exports`, neutral
does not enable the `browser` or `node` condition, so exports commonly fall
through to `default`. Set `platform` to `browser` or `node` for those runtimes;
a recipe's `platform` overrides the report-wide setting.

## Migrating from the standalone workflow

Move your maintained README content to `README.mdx` and replace generated-section
markers with `<Tonnage config={config} />`. Remove `marker` and `readme` from the
configuration. Import `Tonnage` from `tonnage` instead of `tonnage/galley`, and
replace `tonnage write` / `tonnage check` scripts with `galley write` /
`galley check`. Galley generates the entire README from its MDX source.

The tonnage executable, shell completion, standalone measurement/report APIs,
and Markdown section-editing helpers have been removed. Reusable configurations
can continue to use `defineConfig`; render reports through the component.

## Bundle size

Package export sizes include complete runtime export surfaces.

Sizes are exact minified and level-9 gzip JavaScript byte counts. Declarations, source maps, CSS, and other assets are excluded. Peer dependencies stay external, and shared modules are counted once per bundle.

| Import    | Minified JS |  Gzip JS |
| --------- | ----------: | -------: |
| `tonnage` |    50,135 B | 17,813 B |

Report maintained with [tonnage](https://github.com/jeremybanka/tonnage).
