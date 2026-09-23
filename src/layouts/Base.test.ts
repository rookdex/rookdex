import { describe, expect, it } from "vitest"
import type { Locale } from "../i18n"
import type { Tab } from "../model/tabs"
import { renderDoc } from "../test/render"
import Base from "./Base.astro"

function page(path: string, extra: { locale?: Locale; tab?: Tab | null } = {}) {
	return renderDoc(Base, {
		props: { locale: "en", title: "T", description: "D", path, ...extra },
		slots: { default: "<p>content</p>" },
	})
}

describe("main navigation (spec §5, §12)", () => {
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
})
