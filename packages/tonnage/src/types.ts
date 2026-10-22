export type BundlePlatform = `browser` | `neutral` | `node`

export type TonnageExports = {
	exclude?: readonly string[]
	include?: readonly string[]
}

export type TonnageRecipe = {
	entry: string
	external?: readonly string[]
	name: string
	platform?: BundlePlatform
}

export type TonnageConfig = {
	exports?: boolean | TonnageExports
	external?: readonly string[]
	heading?: string
	packageJson?: string
	platform?: BundlePlatform
	recipes?: readonly TonnageRecipe[]
	target?: string
}

export type BundleMeasurement = {
	gzipBytes: number
	rawBytes: number
}

export type TonnageRow = BundleMeasurement & {
	imports: readonly string[]
	name: string
}

export type TonnageRecipeRow = BundleMeasurement & {
	entry: string
	name: string
}

export type TonnageReport = {
	exports: readonly TonnageRow[]
	packageName: string
	recipes: readonly TonnageRecipeRow[]
}
