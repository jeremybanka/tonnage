import path from "node:path"

import type { DocumentContext, Element } from "galley.md"

import { createTonnageReport } from "./report.ts"
import { reportContent } from "./report-content.ts"
import type { TonnageConfig } from "./types.ts"

export type TonnageProps = {
	config?: TonnageConfig
	/** Override the document directory when measuring a different package. */
	directory?: string
}

/** Measure bundles and include the report in a galley.md document. */
export async function Tonnage(
	{ config = {}, directory }: TonnageProps,
	context: DocumentContext,
): Promise<Element[]> {
	const report = await createTonnageReport(
		config,
		path.resolve(context.directory, directory ?? "."),
	)
	return reportContent(report, config)
}
