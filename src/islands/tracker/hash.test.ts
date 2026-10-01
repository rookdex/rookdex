// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { hashTarget } from "./hash"

beforeEach(() => {
	document.body.innerHTML = `<input type="checkbox" id="item-wildlife/pelican"><p id="item-note"></p>`
})

describe("hashTarget (feedback spec §4)", () => {
	it("finds a checkbox whose id contains a slash", () => {
		expect(hashTarget("#item-wildlife/pelican", document)?.id).toBe("item-wildlife/pelican")
	})

	it("decodes a percent-encoded hash", () => {
		expect(hashTarget("#item-wildlife%2Fpelican", document)?.id).toBe("item-wildlife/pelican")
	})

	it.each([
		"",
		"#",
		"#wildlife/pelican",
		"#item-wildlife/dodo",
		"#item-%",
		"#item-%E0%A4%A",
		"#item-note",
	])("returns null for %j", (hash) => {
		expect(hashTarget(hash, document)).toBeNull()
	})
})
