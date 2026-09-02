import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
	createTonnageReport,
	measureImports,
	renderTonnageMarkdown,
	runTonnage,
	tonnageMarkers,
	updateGeneratedSection,
} from "../src/index.ts"

describe(`tonnage reports`, () => {
	test(`renders an exports-only report without recipe details or a subsection`, () => {
		const markdown = renderTonnageMarkdown({
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
		expect(markdown).toContain(`<code>fixture-package</code>`)
		expect(markdown).not.toContain(`Usage example`)
		expect(markdown).not.toContain(`Recipe`)
		expect(markdown).not.toContain(`### `)
	})

	test(`renders a recipes-only report without export details or a subsection`, () => {
		const markdown = renderTonnageMarkdown({
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

	test(`labels both table types in a combined report`, () => {
		const markdown = renderTonnageMarkdown({
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

	test(`measures the actual bundled output`, async () => {
		const fixture = await makeFixture()
		const measurement = await measureImports([fixture.entryPath], {
			resolveDirectory: fixture.directory,
		})

		expect(measurement.rawBytes).toBeGreaterThan(1_000)
		expect(measurement.gzipBytes).toBeGreaterThan(0)
		expect(measurement.gzipBytes).toBeLessThan(measurement.rawBytes)
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
		expect(renderTonnageMarkdown(report)).toContain(`shared modules`)
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

	test(`writes generated README sections and detects drift`, async () => {
		const fixture = await makeFixture()
		const { end, start } = tonnageMarkers(`fixture`)
		await fs.writeFile(
			fixture.readmePath,
			[`# Fixture`, ``, start, `stale`, end, ``].join(`\n`),
		)
		const config = {
			marker: `fixture`,
			packageJson: `package.json`,
			readme: `README.md`,
		}

		const stale = await runTonnage(config, {
			configDirectory: fixture.directory,
			mode: `check`,
		})
		expect(stale.changed).toBe(true)

		const written = await runTonnage(config, {
			configDirectory: fixture.directory,
			mode: `write`,
		})
		expect(written.changed).toBe(true)

		const current = await runTonnage(config, {
			configDirectory: fixture.directory,
			mode: `check`,
		})
		expect(current.changed).toBe(false)
	})

	test(`requires one ordered marker pair`, () => {
		expect(() => updateGeneratedSection(`# README`, `report`)).toThrow(
			`README must contain exactly one`,
		)
	})
})

async function makeFixture(): Promise<{
	directory: string
	entryPath: string
	readmePath: string
}> {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), `tonnage-test-`))
	const entryPath = path.join(directory, `index.js`)
	const featurePath = path.join(directory, `feature.js`)
	const recipePath = path.join(directory, `recipe.js`)
	const readmePath = path.join(directory, `README.md`)
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
		fs.writeFile(readmePath, `# Fixture\n`),
	])

	return { directory, entryPath, readmePath }
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
