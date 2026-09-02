import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { Plugin } from "esbuild"

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

		const filter = new RegExp(`^${escapeRegExp(packageName)}(?:/.*)?$`)
		const plugin: Plugin = {
			name: `tonnage-package-resolution`,
			setup(build) {
				build.onResolve({ filter }, async (args) => {
					if (args.resolveDir === temporaryDirectory) {
						return
					}

					return build.resolve(args.path, {
						importer: args.importer,
						kind: args.kind,
						namespace: args.namespace,
						resolveDir: temporaryDirectory,
						with: args.with,
					})
				})
			},
		}

		return await useResolver(plugin)
	} finally {
		await fs.rm(temporaryDirectory, { force: true, recursive: true })
	}
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)
}
