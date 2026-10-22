import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, expect, test } from "vite-plus/test"

import { compileMarkdown, renderMarkdown } from "galley.md"

import { Tonnage } from "../src/index.ts"

const directories: string[] = []
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => fs.rm(directory, { recursive: true, force: true })),
	)
})

test.each(["default", "relative", "absolute"])(
	"resolves the measured package with a %s directory",
	async (mode) => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "tonnage-directory-"))
		directories.push(root)
		const directory = path.join(root, "package")
		const docs = path.join(root, "docs")
		await Promise.all([fs.mkdir(directory), fs.mkdir(docs)])
		await fs.writeFile(
			path.join(directory, "package.json"),
			JSON.stringify({
				name: "directory-fixture",
				type: "module",
				exports: "./index.ts",
			}),
		)
		await fs.writeFile(
			path.join(directory, "index.ts"),
			"export const value = 42\n",
		)
		const context = {
			directory: mode === "default" ? directory : docs,
			path: path.join(mode === "default" ? directory : docs, "README.mdx"),
		}
		const props =
			mode === "default"
				? {}
				: { directory: mode === "relative" ? "../package" : directory }
		const markdown = await renderMarkdown(
			await Tonnage(props, context),
			context,
		)
		expect(markdown).toContain("`directory-fixture`")
		expect(markdown).toMatch(/[1-9][0-9,]* B/)
	},
)

test("a tonnage component measures real imports beside an embedded source example", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tonnage-galley-"))
	directories.push(directory)
	const component = fileURLToPath(new URL("../src/index.ts", import.meta.url))
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
	const context = { directory, path: input }
	expect(markdown).toContain(
		await renderMarkdown(await Tonnage({ config }, context), context),
	)
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
