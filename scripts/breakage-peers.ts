import { fileURLToPath } from "node:url"

import { assembleReleasePlan } from "@changesets/assemble-release-plan"
import { readConfig } from "@changesets/config"
import { readPreState } from "@changesets/pre"
import { readChangesets } from "@changesets/read"
import { getPackages } from "@manypkg/get-packages"

const root = fileURLToPath(new URL("../", import.meta.url))

export async function releaseIntent({
	packageName,
	currentVersion,
}: {
	packageName: string
	currentVersion: string
}) {
	const packages = await getPackages(root)
	const { config, errors } = await readConfig(root, packages)
	if (errors) throw new Error(errors.join("\n"))
	const [changesets, preState] = await Promise.all([
		readChangesets(root),
		readPreState(root),
	])
	const plan = assembleReleasePlan(changesets, packages, config, preState)
	const release = plan.releases.find(({ name }) => name === packageName)
	return {
		status: "release" as const,
		version: release?.newVersion ?? currentVersion,
	}
}
