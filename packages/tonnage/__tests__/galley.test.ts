import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, expect, test } from "vite-plus/test"

import { compileMarkdown } from "galley.md"

import { createTonnageReport, renderTonnageMarkdown } from "../src/index.ts"

const directories: string[] = []
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => fs.rm(directory, { recursive: true, force: true })),
	)
})

test("a tonnage component measures real imports beside an embedded source example", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tonnage-galley-"))
	directories.push(directory)
	const component = fileURLToPath(new URL("../src/galley.ts", import.meta.url))
	await fs.writeFile(
		path.join(directory, "package.json"),
		JSON.stringify({
			name: "component-fixture",
			type: "module",
			exports: { ".": "./index.ts" },
		}),
	)
	await fs.writeFile(
		path.join(directory, "index.ts"),
		"export const greet = (name: string) => `hello ${name}`\n",
	)
	await fs.writeFile(
		path.join(directory, "recipe.ts"),
		"export { greet } from 'component-fixture'\n",
	)
	const input = path.join(directory, "README.mdx")
	const config = { recipes: [{ name: "Greeting", entry: "./recipe.ts" }] }
	await fs.writeFile(
		input,
		`import { Tonnage } from ${JSON.stringify(component)}
import Example from './recipe.ts' with { type: 'code', lang: 'ts' }

# Fixture

<Example />

<Tonnage config={${JSON.stringify(config)}} />
`,
	)
	const markdown = await compileMarkdown(input)
	const report = await createTonnageReport(config, directory)
	expect(markdown).toContain(await renderTonnageMarkdown(report, config))
	expect(markdown).toContain("# Fixture")
	expect(markdown).toContain("export { greet } from 'component-fixture'")
	expect(markdown).toContain("## Bundle size")
	expect(markdown).toContain("component-fixture")
	expect(markdown).toContain("Greeting")
	expect(markdown).toContain("level-9 gzip")
	expect(markdown).toMatch(/\d+ B/)
	expect(markdown).not.toContain("<Tonnage")
	await expect(
		fs.stat(path.join(directory, "README.md")),
	).rejects.toMatchObject({ code: "ENOENT" })
})
