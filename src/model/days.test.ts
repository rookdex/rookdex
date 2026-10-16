import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dayFromKey, daysAgo, localDayKey } from "./days"

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
