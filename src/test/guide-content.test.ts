import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { hasPrice } from "./price-patterns"

const read = (locale: string) =>
	readFileSync(
		new URL(`../content/guides/${locale}/before-you-start.md`, import.meta.url),
		"utf8"
	).replace(/\r\n/g, "\n")
const body = (text: string) => text.slice(text.indexOf("\n---\n", 4) + 5)
const headings = (text: string) => [...body(text).matchAll(/^## (.+)$/gm)].map((m) => m[1])

describe.each([
	[
		"en",
		[
			"The date",
			"Editions",
			"Pre-order bonus",
			"GTA+",
			"Preload",
			"Buying in Norway",
			"What Rookdex does on launch night",
		],
	],
	[
		"no",
		[
			"Datoen",
			"Utgaver",
			"Bonus ved forhåndsbestilling",
			"GTA+",
			"Forhåndsnedlasting",
			"Kjøp i Norge",
			"Hva Rookdex gjør på lanseringskvelden",
		],
	],
])("Before you start, %s (feedback spec §9)", (locale, expected) => {
	const text = read(locale)

	it("has the sections in order", () => {
		expect(headings(text)).toEqual(expected)
	})

	it("links only inside the app from its body", () => {
		expect(body(text)).not.toMatch(/\]\((https?:)?\/\//)
		expect(body(text)).toContain(`](/${locale}/settings/#about)`)
		expect(body(text)).toContain(`](/${locale}/)`)
	})

	it("cites the pre-order article and the PlayStation Store page, and is dated", () => {
		expect(text).toMatch(/\n {2}- https:\/\/www\.rockstargames\.com\/newswire\/article\/\S+\n/)
		expect(text).toContain("  - https://store.playstation.com/no-no/concept/10000730")
		expect(text).not.toContain("https://www.rockstargames.com/newswire\n")
		expect(text).not.toContain("updated: 2026-09-09")
	})
})

describe.each(["en", "no"])("%s guide prices (locale spec §5.5)", (locale) => {
	const file = read(locale)
	const frontmatter = file.slice(0, file.indexOf("\n---\n", 4))

	it("has no price string anywhere in the file", () => {
		const priced = file.split("\n").filter((line) => hasPrice(line))
		expect(priced).toEqual([])
	})

	it("uses the price tokens in the body", () => {
		expect(body(file)).toContain("{price:standard}")
		expect(body(file)).toContain("{price:ultimate}")
	})

	it("keeps tokens out of frontmatter, where the Markdown plugin never runs", () => {
		expect(frontmatter).not.toContain("{price:")
	})
})
