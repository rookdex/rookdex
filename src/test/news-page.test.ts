import { describe, expect, it, vi } from "vitest"
import { facts, rumours } from "../model/seed"
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
	const official = {
		url: "https://www.rockstargames.com/newswire/article/1",
		title: "Newswire",
		tier: "official" as const,
	}
	const fact = (key: string, announced: string) => ({
		id: `facts/${key}`,
		claim_key: key,
		name: { en: `Fact ${key}`, nb: `Faktum ${key}` },
		summary: { en: "A fact.", nb: "Et faktum." },
		announced,
		sources: [official],
	})
	return {
		...(await importOriginal<typeof import("../model/seed")>()),
		facts: [fact("older", "2026-06-24"), fact("newer", "2026-10-15")],
		rumours: [
			rumour("oldest", "2026-08-01"),
			rumour("tie-b", "2026-09-18"),
			rumour("newest", "2026-10-01"),
			rumour("tie-a", "2026-09-18"),
		],
	}
})

describe("News page (spec §8)", () => {
	it("is the News tab, with Confirmed above Rumours", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("h1")?.textContent).toBe("News")
		expect([...doc.querySelectorAll("main h2")].map((h) => h.textContent)).toEqual([
			"Confirmed",
			"Rumours",
			"Official channels",
		])
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("News")
	})

	it("lists each rumour under an h3, newest first (dashboard spec §6.3)", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		const names = [...doc.querySelectorAll('[aria-labelledby="rumours"] h3')].map(
			(h) => h.textContent
		)
		expect(names).toEqual(["Rumour newest", "Rumour tie-a", "Rumour tie-b", "Rumour oldest"])
	})

	it("lists each fact newest first, in the page's language", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		const names = [...doc.querySelectorAll(".fact-list h3")].map((h) => h.textContent)
		expect(names).toEqual(["Faktum newer", "Faktum older"])
		expect(doc.querySelector(".fact-list .summary")?.textContent).toBe("Et faktum.")
	})

	it("keeps the not-confirmed line under Rumours, away from the facts", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const intro = doc.querySelector('[aria-labelledby="rumours"] .section-intro')
		expect(intro?.textContent).toMatch(/not confirmed by Rockstar/)
		expect(doc.querySelector('[aria-labelledby="confirmed"]')?.textContent).not.toMatch(
			/not confirmed/
		)
	})

	it("links each fact to its official source in a new tab", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const links = [...doc.querySelectorAll(".fact-list .meta a")]
		expect(links).toHaveLength(facts.length)
		for (const a of links) {
			expect(a.getAttribute("href")).toBe("https://www.rockstargames.com/newswire/article/1")
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.textContent).toContain("Announced on rockstargames.com")
		}
	})

	it("lists Rockstar's official channels as plain text links in a new tab", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(doc.querySelector("#channels")?.textContent).toBe("Offisielle kanaler")
		const links = [...doc.querySelectorAll(".channel-list a")]
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"https://www.rockstargames.com/newswire",
			"https://www.youtube.com/@RockstarGames",
			"https://x.com/rockstargames",
			"https://instagram.com/rockstargames",
		])
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.querySelector("img")).toBeNull()
		}
	})

	it("drops the old link back to the tracker", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector('main a[href="/en/tracker/"]')).toBeNull()
	})

	it("has a search title that differs from the heading", async () => {
		expect((await renderDoc(News, { params: { locale: "en" } })).title).toBe(
			"GTA 6 news, confirmed facts and rumours · Rookdex"
		)
		expect((await renderDoc(News, { params: { locale: "nb" } })).title).toBe(
			"GTA 6-nyheter, bekreftede fakta og rykter · Rookdex"
		)
	})

	it("links each rumour's report out in a new tab", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const links = [...doc.querySelectorAll('[aria-labelledby="rumours"] .meta a')]
		expect(links).toHaveLength(rumours.length)
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.getAttribute("rel")).toBe("noopener noreferrer")
			expect(a.querySelector(".new-tab-note")).not.toBeNull()
		}
	})
})
