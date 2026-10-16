# tonnage

Workspace for the Tonnage bundle measurement package and md-x Markdown compiler.

The package itself lives in [packages/tonnage](packages/tonnage).

[md-x](packages/md-x) compiles MDX components and attributed source imports to plain Markdown. Tonnage's own README is generated from `packages/tonnage/README.mdx`, including source examples and a live bundle report.

## Development

Install dependencies with `pnpm install`, then use `pnpm build`, `pnpm test`, and `pnpm check` for the standard workspace checks.

Run `pnpm docs:write` after editing the README source or its imported examples. `pnpm check:docs` checks for generated documentation drift.

## License

Tonnage is free and open-source software under the [Mozilla Public License 2.0](LICENSE).

## Repository commands

See [the command guide](docs/commands.md) for formatting, static checks, tests, coverage where available, and release commands.
