import { cli, help, helpOption, optional } from "comline"

import type { TonnageMode } from "./types.ts"

const ROOT_MANUAL = helpOption(`Show help for the tonnage command line.`)
const WRITE_MANUAL = helpOption(`Update the configured README report.`)
const CHECK_MANUAL = helpOption(
	`Check that the configured README report is up to date.`,
)

const tonnageCli = cli({
	cliName: `tonnage`,
	cliDescription: `Keep deterministic bundle size reports in README files and CI.`,
	routes: optional({
		check: optional({ $configPath: null }),
		make: optional({ $configPath: null }),
		test: optional({ $configPath: null }),
		write: optional({ $configPath: null }),
	}),
	routeOptions: {
		"": ROOT_MANUAL,
		check: CHECK_MANUAL,
		"check/$configPath": CHECK_MANUAL,
		make: WRITE_MANUAL,
		"make/$configPath": WRITE_MANUAL,
		test: CHECK_MANUAL,
		"test/$configPath": CHECK_MANUAL,
		write: WRITE_MANUAL,
		"write/$configPath": WRITE_MANUAL,
	},
	discoverConfigPath: () => undefined,
})

export type TonnageCliInvocation =
	| { kind: `help` }
	| { configArgument?: string; kind: `run`; mode: TonnageMode }

export function parseTonnageCli(args: string[]): TonnageCliInvocation {
	const { inputs } = tonnageCli(args)

	if (inputs.case === `` || inputs.opts.help) {
		return { kind: `help` }
	}

	const mode =
		inputs.case === `write` ||
		inputs.case === `write/$configPath` ||
		inputs.case === `make` ||
		inputs.case === `make/$configPath`
			? `write`
			: `check`
	const configArgument = inputs.path[1]

	return configArgument === undefined
		? { kind: `run`, mode }
		: { configArgument, kind: `run`, mode }
}

export function renderTonnageCliHelp(): string {
	return help(tonnageCli.definition)
}
