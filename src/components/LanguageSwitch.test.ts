import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import LanguageSwitch from "./LanguageSwitch.astro"

describe("language picker markup (locale spec §7.1, standard §6.1)", () => {
	it("is a labelled nav holding a picker disclosure, with no menu roles", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "nb", path: "tracker" } })
		expect(
			doc.querySelector('nav[aria-label="Språk"] > details[data-picker="lang"] > summary')
		).not.toBeNull()
		expect(doc.querySelector('ul.picker-list[aria-label="Språk"]')).not.toBeNull()
		expect(doc.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
	})

	it("names the trigger with hidden text only, no visible code", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "" } })
		const summary = doc.querySelector("summary")
		const tip = summary?.querySelector(".tip")
		expect(tip?.getAttribute("aria-hidden")).toBe("true")
		expect(tip?.textContent).toBe("Language")
		tip?.remove()
		expect(summary?.querySelector(".lang-chevron")).toBeNull()
		expect(summary?.textContent?.replace(/\s+/g, " ").trim()).toBe("Language: English")
		expect(summary?.querySelector(".visually-hidden")?.textContent).toBe("Language: English")
		expect(summary?.hasAttribute("aria-label")).toBe(false)
	})

	it("links the same page in each language and marks the current one", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "nb", path: "tracker" } })
		const rows = [...doc.querySelectorAll("a.picker-row")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
			a.getAttribute("data-picker-row"),
		])
		expect(rows).toEqual([
			["/en/tracker/", "en", "en", "en"],
			["/nb/tracker/", "nb", "nb", "nb"],
		])
		const current = doc.querySelectorAll('a.picker-row[aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe("Norsk bokmål")
	})

	it("ships the System row first and hidden, with every language's URL for this page", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "news" } })
		const first = doc.querySelector(".picker-list > li")
		expect(first?.hasAttribute("data-system-item")).toBe(true)
		expect(first?.hasAttribute("hidden")).toBe(true)
		const link = first?.querySelector("a")
		expect(link?.getAttribute("data-picker-row")).toBe("")
		expect(link?.classList.contains("picker-row")).toBe(false)
		expect(JSON.parse(link?.getAttribute("data-hrefs") ?? "")).toEqual({
			en: "/en/news/",
			nb: "/nb/news/",
		})
		expect(link?.textContent?.replace(/\s+/g, " ").trim()).toBe("System ()")
		expect(link?.querySelector("[data-system-name]")).not.toBeNull()
	})
})
