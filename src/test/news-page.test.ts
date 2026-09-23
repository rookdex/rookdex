import { describe, expect, it } from "vitest"
import { rumours } from "../model/seed"
import News from "../pages/[locale]/news.astro"
import { renderDoc } from "./render"

describe("News page (spec §8)", () => {
	it("is the News tab, with Rumours as its first section", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("h1")?.textContent).toBe("News")
		expect(doc.querySelector("main h2")?.textContent).toBe("Rumours")
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("News")
	})

	it("lists each rumour under an h3", async () => {
		const doc = await renderDoc(News, { params: { locale: "no" } })
		expect(rumours.length).toBeGreaterThan(0)
		const names = [...doc.querySelectorAll(".rumour-list h3")].map((h) => h.textContent)
		expect(names).toEqual(rumours.map((r) => r.name))
	})

	it("drops the old link back to the tracker", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector('main a[href="/en/tracker/"]')).toBeNull()
	})
})
