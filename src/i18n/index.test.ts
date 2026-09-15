import { describe, expect, it } from "vitest"
import { fill, isLocale, locales, t } from "./index"

describe("locales", () => {
	it("lists en and no, en first", () => {
		expect([...locales]).toEqual(["en", "no"])
	})
	it("isLocale guards unknown prefixes", () => {
		expect(isLocale("no")).toBe(true)
		expect(isLocale("xx")).toBe(false)
		expect(isLocale(undefined)).toBe(false)
	})
})

describe("t", () => {
	it("returns the strings for a locale", () => {
		expect(t("no").hub.countdownHeading).toBe("Nedtelling til lansering")
	})
})

describe("fill", () => {
	it("replaces placeholders", () => {
		expect(fill("{n} days to go", { n: 70 })).toBe("70 days to go")
	})
	it("leaves unknown placeholders visible so they get noticed", () => {
		expect(fill("Day {n}", {})).toBe("Day {n}")
	})
})
