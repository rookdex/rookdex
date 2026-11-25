import { describe, expect, it } from "vitest"
import { type FixtureInput, ign, ignNordic, validInput } from "../test/seed-fixture"
import { buildSeed, parseShipped, sortKey } from "./seedBuild"

function errorsAfter(change: (input: FixtureInput) => void): string {
	const input = validInput()
	change(input)
	return buildSeed(input).errors.join("\n")
}
const cars = (input: FixtureInput) => input.groups["vehicles/cars.json"]
const bikes = (input: FixtureInput) => input.groups["vehicles/bikes.json"]
const birds = (input: FixtureInput) => input.groups["animals/birds.json"]
const pelican = (input: FixtureInput) => birds(input).items[0]

describe("buildSeed on the valid fixture", () => {
	const result = buildSeed(validInput())

	it("has no errors", () => {
		expect(result.errors).toEqual([])
	})
	it("orders categories by categories.json and skips one with no files", () => {
		expect(result.categories.map((c) => c.id)).toEqual(["vehicles", "animals"])
	})
	it("orders groups by their header and items by the group's sort", () => {
		expect(result.items.map((i) => i.id)).toEqual([
			"vehicles/alpha",
			"vehicles/hoop-9",
			"vehicles/hoop-10",
			"vehicles/zeta",
			"vehicles/second",
			"vehicles/first",
			"animals/heron",
			"animals/pelican",
			"animals/cougar",
		])
	})
	it("fills category and group from the path", () => {
		const cougar = result.items.find((i) => i.id === "animals/cougar")
		expect(cougar).toMatchObject({ category: "animals", group: "mammals" })
	})
	it("gives an item with no sources the header's, tiered", () => {
		const first = result.items.find((i) => i.id === "vehicles/first")
		expect(first?.sources).toEqual([
			{ url: "https://www.rockstargames.com/VI", title: "GTA VI site", tier: "official" },
		])
	})
	it("marks counts: false groups and edition items uncounted", () => {
		const flagged = result.items.filter((i) => i.uncounted).map((i) => i.id)
		expect(flagged).toEqual(["animals/heron", "animals/cougar"])
	})
	it("tiers tip sources and location links", () => {
		const pelican = result.items.find((i) => i.id === "animals/pelican")
		expect(pelican?.tips?.[0].sources[0]).toMatchObject({ tier: "press" })
		expect(pelican?.locations?.[0].link).toMatchObject({ tier: "press" })
	})
	it("returns the group headers in order", () => {
		expect(result.groups.map((g) => `${g.category}/${g.id}`)).toEqual([
			"vehicles/cars",
			"vehicles/bikes",
			"animals/birds",
			"animals/mammals",
		])
		expect(result.groups[0]).toMatchObject({
			total: 3,
			counts: true,
			sets: [{ id: "coupes", total: 2 }],
		})
		expect(result.groups[3]).toMatchObject({ counts: false })
	})
})

