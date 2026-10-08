import { describe, expect, it } from "vitest"
import { isLocale, locales } from "./index"

describe("locales", () => {
	it("lists en and nb, en first", () => {
		expect([...locales]).toEqual(["en", "nb"])
	})

	it("isLocale guards unknown prefixes", () => {
		expect(isLocale("nb")).toBe(true)
		expect(isLocale("xx")).toBe(false)
		expect(isLocale(undefined)).toBe(false)
	})
})
