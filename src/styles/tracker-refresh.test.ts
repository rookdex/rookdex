import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	""
)

/** The body of the first rule whose selector list is exactly `selector`. */
function rule(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ""
}

describe("tracker refresh look (spec §3, §4)", () => {
	it("draws counts in Bebas Neue at its one real weight", () => {
		for (const selector of [".tile-count", ".cat-head h2", ".cat-count"]) {
			expect(rule(selector), selector).toMatch(/font-family:\s*var\(--font-display\)/)
			expect(rule(selector), selector).toMatch(/font-weight:\s*400/)
		}
	})

	it("widens the desktop tracker to tiles, list and rail with 48 px columns", () => {
		expect(css).toContain("--tracker-max-w: calc(200px + 624px + 200px + 2 * 48px)")
	})

	it("spaces categories 72 px, groups 40 px and cards 12 px apart", () => {
		expect(rule(".item-list")).toMatch(/gap:\s*72px/)
		expect(rule(".item-groups")).toMatch(/gap:\s*40px/)
		expect(rule(".item-group ul")).toMatch(/gap:\s*12px/)
		expect(rule(".item-group ul")).toMatch(/minmax\(min\(280px, 100%\), 1fr\)/)
	})

	it("makes the check a 24 px circle", () => {
		expect(rule(".item-main input")).toMatch(/border-radius:\s*50%/)
		expect(rule(".item-main input")).toMatch(/width:\s*24px/)
	})

	it("breaks a tile label only inside a word that cannot fit on its own line (R2)", () => {
		expect(rule(".tile-name")).toMatch(/overflow-wrap:\s*break-word/)
		expect(rule(".tile-name")).toMatch(/hyphens:\s*auto/)
	})

	it("keeps the desktop tile label at the phone size so a long Norwegian name fits on one line", () => {
		const sizes = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
			.filter(([, selectors]) => selectors.trim() === ".tile-name")
			.map(([, , body]) => body.match(/font-size:\s*([^;]+);/)?.[1]?.trim())
		expect(sizes.length).toBeGreaterThan(0)
		expect(sizes).toEqual(sizes.map(() => "0.75rem"))
	})

	it("lets a long category title break instead of widening the page at large text", () => {
		expect(rule(".cat-head h2")).toMatch(/min-width:\s*0/)
		expect(rule(".cat-head h2")).toMatch(/overflow-wrap:\s*break-word/)
		expect(rule(".item-list")).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/)
	})

	it("keeps the hub's uppercase label look off the tracker tile name", () => {
		const uppercased = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
			.filter(([, , body]) => /text-transform:\s*uppercase/.test(body))
			.map(([, selectors]) => selectors)
		expect(uppercased.some((selectors) => selectors.includes(".tile-label"))).toBe(true)
		expect(uppercased.some((selectors) => selectors.includes(".tile-name"))).toBe(false)
	})

	it("thickens the pressed tile edge so pressed differs from hover by more than colour", () => {
		expect(rule('.tiles button[aria-pressed="true"]')).toMatch(
			/box-shadow:\s*inset 0 0 0 1px color-mix\(in srgb, var\(--accent\) 55%, transparent\)/
		)
	})

	it("leaves no .chips selector behind", () => {
		expect(css).not.toMatch(/\.chips\b/)
	})
})
