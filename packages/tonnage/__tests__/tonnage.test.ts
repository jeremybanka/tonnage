import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { describe, expect, onTestFinished, test } from "vite-plus/test"

import { Markdown, renderMarkdown } from "galley.md"

import { measureEntry, measureImports } from "../src/measure.ts"
import { createTonnageReport } from "../src/report.ts"
import { reportContent } from "../src/report-content.ts"
import type { TonnageConfig, TonnageReport } from "../src/types.ts"

function renderReport(report: TonnageReport, config: TonnageConfig = {}) {
	return renderMarkdown(reportContent(report, config), {
		directory: process.cwd(),
		path: path.resolve("README.mdx"),
	})
}

describe(`tonnage reports`, () => {
	test(`renders an exports-only report without recipe details or a subsection`, async () => {
		const markdown = await renderReport({
			exports: [
				{
					gzipBytes: 48,
					imports: [`fixture-package`],
					name: `fixture-package`,
					rawBytes: 120,
				},
			],
			packageName: `fixture-package`,
			recipes: [],
		})

		expect(markdown).toContain(`complete runtime export surfaces`)
		expect(markdown).toContain("`fixture-package`")
		expect(markdown).not.toContain(`Usage example`)
		expect(markdown).not.toContain(`Recipe`)
		expect(markdown).not.toContain(`### `)
	})

	test(`renders a recipes-only report without export details or a subsection`, async () => {
		const markdown = await renderReport({
			exports: [],
			packageName: `fixture-package`,
			recipes: [
				{
					entry: `recipe.js`,
					gzipBytes: 32,
					name: `One feature`,
					rawBytes: 80,
				},
			],
		})

		expect(markdown).toContain(`tree-shake unused exports`)
		expect(markdown).toContain(`One feature`)
		expect(markdown).not.toContain(`Package export`)
		expect(markdown).not.toContain(`Public modules`)
		expect(markdown).not.toContain(`### `)
	})

	test(`labels both table types in a combined report`, async () => {
		const markdown = await renderReport({
			exports: [
				{
					gzipBytes: 48,
					imports: [`fixture-package`],
					name: `fixture-package`,
					rawBytes: 120,
				},
			],
			packageName: `fixture-package`,
			recipes: [
				{
					entry: `recipe.js`,
					gzipBytes: 32,
					name: `One feature`,
					rawBytes: 80,
				},
			],
		})

		expect(markdown).toContain(`complete runtime export surfaces`)
		expect(markdown).toContain(`tree-shake unused exports`)
		expect(markdown).toContain(`### Package exports`)
		expect(markdown).toContain(`### Usage examples`)
	})

	test("preserves literal table text and code while aligning byte columns", async () => {
		const importName = "@fixture/a|b`<c>&"
		const entry = "./examples/a|b`<c>&.ts"
		const markdown = await renderReport({
			packageName: importName,
			exports: [
				{
					name: importName,
					imports: [importName],
					rawBytes: 1234,
					gzipBytes: 567,
				},
			],
			recipes: [
				{
					name: "*Literal* | <recipe> & [label]\nnext line",
					entry,
					rawBytes: 2345,
					gzipBytes: 678,
				},
			],
		})
		const tables = Markdown({ children: markdown }).children.filter(
			(node) => node.type === "table",
		)
		expect(tables).toHaveLength(2)
		expect(tables[0]?.align).toEqual([null, "right", "right"])
		expect(tables[1]?.align).toEqual([null, null, "right", "right"])
		expect(
			tables[0]?.children[1]?.children.map((cell) => cell.children),
		).toEqual([
			[{ type: "inlineCode", value: importName, position: expect.any(Object) }],
			[{ type: "text", value: "1,234 B", position: expect.any(Object) }],
			[{ type: "text", value: "567 B", position: expect.any(Object) }],
		])
		expect(tables[1]?.children[1]?.children[0]?.children).toEqual([
			{
				type: "text",
				value: "*Literal* | <recipe> & [label] next line",
				position: expect.any(Object),
			},
		])
		expect(tables[1]?.children[1]?.children[1]?.children).toEqual([
			{ type: "inlineCode", value: entry, position: expect.any(Object) },
		])
	})

	test("renders an empty report without tables or measurement-specific prose", async () => {
		const markdown = await renderReport(
			{ packageName: "fixture", exports: [], recipes: [] },
			{ heading: "Size [budget]" },
		)
		const document = Markdown({ children: markdown })
		expect(document.children[0]).toMatchObject({
			type: "heading",
			depth: 2,
			children: [{ type: "text", value: "Size [budget]" }],
		})
		expect(document.children.some((node) => node.type === "table")).toBe(false)
		expect(markdown).toContain("level-9 gzip")
		expect(markdown).toContain("Report maintained with")
		expect(markdown).not.toContain("Package export sizes")
		expect(markdown).not.toContain("Usage example sizes")
	})

	test(`measures the actual bundled output`, async () => {
		const fixture = await makeFixture()
		const measurement = await measureImports([fixture.entryPath], {
			resolveDirectory: fixture.directory,
		})

		expect(measurement.rawBytes).toBeGreaterThan(1_000)
		expect(measurement.gzipBytes).toBeGreaterThan(0)
		expect(measurement.gzipBytes).toBeLessThan(measurement.rawBytes)
	})

	test(`includes imported peers and their subpaths in export and recipe sizes when enabled`, async () => {
		const { directory, entryPath } = await makePeerFixture()
		const config = {
			recipes: [{ name: `With peer`, entry: `recipe.ts` }],
		}
		const external = await createTonnageReport(config, directory)
		const included = await createTonnageReport(
			{ ...config, includePeers: true },
			directory,
		)
		const expectedExport = await measureImports([entryPath], {
			resolveDirectory: directory,
		})
		const expectedRecipe = await measureEntry(`recipe.ts`, {
			resolveDirectory: directory,
		})

		expect(included.exports[0]).toMatchObject(expectedExport)
		expect(included.recipes[0]).toMatchObject(expectedRecipe)
		expect(included.exports[0]!.rawBytes).toBeGreaterThan(
			external.exports[0]!.rawBytes + 1_000,
		)
		expect(included.recipes[0]!.rawBytes).toBeGreaterThan(
			external.recipes[0]!.rawBytes + 1_000,
		)
		expect(included.recipes[0]!.rawBytes).toBeLessThan(
			included.exports[0]!.rawBytes,
		)
		expect(await renderReport(external, config)).toContain(
			`Peer dependencies stay external`,
		)
		const markdown = await renderReport(included, { includePeers: true })
		expect(markdown).toContain(
			`Imported peer dependencies are bundled unless explicitly external`,
		)
		expect(markdown).not.toContain(`Peer dependencies stay external`)
	})

	test(`explicit external entries override peer inclusion for exports and recipes`, async () => {
		const { directory } = await makePeerFixture()
		const config = {
			recipes: [{ name: `With peer`, entry: `recipe.ts` }],
		}
		const baseline = await createTonnageReport(config, directory)
		const reportExternal = await createTonnageReport(
			{ ...config, includePeers: true, external: [`@fixture/peer`] },
			directory,
		)
		const recipeExternal = await createTonnageReport(
			{
				includePeers: true,
				recipes: [{ ...config.recipes[0]!, external: [`@fixture/peer`] }],
			},
			directory,
		)

		expect(reportExternal).toEqual(baseline)
		expect(recipeExternal.recipes).toEqual(baseline.recipes)
		expect(recipeExternal.exports[0]!.rawBytes).toBeGreaterThan(
			baseline.exports[0]!.rawBytes + 1_000,
		)
	})

	test(`requires imported peers to resolve only when inclusion is enabled`, async () => {
		const { directory } = await makePeerFixture()
		await fs.rm(path.join(directory, `node_modules`), { recursive: true })
		const baseline = await createTonnageReport({}, directory)
		expect(
			await createTonnageReport({ includePeers: false }, directory),
		).toEqual(baseline)
		await expect(
			createTonnageReport({ includePeers: true }, directory),
		).rejects.toThrow(`Could not resolve "@fixture/peer`)
		expect(
			await createTonnageReport(
				{ includePeers: true, external: [`@fixture/peer`] },
				directory,
			),
		).toEqual(baseline)
	})

	test(`counts emitted runtime JavaScript only`, async () => {
		const fixture = await makeFixture()
		const javascriptOnly = await measureImports([fixture.entryPath], {
			resolveDirectory: fixture.directory,
		})
		const entry = await fs.readFile(fixture.entryPath, `utf8`)
		await Promise.all([
			fs.writeFile(fixture.entryPath, `import "./style.css";\n${entry}`),
			fs.writeFile(
				path.join(fixture.directory, `style.css`),
				`.fixture { content: "${`runtime-js-only`.repeat(2_000)}"; }`,
			),
		])

		const withCss = await measureImports([fixture.entryPath], {
			resolveDirectory: fixture.directory,
		})

		expect(withCss.rawBytes).toBe(javascriptOnly.rawBytes)
		expect(Math.abs(withCss.gzipBytes - javascriptOnly.gzipBytes)).toBeLessThan(
			5,
		)
	})

	test(`discovers package exports and deduplicates recipe graphs`, async () => {
		const fixture = await makeFixture()
		const config = {
			packageJson: `package.json`,
			recipes: [
				{
					entry: `recipe.js`,
					name: `Everything`,
				},
			],
		}
		const report = await createTonnageReport(config, fixture.directory)

		expect(report.exports.map((row) => row.name)).toEqual([
			`fixture-package`,
			`fixture-package/feature`,
		])
		expect(report.recipes).toHaveLength(1)
		expect(report.recipes[0]?.rawBytes).toBeLessThan(
			report.exports[0]?.rawBytes ?? 0,
		)
		expect(report.recipes[0]?.rawBytes).toBeLessThan(
			(report.exports[0]?.rawBytes ?? 0) + (report.exports[1]?.rawBytes ?? 0),
		)
		expect(report.recipes[0]?.entry).toBe(`recipe.js`)
		const markdown = await renderReport(report)
		expect(markdown).toContain(`shared modules`)
		expect(markdown).toContain(
			`Report maintained with [tonnage](https://github.com/jeremybanka/tonnage).`,
		)
	})

	test.each([
		[`neutral`, `neutral.js`],
		[`browser`, `browser.js`],
		[`node`, `node.js`],
	] as const)(
		`resolves package exports with %s conditions without a self dependency`,
		async (platform, entry) => {
			const fixture = await makeConditionalExportsFixture()
			expect(
				await pathExists(
					path.join(
						fixture.directory,
						`node_modules`,
						`@tonnage-fixture`,
						`package`,
					),
				),
			).toBe(false)

			const report = await createTonnageReport(
				{ packageJson: `package.json`, platform },
				fixture.directory,
			)
			const expected = await measureImports(
				[path.join(fixture.directory, entry)],
				{
					external: [`fixture-peer`],
					platform,
					resolveDirectory: fixture.directory,
				},
			)

			expect(report.exports.map((row) => row.name)).toEqual([
				`@tonnage-fixture/package`,
				`@tonnage-fixture/package/feature`,
			])
			expect(report.exports[0]).toMatchObject(expected)
		},
	)

	test(`resolves main-only packages and dependencies on the neutral platform`, async () => {
		const fixture = await makeMainOnlyFixture()
		expect(
			await pathExists(
				path.join(fixture.directory, `node_modules`, `main-only-package`),
			),
		).toBe(false)

		const report = await createTonnageReport(
			{ packageJson: `package.json` },
			fixture.directory,
		)

		expect(report.exports).toHaveLength(1)
		expect(report.exports[0]?.name).toBe(`main-only-package`)
		expect(report.exports[0]?.rawBytes).toBeGreaterThan(100)
	})

	test.each([
		[`browser`, `browser.js`],
		[`node`, `node.js`],
	] as const)(
		`keeps esbuild's %s main-field behavior`,
		async (platform, entry) => {
			const fixture = await makeConditionalExportsFixture()
			const dependencyDirectory = path.join(
				fixture.directory,
				`node_modules`,
				`legacy-field-dependency`,
			)

			const measurement = await measureImports([`legacy-field-dependency`], {
				platform,
				resolveDirectory: fixture.directory,
			})
			const expected = await measureImports(
				[path.join(dependencyDirectory, entry)],
				{
					platform,
					resolveDirectory: fixture.directory,
				},
			)

			expect(measurement).toEqual(expected)
		},
	)
})

