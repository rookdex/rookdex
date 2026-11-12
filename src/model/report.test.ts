import { describe, expect, it } from "vitest"
import { itemReportUrl } from "./report"

describe("itemReportUrl", () => {
	it("opens the item-report issue form on the Rookdex repo, prefilled with the item", () => {
		const url = new URL(itemReportUrl({ id: "wildlife/pelican", name: "Pelican" }))
		expect(url.origin).toBe("https://github.com")
		expect(url.pathname).toBe("/rookdex/rookdex/issues/new")
		expect(url.searchParams.get("template")).toBe("item-report.yml")
		expect(url.searchParams.get("title")).toBe("Item report: Pelican")
		expect(url.searchParams.get("item")).toBe("wildlife/pelican")
	})

	it("encodes names with spaces, quotes and ampersands", () => {
		const url = new URL(itemReportUrl({ id: "vehicles/x", name: `Tom & Jerry's "Car"` }))
		expect(url.searchParams.get("title")).toBe(`Item report: Tom & Jerry's "Car"`)
		expect(url.search).not.toContain(" ")
	})
})
