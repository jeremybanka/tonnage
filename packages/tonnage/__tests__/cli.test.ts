import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { afterEach, describe, expect, test } from "vitest"

const execute = promisify(execFile)
const cliPath = fileURLToPath(new URL(`../src/cli.ts`, import.meta.url))
const directories: string[] = []

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => fs.rm(directory, { recursive: true, force: true })),
	)
})

async function fixture(): Promise<string> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), `tonnage-cli-`))
	directories.push(directory)
	await fs.writeFile(
		path.join(directory, `package.json`),
		JSON.stringify({ name: `cli-fixture`, type: `module` }),
	)
	return directory
}

function run(
	directory: string,
	...args: string[]
): Promise<{ stdout: string; stderr: string }> {
	return execute(process.execPath, [cliPath, ...args], {
		cwd: directory,
		env: { ...process.env, NO_COLOR: `1`, FORCE_COLOR: `0` },
	})
}

describe(`tonnage executable`, () => {
	test(`completes commands and config paths without evaluating configs or changing reports`, async () => {
		const directory = await fixture()
		await fs.writeFile(
			path.join(directory, `tonnage.config.ts`),
			`throw new Error("config must not run");`,
		)
		await fs.writeFile(path.join(directory, `README.md`), `unchanged`)
		const commands = await run(directory, `__completeNoDesc`, ``)
		expect(commands.stdout.split(`\n`)).toEqual(
			expect.arrayContaining([`write`, `check`, `completion`]),
		)
		expect(commands.stderr).toBe(``)
		for (const command of [`write`, `check`]) {
			// Native Carapace responses include filesystem candidates, not just hints.
			const files = await run(
				directory,
				`_carapace`,
				`export`,
				`tonnage`,
				command,
				`tonnage.config`,
			)
			expect(files.stdout).toContain(`tonnage.config.ts`)
			expect(files.stderr).toBe(``)
		}
		expect(await fs.readFile(path.join(directory, `README.md`), `utf8`)).toBe(
			`unchanged`,
		)
	})

	test.each([`bash`, `zsh`, `fish`, `nushell`, `carapace`])(
		`generates %s integration without a config`,
		async (target) => {
			const directory = await fixture()
			const result = await run(directory, `completion`, target)
			expect(result.stdout).toContain(`tonnage`)
			expect(result.stderr).toBe(``)
			expect(await fs.readdir(directory)).toEqual([`package.json`])
		},
	)

	test(`reports invalid completion installation syntax before config loading`, async () => {
		const directory = await fixture()
		await expect(
			run(directory, `completion`, `install`, `invalid`),
		).rejects.toMatchObject({
			code: 1,
			stdout: ``,
			stderr: expect.stringContaining(`completion install`),
		})
	})

	test(`shows help without loading a broken config and keeps warnings on stderr`, async () => {
		const directory = await fixture()
		await fs.writeFile(
			path.join(directory, `tonnage.config.ts`),
			`throw new Error("config must not run");`,
		)
		const result = await run(directory, `write`, `--help`, `--typo`)
		expect(result.stdout).toContain(`tonnage write`)
		expect(result.stdout).not.toContain(`--typo`)
		expect(result.stderr).toContain(`--typo`)
	})

	test(`preserves async configs, config-relative paths, and write/check exit behavior`, async () => {
		const directory = await fixture()
		const configDirectory = path.join(directory, `nested`)
		await fs.mkdir(configDirectory)
		await fs.writeFile(
			path.join(configDirectory, `package.json`),
			JSON.stringify({ name: `nested-fixture` }),
		)
		await fs.writeFile(
			path.join(configDirectory, `tonnage.config.ts`),
			`export default await Promise.resolve({ exports: false });`,
		)
		const readmePath = path.join(configDirectory, `README.md`)
		const original = `# Fixture\n\n<!-- tonnage:default:start -->\nstale\n<!-- tonnage:default:end -->\n`
		await fs.writeFile(readmePath, original)
		const configArgument = `nested/tonnage.config.ts`
		await expect(
			run(directory, `check`, configArgument, `--typo`),
		).rejects.toMatchObject({
			code: 1,
			stdout: ``,
			stderr: expect.stringContaining(`is out of date`),
		})
		expect(await fs.readFile(readmePath, `utf8`)).toBe(original)
		const written = await run(directory, `write`, configArgument, `--typo`)
		expect(written.stdout).toContain(`Updated nested/README.md`)
		expect(written.stderr).toContain(`--typo`)
		const checked = await run(directory, `check`, configArgument, `--typo`)
		expect(checked.stdout).toContain(`already up to date`)
		expect(checked.stderr).toContain(`--typo`)
	})

	test(`still fails for missing discovered or explicit configs`, async () => {
		const directory = await fixture()
		await expect(run(directory, `check`)).rejects.toMatchObject({
			code: 1,
			stderr: expect.stringContaining(`Could not find a tonnage config`),
		})
		await expect(run(directory, `write`, `missing.ts`)).rejects.toMatchObject({
			code: 1,
			stderr: expect.stringContaining(`missing.ts`),
		})
	})
})
