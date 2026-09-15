import {
	type CliWarning,
	cli,
	completionResponse,
	help,
	helpOption,
	optional,
} from "comline"

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
		write: optional({ $configPath: null }),
	}),
	routeOptions: {
		"": ROOT_MANUAL,
		check: CHECK_MANUAL,
		"check/$configPath": CHECK_MANUAL,
		write: WRITE_MANUAL,
		"write/$configPath": WRITE_MANUAL,
	},
	positionalCompletions: {
		"check/$configPath": { fileSystem: `files` },
		"write/$configPath": { fileSystem: `files` },
	},
	discoverConfigPath: () => undefined,
})

export type TonnageCliInvocation = { warnings: CliWarning[] } & (
	| { kind: `help` }
	| { configArgument?: string; kind: `run`; mode: TonnageMode }
)

export function completeTonnageCli(
	args: string[],
): Promise<string | undefined> {
	return completionResponse(tonnageCli.definition, args)
}

export function parseTonnageCli(args: string[]): TonnageCliInvocation {
	const { inputs, warnings } = tonnageCli(args)

	if (inputs.case === `` || inputs.opts.help) {
		return { kind: `help`, warnings }
	}

	const mode =
		inputs.case === `write` || inputs.case === `write/$configPath`
			? `write`
			: `check`
	const configArgument = inputs.path[1]

	return configArgument === undefined
		? { kind: `run`, mode, warnings }
		: { configArgument, kind: `run`, mode, warnings }
}

export function renderTonnageCliHelp(): string {
	return help(tonnageCli.definition)
}
