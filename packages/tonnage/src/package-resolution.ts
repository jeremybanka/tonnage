import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { context, type Plugin, type PluginBuild } from "esbuild"

export async function withPackageResolver<Result>(
	packageName: string,
	packageDirectory: string,
	useResolver: (plugin: Plugin) => Promise<Result>,
): Promise<Result> {
	const temporaryDirectory = await fs.mkdtemp(
		path.join(os.tmpdir(), `tonnage-package-`),
	)
	try {
		const nodeModulesDirectory = path.join(temporaryDirectory, `node_modules`)
		const packageLinkPath = path.resolve(nodeModulesDirectory, packageName)
		if (!packageLinkPath.startsWith(`${nodeModulesDirectory}${path.sep}`)) {
			throw new Error(`Invalid package name: ${packageName}`)
		}

		await fs.mkdir(path.dirname(packageLinkPath), { recursive: true })
		await fs.symlink(
			packageDirectory,
			packageLinkPath,
			process.platform === `win32` ? `junction` : `dir`,
		)

		const plugin: Plugin = {
			name: `tonnage-package-resolution`,
			async setup(build) {
				// Resolve packages without development aliases, but leave the actual
				// build's tsconfig discovery intact for JSX and other transforms.
				// This context only resolves paths; it never compiles any files.
				let resolutionBuild: PluginBuild
				const resolver = await context({
					...build.initialOptions,
					entryPoints: [],
					stdin: { contents: `` },
					tsconfigRaw: {},
					plugins: [
						{
							name: `tonnage-alias-free-resolution`,
							setup(resolverBuild) {
								resolutionBuild = resolverBuild
							},
						},
					],
				})
				build.onEnd(() => resolver.dispose())
				build.onDispose(() => {
					void resolver.dispose()
				})

				const nativeResolution = {}
				build.onResolve({ filter: /.*/ }, async (args) => {
					if (
						args.pluginData === nativeResolution ||
						args.kind === `entry-point` ||
						path.isAbsolute(args.path) ||
						/^\.{1,2}(?:\/|$)/.test(args.path)
					) {
						return
					}

					const isSelfImport =
						args.path === packageName || args.path.startsWith(`${packageName}/`)
					const result = await resolutionBuild.resolve(args.path, {
						importer: args.importer,
						kind: args.kind,
						namespace: args.namespace,
						resolveDir: isSelfImport ? temporaryDirectory : args.resolveDir,
						with: args.with,
					})
					if (result.errors.length > 0) {
						const native = await build.resolve(args.path, {
							importer: args.importer,
							kind: args.kind,
							namespace: args.namespace,
							resolveDir: args.resolveDir,
							with: args.with,
							pluginData: nativeResolution,
						})
						// Native resolution knows whether an unresolved import is guarded
						// by try/catch. Delegate only if it cannot fall back to an alias.
						if (native.errors.length > 0) return
					}
					return result
				})
			},
		}

		return await useResolver(plugin)
	} finally {
		await fs.rm(temporaryDirectory, { force: true, recursive: true })
	}
}
