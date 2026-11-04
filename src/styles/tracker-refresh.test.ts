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
		expect(rule(".item-check")).toMatch(/border-radius:\s*50%/)
		expect(rule(".item-check")).toMatch(/width:\s*24px/)
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

	it("draws the tile edge and top-aligns its rows itself, without the hub's .tile class", () => {
		expect(rule(".tiles button")).toMatch(/border:\s*1px solid var\(--border\)/)
		expect(rule(".tiles button")).toMatch(/align-content:\s*start/)
	})

	it("sets the All tile label to 12 px on desktop so every desktop tile has one height", () => {
		const desktop = css.slice(css.indexOf("@media (min-width: 1024px)"))
		expect(desktop).toMatch(/\.tiles \.tile-all \.tile-name\s*\{[^}]*font-size:\s*0\.75rem/)
	})

	it("leaves no .chips selector behind", () => {
		expect(css).not.toMatch(/\.chips\b/)
	})
})

describe("icon-lead card (spec §5.1)", () => {
	it("clamps the description to two lines and keeps the 65ch cap off", () => {
		expect(rule(".item-desc")).toMatch(/-webkit-line-clamp:\s*2/)
		expect(rule(".item-desc")).toMatch(/max-width:\s*none/)
	})

	it("turns a found card's border and icon tile pink", () => {
		expect(rule(".item.found")).toMatch(/border-color:[^;]*var\(--accent\)/)
		expect(rule(".item.found .item-tile")).toMatch(/color:\s*var\(--accent\)/)
	})
})

describe("layout without the rail below 1024 px (spec §3, §5.3)", () => {
	it("hides the rail below 1024 px and the Last found row from there", () => {
		expect(rule(".stats")).toMatch(/display:\s*none/)
		const desktop = css.slice(css.indexOf("@media (min-width: 1024px)"))
		expect(desktop).toMatch(/\.last-found\s*\{\s*display:\s*none/)
		expect(desktop).toMatch(/\.stats\s*\{[^}]*display:\s*block/)
	})
})

describe("profile in the title row (spec §5.5)", () => {
	it("sets the initial in --text and opens the menu leftwards from the slot", () => {
		expect(rule(".avatar")).toMatch(/color:\s*var\(--text\)/)
		expect(rule("#tracker-profile .menu")).toMatch(/right:\s*0/)
	})
})

describe("wide steps (spec §14.2)", () => {
	it("widens the tracker page in two steps that each add a card column", () => {
		const step = (px: number) =>
			css.match(new RegExp(`@media \\(min-width: ${px}px\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ""
		expect(step(1600)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*max-width:\s*90rem/)
		expect(step(1600)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*--tracker-max-w:\s*none/)
		expect(step(1920)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*max-width:\s*120rem/)
		// The hub keeps its own cap.
		expect(step(1600)).toMatch(/\.wrap\.wide\s*\{[^}]*max-width:\s*85rem/)
	})
})

describe("profile button size and the title row (final review E1, E3)", () => {
	const page = readFileSync(
		new URL("../pages/[locale]/tracker/index.astro", import.meta.url),
		"utf8"
	)

	it("holds the profile button at the tap height with no vertical padding", () => {
		expect(rule(".profile-menu > button")).toMatch(/padding-block:\s*0/)
	})

	it("keeps the title whole and lets the profile name ellipsise instead", () => {
		const h1 = page.match(/\.tracker-head h1\s*\{([^}]*)\}/)?.[1] ?? ""
		expect(h1).toMatch(/flex:\s*none/)
		expect(h1).not.toMatch(/min-width:\s*0/)
		expect(page).toMatch(/\.tracker-head\s*\{[^}]*flex-wrap:\s*wrap/)
		expect(page).toMatch(/#tracker-profile\s*\{[^}]*flex:\s*1 1 0[^}]*min-width:\s*62px/)
		expect(rule("#tracker-profile .profile-menu > button")).toMatch(/max-width:\s*100%/)
	})
})
