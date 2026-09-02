# tonnage

Keep exact bundle size tables in a package README and fail CI when the checked-in
numbers drift.

The tool bundles real public package imports with esbuild, minifies the result,
and reports JavaScript bytes before and after level-9 gzip. Public-module rows
retain every runtime export; recipe entry files can select named exports and
tree-shake the rest. Declarations, source maps, CSS, and other assets are not
counted. Peer dependencies stay external, and shared modules are counted once
per bundle.

## Configure

Add the generated-section comments to the target README, then create a config
beside the package manifest. The complete configuration exhibit is in
[examples/tonnage.config.ts](./examples/tonnage.config.ts).
Each recipe points to a reviewable entry file such as
[examples/recipes/react-app.ts](./examples/recipes/react-app.ts). Use named
imports in these files to represent the runtime surface a real application uses;
unused package exports are tree-shaken.

The default generated-section marker is `default`; the example uses `my-package`.
The opening and closing comments use the forms
`tonnage:my-package:start` and `tonnage:my-package:end`.

## Run

Run `tonnage write` during development to update the README. Run
`tonnage check` in CI to recompute the same report without writing and exit
nonzero when the README is stale. Run `tonnage --help` to see both commands and
their optional config-path arguments.

By default the tool reads `package.json`, writes `README.md`, and measures every
public export except `./package.json`. Paths are resolved relative to the config
file. Use `exports.include` or `exports.exclude` to select subpaths, recipe entry
files to describe realistic runtime boundaries, and `external` for non-peer
imports that the package intentionally leaves to its consumers.

## Report layout

Generated reports adapt to the measurements they contain. An exports-only or
recipes-only report puts its table directly below the configured report heading
and describes only that type of measurement. A report with both types labels the
tables `Package exports` and `Usage examples` so readers can distinguish complete
runtime export surfaces from tree-shaken recipe bundles.

Every layout states the exact measurement semantics: minified and level-9 gzip
JavaScript bytes, with declarations, source maps, CSS, and other assets excluded.
Peer dependencies remain external, and shared modules are counted once in each
bundle.

## Package resolution and platforms

Tonnage resolves the package's own public import name from the manifest selected
by `packageJson`; a workspace package does not need to install or declare itself
as a dependency. Root and subpath imports still go through esbuild's package
resolver, so the manifest's `exports` restrictions and conditions apply. Runtime
dependencies resolve from the measured package, while its peer dependencies stay
external.

The default `platform` is `neutral`. For packages without `exports`, Tonnage
configures neutral resolution to try the `module` field and then `main`, so
main-only packages and dependencies are actionable by default. With conditional
`exports`, neutral does not enable the `browser` or `node` condition, so exports
commonly fall through to their `default` target. Set `platform` to `browser` or
`node` when that runtime is what you want to measure; those choices retain
esbuild's native export conditions and main-field behavior. A recipe's
`platform` overrides the report-wide setting for that recipe.
