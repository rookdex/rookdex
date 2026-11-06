import { describe, expect, it } from "vitest"
import { translator } from "../i18n"
import { dexCategory, dexCopy, dexIndex, dexKeys, dexSearchRows, dexStatus } from "./dex"
import type { SeedItem } from "./schema"
import { matches } from "./search"
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

describe("dexCopy (category pages spec §8)", () => {
	const en = translator("en")
	const nb = translator("nb")

	it("builds the title, lede and description for a category", () => {
		const copy = dexCopy(en, dexCategory(fixture, "wildlife"))
		expect(copy.title).toBe("GTA 6 animals: every species confirmed so far · Rookdex")
		expect(copy.lede).toBe("3 animals so far: 2 confirmed, 1 expected.")
		expect(copy.description).toMatch(/^All 3 GTA 6 animals in the Dex so far/)
	})

	it("picks the singular and keeps zero counts readable", () => {
		const one = dexCategory([item("crane", "birds")], "wildlife")
		expect(dexCopy(en, one).lede).toBe("1 animal so far: 1 confirmed, 0 expected.")
		expect(dexCopy(nb, one).lede).toBe("1 dyr så langt: 1 bekreftet, 0 forventet.")
	})

	it("throws on a category without copy, naming the key", () => {
		const bogus = { ...dexCategory(fixture, "wildlife"), id: "bogus" }
		expect(() => dexCopy(en, bogus)).toThrow('"seo.titles.dex.bogus"')
	})
})

describe("dexStatus (category pages spec §5.2)", () => {
	const { t } = translator("en")

	it("says Confirmed, or Expected with its precedent", () => {
		expect(dexStatus(t, item("crane", "birds"))).toBe("Confirmed")
		expect(dexStatus(t, item("ibis", "birds", "expected"))).toBe("Expected, as in GTA V")
	})

	it("never ends in 'as in' when an expected item has no precedent", () => {
		const bare = { ...item("ibis", "birds", "expected"), precedent: undefined }
		expect(dexStatus(t, bare)).toBe("Expected")
	})
})

describe("dexSearchRows (Dex search spec §5.1)", () => {
	const { t } = translator("nb")
	const urlFor = (category: string) => `/nb/dex/${category}/`

	it("has one row per live item, in the order the Dex pages list them", () => {
		const rows = dexSearchRows(t, urlFor, live)
		const order = dexIndex(live).flatMap((c) => c.groups.flatMap((g) => g.items.map((i) => i.id)))
		expect(rows.map((row) => row.id)).toEqual(order)
		expect(rows).toHaveLength(live.length)
	})

	it("orders the fixture by category, then group, then name", () => {
		const rows = dexSearchRows(t, urlFor, fixture)
		expect(rows.map((row) => row.name)).toEqual(["crane", "ibis", "gator", "crab"])
	})

	it("links each row to its card on the category page", () => {
		const [crane] = dexSearchRows(t, urlFor, fixture)
		expect(crane.href).toBe("/nb/dex/wildlife/#wildlife/crane")
	})

	it("says the short status word in the page language", () => {
		const [crane, ibis] = dexSearchRows(t, urlFor, fixture)
		expect([crane.status, crane.statusWord]).toEqual(["confirmed", "Bekreftet"])
		expect([ibis.status, ibis.statusWord]).toEqual(["expected", "Forventet"])
	})

	it("names the category and group in the page language", () => {
		const [crane, , gator] = dexSearchRows(t, urlFor, fixture)
		expect(crane.place).toBe("Dyreliv · Fugler")
		expect(gator.place).toBe("Dyreliv · Krypdyr")
		expect(dexSearchRows(translator("en").t, urlFor, fixture)[0].place).toBe("Wildlife · Birds")
	})

	it("searches the name and every group term, normalized like the query", () => {
		const [crane] = dexSearchRows(t, urlFor, fixture)
		expect(crane.search).toBe(crane.search.toLowerCase())
		for (const word of ["crane", "bird", "fugler", "dyr"])
			expect(matches(word, [crane.search])).toBe(true)
		expect(matches("reptile", [crane.search])).toBe(false)
	})

	it("finds boats with the Norwegian word", () => {
		// "båt" normalizes to "bat", so substring matching also finds "Maibatsu" cars, as the
		// tracker does. What matters is that no boat is missed.
		const boats = dexSearchRows(t, urlFor, live).filter((row) => row.place.endsWith("Båter"))
		expect(boats.length).toBeGreaterThan(0)
		expect(boats.every((row) => matches("båt", [row.search]))).toBe(true)
	})

	it("throws on a retired item", () => {
		const retired = item("dodo", "birds", "confirmed", { retired: true })
		expect(() => dexSearchRows(t, urlFor, [retired])).toThrow(/retired/)
	})
})
