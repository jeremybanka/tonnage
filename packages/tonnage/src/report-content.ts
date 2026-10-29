import { Markdown, type Content, type Element } from "galley.md"
import { jsx } from "galley.md/jsx-runtime"

import type { TonnageConfig, TonnageReport } from "./types.ts"

/** Build the report's headings, tables, and measurement notes as Galley elements. */
export function reportContent(
	report: TonnageReport,
	config: TonnageConfig = {},
): Element[] {
	const hasExports = report.exports.length > 0
	const hasRecipes = report.recipes.length > 0
	const hasMultipleSections = hasExports && hasRecipes
	const content = [heading(2, config.heading ?? "Bundle size")]

	if (hasExports)
		content.push(
			paragraph(
				"Package export sizes include complete runtime export surfaces.",
			),
		)
	if (hasRecipes)
		content.push(
			paragraph(
				"Usage example sizes bundle their entry files and tree-shake unused exports.",
			),
		)
	content.push(
		paragraph(
			"Sizes are exact minified and level-9 gzip JavaScript byte counts. Declarations, source maps, CSS, and other assets are excluded. " +
				(config.includePeers
					? "Imported peer dependencies are bundled unless explicitly external, and shared modules are counted once per bundle."
					: "Peer dependencies stay external, and shared modules are counted once per bundle."),
		),
	)

	if (hasExports) {
		if (hasMultipleSections) content.push(heading(3, "Package exports"))
		content.push(
			table(
				[
					{ title: "Import" },
					{ title: "Minified JS", align: "right" },
					{ title: "Gzip JS", align: "right" },
				],
				report.exports.map((row) => [
					code(row.name),
					formatBytes(row.rawBytes),
					formatBytes(row.gzipBytes),
				]),
			),
		)
	}

	if (hasRecipes) {
		if (hasMultipleSections) content.push(heading(3, "Usage examples"))
		content.push(
			table(
				[
					{ title: "Recipe" },
					{ title: "Entry" },
					{ title: "Minified JS", align: "right" },
					{ title: "Gzip JS", align: "right" },
				],
				report.recipes.map((row) => [
					row.name,
					code(row.entry),
					formatBytes(row.rawBytes),
					formatBytes(row.gzipBytes),
				]),
			),
		)
	}

	content.push(
		jsx(
			() => ({
				type: "paragraph",
				children: [
					{ type: "text", value: "Report maintained with " },
					{
						type: "link",
						url: "https://github.com/jeremybanka/tonnage",
						children: [{ type: "text", value: "tonnage" }],
					},
					{ type: "text", value: "." },
				],
			}),
			null,
		),
	)
	return content
}

function code(value: string): Content {
	return { type: "inlineCode", value }
}

function formatBytes(bytes: number): string {
	return `${new Intl.NumberFormat("en-US").format(bytes)} B`
}

function table(
	columns: readonly { title: string; align?: "right" }[],
	rows: readonly (readonly Content[])[],
): Element {
	return jsx(Markdown.Table, {
		children: [
			jsx("thead", {
				children: jsx("tr", {
					children: columns.map(({ title, align }) =>
						jsx("th", { children: title, align }),
					),
				}),
			}),
			jsx("tbody", {
				children: rows.map((cells) =>
					jsx("tr", {
						children: cells.map((children) => jsx("td", { children })),
					}),
				),
			}),
		],
	})
}

// Return elements for the public component contract while constructing Markdown
// nodes explicitly, independently of Galley's native JSX rendering policy.
function heading(depth: 2 | 3, value: string): Element {
	return jsx(
		() => ({ type: "heading", depth, children: [{ type: "text", value }] }),
		null,
	)
}

function paragraph(value: string): Element {
	return jsx(
		() => ({ type: "paragraph", children: [{ type: "text", value }] }),
		null,
	)
}
