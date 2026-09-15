import { describe, expect, it } from "vitest"
import { countdownParts, daysSince, daysToGo, hubPhase, LAUNCH_AT } from "./launch"

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
