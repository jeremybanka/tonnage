import { describe, expect, test } from "vitest"

import { parseTonnageCli, renderTonnageCliHelp } from "../src/command-line.ts"

describe(`tonnage command line`, () => {
	test.each([
		[`write`, `write`],
		[`check`, `check`],
	] as const)(`maps %s to %s mode`, (command, mode) => {
		expect(parseTonnageCli([`node`, `tonnage`, command])).toEqual({
			kind: `run`,
			mode,
			warnings: [],
		})
	})

	test(`accepts a config path`, () => {
		expect(
			parseTonnageCli([`node`, `tonnage`, `check`, `config/tonnage.config.ts`]),
		).toEqual({
			configArgument: `config/tonnage.config.ts`,
			kind: `run`,
			mode: `check`,
			warnings: [],
		})
	})

	test.each([
		[`tonnage`],
		[`tonnage`, `--help`],
		[`tonnage`, `write`, `--help`],
	])(`shows help for %j`, (...args) => {
		expect(parseTonnageCli([`node`, ...args])).toEqual({
			kind: `help`,
			warnings: [],
		})
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
			expect(() => parseTonnageCli([`node`, `tonnage`, command])).toThrow(
				`does not have a positional argument named`,
			)
		},
	)

	test(`keeps dash-prefixed config paths after the delimiter`, () => {
		expect(
			parseTonnageCli([`node`, `tonnage`, `check`, `--`, `--config.ts`]),
		).toEqual({
			configArgument: `--config.ts`,
			kind: `run`,
			mode: `check`,
			warnings: [],
		})
	})

	test(`returns ignored-option warnings with the selected command`, () => {
		const invocation = parseTonnageCli([`node`, `tonnage`, `check`, `--typo`])
		expect(invocation.kind).toBe(`run`)
		expect(invocation.warnings).toEqual([
			expect.objectContaining({
				code: `unknown-option`,
				option: `--typo`,
				path: [`check`],
			}),
		])
	})

	test(`rejects extra positional arguments`, () => {
		expect(() =>
			parseTonnageCli([`node`, `tonnage`, `write`, `config.ts`, `extra`]),
		).toThrow()
	})
})