async function makeFixture(): Promise<{
	directory: string
	entryPath: string
}> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), `tonnage-test-`))
	const entryPath = path.join(directory, `index.js`)
	const featurePath = path.join(directory, `feature.js`)
	const recipePath = path.join(directory, `recipe.js`)
	const compressibleText = `tonnage bundle size `.repeat(200)

	await Promise.all([
		fs.writeFile(
			path.join(directory, `package.json`),
			JSON.stringify({
				exports: {
					".": `./index.js`,
					"./feature": `./feature.js`,
					"./package.json": `./package.json`,
				},
				name: `fixture-package`,
				type: `module`,
			}),
		),
		fs.writeFile(
			entryPath,
			`export { feature } from "./feature.js"; export const text = ${JSON.stringify(compressibleText)};`,
		),
		fs.writeFile(featurePath, `export const feature = "feature";`),
		fs.writeFile(
			recipePath,
			`export { feature } from "fixture-package"; export { feature as directFeature } from "fixture-package/feature";`,
		),
	])

	return { directory, entryPath }
}

async function makeConditionalExportsFixture(): Promise<{
	directory: string
}> {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), `tonnage-conditional-exports-test-`),
	)
	const dependencyDirectory = path.join(
		directory,
		`node_modules`,
		`main-only-dependency`,
	)
	const legacyDependencyDirectory = path.join(
		directory,
		`node_modules`,
		`legacy-field-dependency`,
	)
	await Promise.all([
		fs.mkdir(dependencyDirectory, { recursive: true }),
		fs.mkdir(legacyDependencyDirectory, { recursive: true }),
	])
	await Promise.all([
		fs.writeFile(
			path.join(directory, `package.json`),
			JSON.stringify({
				exports: {
					".": {
						browser: `./browser.js`,
						node: `./node.js`,
						default: `./neutral.js`,
					},
					"./feature": `./feature.js`,
				},
				name: `@tonnage-fixture/package`,
				peerDependencies: { "fixture-peer": `*` },
				type: `module`,
			}),
		),
		...([`browser`, `neutral`, `node`] as const).map((condition) =>
			fs.writeFile(
				path.join(directory, `${condition}.js`),
				[
					`import { dependency } from "main-only-dependency"`,
					`import { peer } from "fixture-peer"`,
					`import { peerSubpath } from "fixture-peer/subpath"`,
					`import { feature } from "@tonnage-fixture/package/feature"`,
					`export const value = dependency + peer + peerSubpath + feature + ${JSON.stringify(condition.repeat(100))}`,
				].join(`\n`),
			),
		),
		fs.writeFile(
			path.join(directory, `feature.js`),
			`export const feature = "feature"`,
		),
		fs.writeFile(
			path.join(dependencyDirectory, `package.json`),
			JSON.stringify({
				main: `./index.js`,
				name: `main-only-dependency`,
				type: `module`,
			}),
		),
		fs.writeFile(
			path.join(dependencyDirectory, `index.js`),
			`export const dependency = ${JSON.stringify(`runtime dependency `.repeat(20))}`,
		),
		fs.writeFile(
			path.join(legacyDependencyDirectory, `package.json`),
			JSON.stringify({
				browser: `./browser.js`,
				main: `./node.js`,
				name: `legacy-field-dependency`,
				type: `module`,
			}),
		),
		fs.writeFile(
			path.join(legacyDependencyDirectory, `browser.js`),
			`export const legacy = ${JSON.stringify(`browser field `.repeat(30))}`,
		),
		fs.writeFile(
			path.join(legacyDependencyDirectory, `node.js`),
			`export const legacy = ${JSON.stringify(`node main field `.repeat(20))}`,
		),
	])

	return { directory }
}

