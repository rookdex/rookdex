import { describe, expect, it } from "vitest"
import { buildNow } from "./build-now"

describe("buildNow (dashboard spec §6.4)", () => {
	it("is the build clock when ROOKDEX_NOW is unset or empty", () => {
		const clock = new Date("2026-10-14T10:00:00Z")
		expect(buildNow(undefined, () => clock)).toBe(clock)
		expect(buildNow("", () => clock)).toBe(clock)
	})

	it("uses ROOKDEX_NOW when it parses", () => {
		expect(buildNow("2026-11-20T12:00:00Z").toISOString()).toBe("2026-11-20T12:00:00.000Z")
	})

	it("fails the build, naming the variable, when it does not parse", () => {
		expect(() => buildNow("next thursday")).toThrow(/ROOKDEX_NOW/)
	})
})
