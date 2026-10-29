import fs from "node:fs/promises"
import path from "node:path"

import {
	measureEntryWithPlugins,
	measureImportsWithPlugins,
} from "./measure.ts"
import { withPackageResolver } from "./package-resolution.ts"
import type {
	TonnageConfig,
	TonnageExports,
	TonnageReport,
	TonnageRow,
} from "./types.ts"

type PackageJson = {
	exports?: unknown
	name?: string
	peerDependencies?: Record<string, string>
}

export async function createTonnageReport(
	config: TonnageConfig,
	configDirectory: string,
): Promise<TonnageReport> {
	const packageJsonPath = path.resolve(
		configDirectory,
		config.packageJson ?? `package.json`,
	)
	const packageJson = JSON.parse(
		await fs.readFile(packageJsonPath, `utf8`),
	) as PackageJson
	if (!packageJson.name) {
		throw new Error(`${packageJsonPath} does not declare a package name.`)
	}

	const resolveDirectory = path.dirname(packageJsonPath)
	const peerDependencies = Object.keys(packageJson.peerDependencies ?? {})
	const external = unique([
		...(config.includePeers ? [] : peerDependencies),
		...(config.external ?? []),
	])
	const exportImports = selectExportImports(
		packageJson.name,
		packageJson.exports,
		config.exports,
	)

	const { exportRows, recipeRows } = await withPackageResolver(
		packageJson.name,
		resolveDirectory,
		async (packageResolver) => {
			const exportRows = await Promise.all(
				exportImports.map(async (specifier): Promise<TonnageRow> => ({
					...(await measureImportsWithPlugins([specifier], {
						external,
						platform: config.platform,
						plugins: [packageResolver],
						resolveDirectory,
						target: config.target,
					})),
					imports: [specifier],
					name: specifier,
				})),
			)
			const recipeRows = await Promise.all(
				(config.recipes ?? []).map(async (recipe) => ({
					...(await measureEntryWithPlugins(recipe.entry, {
						external: unique([...external, ...(recipe.external ?? [])]),
						platform: recipe.platform ?? config.platform,
						plugins: [packageResolver],
						resolveDirectory,
						target: config.target,
					})),
					entry: recipe.entry,
					name: recipe.name,
				})),
			)

			return { exportRows, recipeRows }
		},
	)

	return {
		exports: exportRows,
		packageName: packageJson.name,
		recipes: recipeRows,
	}
}

function selectExportImports(
	packageName: string,
	exportsValue: unknown,
	selection: TonnageConfig[`exports`],
): string[] {
	if (selection === false) {
		return []
	}

	const exportKeys = getExportKeys(exportsValue)
	const options: TonnageExports = typeof selection === `object` ? selection : {}
	const included = options.include
		? [...options.include]
		: exportKeys.filter((exportKey) => exportKey !== `./package.json`)
	const excluded = new Set(options.exclude ?? [])

	return included
		.filter((exportKey) => !excluded.has(exportKey))
		.map((exportKey) => toPackageImport(packageName, exportKey))
}

function getExportKeys(exportsValue: unknown): string[] {
	if (typeof exportsValue === `string` || Array.isArray(exportsValue)) {
		return [`.`]
	}
	if (!exportsValue || typeof exportsValue !== `object`) {
		return [`.`]
	}

	const keys = Object.keys(exportsValue)
	return keys.some((key) => key.startsWith(`.`)) ? keys : [`.`]
}

function toPackageImport(packageName: string, exportKey: string): string {
	if (exportKey === `.`) {
		return packageName
	}
	if (!exportKey.startsWith(`./`)) {
		throw new Error(`Invalid package export key: ${exportKey}`)
	}
	return `${packageName}/${exportKey.slice(2)}`
}

function unique(values: readonly string[]): string[] {
	return [...new Set(values)]
}
