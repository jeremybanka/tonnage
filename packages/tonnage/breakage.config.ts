import { changesetsReleaseDelta } from "@breakage/changesets"
import { defineConfig, semverPolicy, type BreakageConfig } from "breakage"

const config: BreakageConfig = defineConfig({
	release: {
		resolveDelta: changesetsReleaseDelta(),
		policy: semverPolicy({ beforeV1: "minor" }),
	},
	npm: {
		artifact: ".breakage/package.tgz",
		representatives: "peer-environments/*",
		lockfile: "pnpm-lock.yaml",
		prepareCommand: "pnpm install --frozen-lockfile --ignore-scripts",
		suites: {
			"galley.md": {
				files: ["__tests__/fixtures/consumer/*"],
				command:
					"node --test __tests__/fixtures/consumer/runtime.ts && node ../node_modules/typescript/bin/tsc -p __tests__/fixtures/consumer/tsconfig.consumer.json",
			},
		},
		baseline: { tagPattern: "refs/tags/tonnage@" },
	},
})

export default config
