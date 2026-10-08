// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { footerStatus, wireFooterStatus } from "./footer-countdown"

const templates = { one: "{count} day to launch", other: "{count} days to launch", out: "Out now" }
const at = (iso: string) => new Date(iso)

describe("footerStatus (feedback spec §6, locale spec §5.2)", () => {
	it("counts down with the language's plural rules", () => {
		expect(footerStatus(new Date("2026-09-10T10:00:00Z"), templates, "en")).toBe(
			"70 days to launch"
		)
		expect(footerStatus(new Date("2026-11-18T10:00:00Z"), templates, "en")).toBe("1 day to launch")
	})

	it("counts whole days before launch", () => {
		expect(footerStatus(at("2026-11-17T00:00:00+01:00"), templates, "en")).toBe("2 days to launch")
	})

	it("uses the singular on the last day, even in the evening before", () => {
		expect(footerStatus(at("2026-11-18T20:00:00+01:00"), templates, "en")).toBe("1 day to launch")
	})

	it("says out now after launch", () => {
		expect(footerStatus(new Date("2026-11-20T10:00:00Z"), templates, "en")).toBe("Out now")
	})

	it("says out now from launch day on", () => {
		expect(footerStatus(at("2026-11-19T00:00:00+01:00"), templates, "en")).toBe("Out now")
		expect(footerStatus(at("2027-01-01T12:00:00+01:00"), templates, "en")).toBe("Out now")
	})
})

describe("wireFooterStatus", () => {
	afterEach(() => {
		document.body.innerHTML = ""
		document.documentElement.lang = ""
	})

	it("swaps in the live state from the data attributes, in the page's language", () => {
		document.documentElement.lang = "no"
		document.body.innerHTML = `<a data-footer-status data-one="{count} dag til lansering" data-other="{count} dager til lansering" data-out="Ute nå"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]")
		if (!chip) throw new Error("no chip")
		wireFooterStatus(chip, new Date("2026-11-18T10:00:00Z"))
		expect(chip.textContent).toBe("1 dag til lansering")
	})

	it("leaves the date alone when a template is missing", () => {
		document.body.innerHTML = `<a data-footer-status data-other="{count} days"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]")
		if (!chip) throw new Error("no chip")
		wireFooterStatus(chip, new Date("2026-09-10T10:00:00Z"))
		expect(chip.textContent).toBe("19 Nov 2026")
	})
})
