import path from "node:path"

import { Markdown, type DocumentContext, type Root } from "galley.mdx"

import { createTonnageReport, renderTonnageMarkdown } from "./report.ts"
import type { TonnageConfig } from "./types.ts"

export type TonnageProps = {
	config?: TonnageConfig
	/** Override the document directory when measuring a different package. */
	directory?: string
}

/** Measure bundles and include the report in a galley.mdx document. */
export async function Tonnage(
	{ config = {}, directory }: TonnageProps,
	context: DocumentContext,
): Promise<Root> {
	const report = await createTonnageReport(
		config,
		path.resolve(context.directory, directory ?? "."),
	)
	return Markdown({ children: renderTonnageMarkdown(report, config) })
}
