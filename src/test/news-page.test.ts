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
		facts: [fact("older", "2025-06-24"), fact("newer", "2026-10-15")],
		rumours: [
			rumour("oldest", "2026-08-01"),
			rumour("tie-b", "2026-09-18"),
			rumour("newest", "2026-10-01"),
			rumour("tie-a", "2026-09-18"),
		],
	}
})

// Vitest has no content layer, so the guide entries the page links to are stubbed in each language.
vi.mock("astro:content", () => {
	const guide = (id: string, title: string) => ({ id, data: { title, summary: `${title}.` } })
	return {
		getCollection: async () => [
			guide("en/first-hour", "Your first hour"),
			guide("en/before-you-start", "Before you start"),
			guide("nb/before-you-start", "Før du begynner"),
			guide("nb/first-hour", "Den første timen"),
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
			"New to GTA VI?",
			"Official channels",
		])
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("News")
	})

	it("puts New to GTA VI? above Official channels in the aside", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const heads = [...doc.querySelectorAll("aside h2")].map((h) => [h.id, h.textContent])
		expect(heads).toEqual([
			["new-to-gta", "New to GTA VI?"],
			["channels", "Official channels"],
		])
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .section-intro')?.textContent).toBe(
			"Guides for your first days"
		)
		expect(doc.querySelector("aside")?.hasAttribute("aria-label")).toBe(false)
	})

	it("lists the guides in the page's language, each a full row with an icon", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(doc.querySelector("#new-to-gta")?.textContent).toBe("Ny i GTA VI?")
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .section-intro')?.textContent).toBe(
			"Guider for de første dagene"
		)
		const links = [...doc.querySelectorAll('[aria-labelledby="new-to-gta"] .panel-list a')]
		expect(
			links.map((a) => [a.querySelector(".row-label")?.textContent, a.getAttribute("href")])
		).toEqual([
			["Før du begynner", "/nb/guides/before-you-start/"],
			["Den første timen", "/nb/guides/first-hour/"],
		])
		for (const a of links) {
			expect(a.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector('.row-arrow[aria-hidden="true"]')?.textContent).toBe("›")
		}
		// The guide summary stays on the guide page, not in the row.
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .summary')).toBeNull()
	})

	it("keeps the panels off the news list styles", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("aside .rumour-list")).toBeNull()
		expect(doc.querySelectorAll("aside .news-panel")).toHaveLength(2)
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

	it("lists Rockstar's official channels with muted icons, never a brand logo", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(doc.querySelector("#channels")?.textContent).toBe("Offisielle kanaler")
		expect(doc.querySelector('[aria-labelledby="channels"] .section-intro')?.textContent).toBe(
			"Rockstars egne nyheter og medier, rett fra kilden."
		)
		const links = [...doc.querySelectorAll('[aria-labelledby="channels"] .panel-list a')]
		expect(
			links.map((a) => [a.querySelector(".row-label")?.textContent, a.getAttribute("href")])
		).toEqual([
			["Rockstar Newswire", "https://www.rockstargames.com/newswire"],
			["Trailere, skjermbilder og bakgrunnsbilder", "https://www.rockstargames.com/VI/media"],
			["YouTube", "https://www.youtube.com/@RockstarGames"],
			["X", "https://x.com/rockstargames"],
			["Instagram", "https://instagram.com/rockstargames"],
		])
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.querySelector("img")).toBeNull()
			const icon = a.querySelector("svg")
			expect(icon?.getAttribute("fill")).toBe("none")
			expect(icon?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector(".ext-icon")).not.toBeNull()
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

	it("opens every item with its tier label and a dated <time>", async () => {
		for (const locale of ["en", "nb"] as const) {
			const doc = await renderDoc(News, { params: { locale } })
			const labels = locale === "en" ? ["Confirmed", "Rumour"] : ["Bekreftet", "Rykte"]
			const sections = [
				['[aria-labelledby="confirmed"]', labels[0], "is-confirmed"],
				['[aria-labelledby="rumours"]', labels[1], "is-rumour"],
			] as const
			for (const [section, label, dot] of sections) {
				const items = [...doc.querySelectorAll(`${section} .rumour-list > li`)]
				expect(items.length).toBeGreaterThan(0)
				for (const item of items) {
					// Title first in the DOM, so heading navigation hears the tier and date next.
					expect(item.firstElementChild?.tagName).toBe("H3")
					expect(item.children[1]?.classList.contains("tier-line")).toBe(true)
					const line = item.querySelector(".tier-line")
					expect(line?.querySelector(".tier-label")?.textContent).toBe(label)
					const marker = line?.querySelector(".tier-dot")
					expect(marker?.classList.contains(dot)).toBe(true)
					expect(marker?.getAttribute("aria-hidden")).toBe("true")
					const datetime = line?.querySelector("time")?.getAttribute("datetime") ?? ""
					expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}$/)
					expect(Number.isNaN(Date.parse(datetime))).toBe(false)
				}
			}
		}
	})

	it("shows the year on a date from another year", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const old = doc.querySelector('.fact-list time[datetime="2025-06-24"]')
		expect(old?.textContent).toBe("24 Jun 2025")
	})

	it("marks the newest fact, and only it, as the lead", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const leads = [...doc.querySelectorAll(".is-lead")]
		expect(leads).toHaveLength(1)
		expect(leads[0]?.querySelector("h3")?.textContent).toBe("Fact newer")
		expect(leads[0]?.parentElement?.classList.contains("fact-list")).toBe(true)
	})

	it("jumps to the two panels from a labelled line under the heading", async () => {
		for (const [locale, label] of [
			["en", "On this page"],
			["nb", "På denne siden"],
		] as const) {
			const doc = await renderDoc(News, { params: { locale } })
			const nav = doc.querySelector(`nav[aria-label="${label}"]`)
			expect(nav?.previousElementSibling?.tagName).toBe("H1")
			const targets = [...(nav?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))
			expect(targets).toEqual(["#new-to-gta", "#channels"])
			for (const href of targets) {
				const heading = doc.getElementById(href?.slice(1) ?? "")
				expect(heading?.tagName).toBe("H2")
				expect(heading?.closest("aside")).not.toBeNull()
			}
			expect([...(nav?.querySelectorAll("a") ?? [])].map((a) => a.textContent)).toEqual([
				doc.getElementById("new-to-gta")?.textContent,
				doc.getElementById("channels")?.textContent,
			])
		}
	})

	it("puts Confirmed, Rumours and the aside in one grid on the wide page", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const grid = doc.querySelector(".news-grid")
		const parts = ["news-confirmed", "news-rumours", "news-aside"]
		const children = [...(grid?.children ?? [])]
		expect(children.map((el) => parts.find((c) => el.classList.contains(c)))).toEqual(parts)
		expect(grid?.classList.contains("no-facts")).toBe(false)
		expect(doc.querySelector("main")?.classList.contains("wide")).toBe(true)
	})

	it("drops Confirmed and the lead when there are no facts", async () => {
		const saved = facts.splice(0)
		try {
			const doc = await renderDoc(News, { params: { locale: "en" } })
			const grid = doc.querySelector(".news-grid")
			expect(grid?.classList.contains("no-facts")).toBe(true)
			expect(grid?.firstElementChild?.classList.contains("news-rumours")).toBe(true)
			expect(doc.querySelector("#confirmed")).toBeNull()
			expect(doc.querySelector(".is-lead")).toBeNull()
		} finally {
			facts.push(...saved)
		}
	})
})
