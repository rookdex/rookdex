import { describe, expect, it } from "vitest"
import { translator } from "../i18n"
import { dexCategory } from "../model/dex"
import { categoryIds, seedItems } from "../model/seed"
import Page from "../pages/[locale]/dex/[category].astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "nb", category: string) =>
	renderDoc(Page, { params: { locale, category } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Dex category page (category pages spec §5)", () => {
	it("is a titled sub page under the Tracker tab, with its counts in the lede", async () => {
		const doc = await page("en", "wildlife")
		const dex = dexCategory(live, "wildlife")
		expect(doc.querySelectorAll("h1")).toHaveLength(1)
		expect(text(doc.querySelector("h1"))).toBe("Wildlife")
		expect(text(doc.querySelector(".lede"))).toBe(
			`${dex.total} animals so far: ${dex.confirmed} confirmed, ${dex.expected} expected.`
		)
		expect(doc.title).toBe("GTA 6 animals: every species confirmed so far · Rookdex")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Tracker")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/en/dex/wildlife/"
		)
	})

	it.each(categoryIds(live))("has a chip, a section and one card per item for %s", async (c) => {
		const doc = await page("en", c)
		const dex = dexCategory(live, c)
		const chips = [...doc.querySelectorAll('nav[aria-label="Groups"] a')]
		expect(chips.map((a) => a.getAttribute("href"))).toEqual(
			dex.groups.map((g) => `#group-${g.id}`)
		)
		expect(chips.map((a) => text(a.querySelector(".count")))).toEqual(
			dex.groups.map((g) => String(g.items.length))
		)
		for (const group of dex.groups) {
			const h2 = doc.getElementById(`group-${group.id}`)
			expect(h2?.tagName).toBe("H2")
			const section = h2?.closest("section")
			expect(section?.getAttribute("aria-labelledby")).toBe(`group-${group.id}`)
			const ids = [...(section?.querySelectorAll("article.dex-card") ?? [])].map((a) => a.id)
			expect(ids).toEqual(group.items.map((item) => item.id))
		}
	})

	it("shows each item's name, status word and description", async () => {
		const doc = await page("en", "collectibles")
		const { t } = translator("en")
		for (const item of live.filter((i) => i.category === "collectibles")) {
			const card = doc.getElementById(item.id)
			expect(text(card?.querySelector("h3"))).toBe(item.name)
			const status = card?.querySelector(".status")
			expect(status?.classList.contains(item.status)).toBe(true)
			expect(text(status)).toBe(
				item.status === "confirmed"
					? t("tracker.confirmed")
					: t("tracker.expectedFrom", { precedent: item.precedent ?? "" })
			)
			expect(status?.querySelector(".dot")?.getAttribute("aria-hidden")).toBe("true")
			expect(text(card?.querySelector(".desc")) ?? null).toBe(item.description ?? null)
		}
	})

	it("keeps sources in a closed dropdown that counts them", async () => {
		const doc = await page("nb", "vehicles")
		for (const item of live.filter((i) => i.category === "vehicles")) {
			const details = doc.getElementById(item.id)?.querySelector("details.card-sources")
			expect(details?.hasAttribute("open")).toBe(false)
			expect(text(details?.querySelector("summary"))).toBe(`Kilder (${item.sources.length})`)
			expect(details?.querySelector("summary svg")?.getAttribute("aria-hidden")).toBe("true")
			const links = [...(details?.querySelectorAll('a[target="_blank"]') ?? [])]
			expect(links.map((a) => a.getAttribute("href"))).toEqual(item.sources.map((s) => s.url))
		}
	})

	it("links each card to its checkbox in the tracker, after the sources", async () => {
		const doc = await page("en", "places")
		for (const item of live.filter((i) => i.category === "places")) {
			const card = doc.getElementById(item.id)
			const tick = card?.querySelector("a.tick")
			// ItemList.tsx gives each checkbox the id `item-${item.id}`.
			expect(tick?.getAttribute("href")).toBe(`/en/tracker/#item-${item.id}`)
			expect(text(tick)).toBe(`Tick it off in the tracker: ${item.name}`)
			const focusable = [...(card?.querySelectorAll("summary, a") ?? [])]
			expect(focusable.at(0)?.tagName).toBe("SUMMARY")
			expect(focusable.at(-1)).toBe(tick)
		}
	})

	it("marks English seed text on nb and leaves Norwegian text outside it", async () => {
		const doc = await page("nb", "wildlife")
		const card = doc.querySelector("article.dex-card")
		expect(card?.querySelector("h3")?.getAttribute("lang")).toBe("en")
		if (card?.querySelector(".desc")) {
			expect(card.querySelector(".desc")?.getAttribute("lang")).toBe("en")
		}
		expect(card?.querySelector("a.tick .visually-hidden [lang='en']")).not.toBeNull()
		for (const note of doc.querySelectorAll(".new-tab-note")) {
			expect(note.closest("[lang='en']")).toBeNull()
		}
		expect(text(card?.querySelector(".status"))).toMatch(/^(Bekreftet|Forventet)/)
		const en = await page("en", "wildlife")
		expect(en.querySelector(".dex-group [lang='en']")).toBeNull()
	})

	it("ends with the other categories and the Sources page", async () => {
		const doc = await page("en", "wildlife")
		const more = doc.querySelector('nav[aria-labelledby="dex-more"]')
		expect(text(more?.querySelector("h2"))).toBe("More in the Dex")
		expect([...(more?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual([
			...categoryIds(live)
				.filter((c) => c !== "wildlife")
				.map((c) => `/en/dex/${c}/`),
			"/en/tracker/sources/",
		])
	})

	it("refuses a category the seed does not have", async () => {
		await expect(page("en", "boats")).rejects.toThrow('"boats"')
	})
})
