import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import Sources from "../components/Sources.astro"
import SourcesPage from "../pages/[locale]/tracker/sources.astro"
import { renderDoc } from "../test/render"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	""
)

/** The body of the first rule whose selector list is exactly `prelude`. */
function rule(prelude: string): string | undefined {
	const at = css.indexOf(`\n${prelude} {`)
	if (at === -1) return undefined
	const open = css.indexOf("{", at)
	return css.slice(open + 1, css.indexOf("}", open))
}

const prose = ":where(.news, .privacy p, .guide > :is(p, ul, ol)) a"

describe("link style: cyan, underlined only in running text", () => {
	it("draws a link cyan with no underline by default", () => {
		const body = rule("a")
		expect(body).toContain("color: var(--link);")
		expect(body).toContain("text-decoration: none;")
	})

	// WCAG 1.4.1: inside a sentence, colour alone does not set a link apart from the words around it.
	it("keeps the underline in News, the privacy page and the guide body, and nowhere else", () => {
		expect(rule(prose)).toContain("text-decoration: underline;")
		expect(css.match(/text-decoration: underline;/g)).toHaveLength(1)
	})

	it("gives a link on its own line a 44 px target that lifts on hover and press", () => {
		expect(rule(".go-link")).toContain("min-height: var(--tap);")
		const hover = css.slice(css.indexOf("@media (hover: hover) {"))
		expect(hover).toMatch(/\.go-link:hover[\s\S]*?background: var\(--bg-hover\)/)
		const press = css.slice(css.indexOf("@media (hover: none) {"))
		expect(press).toMatch(/\.go-link:active[\s\S]*?background: var\(--bg-hover\)/)
	})

	it("ends a link that stays on the site with a chevron; external links keep their ↗", () => {
		expect(rule(".go-link:not([target])::after")).toContain("mask:")
	})
})

describe("links on their own line use .go-link", () => {
	// The hub holds a React island the test container cannot render, so this reads the source.
	it("on the hub: Open the tracker", () => {
		const hub = readFileSync(new URL("../pages/[locale]/index.astro", import.meta.url), "utf8")
		expect(hub).toContain(`<a class="go-link" href={getRelativeLocaleUrl(locale, "tracker")}>`)
	})

	it("on the Sources page: every source and every back link", async () => {
		const doc = await renderDoc(SourcesPage, { params: { locale: "en" } })
		const links = doc.querySelectorAll(".source-entry a")
		expect(links.length).toBeGreaterThan(0)
		for (const link of links) expect(link.classList.contains("go-link")).toBe(true)
	})

	it("under a guide: the source list", async () => {
		const doc = await renderDoc(Sources, {
			props: { urls: ["https://www.rockstargames.com/"], label: "Sources", locale: "en" },
		})
		expect(doc.querySelector(".sources a")?.classList.contains("go-link")).toBe(true)
	})
})