async function makeMainOnlyFixture(): Promise<{ directory: string }> {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), `tonnage-main-only-test-`),
	)
	const dependencyDirectory = path.join(
		directory,
		`node_modules`,
		`main-only-dependency`,
	)
	await fs.mkdir(dependencyDirectory, { recursive: true })
	await Promise.all([
		fs.writeFile(
			path.join(directory, `package.json`),
			JSON.stringify({
				main: `./main.js`,
				name: `main-only-package`,
				type: `module`,
			}),
		),
		fs.writeFile(
			path.join(directory, `main.js`),
			`export { dependency } from "main-only-dependency"`,
		),
		fs.writeFile(
			path.join(dependencyDirectory, `package.json`),
			JSON.stringify({
				main: `./index.js`,
				name: `main-only-dependency`,
				type: `module`,
			}),
		),
		fs.writeFile(
			path.join(dependencyDirectory, `index.js`),
			`export const dependency = ${JSON.stringify(`main-only runtime dependency `.repeat(20))}`,
		),
	])

	return { directory }
}

async function pathExists(filePath: string): Promise<boolean> {
	return fs.access(filePath).then(
		() => true,
		() => false,
	)
}

async function makePeerFixture(): Promise<{
	directory: string
	entryPath: string
}> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), `tonnage-peers-`))
	onTestFinished(() => fs.rm(directory, { recursive: true, force: true }))
	const peerDirectory = path.join(directory, `node_modules`, `@fixture`, `peer`)
	await fs.mkdir(peerDirectory, { recursive: true })
	const entryPath = path.join(directory, `index.ts`)
	await Promise.all([
		fs.writeFile(
			path.join(directory, `package.json`),
			JSON.stringify({
				name: `peer-fixture`,
				type: `module`,
				exports: `./index.ts`,
				peerDependencies: { "@fixture/peer": `*`, "unused-peer": `*` },
				peerDependenciesMeta: { "unused-peer": { optional: true } },
			}),
		),
		fs.writeFile(
			entryPath,
			`export { shared } from "@fixture/peer"; export { feature } from "@fixture/peer/feature"; export const unused = ${JSON.stringify(`unused export `.repeat(200))};`,
		),
		fs.writeFile(
			path.join(directory, `recipe.ts`),
			`export { shared, feature } from "./index.ts"; export { shared as direct } from "@fixture/peer";`,
		),
		fs.writeFile(
			path.join(peerDirectory, `package.json`),
			JSON.stringify({
				name: `@fixture/peer`,
				type: `module`,
				exports: { ".": `./index.ts`, "./feature": `./feature.ts` },
			}),
		),
		fs.writeFile(
			path.join(peerDirectory, `index.ts`),
			`export const shared = ${JSON.stringify(`shared peer code `.repeat(200))};`,
		),
		fs.writeFile(
			path.join(peerDirectory, `feature.ts`),
			`import { shared } from "./index.ts"; export const feature = shared + ${JSON.stringify(`peer feature `.repeat(200))};`,
		),
	])
	return { directory, entryPath }
}
