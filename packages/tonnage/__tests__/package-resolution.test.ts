// cspell:words jsxdev jsxs
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { Plugin } from "esbuild"
import { expect, onTestFinished, test } from "vite-plus/test"

import { measureEntryWithPlugins } from "../src/measure.ts"
import { withPackageResolver } from "../src/package-resolution.ts"
import { createTonnageReport } from "../src/report.ts"
import type { BundlePlatform, TonnageConfig } from "../src/types.ts"

const recipe = `
import { h, Fragment } from "@fixture/peer/jsx-runtime";
export { shared as direct } from "@fixture/peer";
export { shared as feature } from "@fixture/peer/feature";
export { dependency as directDependency } from "fixture-dependency";
export { fromA, dependency } from "fixture-a";
export const view = <><main /></>;
`

test.each([`browser`, `node`, `neutral`] as const)(
	`resolves built packages once with %s conditions and preserves automatic JSX`,
	async (platform) => {
		const { workspacePackage, consumerPackage } = await makeFixture()
		const actual = await inspectRecipe(workspacePackage, platform, true)
		const consumer = await inspectRecipe(consumerPackage, platform, false)
		const condition = platform === `neutral` ? `default` : platform

		expect(actual.measurement).toEqual(consumer.measurement)
		expect(actual.inputs.some((input) => input.includes(`/src/`))).toBe(false)
		expect(
			actual.inputs.filter((input) => input.endsWith(`/lib/${condition}.js`)),
		).toHaveLength(1)
		expect(
			actual.inputs.some((input) => input.endsWith(`/lib/jsx-runtime.js`)),
		).toBe(true)
		expect(actual.output.direct).toEqual({ condition })
		expect(actual.output.fromA).toBe(actual.output.direct)
		expect(actual.output.feature).toBe(actual.output.direct)
		expect(actual.output.dependency).toBe(actual.output.directDependency)
		expect(actual.output.view).toMatchObject({
			tag: `fragment`,
			shared: { condition },
		})
		expect(actual.output.view.shared).toBe(actual.output.direct)

		const config = {
			platform,
			includePeers: true,
			recipes: [{ name: `App`, entry: `recipes/app.tsx` }],
		}
		expect(await createTonnageReport(config, workspacePackage)).toEqual(
			await createTonnageReport(config, consumerPackage),
		)
	},
)

test.each([`classic`, `development`] as const)(
	`preserves inherited %s JSX settings while ignoring package aliases`,
	async (jsx) => {
		const { workspacePackage, consumerPackage } = await makeFixture(jsx)
		const actual = await inspectRecipe(workspacePackage, `browser`, true)
		const consumer = await inspectRecipe(consumerPackage, `browser`, false)
		// Development JSX embeds absolute source paths, so compare runtime values
		// instead of byte counts between the two directories.
		expect(actual.output.view).toEqual(consumer.output.view)
		expect(actual.output.view.tag).toBe(`fragment`)
		expect(actual.output.view.shared).toBe(actual.output.direct)
		expect(actual.inputs.some((input) => input.includes(`/src/`))).toBe(false)
	},
)

test.each([`paths`, `baseUrl`] as const)(
	`ignores recipe-level %s package redirection, including the JSX runtime`,
	async (alias) => {
		const { workspacePackage, consumerPackage } = await makeFixture()
		await fs.rm(path.join(workspacePackage, `recipes/tsconfig.json`))
		if (alias === `baseUrl`) {
			const workspace = path.resolve(workspacePackage, `../..`)
			await fs.writeFile(
				path.join(workspace, `tsconfig.json`),
				JSON.stringify({
					extends: `./tsconfig.shared.json`,
					compilerOptions: { baseUrl: `.` },
				}),
			)
			await fs.writeFile(
				path.join(workspace, `fixture-dependency.ts`),
				`export const dependency = { source: true };`,
			)
		}
		const actual = await inspectRecipe(workspacePackage, `browser`, true)
		const consumer = await inspectRecipe(consumerPackage, `browser`, false)
		expect(actual.measurement).toEqual(consumer.measurement)
		expect(actual.output.direct).toEqual({ condition: `browser` })
		expect(actual.output.directDependency).toEqual({ built: true })
		expect(actual.output.view.shared).toBe(actual.output.direct)
	},
)

