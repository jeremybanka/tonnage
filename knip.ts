import type { KnipConfig } from "knip"

// Public source entrypoints remain roots, including CLIs, workers, and conditional exports.
// Formatter plugins and JSON schemas are loaded by configuration paths, not imports.
// Generated distributions are checked through their authored source entrypoints.
export default {
	workspaces: {
		".": {
			entry: ["scripts/*.{ts,tsx}"],
			project: ["*.ts", "scripts/**/*.{ts,tsx}"],
			ignoreDependencies: [
				"@dprint/json",
				"@dprint/markdown",
				"@dprint/oxc",
				"@dprint/toml",
				"dprint-plugin-malva",
				"dprint-plugin-yaml",
			],
		},
		"packages/tonnage": {
			entry: [
				"src/index.ts!",
				"breakage.config.ts",
				"__tests__/fixtures/**/*.{ts,tsx,js,mjs,cjs}",
				"peer-environments/**/*.{ts,tsx,js,mjs,cjs}",
				"examples/**/*.{ts,tsx}",
			],
			project: [
				"*.ts",
				"{src,bin}/**/*.{ts,tsx}!",
				"{tests,__tests__,peer-environments,examples}/**/*.{ts,tsx,js,mjs,cjs}",
			],
			ignoreDependencies: [
				// Placeholder import in the published recipe example.
				"my-package",
			],
		},
	},
	ignore: ["**/dist/**"],
} satisfies KnipConfig
