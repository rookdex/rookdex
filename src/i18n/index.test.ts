import { describe, expect, it } from "vitest"
import { isLocale, locales } from "./index"

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
