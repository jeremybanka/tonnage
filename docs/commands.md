# Repository commands

Run these commands from the repository root with `pnpm run <command>`. `mise.toml` selects the toolchain. Package-level commands keep the same meaning while narrowing their scope.

Following the [mise Node.js cookbook](https://mise.jdx.dev/mise-cookbook/nodejs.html#add-node-modules-binaries-to-the-path), mise adds the repository root’s `node_modules/.bin` to `PATH`. With shell activation or `mise exec -- <tool>`, installed dependency CLIs are available from the root and package directories.

| Command               | Contract                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `fmt`                 | Apply the repository formatting policy.                                                                            |
| `check:fmt`           | Validate formatting without rewriting maintained files; language-specific validators are listed below.             |
| `docs:write`          | Build the packages and regenerate the tonnage README from its MDX source.                                          |
| `check`               | Run every static check listed below. Generated prerequisites and caches may be written; source fixes are explicit. |
| `test`                | Run the normal test suite once and return a failing status when tests fail.                                        |
| `test:watch`          | Watch the available interactive test suites.                                                                       |
| `test:breakage:peers` | Build and pack tonnage, then test its peer contract in frozen consumer environments with Breakage.                 |
| `build`               | Build distributable artifacts.                                                                                     |
| `change`              | Author pending release notes.                                                                                      |
| `release:version`     | Prepare versions and release metadata without publishing.                                                          |
| `release:publish`     | Build as required by the release pipeline and publish packages.                                                    |
| `workflows:update`    | Update pinned workflow tooling references.                                                                         |

## Static checks

- `check:fmt`: `dprint check`.
- `check:docs`: build the packages, type-check tonnage's README with the TypeScript 7.1 content mapper, and run `galley check` to verify its generated output.
- `check:vp`: `vp check --no-fmt`.
- `check:spelling`: `cspell .`.

`check:vp` runs linting and TypeScript typechecking through Vite Plus with `lint.options.typeAware` and `lint.options.typeCheck` enabled. `check:fmt` handles formatting separately.

## Migration

Use `check:fmt` for formatting validation and `check:<tool>` for static checks. Use the canonical commands directly; superseded names have been removed.

## Galley dependency

Tonnage requires `galley.md` as a peer for report rendering and pins it as a development dependency for README compilation and local tests. It is maintained in [jeremybanka/galley](https://github.com/jeremybanka/galley). First-party `galley.md` and `breakage` releases are excluded from pnpm's minimum release age.

## Peer compatibility

`test:breakage:peers` runs without task caching and exercises the packed package against the pinned Galley 0.1.1 representative under `packages/tonnage/peer-environments`. Its separate workspace and committed lockfile disable automatic peer installation. The consumer suite checks programmatic rendering, MDX composition, CLI write/check, and public declaration compatibility. Add a representative when adding a supported peer era, and retain coverage of existing eras.

Breakage compares peer requirements with the latest `tonnage@` release tag. The peer CI job fetches release history. Changesets supplies the planned version; a minor release before 1.0 or a major release certifies intentional support changes. Consumer assertion failures cannot be certified away. The package-level `pack:breakage` command creates the archive; the root peer command builds before packing.

The consumer fixture uses `tsconfig.consumer.json` explicitly inside Breakage so its type check resolves the installed package. Keeping that config separate from automatic `tsconfig.json` discovery lets `check:vp` validate workspace source before a build.

Breakage removes its disposable `test/` directory after each run. Do not run checks against the same representative concurrently; inspect any stage left by an interrupted process before removing it.
