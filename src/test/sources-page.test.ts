import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../model/seed"
import Sources from "../pages/[locale]/tracker/sources.astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "no") => renderDoc(Sources, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Sources page (feedback spec §5)", () => {
	it("is a titled page under the Tracker tab", async () => {
		const doc = await page("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Sources")
		expect(doc.querySelector(".lede")?.textContent).toBe(
			"Where every item in the tracker comes from."
		)
		expect(doc.title).toBe("Sources for the GTA 6 tracker · Rookdex")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Tracker")
		expect(lit?.getAttribute("aria-current")).toBe("true")
	})

	it("has one entry per live item, anchored on its seed id", async () => {
		const doc = await page("en")
		const ids = [...doc.querySelectorAll("article.source-entry")].map((a) => a.id)
		expect([...ids].sort()).toEqual(live.map((item) => item.id).sort())
		for (const item of seedItems.filter((i) => i.retired)) {
			expect(doc.getElementById(item.id)).toBeNull()
		}
	})

	it("links every source out in a new tab, with its outlet under it", async () => {
		const doc = await page("no")
		for (const item of live) {
			const entry = doc.getElementById(item.id)
			expect(text(entry?.querySelector("h3"))).toBe(item.name)
			const links = [...(entry?.querySelectorAll('a[target="_blank"]') ?? [])]
			expect(links.map((a) => a.getAttribute("href"))).toEqual(item.sources.map((s) => s.url))
			for (const a of links) expect(a.querySelector(".new-tab-note")).not.toBeNull()
			expect(entry?.querySelectorAll(".outlet")).toHaveLength(item.sources.length)
		}
	})

	it("counts the live items of each category on its chip, in the tracker's order", async () => {
		const doc = await page("en")
		const chips = [...doc.querySelectorAll(".source-chips a")]
		const categories = categoryIds(live)
		expect(chips.map((a) => a.getAttribute("href"))).toEqual(categories.map((c) => `#cat-${c}`))
		expect(chips.map((a) => a.querySelector(".count")?.textContent)).toEqual(
			categories.map((c) => String(live.filter((item) => item.category === c).length))
		)
		for (const c of categories) expect(doc.getElementById(`cat-${c}`)?.tagName).toBe("H2")
	})

	it("links back to each item's checkbox, named with the item", async () => {
		const doc = await page("en")
		for (const item of live) {
			const back = doc.getElementById(item.id)?.querySelector("a.back")
			expect(back?.getAttribute("href")).toBe(`/en/tracker/#item-${item.id}`)
			expect(text(back)).toBe(`Back to the item in the tracker: ${item.name}`)
		}
	})
})