describe("buildSeed rejects", () => {
	it.each([
		[
			"a duplicate id",
			(i: FixtureInput) => (bikes(i).items[0].id = "vehicles/zeta"),
			/duplicate id vehicles\/zeta/,
		],
		[
			"an unknown set",
			(i: FixtureInput) => (cars(i).items[0].set = "sedans"),
			/vehicles\/zeta: unknown set sedans/,
		],
		[
			"a group listed above its total",
			(i: FixtureInput) => (cars(i).total = 2),
			/vehicles\/cars: listed 3 above total 2/,
		],
		[
			"a set listed above its total",
			(i: FixtureInput) => {
				const [coupes] = cars(i).sets ?? []
				coupes.total = 1
			},
			/vehicles\/cars set coupes: listed 2 above total 1/,
		],
		[
			"a shipped id missing from the seed",
			(i: FixtureInput) => (i.shipped += "vehicles/gone\n"),
			/vehicles\/gone: shipped id is missing from the seed/,
		],
		[
			"a seed id that is not in shipped-ids.txt",
			(i: FixtureInput) => (i.shipped = i.shipped.replace("vehicles/zeta\n", "")),
			/vehicles\/zeta: not in shipped-ids\.txt/,
		],
		[
			"an invalid line in shipped-ids.txt",
			(i: FixtureInput) => (i.shipped += "Not An Id\n"),
			/shipped-ids\.txt: "Not An Id" is not an id/,
		],
		[
			"an id over 80 characters",
			(i: FixtureInput) => (cars(i).items[0].id = `vehicles/${"a".repeat(80)}`),
			/vehicles\/cars\.json items\.0\.id/,
		],
		[
			"two press sources under one allowlist entry",
			(i: FixtureInput) => (cars(i).items[2].sources = [ign, ignNordic]),
			/vehicles\/hoop-10: confirmed needs an official source, a game screen or two press sources/,
		],
		[
			"a tip source on an unlisted host",
			(i: FixtureInput) =>
				(pelican(i).tips = [
					{ text: "Look up.", sources: [{ url: "https://example.com/t", title: "T" }] },
				]),
			/animals\/pelican tip 1: source https:\/\/example\.com\/t is unlisted/,
		],
		[
			"a location link on an unlisted host",
			(i: FixtureInput) =>
				(pelican(i).locations = [
					{ area: "Piers", kind: "find", link: { url: "https://example.com/p", title: "Map" } },
				]),
			/animals\/pelican: location link https:\/\/example\.com\/p is unlisted/,
		],
		[
			"a category listed twice in categories.json",
			(i: FixtureInput) => i.categories.categories.push({ id: "vehicles" }),
			/categories\.json: vehicles is listed twice/,
		],
		[
			"an item with no sources under a header with none",
			(i: FixtureInput) => (cars(i).items[0].sources = []),
			/vehicles\/zeta: no sources, and the group header has none/,
		],
		[
			"a folder that is not in categories.json",
			(i: FixtureInput) =>
				(i.groups["weapons/guns.json"] = { group: "guns", order: 1, sort: "name", items: [] }),
			/weapons\/guns\.json: weapons is not in categories\.json/,
		],
		[
			"a file whose group field differs from its name",
			(i: FixtureInput) => (bikes(i).group = "motorbikes"),
			/vehicles\/bikes\.json: group must be bikes/,
		],
		[
			"two groups with one order",
			(i: FixtureInput) => (bikes(i).order = 1),
			/vehicles: groups bikes and cars share order 1/,
		],
		[
			"a file outside <category>/<group>.json",
			(i: FixtureInput) =>
				(i.groups["vehicles/extra/cars.json"] = {
					group: "cars",
					order: 9,
					sort: "name",
					items: [],
				}),
			/vehicles\/extra\/cars\.json: a group file sits at <category>\/<group>\.json/,
		],
	])("%s", (_name, change, error) => {
		expect(errorsAfter(change)).toMatch(error)
	})
})

describe("sortKey (spec §3)", () => {
	it("drops a leading model year and punctuation, keeps other digits", () => {
		expect(sortKey("'70 Vapid Ganado")).toBe("Vapid Ganado")
		expect(sortKey("’70 Vapid Ganado")).toBe("Vapid Ganado")
		expect(sortKey("1955 Vapid Stanier")).toBe("Vapid Stanier")
		expect(sortKey("“Quoted” Name")).toBe("Quoted” Name")
		expect(sortKey("300R")).toBe("300R")
	})
})

describe("parseShipped", () => {
	it("reads LF and CRLF the same and skips comments and blank lines", () => {
		const lf = parseShipped("# list\nanimals/a\n\nanimals/b\n")
		const crlf = parseShipped("# list\r\nanimals/a\r\n\r\nanimals/b\r\n")
		expect(lf).toEqual({ ids: ["animals/a", "animals/b"], errors: [] })
		expect(crlf).toEqual(lf)
	})
})
