import path from "node:path"
import { gzipSync } from "node:zlib"

import { build, type BuildOptions, type Plugin } from "esbuild"

import type { BundleMeasurement, BundlePlatform } from "./types.ts"

export type MeasureImportsOptions = {
	external?: readonly string[] | undefined
	platform?: BundlePlatform | undefined
	resolveDirectory: string
	target?: string | undefined
}

export type MeasureEntryOptions = MeasureImportsOptions

type InternalMeasureOptions = MeasureImportsOptions & {
	plugins?: readonly Plugin[]
}

export async function measureEntry(
	entry: string,
	options: MeasureEntryOptions,
): Promise<BundleMeasurement> {
	return measureEntryWithPlugins(entry, options)
}

export async function measureEntryWithPlugins(
	entry: string,
	options: InternalMeasureOptions,
): Promise<BundleMeasurement> {
	return measureBuild(
		{ entryPoints: [path.resolve(options.resolveDirectory, entry)] },
		options,
	)
}

export async function measureImports(
	imports: readonly string[],
	options: MeasureImportsOptions,
): Promise<BundleMeasurement> {
	return measureImportsWithPlugins(imports, options)
}

export async function measureImportsWithPlugins(
	imports: readonly string[],
	options: InternalMeasureOptions,
): Promise<BundleMeasurement> {
	if (imports.length === 0) {
		throw new Error(`A tonnage entry must import at least one module.`)
	}

	const entry = imports
		.map(
			(specifier, index) =>
				`export * as entry${index} from ${JSON.stringify(specifier)}`,
		)
		.join(`\n`)
	return measureBuild(
		{
			stdin: {
				contents: entry,
				loader: `js`,
				resolveDir: options.resolveDirectory,
				sourcefile: `tonnage-entry.js`,
			},
		},
		options,
	)
}

async function measureBuild(
	entry: Pick<BuildOptions, `entryPoints` | `stdin`>,
	options: InternalMeasureOptions,
): Promise<BundleMeasurement> {
	const platform = options.platform ?? `neutral`

	const result = await build({
		bundle: true,
		charset: `utf8`,
		external: [
			...(options.external ?? []),
			...(platform === `browser` ? [] : [`node:*`]),
		],
		format: `esm`,
		legalComments: `none`,
		logLevel: `silent`,
		...(platform === `neutral` ? { mainFields: [`module`, `main`] } : {}),
		minify: true,
		outdir: `out`,
		platform,
		plugins: [...(options.plugins ?? [])],
		...entry,
		target: options.target ?? `es2022`,
		treeShaking: true,
		write: false,
	})

	const outputFiles = [...(result.outputFiles ?? [])]
		.filter((output) => output.path.endsWith(`.js`))
		.sort((left, right) => left.path.localeCompare(right.path))
	if (outputFiles.length === 0) {
		throw new Error(`The tonnage entry did not emit any runtime JavaScript.`)
	}
	const rawBytes = outputFiles.reduce(
		(total, output) => total + output.contents.byteLength,
		0,
	)
	const gzipBytes = outputFiles.reduce(
		(total, output) =>
			total + gzipSync(output.contents, { level: 9 }).byteLength,
		0,
	)

	return { gzipBytes, rawBytes }
}