test(`preserves peer defaults and explicit report and recipe externals`, async () => {
	const { workspacePackage, consumerPackage } = await makeFixture()
	const app = { name: `App`, entry: `recipes/app.tsx` }
	const configs: TonnageConfig[] = [
		{ recipes: [app] },
		{ includePeers: true, external: [`@fixture/peer`], recipes: [app] },
		{ includePeers: true, recipes: [{ ...app, external: [`@fixture/peer`] }] },
		{ includePeers: true, external: [`@fixture/peer/feature`], recipes: [app] },
		{ includePeers: true, external: [`fixture-dependency`], recipes: [app] },
	]
	for (const config of configs) {
		expect(await createTonnageReport(config, workspacePackage)).toEqual(
			await createTonnageReport(config, consumerPackage),
		)
	}
})

test(`preserves optional imports guarded by try/catch or a rejection handler`, async () => {
	const { workspacePackage, consumerPackage } = await makeFixture()
	for (const directory of [workspacePackage, consumerPackage]) {
		await fs.appendFile(
			path.join(directory, `lib/index.js`),
			`
export function optional() {
  try { return require("missing-optional-package"); } catch { return "missing"; }
}
export function optionalDynamic() {
  return import("missing-optional-package").catch(() => "missing");
}
`,
		)
		await fs.appendFile(
			path.join(directory, `recipes/app.tsx`),
			`export { optional, optionalDynamic } from "fixture-a";`,
		)
	}
	const actual = await inspectRecipe(workspacePackage, `node`, true)
	const consumer = await inspectRecipe(consumerPackage, `node`, false)
	expect(actual.measurement).toEqual(consumer.measurement)
	expect(actual.output.optional()).toBe(`missing`)
	expect(await actual.output.optionalDynamic()).toBe(`missing`)
})

test(`does not use source aliases to bypass package exports or missing peers`, async () => {
	const { workspacePackage } = await makeFixture()
	await fs.writeFile(
		path.join(workspacePackage, `private.ts`),
		`export * from "@fixture/peer/private";`,
	)
	await expect(
		createTonnageReport(
			{
				exports: false,
				includePeers: true,
				recipes: [{ name: `Private`, entry: `private.ts` }],
			},
			workspacePackage,
		),
	).rejects.toThrow(`Could not resolve "@fixture/peer/private"`)

	await fs.rm(
		path.resolve(workspacePackage, `../../node_modules/@fixture/peer`),
	)
	await expect(
		createTonnageReport({ includePeers: true }, workspacePackage),
	).rejects.toThrow(`Could not resolve "@fixture/peer"`)
})

async function inspectRecipe(
	directory: string,
	platform: BundlePlatform,
	useResolver: boolean,
) {
	let inputs: string[] = []
	let code = ``
	const inspect: Plugin = {
		name: `inspect-bundle`,
		setup(build) {
			build.initialOptions.metafile = true
			build.onEnd((result) => {
				inputs = Object.keys(result.metafile!.inputs).map((input) =>
					input.replaceAll(`\\`, `/`),
				)
				code = result.outputFiles!.find((file) =>
					file.path.endsWith(`.js`),
				)!.text
			})
		},
	}
	const measure = (plugins: Plugin[]) =>
		measureEntryWithPlugins(`recipes/app.tsx`, {
			resolveDirectory: directory,
			platform,
			plugins: [...plugins, inspect],
		})
	const measurement = useResolver
		? await withPackageResolver(`fixture-a`, directory, (resolver) =>
				measure([resolver]),
			)
		: await measure([])
	const output = (await import(
		`data:text/javascript;base64,${Buffer.from(code).toString(`base64`)}`
	)) as {
		direct: unknown
		fromA: unknown
		feature: unknown
		dependency: unknown
		directDependency: unknown
		view: { tag: string; shared: unknown }
		optional: () => unknown
		optionalDynamic: () => Promise<unknown>
	}
	return { measurement, inputs, output }
}

