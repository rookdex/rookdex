import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import LanguageSwitch from "./LanguageSwitch.astro"

describe("language picker markup (spec §6)", () => {
	it("is a labelled nav holding a details disclosure, with no menu roles", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "no", path: "tracker" } })
		expect(doc.querySelector('nav[aria-label="Språk"] > details > summary')).not.toBeNull()
		expect(doc.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
	})

	it("names the button with the visible code and the full language", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "" } })
		const name = doc.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim()
		expect(name).toBe("EN Language: English")
	})

	it("links the same page in each language and marks the current one", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "no", path: "tracker" } })
		const links = [...doc.querySelectorAll("details a")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
		])
		expect(links).toEqual([
			["/en/tracker/", "en", "en"],
			["/no/tracker/", "no", "no"],
		])
		const current = doc.querySelectorAll('details a[aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe("Norsk")
	})
})
