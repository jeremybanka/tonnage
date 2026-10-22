import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { compileMarkdown, renderMarkdown } from "galley.md"
import {
	createTonnageReport,
	defineConfig,
	renderTonnageMarkdown,
} from "tonnage"
import { Tonnage } from "tonnage/galley"

await test("the packed API, component, and CLI render with the consumer's Galley", async () => {
	// Stay inside the isolated consumer so MDX resolves its installed packages.
	const directory = await fs.mkdtemp(path.join(process.cwd(), "fixture-"))
	try {
		await fs.writeFile(
			path.join(directory, "package.json"),
			JSON.stringify({
				name: "peer-fixture",
				type: "module",
				exports: { ".": "./index.ts" },
			}),
		)
		await fs.writeFile(
			path.join(directory, "index.ts"),
			"export const value = 42\n",
		)
		await fs.writeFile(
			path.join(directory, "recipe.ts"),
			"export { value } from 'peer-fixture'\n",
		)
		const config = defineConfig({
			recipes: [{ name: "Value | sample", entry: "./recipe.ts" }],
		})
		const report = await createTonnageReport(config, directory)
		assert.equal(report.exports.length, 1)
		assert.equal(report.recipes.length, 1)
		assert.ok(report.exports[0]!.rawBytes > 0)
		const markdown = await renderTonnageMarkdown(report, config)
		assert.match(markdown, /## Bundle size/)
		assert.match(markdown, /peer-fixture/)
		assert.match(markdown, /Value \\\| sample/)
		assert.match(markdown, /\d+ B/)

		const input = path.join(directory, "README.mdx")
		const context = { directory, path: input }
		assert.equal(
			await renderMarkdown(await Tonnage({ config }, context), context),
			markdown,
		)
		await fs.writeFile(
			input,
			`import { Tonnage } from "tonnage/galley"

# Consumer

<Tonnage config={${JSON.stringify(config)}} />
`,
		)
		assert.ok((await compileMarkdown(input)).includes(markdown))
		await assert.rejects(fs.stat(path.join(directory, "README.md")), {
			code: "ENOENT",
		})

		await fs.writeFile(
			path.join(directory, "tonnage.config.ts"),
			`export default ${JSON.stringify(config)}\n`,
		)
		await fs.writeFile(
			path.join(directory, "README.md"),
			"# Consumer\n\n<!-- tonnage:default:start -->\n<!-- tonnage:default:end -->\n",
		)
		const cli = fileURLToPath(
			new URL("./dist/cli.mjs", import.meta.resolve("tonnage/package.json")),
		)
		execFileSync(process.execPath, [cli, "write"], { cwd: directory })
		assert.ok(
			(await fs.readFile(path.join(directory, "README.md"), "utf8")).includes(
				markdown.trim(),
			),
		)
		execFileSync(process.execPath, [cli, "check"], { cwd: directory })
	} finally {
		await fs.rm(directory, { recursive: true, force: true })
	}
})
