import type { Content, Element } from "galley.md"
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
	const content = [jsx("h2", { children: config.heading ?? "Bundle size" })]

	if (hasExports)
		content.push(
			jsx("p", {
				children:
					"Package export sizes include complete runtime export surfaces.",
			}),
		)
	if (hasRecipes)
		content.push(
			jsx("p", {
				children:
					"Usage example sizes bundle their entry files and tree-shake unused exports.",
			}),
		)
	content.push(
		jsx("p", {
			children:
				"Sizes are exact minified and level-9 gzip JavaScript byte counts. Declarations, source maps, CSS, and other assets are excluded. Peer dependencies stay external, and shared modules are counted once per bundle.",
		}),
	)

	if (hasExports) {
		if (hasMultipleSections)
			content.push(jsx("h3", { children: "Package exports" }))
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
		if (hasMultipleSections)
			content.push(jsx("h3", { children: "Usage examples" }))
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
		jsx("p", {
			children: [
				"Report maintained with ",
				jsx("a", {
					href: "https://github.com/jeremybanka/tonnage",
					children: "tonnage",
				}),
				".",
			],
		}),
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
	return jsx("table", {
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
