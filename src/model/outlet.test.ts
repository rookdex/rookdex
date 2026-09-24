import { describe, expect, it } from "vitest"
import { duplicateOutlet, outletOf } from "./outlet"

describe("outletOf", () => {
	it("returns the host without www", () => {
		expect(outletOf("https://www.ign.com/articles/x")).toBe("ign.com")
	})
})

describe("duplicateOutlet (spec §9)", () => {
	it("is undefined when every source is from a different outlet", () => {
		expect(
			duplicateOutlet(["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"])
		).toBeUndefined()
	})

	it("names the first outlet cited twice, ignoring www. and case", () => {
		expect(duplicateOutlet(["https://www.IGN.com/articles/a", "https://ign.com/articles/b"])).toBe(
			"ign.com"
		)
	})
})
