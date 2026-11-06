import { describe, expect, it } from "vitest"
import { dexIndex } from "../model/dex"
import { seedItems } from "../model/seed"
import Page from "../pages/[locale]/dex/index.astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "nb") => renderDoc(Page, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Dex index page (category pages spec §6)", () => {
	it("is titled Dex and is the Dex tab's own page", async () => {
		const doc = await page("en")
		expect(text(doc.querySelector("h1"))).toBe("Dex")
		expect(doc.title).toBe("GTA 6 Dex: every animal, car, place and collectible · Rookdex")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Dex")
		expect(lit?.getAttribute("aria-current")).toBe("page")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/en/dex/"
		)
	})

	it("has one whole-card link per category, named in plain words", async () => {
		const doc = await page("nb")
		const links = [...doc.querySelectorAll(".dex-index a")]
		const index = dexIndex(live)
		expect(links.map((a) => a.getAttribute("href"))).toEqual(index.map((c) => `/nb/dex/${c.id}/`))
		for (const [i, c] of index.entries()) {
			const a = links[i]
			expect(a.closest("li")?.querySelectorAll("a")).toHaveLength(1)
			expect(text(a.querySelector(".counts"))).toContain(`${c.confirmed} bekreftet`)
			expect(text(a.querySelector(".counts"))).toContain(`${c.expected} forventet`)
			for (const hidden of a.querySelectorAll(".dot, .sep")) {
				expect(hidden.getAttribute("aria-hidden")).toBe("true")
			}
			expect(a.querySelector(".groups")?.textContent?.split(" · ")).toHaveLength(c.groups.length)
		}
	})

	it("links to the Sources page under the grid", async () => {
		const doc = await page("en")
		const link = doc.querySelector("main a.sources-link")
		expect(link?.getAttribute("href")).toBe("/en/tracker/sources/")
		expect(text(link)).toBe("Sources")
	})

	it("has a search box with a name, and no form (Dex search spec §4)", async () => {
		const doc = await page("nb")
		const input = doc.querySelector<HTMLInputElement>('[role="search"] input#dex-search')
		expect(input?.getAttribute("type")).toBe("search")
		expect(input?.getAttribute("maxlength")).toBe("100")
		expect(input?.getAttribute("autocomplete")).toBe("off")
		expect(input?.getAttribute("enterkeyhint")).toBe("search")
		expect(text(doc.querySelector('label[for="dex-search"]'))).toBe("Søk i Dex-en")
		expect(doc.querySelector("main form")).toBeNull()
		const cross = doc.querySelector(".search-field [data-dex-clear]")
		expect(cross?.hasAttribute("hidden")).toBe(true)
		expect(text(cross)).toBe("Tøm søket")
		expect(doc.querySelector('[data-dex-status][role="status"]')).not.toBeNull()
	})

	it("hands the script its copy as templates", async () => {
		const root = (await page("nb")).querySelector<HTMLElement>("[data-dex-search]")
		expect(root?.dataset).toMatchObject({
			one: "1 treff",
			other: "{count} treff",
			noMatch: "Ingen treff på «{query}».",
			cleared: "Søket er tømt",
		})
	})

	it("renders one hidden result row per live item", async () => {
		const doc = await page("en")
		const list = doc.querySelector("[data-dex-results]")
		expect(list?.hasAttribute("hidden")).toBe(true)
		expect(list?.getAttribute("tabindex")).toBe("-1")
		expect(list?.getAttribute("aria-label")).toBe("Search results")
		const rows = [...doc.querySelectorAll("[data-dex-results] > li")]
		expect(rows).toHaveLength(live.length)
		expect(rows.every((row) => row.hasAttribute("hidden") && row.getAttribute("data-search"))).toBe(
			true
		)
		const first = rows[0].querySelector("a")
		expect(first?.getAttribute("href")).toMatch(/^\/en\/dex\/[a-z-]+\/#[a-z-]+\/[a-z0-9-]+$/)
		expect(rows[0].querySelector(".dot")?.getAttribute("aria-hidden")).toBe("true")
		expect(doc.querySelector("[data-dex-empty]")?.hasAttribute("hidden")).toBe(true)
	})

	it("marks item names as English on the Norwegian page only", async () => {
		const nbName = (await page("nb")).querySelector("[data-dex-results] .row-name")
		const enName = (await page("en")).querySelector("[data-dex-results] .row-name")
		expect(nbName?.getAttribute("lang")).toBe("en")
		expect(enName?.hasAttribute("lang")).toBe(false)
	})
})