async function makeFixture(
	jsx: `automatic` | `classic` | `development` = `automatic`,
) {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `tonnage-aliases-`))
	onTestFinished(() => fs.rm(root, { recursive: true, force: true }))
	const workspace = path.join(root, `workspace`)
	const workspacePackage = path.join(workspace, `packages/a`)
	const peer = path.join(workspace, `packages/peer`)
	const dependency = path.join(workspace, `packages/dependency`)
	const consumer = path.join(root, `consumer`)
	const consumerPackage = path.join(consumer, `app`)
	const write = async (file: string, contents: string) => {
		await fs.mkdir(path.dirname(file), { recursive: true })
		await fs.writeFile(file, contents)
	}
	const json = (file: string, value: unknown) =>
		write(file, JSON.stringify(value))
	const compilerOptions =
		jsx === `classic`
			? { jsx: `react`, jsxFactory: `h`, jsxFragmentFactory: `Fragment` }
			: {
					jsx: jsx === `development` ? `react-jsxdev` : `react-jsx`,
					jsxImportSource: `@fixture/peer`,
				}
	await json(path.join(workspace, `tsconfig.shared.json`), { compilerOptions })
	await json(path.join(workspace, `tsconfig.json`), {
		extends: `./tsconfig.shared.json`,
		compilerOptions: {
			baseUrl: `.`,
			paths: {
				"fixture-a": [`./packages/a/src/index.ts`],
				"@fixture/peer": [`./packages/peer/src/index.ts`],
				"@fixture/peer/*": [`./packages/peer/src/index.ts`],
				"fixture-dependency": [`./packages/dependency/src/index.ts`],
			},
		},
	})
	await json(path.join(workspacePackage, `package.json`), {
		name: `fixture-a`,
		type: `module`,
		exports: `./lib/index.js`,
		peerDependencies: { "@fixture/peer": `*` },
		dependencies: { "fixture-dependency": `*` },
	})
	const conditions = Object.fromEntries(
		[`browser`, `node`, `default`].map((condition) => [
			condition,
			`./lib/${condition}.js`,
		]),
	)
	await json(path.join(peer, `package.json`), {
		name: `@fixture/peer`,
		type: `module`,
		exports: {
			".": conditions,
			"./feature": conditions,
			"./jsx-runtime": `./lib/jsx-runtime.js`,
			"./jsx-dev-runtime": `./lib/jsx-runtime.js`,
		},
	})
	await json(path.join(dependency, `package.json`), {
		name: `fixture-dependency`,
		type: `module`,
		exports: `./lib/index.js`,
	})
	await write(
		path.join(workspacePackage, `lib/index.js`),
		`export { shared as fromA } from "@fixture/peer"; export { dependency } from "fixture-dependency";`,
	)
	await write(
		path.join(dependency, `lib/index.js`),
		`export const dependency = { built: true };`,
	)
	for (const condition of [`browser`, `node`, `default`]) {
		await write(
			path.join(peer, `lib/${condition}.js`),
			`export const shared = { condition: ${JSON.stringify(condition)} };`,
		)
	}
	await write(
		path.join(peer, `lib/jsx-runtime.js`),
		`
import { shared } from "@fixture/peer";
export const Fragment = "fragment";
export function h(tag, props, ...children) { return { tag, props, children, shared }; }
export function jsx(tag, props) { return { tag, props, shared }; }
export { jsx as jsxs, jsx as jsxDEV };
`,
	)
	for (const directory of [workspacePackage, peer, dependency]) {
		await write(
			path.join(directory, `src/index.ts`),
			`export const shared = { source: true }; export const dependency = shared; export const fromA = shared;`,
		)
	}
	await write(path.join(workspacePackage, `recipes/app.tsx`), recipe)
	// This local paths override fixes direct imports only; built files still
	// discover workspace aliases unless the package resolver isolates them.
	await json(path.join(workspacePackage, `recipes/tsconfig.json`), {
		extends: `../../../tsconfig.json`,
		compilerOptions: { paths: {} },
	})
	for (const [name, directory] of [
		[`@fixture/peer`, peer],
		[`fixture-dependency`, dependency],
	]) {
		const link = path.join(workspace, `node_modules`, name!)
		await fs.mkdir(path.dirname(link), { recursive: true })
		await fs.symlink(
			directory!,
			link,
			process.platform === `win32` ? `junction` : `dir`,
		)
	}
	// The consumer has only the manifests and built output, outside the workspace.
	for (const [name, directory] of [
		[`fixture-a`, workspacePackage],
		[`@fixture/peer`, peer],
		[`fixture-dependency`, dependency],
	]) {
		const destination =
			name === `fixture-a`
				? consumerPackage
				: path.join(consumer, `node_modules`, name!)
		await fs.mkdir(destination, { recursive: true })
		await fs.copyFile(
			path.join(directory!, `package.json`),
			path.join(destination, `package.json`),
		)
		await fs.cp(path.join(directory!, `lib`), path.join(destination, `lib`), {
			recursive: true,
		})
	}
	await write(path.join(consumerPackage, `recipes/app.tsx`), recipe)
	await json(path.join(consumerPackage, `tsconfig.json`), { compilerOptions })
	return { workspacePackage, consumerPackage }
}
