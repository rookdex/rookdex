import { describe, expect, it, vi } from "vitest"
import { rumours } from "../model/seed"
import News from "../pages/[locale]/news.astro"
import { renderDoc } from "./render"

// The shipped rumours share one date, so they can't show whether the page sorts. These are stored
// oldest first, with a same-day pair, so only a newest-first sort (ties by id) gives the order below.
vi.mock("../model/seed", async (importOriginal) => {
	const press = {
		url: "https://www.ign.com/articles/gta-6",
		title: "Report",
		tier: "press" as const,
	}
	const rumour = (key: string, added: string) => ({
		id: `rumours/${key}`,
		name: `Rumour ${key}`,
		claim_key: key,
		summary: "A claim.",
		added,
		sources: [press],
	})
	return {
		...(await importOriginal<typeof import("../model/seed")>()),
		rumours: [
			rumour("oldest", "2026-08-01"),
			rumour("tie-b", "2026-09-18"),
			rumour("newest", "2026-10-01"),
			rumour("tie-a", "2026-09-18"),
		],
	}
})

describe("News page (spec §8)", () => {
	it("is the News tab, with Rumours as its first section", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("h1")?.textContent).toBe("News")
		expect(doc.querySelector("main h2")?.textContent).toBe("Rumours")
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("News")
	})

	it("lists each rumour under an h3, newest first (dashboard spec §6.3)", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		const names = [...doc.querySelectorAll(".rumour-list h3")].map((h) => h.textContent)
		expect(names).toEqual(["Rumour newest", "Rumour tie-a", "Rumour tie-b", "Rumour oldest"])
	})

	it("drops the old link back to the tracker", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector('main a[href="/en/tracker/"]')).toBeNull()
	})

	it("has a search title that differs from the heading", async () => {
		expect((await renderDoc(News, { params: { locale: "en" } })).title).toBe(
			"GTA 6 news and rumours · Rookdex"
		)
		expect((await renderDoc(News, { params: { locale: "nb" } })).title).toBe(
			"GTA 6-nyheter og rykter · Rookdex"
		)
	})

	it("links each rumour's report out in a new tab", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const links = [...doc.querySelectorAll(".rumour-list .meta a")]
		expect(links).toHaveLength(rumours.length)
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.getAttribute("rel")).toBe("noopener noreferrer")
			expect(a.querySelector(".new-tab-note")).not.toBeNull()
		}
	})
})
