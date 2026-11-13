import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addDays, dayFromKey, daysAgo, dottedDate, localDayKey, newsDate } from "./days"

beforeEach(() => {
	vi.stubEnv("TZ", "Europe/Oslo")
})
afterEach(() => {
	vi.unstubAllEnvs()
})

describe("calendar days (dashboard spec §6.2)", () => {
	it("keys a moment by the local calendar day", () => {
		// 23:30 UTC on 19 Nov is 00:30 on 20 Nov in Oslo.
		expect(localDayKey(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-20")
		expect(localDayKey(new Date("2026-11-19T22:30:00Z"))).toBe("2026-11-19")
	})

	it("turns a key back into a moment inside that day", () => {
		expect(localDayKey(dayFromKey("2026-11-20"))).toBe("2026-11-20")
	})

	it("counts whole days and clamps the future to today", () => {
		expect(daysAgo("2026-09-18", "2026-11-22")).toBe(65)
		expect(daysAgo("2026-11-22", "2026-11-22")).toBe(0)
		expect(daysAgo("2026-11-25", "2026-11-22")).toBe(0)
	})
})

describe("addDays", () => {
	it("steps by calendar day across the October daylight-saving change", () => {
		expect(addDays("2026-10-25", -1)).toBe("2026-10-24")
		expect(addDays("2026-10-24", 1)).toBe("2026-10-25")
		expect(addDays("2026-10-26", -1)).toBe("2026-10-25")
	})

	it("crosses month and year ends", () => {
		expect(addDays("2026-11-01", -1)).toBe("2026-10-31")
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
	})
})

describe("dottedDate", () => {
	it("writes the device's calendar day with periods, in both languages", () => {
		expect(dottedDate(new Date(2026, 10, 2, 23, 30))).toBe("02.11.2026")
		expect(dottedDate(new Date(2026, 0, 19, 0, 5))).toBe("19.01.2026")
	})
})

describe("newsDate (News redesign spec §3)", () => {
	it("shows day and short month, day first in both languages", () => {
		expect(newsDate("2026-11-10", "en", 2026)).toBe("10 Nov")
		expect(newsDate("2026-11-10", "nb", 2026)).toBe("10. nov.")
	})

	it("adds the year when it differs from the build year", () => {
		expect(newsDate("2026-06-24", "en", 2027)).toBe("24 Jun 2026")
		expect(newsDate("2026-06-24", "nb", 2027)).toBe("24. juni 2026")
	})

	it("keeps the calendar day in a zone west of UTC", () => {
		vi.stubEnv("TZ", "America/Los_Angeles")
		expect(newsDate("2026-11-10", "en", 2026)).toBe("10 Nov")
		expect(newsDate("2026-01-01", "en", 2026)).toBe("1 Jan")
	})
})
