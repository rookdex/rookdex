import { describe, expect, it } from "vitest"
import { translator } from "./index"
import { systemRow } from "./system-row"

describe("systemRow (shared by the header picker and Settings)", () => {
	it("maps every locale to this page's relative URL", () => {
		const { hrefs } = systemRow(translator("en").t, "tracker")
		expect(hrefs).toEqual({ en: "/en/tracker/", nb: "/nb/tracker/" })
	})

	it("splits the System label around the {value} slot", () => {
		const { before, after } = systemRow(translator("en").t, "")
		expect(before).toBe("System (")
		expect(after).toBe(")")
	})

	it("defaults the trailing half to an empty string when the slot ends the label", () => {
		const { before, after } = systemRow((() => "System {value}") as never, "")
		expect(before).toBe("System ")
		expect(after).toBe("")
	})
})
