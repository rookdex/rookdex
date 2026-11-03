import { describe, expect, it } from "vitest"
import { dexIndex } from "../model/dex"
import { seedItems } from "../model/seed"
import Page from "../pages/[locale]/dex/index.astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "nb") => renderDoc(Page, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Dex index page (category pages spec §6)", () => {
	it("is titled Dex under the Tracker tab", async () => {
		const doc = await page("en")
		expect(text(doc.querySelector("h1"))).toBe("Dex")
		expect(doc.title).toBe("GTA 6 Dex: every animal, car, place and collectible · Rookdex")
		expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current]'))).toBe("Tracker")
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
})
