import { defineConfig } from "tonnage"
import type {
	BundlePlatform,
	TonnageConfig,
	TonnageExports,
	TonnageProps,
	TonnageRecipe,
} from "tonnage"

const platform: BundlePlatform = "node"
const exports: TonnageExports = { include: ["."] }
const recipe: TonnageRecipe = {
	name: "Example",
	entry: "./recipe.ts",
	platform,
}
const config: TonnageConfig = defineConfig({
	exports,
	includePeers: true,
	recipes: [recipe],
	platform,
})
export const props: TonnageProps = { config, directory: "../package" }

defineConfig({
	// @ts-expect-error Galley owns document output paths.
	readme: "README.md",
})
defineConfig({
	// @ts-expect-error Reports are placed by MDX components, without markers.
	marker: "default",
})
