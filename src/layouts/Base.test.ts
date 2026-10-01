import { describe, expect, it } from "vitest"
import type { Locale } from "../i18n"
import type { Tab } from "../model/tabs"
import { renderDoc } from "../test/render"
import Base from "./Base.astro"

function page(
	path: string,
	extra: { locale?: Locale; tab?: Tab | null; indexable?: boolean } = {}
) {
	return renderDoc(Base, {
		props: { locale: "en", title: "T", description: "D", path, ...extra },
		slots: { default: "<p>content</p>" },
	})
}

describe("main navigation (spec §5, §12)", () => {
	it("keeps the Tracker tab lit on its Sources page, without claiming to be that page", async () => {
		const doc = await page("tracker/sources")
		const lit = doc.querySelectorAll('nav[aria-label="Main"] [aria-current]')
		expect(lit).toHaveLength(1)
		expect(lit[0].textContent?.trim()).toBe("Tracker")
		expect(lit[0].getAttribute("aria-current")).toBe("true")
	})

	it("puts one Main nav between the header and main", async () => {
		const doc = await page("")
		expect(doc.querySelectorAll('nav[aria-label="Main"]')).toHaveLength(1)
		const order = [...doc.querySelectorAll("body > header, body > nav, body > main, body > footer")]
		expect(order.map((el) => el.tagName)).toEqual(["HEADER", "NAV", "MAIN", "FOOTER"])
	})

	it.each([
		["", "Home"],
		["tracker", "Tracker"],
		["news", "News"],
		["settings", "Settings"],
	])("marks the tab for path %j as %s", async (path, label) => {
		const doc = await page(path)
		const current = doc.querySelectorAll('nav[aria-label="Main"] [aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe(label)
	})

	it("marks no tab on a guide, or when the page passes tab={null}", async () => {
		for (const doc of [await page("guides/before-you-start"), await page("", { tab: null })]) {
			expect(doc.querySelector('nav[aria-label="Main"] [aria-current]')).toBeNull()
		}
	})

	it("links every tab in the page's language", async () => {
		const doc = await page("", { locale: "no" })
		const links = [...doc.querySelectorAll('nav[aria-label="Hoved"] a')]
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"/no/",
			"/no/tracker/",
			"/no/news/",
			"/no/settings/",
		])
		expect(links[3].textContent?.trim()).toBe("Inn­stillinger")
	})

	it("hides every tab icon from assistive tech", async () => {
		const doc = await page("")
		const icons = [...doc.querySelectorAll('nav[aria-label="Main"] svg')]
		expect(icons).toHaveLength(4)
		for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true")
	})

	it("lets the page reach under the phone's safe area", async () => {
		const doc = await page("")
		expect(doc.querySelector('meta[name="viewport"]')?.getAttribute("content")).toBe(
			"width=device-width, initial-scale=1, viewport-fit=cover"
		)
	})

	it("ships the history buttons hidden and labelled, before the brand (spec §4)", async () => {
		const doc = await page("", { locale: "no" })
		const group = doc.querySelector("header [data-history]")
		const brand = doc.querySelector("header .brand")
		expect(group?.hasAttribute("hidden")).toBe(true)
		const labels = [...(group?.querySelectorAll("button") ?? [])].map((b) =>
			b.getAttribute("aria-label")
		)
		expect(labels).toEqual(["Tilbake", "Fremover"])
		// 4 = Node.DOCUMENT_POSITION_FOLLOWING: the brand comes after the group.
		expect(brand && group ? group.compareDocumentPosition(brand) & 4 : 0).toBe(4)
	})
})

describe("title (SEO spec §4.4)", () => {
	it("writes the title prop verbatim, with no suffix added", async () => {
		const doc = await page("tracker")
		expect(doc.title).toBe("T")
	})
})

const content = (doc: Document, selector: string) =>
	[...doc.querySelectorAll(selector)].map((el) => el.getAttribute("content"))

describe("link previews and indexing (SEO spec §4.4)", () => {
	it("gives every page Open Graph and Twitter card tags", async () => {
		const doc = await page("tracker")
		expect(content(doc, 'meta[property="og:site_name"]')).toEqual(["Rookdex"])
		expect(content(doc, 'meta[property="og:type"]')).toEqual(["website"])
		expect(content(doc, 'meta[property="og:title"]')).toEqual(["T"])
		expect(content(doc, 'meta[property="og:description"]')).toEqual(["D"])
		expect(content(doc, 'meta[property="og:image"]')).toEqual(["https://rookdex.app/og.png"])
		expect(content(doc, 'meta[property="og:image:width"]')).toEqual(["1200"])
		expect(content(doc, 'meta[property="og:image:height"]')).toEqual(["630"])
		expect(content(doc, 'meta[property="og:image:alt"]')).toEqual([
			"Rookdex banner: The open-source GTA VI companion.",
		])
		expect(content(doc, 'meta[name="twitter:card"]')).toEqual(["summary_large_image"])
		expect(doc.querySelector('meta[name="twitter:site"]')).toBeNull()
	})

	it.each([
		["en", "en_US", "nb_NO"],
		["no", "nb_NO", "en_US"],
	] as const)("names the %s locale and the other one as alternate", async (locale, own, other) => {
		const doc = await page("tracker", { locale })
		expect(content(doc, 'meta[property="og:locale"]')).toEqual([own])
		expect(content(doc, 'meta[property="og:locale:alternate"]')).toEqual([other])
	})

	it("points og:url at the canonical URL on an indexable page", async () => {
		const doc = await page("news")
		const canonical = doc.querySelectorAll('link[rel="canonical"]')
		expect(canonical).toHaveLength(1)
		expect(content(doc, 'meta[property="og:url"]')).toEqual([canonical[0].getAttribute("href")])
		expect(doc.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(3)
	})

	it("drops canonical, hreflang links, og:url and JSON-LD when not indexable", async () => {
		const doc = await page("", { indexable: false, tab: null })
		expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
		expect(doc.querySelector('link[rel="alternate"][hreflang]')).toBeNull()
		expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
		expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
		// Link previews still work for a shared 404 link.
		expect(content(doc, 'meta[property="og:image"]')).toEqual(["https://rookdex.app/og.png"])
	})

	it.each([
		["en", "en"],
		["no", "nb"],
	] as const)("puts one WebSite JSON-LD block on the %s home page only", async (locale, lang) => {
		const home = await page("", { locale })
		const blocks = home.querySelectorAll('script[type="application/ld+json"]')
		expect(blocks).toHaveLength(1)
		expect(JSON.parse(blocks[0].textContent ?? "")).toEqual({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "Rookdex",
			url: "https://rookdex.app/",
			inLanguage: lang,
		})
		const tracker = await page("tracker", { locale })
		expect(tracker.querySelector('script[type="application/ld+json"]')).toBeNull()
	})
})

describe("update notice markup (feedback spec §10.3)", () => {
	it("ships the card hidden and the live region outside it, empty", async () => {
		const doc = await page("", { locale: "no" })
		const card = doc.querySelector<HTMLElement>("[data-update-notice]")
		expect(card?.hasAttribute("hidden")).toBe(true)
		expect(card?.dataset.text).toBe("En ny versjon er klar")
		expect([...(card?.querySelectorAll("button") ?? [])].map((b) => b.textContent?.trim())).toEqual(
			["Oppdater", "Senere"]
		)
		const live = doc.querySelector('[data-update-status][role="status"]')
		expect(live?.textContent).toBe("")
		expect(live?.closest("[data-update-notice]")).toBeNull()
		expect(live?.classList.contains("visually-hidden")).toBe(true)
	})
})
