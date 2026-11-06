import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import TabBar from "./TabBar.astro"

describe("TabBar (desktop dashboard spec §4.9)", () => {
	it.each([
		["en", "Dashboard"],
		["nb", "Dashbord"],
	])("names the first tab in %s", async (locale, label) => {
		const doc = await renderDoc(TabBar, { props: { locale, current: "dashboard" } })
		const first = doc.querySelector(".tabbar li:first-child a")
		expect(first?.textContent?.trim()).toBe(label)
		expect(first?.getAttribute("aria-current")).toBe("page")
		expect(first?.querySelector("svg path")).not.toBeNull()
	})

	it("puts Dex second, beside Tracker, each with its own icon", async () => {
		const doc = await renderDoc(TabBar, { props: { locale: "en", current: "dex" } })
		const links = [...doc.querySelectorAll(".tabbar a")]
		expect(links.map((a) => a.textContent?.trim())).toEqual([
			"Dashboard",
			"Dex",
			"Tracker",
			"News",
			"Settings",
		])
		expect(links[1].getAttribute("aria-current")).toBe("page")
		const icons = links.map((a) => a.querySelector("svg")?.innerHTML)
		expect(new Set(icons).size).toBe(5)
		expect(icons).not.toContain("")
	})
})
