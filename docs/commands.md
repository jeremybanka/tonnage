# Repository commands

Run these commands from the repository root with `pnpm run <command>`. `mise.toml` selects the toolchain. Package-level commands keep the same meaning while narrowing their scope.

Following the [mise Node.js cookbook](https://mise.jdx.dev/mise-cookbook/nodejs.html#add-node-modules-binaries-to-the-path), mise adds the repository root’s `node_modules/.bin` to `PATH`. With shell activation or `mise exec -- <tool>`, installed dependency CLIs are available from the root and package directories.

| Command            | Contract                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `fmt`              | Apply the repository formatting policy.                                                                            |
| `check:fmt`        | Validate formatting without rewriting maintained files; language-specific validators are listed below.             |
| `docs:write`       | Build the packages and regenerate the tonnage README from its MDX source.                                          |
| `check`            | Run every static check listed below. Generated prerequisites and caches may be written; source fixes are explicit. |
| `test`             | Run the normal test suite once and return a failing status when tests fail.                                        |
| `test:watch`       | Watch the available interactive test suites.                                                                       |
| `build`            | Build distributable artifacts.                                                                                     |
| `change`           | Author pending release notes.                                                                                      |
| `release:version`  | Prepare versions and release metadata without publishing.                                                          |
| `release:publish`  | Build as required by the release pipeline and publish packages.                                                    |
| `workflows:update` | Update pinned workflow tooling references.                                                                         |

## Static checks

- `check:fmt`: `dprint check`.
- `check:docs`: build the packages, type-check tonnage's README with the TypeScript 7.1 content mapper, and run `galley check` to verify its generated output.
- `check:vp`: `vp check --no-fmt`.
- `check:spelling`: `cspell .`.

`check:vp` runs linting and TypeScript typechecking through Vite Plus with `lint.options.typeAware` and `lint.options.typeCheck` enabled. `check:fmt` handles formatting separately.

## Migration

Use `check:fmt` for formatting validation and `check:<tool>` for static checks. Use the canonical commands directly; superseded names have been removed.

## Galley dependency before publication

Galley is maintained separately in `../galley`. Until its first npm release, tonnage installs the packaged snapshot in `vendor/galley.md-0.0.0.tgz`. The optional public peer remains `galley.md@^0.0.0`. Builds and tests consume the installed package without importing a sibling repository's source.

To refresh the snapshot after committing Galley changes, run `pnpm --dir ../galley --filter galley.md pack --pack-destination "$PWD/vendor"` from this repository, then `pnpm install`, `pnpm docs:write`, `pnpm check`, and `pnpm test`. Update `vendor/README.md` with the source commit. After publication, replace the tarball dev dependency with the released version, refresh the lockfile, and remove the snapshot.
