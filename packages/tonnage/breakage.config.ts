import type { NpmConfig } from "breakage"

import { releaseIntent } from "../../scripts/breakage-peers.ts"

export default {
	npm: {
		artifact: ".breakage/package.tgz",
		representatives: "peer-environments/*",
		lockfile: "pnpm-lock.yaml",
		prepareCommand: "pnpm install --frozen-lockfile --ignore-scripts",
		suites: {
			"galley.md": {
				files: ["__tests__/fixtures/consumer/*"],
				command:
					"node --test __tests__/fixtures/consumer/runtime.ts && node ../node_modules/typescript/bin/tsc -p __tests__/fixtures/consumer/tsconfig.json",
			},
		},
		baseline: { tagPattern: "refs/tags/tonnage@" },
		releaseIntent,
		certifyBreaking: ({ previousVersion, release }) =>
			release.delta === "major" ||
			(previousVersion.startsWith("0.") && release.delta === "minor"),
	} satisfies NpmConfig,
}
