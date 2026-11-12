// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

describe("footerStatus on the visitor's own clock", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("still counts down in New York after the 00:05 CET launch rebuild", () => {
		vi.stubEnv("TZ", "America/New_York")
		expect(footerStatus(at("2026-11-18T23:05:00Z"), templates, "en")).toBe("1 day to launch")
		expect(footerStatus(at("2026-11-19T05:00:00Z"), templates, "en")).toBe("Out now")
	})

	it("says out now in Tokyo before Oslo reaches midnight", () => {
		vi.stubEnv("TZ", "Asia/Tokyo")
		expect(footerStatus(at("2026-11-18T15:00:00Z"), templates, "en")).toBe("Out now")
	})
})

const chipHtml = `<a data-footer-status data-one="{count} day to launch" data-other="{count} days to launch" data-out="Out now"><span data-status-text>19 Nov 2026</span></a>`

function mountChip(html = chipHtml): HTMLElement {
	document.body.innerHTML = html
	const chip = document.querySelector<HTMLElement>("[data-footer-status]")
	if (!chip) throw new Error("no chip")
	return chip
}

describe("wireFooterStatus", () => {
	let stop: (() => void) | undefined

	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		stop?.()
		stop = undefined
		vi.useRealTimers()
		vi.unstubAllEnvs()
		document.body.innerHTML = ""
		document.documentElement.lang = ""
	})

	it("swaps in the live state from the data attributes, in the page's language", () => {
		vi.setSystemTime(at("2026-11-18T10:00:00Z"))
		document.documentElement.lang = "nb"
		const chip = mountChip(
			`<a data-footer-status data-one="{count} dag til lansering" data-other="{count} dager til lansering" data-out="Ute nå"><span data-status-text>19 Nov 2026</span></a>`
		)
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("1 dag til lansering")
	})

	it("leaves the date alone and sets no timer when a template is missing", () => {
		vi.setSystemTime(at("2026-09-10T10:00:00Z"))
		const chip = mountChip(
			`<a data-footer-status data-other="{count} days"><span data-status-text>19 Nov 2026</span></a>`
		)
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("19 Nov 2026")
		expect(vi.getTimerCount()).toBe(0)
	})

	it("drops a day at local midnight in Oslo, with one timer and no interval", () => {
		vi.setSystemTime(at("2026-11-16T23:59:59+01:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("3 days to launch")
		expect(vi.getTimerCount()).toBe(1)
		vi.advanceTimersByTime(999)
		expect(chip.textContent).toBe("3 days to launch")
		vi.advanceTimersByTime(1)
		expect(chip.textContent).toBe("2 days to launch")
		expect(vi.getTimerCount()).toBe(1)
	})

	it("drops a day at local midnight in New York, not at Oslo's", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-16T17:59:00-05:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("3 days to launch")
		vi.advanceTimersByTime(60_000) // midnight in Oslo
		expect(chip.textContent).toBe("3 days to launch")
		vi.advanceTimersByTime(6 * 3_600_000) // midnight in New York
		expect(chip.textContent).toBe("2 days to launch")
	})

	it("says out now from local midnight on 19.11 in New York, then stops", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-18T23:59:59-05:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("1 day to launch")
		vi.advanceTimersByTime(1000)
		expect(chip.textContent).toBe("Out now")
		expect(vi.getTimerCount()).toBe(0)
	})

	it("says out now from local midnight on 19.11 in Oslo, then stops", () => {
		vi.setSystemTime(at("2026-11-18T23:59:59+01:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		vi.advanceTimersByTime(1000)
		expect(chip.textContent).toBe("Out now")
		expect(vi.getTimerCount()).toBe(0)
	})

	it("sets no timer when the page loads after launch", () => {
		vi.setSystemTime(at("2026-11-20T10:00:00+01:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("Out now")
		expect(vi.getTimerCount()).toBe(0)
	})

	it("catches up when the tab comes back after the device slept past midnight", () => {
		vi.setSystemTime(at("2026-11-16T20:00:00+01:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		expect(chip.textContent).toBe("3 days to launch")
		// Sleep: the clock jumps, but the timeout has not fired.
		vi.setSystemTime(at("2026-11-18T09:00:00+01:00"))
		document.dispatchEvent(new Event("visibilitychange"))
		expect(chip.textContent).toBe("1 day to launch")
		expect(vi.getTimerCount()).toBe(1)
	})

	it("says out now and stops when the device slept past launch", () => {
		vi.setSystemTime(at("2026-11-18T20:00:00+01:00"))
		const chip = mountChip()
		stop = wireFooterStatus(chip)
		vi.setSystemTime(at("2026-11-19T08:00:00+01:00"))
		document.dispatchEvent(new Event("visibilitychange"))
		expect(chip.textContent).toBe("Out now")
		expect(vi.getTimerCount()).toBe(0)
		// No listener is left either: a later event changes nothing.
		chip.querySelector("[data-status-text]")?.replaceChildren("x")
		document.dispatchEvent(new Event("visibilitychange"))
		expect(chip.textContent).toBe("x")
	})
})
