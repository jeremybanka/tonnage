import { defineConfig } from "vite-plus"

export default defineConfig({
	pack: [
		{
			tsconfig: "tsconfig.build.json",
			clean: true,
			deps: {
				// tsdown <0.23 compatibility: resolve external dependency subpaths.
				// Remove to preserve subpath imports as written (the new default).
				// https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
				resolveDepSubpath: true,
				dts: {
					neverBundle: [/^[\w@]/],
				},
				neverBundle: true,
				onlyBundle: [],
			},
			dts: {
				entry: ["src/index.ts", "src/md-x.ts"],
				sourcemap: true,
			},
			entry: {
				cli: "src/cli.ts",
				index: "src/index.ts",
				"md-x": "src/md-x.ts",
			},
			format: "esm",
			outDir: "dist",
			sourcemap: true,
		},
	],
	test: {
		include: ["__tests__/**/*.test.ts"],
	},
})
