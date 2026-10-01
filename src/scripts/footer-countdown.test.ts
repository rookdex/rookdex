// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { footerStatus, wireFooterStatus } from "./footer-countdown"

const templates = { days: "{n} days to launch", oneDay: "{n} day to launch", out: "Out now" }
const at = (iso: string) => new Date(iso)

describe("footer launch chip (feedback spec §6)", () => {
	it("counts whole days before launch", () => {
		expect(footerStatus(at("2026-11-17T00:00:00+01:00"), templates)).toBe("2 days to launch")
	})

	it("uses the singular on the last day", () => {
		expect(footerStatus(at("2026-11-18T20:00:00+01:00"), templates)).toBe("1 day to launch")
	})

	it("says out now from launch day on", () => {
		expect(footerStatus(at("2026-11-19T00:00:00+01:00"), templates)).toBe("Out now")
		expect(footerStatus(at("2027-01-01T12:00:00+01:00"), templates)).toBe("Out now")
	})

	it("swaps the no-JS date for the live text", () => {
		document.body.innerHTML = `<a data-footer-status data-days="{n} dager til lansering" data-one-day="{n} dag til lansering" data-out="Ute nå"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]") as HTMLElement
		wireFooterStatus(chip, at("2026-11-09T12:00:00+01:00"))
		expect(chip.textContent).toBe("10 dager til lansering")
	})

	it("leaves the date alone when a template is missing", () => {
		document.body.innerHTML = `<a data-footer-status data-days="{n} days"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]") as HTMLElement
		wireFooterStatus(chip, at("2026-11-09T12:00:00+01:00"))
		expect(chip.textContent).toBe("19 Nov 2026")
	})
})
