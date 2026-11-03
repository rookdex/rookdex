import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../../model/seed"
import { AllIcon, categoryIcon } from "./icons"

describe("categoryIcon (tracker refresh spec §4.2)", () => {
	it("gives every category in the seed an icon of its own", () => {
		const ids = categoryIds(seedItems)
		const icons = ids.map(categoryIcon)
		expect(icons).not.toContain(AllIcon)
		expect(new Set(icons).size).toBe(ids.length)
	})

	it("falls back to the All icon for an unknown id, inherited object names included", () => {
		expect(categoryIcon("boats")).toBe(AllIcon)
		expect(categoryIcon("constructor")).toBe(AllIcon)
		expect(categoryIcon("toString")).toBe(AllIcon)
	})
})
