import { afterEach, describe, expect, it, vi } from "vitest"
import { countdownParts, daysSince, daysToGo, hubPhase, LAUNCH_AT, localLaunchAt } from "./launch"

const t = (iso: string) => new Date(iso)

describe("hubPhase", () => {
	it("is before until the launch instant", () => {
		expect(hubPhase(t("2026-11-18T22:59:59Z"))).toBe("before")
	})
	it("is after from 00:00 CET on 19 November", () => {
		expect(LAUNCH_AT.toISOString()).toBe("2026-11-18T23:00:00.000Z")
		expect(hubPhase(t("2026-11-18T23:00:00Z"))).toBe("after")
	})
})

describe("countdownParts", () => {
	it("splits the remaining time into days, hours, minutes, seconds", () => {
		expect(countdownParts(t("2026-11-16T20:58:30Z"))).toEqual({
			days: 2,
			hours: 2,
			minutes: 1,
			seconds: 30,
		})
	})
	it("never goes negative", () => {
		expect(countdownParts(t("2026-12-01T00:00:00Z"))).toEqual({
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
		})
	})
})

describe("daysToGo", () => {
	it("rounds up so the evening before still says 1 day", () => {
		expect(daysToGo(t("2026-11-18T20:00:00Z"))).toBe(1)
	})
	it("counts whole days", () => {
		expect(daysToGo(t("2026-09-09T23:00:00Z"))).toBe(70)
	})
	it("is 0 after launch", () => {
		expect(daysToGo(t("2026-11-20T00:00:00Z"))).toBe(0)
	})
})

describe("daysSince", () => {
	it("is day 0 on launch night", () => {
		expect(daysSince(t("2026-11-19T10:00:00Z"))).toBe(0)
	})
	it("counts whole days after launch", () => {
		expect(daysSince(t("2026-11-22T00:00:00Z"))).toBe(3)
	})
	it("is 0 before launch", () => {
		expect(daysSince(t("2026-10-01T00:00:00Z"))).toBe(0)
	})
})

// Rockstar unlocks the game at midnight local time in every region (Support, 03.11). On the
// device the launch is 19 November 00:00 on its own clock; the build keeps the CET instant.
describe("localLaunchAt", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it.each([
		["Europe/Oslo", "2026-11-18T23:00:00.000Z"],
		["Europe/London", "2026-11-19T00:00:00.000Z"],
		["America/New_York", "2026-11-19T05:00:00.000Z"],
		["America/Sao_Paulo", "2026-11-19T03:00:00.000Z"],
		["Asia/Tokyo", "2026-11-18T15:00:00.000Z"],
		// Southern summer time: Sydney is UTC+11 in November.
		["Australia/Sydney", "2026-11-18T13:00:00.000Z"],
	])("is midnight on 19 November in %s", (zone, iso) => {
		vi.stubEnv("TZ", zone)
		expect(localLaunchAt().toISOString()).toBe(iso)
	})

	it("is what every helper defaults to", () => {
		vi.stubEnv("TZ", "Asia/Tokyo")
		const tokyoMidnight = t("2026-11-18T15:00:00Z")
		expect(hubPhase(t("2026-11-18T14:59:59Z"))).toBe("before")
		expect(hubPhase(tokyoMidnight)).toBe("after")
		expect(daysToGo(t("2026-11-18T14:59:59Z"))).toBe(1)
		expect(daysSince(tokyoMidnight)).toBe(0)
		expect(countdownParts(t("2026-11-18T14:00:00Z"))).toEqual({
			days: 0,
			hours: 1,
			minutes: 0,
			seconds: 0,
		})
	})

	it("is after in Tokyo before the 00:05 CET launch rebuild", () => {
		vi.stubEnv("TZ", "Asia/Tokyo")
		// 22:00 UTC: Tokyo is seven hours into launch day, Oslo is an hour short of it.
		const now = t("2026-11-18T22:00:00Z")
		expect(hubPhase(now)).toBe("after")
		expect(hubPhase(now, LAUNCH_AT)).toBe("before")
	})

	it("is still before in New York after the launch rebuild", () => {
		vi.stubEnv("TZ", "America/New_York")
		const rebuild = t("2026-11-18T23:05:00Z")
		expect(hubPhase(rebuild, LAUNCH_AT)).toBe("after")
		expect(hubPhase(rebuild)).toBe("before")
		expect(countdownParts(rebuild)).toEqual({ days: 0, hours: 5, minutes: 55, seconds: 0 })
		expect(daysToGo(rebuild)).toBe(1)
	})
})

describe("days since launch, by the local calendar", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("turns at local midnight after spring-forward in New York (14 March 2027)", () => {
		vi.stubEnv("TZ", "America/New_York")
		// 00:30 EDT on 15 March is 116 calendar days after 19 November, though 30 minutes short
		// of 116 × 24 hours.
		expect(daysSince(t("2027-03-15T04:30:00Z"))).toBe(116)
		expect(daysSince(t("2027-03-15T03:30:00Z"))).toBe(115)
	})

	it("turns at local midnight after Sydney's summer time ends (4 April 2027)", () => {
		vi.stubEnv("TZ", "Australia/Sydney")
		// 23:30 AEST on 4 April is still day 136, though more than 137 × 24 hours have passed.
		expect(daysSince(t("2027-04-04T13:30:00Z"))).toBe(136)
		expect(daysSince(t("2027-04-04T14:30:00Z"))).toBe(137)
	})

	it("counts from the CET instant on a UTC build machine", () => {
		vi.stubEnv("TZ", "UTC")
		expect(daysSince(t("2026-11-18T23:05:00Z"), LAUNCH_AT)).toBe(0)
		expect(daysSince(t("2026-11-19T22:59:59Z"), LAUNCH_AT)).toBe(0)
		expect(daysSince(t("2026-11-19T23:00:00Z"), LAUNCH_AT)).toBe(1)
	})
})
