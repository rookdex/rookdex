import { describe, expect, it } from "vitest"
import { dexCategory, dexIndex, dexKeys } from "./dex"
import type { SeedItem } from "./schema"
import { categoryIds, groupItems, seedItems } from "./seed"

const live = seedItems.filter((item) => !item.retired)

function item(
	name: string,
	group: string,
	status: "confirmed" | "expected" = "confirmed",
	extra: Partial<SeedItem> = {}
): SeedItem {
	return {
		id: `wildlife/${name}`,
		category: "wildlife",
		group,
		name,
		status,
		...(status === "expected" ? { precedent: "GTA V" } : {}),
		sources: [{ url: "https://www.rockstargames.com/VI", title: "Trailer 1", tier: "official" }],
		...extra,
	}
}

const fixture = [
	item("ibis", "birds", "expected"),
	item("crane", "birds"),
	item("gator", "reptiles"),
	item("crab", "marine", "confirmed", { id: "places/crab", category: "places" }),
]

describe("dexCategory (category pages spec §4)", () => {
	it("counts one category's items by status", () => {
		const dex = dexCategory(fixture, "wildlife")
		expect(dex).toMatchObject({ id: "wildlife", total: 3, confirmed: 2, expected: 1 })
	})

	it("groups in the tracker's order, items by name", () => {
		const dex = dexCategory(fixture, "wildlife")
		expect(dex.groups.map((g) => [g.id, g.items.map((i) => i.name)])).toEqual([
			["birds", ["crane", "ibis"]],
			["reptiles", ["gator"]],
		])
	})

	it.each(categoryIds(live))("matches groupItems for the live %s", (category) => {
		const expected = [...groupItems(live.filter((i) => i.category === category))].map(
			([id, items]) => ({ id, items })
		)
		expect(dexCategory(live, category).groups).toEqual(expected)
	})

	it("throws on a retired item, naming it", () => {
		const items = [...fixture, item("dodo", "birds", "confirmed", { retired: true })]
		expect(() => dexCategory(items, "wildlife")).toThrow("wildlife/dodo")
	})

	it("throws on a category with no items", () => {
		expect(() => dexCategory(fixture, "boats")).toThrow('"boats"')
	})
})

describe("dexIndex (category pages spec §4)", () => {
	it("has one entry per live category in categoryIds order, covering every item", () => {
		const index = dexIndex(live)
		expect(index.map((c) => c.id)).toEqual(categoryIds(live))
		expect(index.reduce((sum, c) => sum + c.total, 0)).toBe(live.length)
		for (const c of index) expect(c.confirmed + c.expected).toBe(c.total)
	})

	it("throws on a retired item", () => {
		expect(() => dexIndex([item("dodo", "birds", "confirmed", { retired: true })])).toThrow()
	})
})

describe("dexKeys (category pages spec §8)", () => {
	it("names the title, lede and description keys a category needs", () => {
		expect(dexKeys("wildlife")).toEqual([
			"seo.titles.dex.wildlife",
			"dex.lede.wildlife.one",
			"dex.lede.wildlife.other",
			"dex.description.wildlife.one",
			"dex.description.wildlife.other",
		])
	})
})
