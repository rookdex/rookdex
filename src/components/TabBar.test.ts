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
})
