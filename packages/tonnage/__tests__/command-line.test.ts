import { describe, expect, test } from "vitest"

import { parseTonnageCli, renderTonnageCliHelp } from "../src/command-line.ts"

describe(`tonnage command line`, () => {
	test.each([
		[`write`, `write`],
		[`check`, `check`],
	] as const)(`maps %s to %s mode`, (command, mode) => {
		expect(parseTonnageCli([`tonnage`, command])).toEqual({
			kind: `run`,
			mode,
		})
	})

	test(`accepts a config path`, () => {
		expect(
			parseTonnageCli([`tonnage`, `check`, `config/tonnage.config.ts`]),
		).toEqual({
			configArgument: `config/tonnage.config.ts`,
			kind: `run`,
			mode: `check`,
		})
	})

	test.each([
		[`tonnage`],
		[`tonnage`, `--help`],
		[`tonnage`, `write`, `--help`],
	])(`shows help for %j`, (...args) => {
		expect(parseTonnageCli(args)).toEqual({ kind: `help` })
	})

	test(`renders command help`, () => {
		const output = renderTonnageCliHelp()

		expect(output).toContain(`tonnage write`)
		expect(output).toContain(`tonnage check`)
		expect(output).not.toContain(`tonnage make`)
		expect(output).not.toContain(`tonnage test`)
		expect(output).toContain(`--help`)
	})

	test.each([`make`, `test`, `unknown`])(
		`rejects the %s command`,
		(command) => {
			expect(() => parseTonnageCli([`tonnage`, command])).toThrow(
				`does not have a positional argument named`,
			)
		},
	)
})
