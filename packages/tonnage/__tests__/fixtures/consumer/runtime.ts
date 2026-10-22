import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { compileMarkdown, renderMarkdown } from "galley.md"
import * as tonnage from "tonnage"
import { defineConfig, Tonnage, type TonnageProps } from "tonnage"

await test("the packed component works with the consumer's Galley write/check workflow", async () => {
	assert.deepEqual(Object.keys(tonnage).sort(), ["Tonnage", "defineConfig"])
	const manifest = JSON.parse(
		await fs.readFile(
			new URL(import.meta.resolve("tonnage/package.json")),
			"utf8",
		),
	)
	assert.equal(manifest.bin, undefined)
	assert.equal(manifest.dependencies.comline, undefined)
	assert.throws(() => import.meta.resolve("tonnage/galley"), {
		code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
	})

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
		const input = path.join(directory, "README.mdx")
		const context = { directory, path: input }
		const props: TonnageProps = { config }
		const markdown = await renderMarkdown(
			await Tonnage(props, context),
			context,
		)
		assert.match(markdown, /## Bundle size/)
		assert.match(markdown, /### Package exports/)
		assert.match(markdown, /### Usage examples/)
		assert.match(markdown, /peer-fixture/)
		assert.match(markdown, /Value \\\| sample/)
		assert.match(markdown, /[1-9][0-9,]* B/)
		await fs.writeFile(
			input,
			`import { Tonnage } from "tonnage"
import config from "./tonnage.config.ts"

# Consumer

<Tonnage config={config} />
`,
		)
		await fs.writeFile(
			path.join(directory, "tonnage.config.ts"),
			`import { defineConfig } from "tonnage"\nexport default defineConfig(${JSON.stringify(config)})\n`,
		)
		const compiled = await compileMarkdown(input)
		assert.ok(compiled.includes(markdown))
		const output = path.join(directory, "README.md")
		await assert.rejects(fs.stat(output), { code: "ENOENT" })

		const galleyPackage = new URL(import.meta.resolve("galley.md/package.json"))
		const galleyManifest = JSON.parse(await fs.readFile(galleyPackage, "utf8"))
		const cli = fileURLToPath(new URL(galleyManifest.bin.galley, galleyPackage))
		const missing = spawnSync(process.execPath, [cli, "check"], {
			cwd: directory,
			encoding: "utf8",
		})
		assert.equal(missing.status, 1, missing.stderr)
		await assert.rejects(fs.stat(output), { code: "ENOENT" })
		execFileSync(process.execPath, [cli, "write"], { cwd: directory })
		assert.equal(await fs.readFile(output, "utf8"), compiled)
		execFileSync(process.execPath, [cli, "check"], { cwd: directory })

		// A package change must invalidate the generated report without check writing it.
		await fs.writeFile(
			path.join(directory, "index.ts"),
			`export const value = ${JSON.stringify("more bundle content ".repeat(100))}\n`,
		)
		const stale = spawnSync(process.execPath, [cli, "check"], {
			cwd: directory,
			encoding: "utf8",
		})
		assert.equal(stale.status, 1, stale.stderr)
		assert.match(stale.stderr, /out of date/)
		assert.equal(await fs.readFile(output, "utf8"), compiled)
		execFileSync(process.execPath, [cli, "write"], { cwd: directory })
		assert.notEqual(await fs.readFile(output, "utf8"), compiled)
		execFileSync(process.execPath, [cli, "check"], { cwd: directory })
	} finally {
		await fs.rm(directory, { recursive: true, force: true })
	}
})
