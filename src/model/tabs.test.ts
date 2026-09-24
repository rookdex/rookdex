import { describe, expect, it } from "vitest"
import { currentTab } from "./tabs"

describe("currentTab (spec §5)", () => {
	it.each([
		["", "home"],
		["tracker", "tracker"],
		["news", "news"],
		["settings", "settings"],
		["guides/before-you-start", null],
	])("maps %j to %j", (path, tab) => {
		expect(currentTab(path)).toBe(tab)
	})

	it("marks no tab when tab is null, whatever the path", () => {
		expect(currentTab("", null)).toBeNull()
	})

	it("lets an explicit tab override the path", () => {
		expect(currentTab("guides/before-you-start", "news")).toBe("news")
	})
})
