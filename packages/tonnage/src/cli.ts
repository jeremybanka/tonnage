#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { parseTonnageCli, renderTonnageCliHelp } from "./command-line.ts"
import { runTonnage } from "./run.ts"
import type { TonnageConfig } from "./types.ts"

const DEFAULT_CONFIG_FILES = [
	`tonnage.config.ts`,
	`tonnage.config.mjs`,
	`tonnage.config.js`,
]

async function main(): Promise<void> {
	const invocation = parseTonnageCli([`tonnage`, ...process.argv.slice(2)])
	if (invocation.kind === `help`) {
		process.stdout.write(renderTonnageCliHelp())
		return
	}

	const { configArgument, mode } = invocation
	const configPath = await findConfig(configArgument)
	const config = await loadConfig(configPath)
	const result = await runTonnage(config, {
		configDirectory: path.dirname(configPath),
		mode,
	})

	if (mode === `check` && result.changed) {
		process.stderr.write(
			`${path.relative(process.cwd(), result.readmePath)} is out of date. Run tonnage write.\n`,
		)
		process.exitCode = 1
		return
	}

	const readme = path.relative(process.cwd(), result.readmePath)
	process.stdout.write(
		result.changed
			? `Updated ${readme}.\n`
			: `${readme} is already up to date.\n`,
	)
}

async function findConfig(configArgument: string | undefined): Promise<string> {
	if (configArgument) {
		return path.resolve(configArgument)
	}

	for (const filename of DEFAULT_CONFIG_FILES) {
		const candidate = path.resolve(filename)
		try {
			await fs.access(candidate)
			return candidate
		} catch {
			// Keep looking for the next supported config filename.
		}
	}

	throw new Error(
		`Could not find a tonnage config (${DEFAULT_CONFIG_FILES.join(`, `)}).`,
	)
}

async function loadConfig(configPath: string): Promise<TonnageConfig> {
	const imported = (await import(pathToFileURL(configPath).href)) as {
		default?: unknown
	}
	if (!imported.default || typeof imported.default !== `object`) {
		throw new Error(`${configPath} must default-export a tonnage config.`)
	}
	return imported.default
}

main().catch((error: unknown) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	)
	process.exitCode = 1
})
