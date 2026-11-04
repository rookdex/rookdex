import { describe, expect, it } from "vitest"
import { dateLocale } from "./days"
import { relativeTime } from "./relativeTime"

// Local wall-clock times, so the calendar-day rules hold in whatever zone the tests run in.
const at = (day: number, hour: number, minute = 0, second = 0) =>
	new Date(2026, 10, day, hour, minute, second)

describe.each(["en", "nb"] as const)("relativeTime in %s (tracker refresh spec §5.4)", (locale) => {
	const said = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
		new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto", style: "short" }).format(
			value,
			unit
		)
	const now = at(20, 8, 0)
	const ago = (then: Date) => relativeTime(then.toISOString(), now, locale)

	it("says now under a minute, for a time in the future and for a broken timestamp", () => {
		expect(ago(at(20, 7, 59, 30))).toBe(said(0, "second"))
		expect(ago(at(20, 10, 0))).toBe(said(0, "second"))
		expect(relativeTime("not a date", now, locale)).toBe(said(0, "second"))
	})

	it("counts minutes under an hour, across midnight too", () => {
		expect(ago(at(20, 7, 55))).toBe(said(-5, "minute"))
		expect(ago(at(20, 7, 0, 1))).toBe(said(-59, "minute"))
		expect(relativeTime(at(19, 23, 50).toISOString(), at(20, 0, 10), locale)).toBe(
			said(-20, "minute")
		)
	})

	it("counts hours on the same calendar day", () => {
		expect(ago(at(20, 5, 0))).toBe(said(-3, "hour"))
	})

	it("counts calendar days before that, so late last night reads yesterday", () => {
		expect(ago(at(19, 23, 0))).toBe(said(-1, "day"))
		expect(ago(at(17, 20, 0))).toBe(said(-3, "day"))
	})
})
