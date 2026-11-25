import { describe, expect, it } from "vitest"
import { type FixtureInput, game, ign, ignNordic, radar, validInput } from "../test/seed-fixture"
import { buildSeed, ciShippedErrors, parseShipped, shippedIdErrors, sortKey } from "./seedBuild"

function errorsAfter(change: (input: FixtureInput) => void): string {
	const input = validInput()
	change(input)
	return buildSeed(input).errors.join("\n")
}
const cars = (input: FixtureInput) => input.groups["vehicles/cars.json"]
const bikes = (input: FixtureInput) => input.groups["vehicles/bikes.json"]
const birds = (input: FixtureInput) => input.groups["animals/birds.json"]
const pelican = (input: FixtureInput) => birds(input).items[0]
function addStandout(input: FixtureInput, specs: Record<string, unknown>) {
	input.groups["vehicles/standout.json"] = {
		group: "standout",
		order: 3,
		sort: "name",
		items: [
			{ id: "vehicles/blazing", name: "Blazing", status: "confirmed", sources: [game], specs },
		],
	}
	input.shipped += "vehicles/blazing\n"
}

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
		[
			"a new item with a retired item's name",
			(i: FixtureInput) => {
				cars(i).items.push({
					id: "vehicles/hoop-nine",
					name: "Hoop 9",
					status: "confirmed",
					sources: [ign, radar],
				})
				i.shipped += "vehicles/hoop-nine\n"
			},
			/vehicles\/hoop-nine: same name as retired vehicles\/hoop-9; add replaces/,
		],
		[
			"an alias that is another item's name",
			(i: FixtureInput) => (birds(i).items[1].aliases = ["Pelican"]),
			/animals\/heron: alias Pelican is already a name or alias in animals/,
		],
		[
			"a tip without a source",
			(i: FixtureInput) => (pelican(i).tips = [{ text: "Look up.", sources: [] }]),
			/animals\/birds\.json items\.0\.tips\.0\.sources/,
		],
		[
			"a game source with a url",
			(i: FixtureInput) =>
				(cars(i).items[1].sources = [{ ...game, url: "https://www.rockstargames.com/VI" }]),
			/vehicles\/cars\.json items\.1\.sources\.0/,
		],
		[
			"markup in a specs value",
			(i: FixtureInput) => (cars(i).items[1].specs = { style: "<b>Classic</b>" }),
			/vehicles\/cars\.json items\.1\.specs\.style/,
		],
		[
			"an unknown spec key",
			(i: FixtureInput) => (cars(i).items[1].specs = { style: "Classic", paint: "Red" }),
			/vehicles\/alpha: unknown spec key paint for vehicles\/cars/,
		],
		[
			"specs on a group that takes none",
			(i: FixtureInput) => (pelican(i).specs = { speed: 5 }),
			/animals\/pelican: animals\/birds takes no specs/,
		],
		[
			"a bar outside 1 to 10",
			(i: FixtureInput) => addStandout(i, { rating: "A", speed: 11 }),
			/vehicles\/standout\.json items\.0\.specs\.speed/,
		],
		[
			"text where a bar belongs",
			(i: FixtureInput) => addStandout(i, { speed: "fast" }),
			/vehicles\/blazing: spec speed must be a 1 to 10 bar/,
		],
		[
			"a number where text belongs",
			(i: FixtureInput) => addStandout(i, { rating: 7 }),
			/vehicles\/blazing: spec rating must be text from the screen/,
		],
		[
			"an online item",
			(i: FixtureInput) => (pelican(i).mode = "online"),
			/animals\/pelican: online and platform-limited items wait for the Settings preference/,
		],
		[
			"a platform-limited item",
			(i: FixtureInput) => (pelican(i).platforms = ["pc"]),
			/animals\/pelican: online and platform-limited items wait for the Settings preference/,
		],
		[
			"a story spoiler item",
			(i: FixtureInput) => (pelican(i).spoiler = "story"),
			/animals\/pelican: story spoilers wait for the Hide spoilers switch/,
		],
		[
			"a story spoiler group",
			(i: FixtureInput) => (birds(i).spoiler = "story"),
			/animals\/birds: story spoilers wait for the Hide spoilers switch/,
		],
		[
			"a group file in a story category",
			(i: FixtureInput) =>
				(i.groups["story/chapters.json"] = {
					group: "chapters",
					order: 1,
					sort: "file",
					items: [],
				}),
			/story\/chapters\.json: story content waits for the Hide spoilers switch/,
		],
		[
			"a set listed twice",
			(i: FixtureInput) => cars(i).sets?.push({ id: "coupes" }),
			/vehicles\/cars: set coupes is listed twice/,
		],
		[
			"a header source on an unlisted host",
			(i: FixtureInput) => (bikes(i).sources = [{ url: "https://example.com/", title: "Blog" }]),
			/vehicles\/bikes/,
		],
	])("%s", (_name, change, error) => {
		expect(errorsAfter(change)).toMatch(error)
	})
})

describe("buildSeed accepts", () => {
	it("a total that only the counted items fit, since edition items do not count", () => {
		expect(errorsAfter((i) => (birds(i).total = 1))).toBe("")
	})
	it("a header with two press sources on different entries over an item with no sources", () => {
		expect(errorsAfter((i) => (bikes(i).sources = [ign, radar]))).toBe("")
	})
	it("a twin name when the new item replaces the retired one", () => {
		expect(
			errorsAfter((i) => {
				cars(i).total = 4
				cars(i).items.push({
					id: "vehicles/hoop-nine",
					name: "Hoop 9",
					status: "confirmed",
					sources: [ign, radar],
					replaces: ["vehicles/hoop-9"],
				})
				i.shipped += "vehicles/hoop-nine\n"
			})
		).toBe("")
	})
	it("an alias equal to a retired name when the item replaces it", () => {
		expect(
			errorsAfter((i) => {
				cars(i).items[0].aliases = ["Hoop 9"]
				cars(i).items[0].replaces = ["vehicles/hoop-9"]
			})
		).toBe("")
	})
	it("every platform listed, story mode and a gate spoiler", () => {
		expect(
			errorsAfter((i) => {
				pelican(i).platforms = ["ps5", "xbox", "pc"]
				pelican(i).mode = "story"
				pelican(i).spoiler = "gate"
			})
		).toBe("")
	})
	it("Standout specs with every key", () => {
		expect(
			errorsAfter((i) =>
				addStandout(i, {
					rating: "A",
					speed: 7,
					acceleration: 6,
					asphaltHandling: 5,
					offRoadHandling: 4,
					strength: 3,
				})
			)
		).toBe("")
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

describe("shippedIdErrors (spec §6 checks 2 and 3)", () => {
	const seed = [
		{ id: "wildlife/pelican", category: "animals" },
		{ id: "animals/heron", category: "animals" },
	]
	it("passes when main's ids stay and new ids start with their category", () => {
		expect(
			shippedIdErrors(["wildlife/pelican"], ["wildlife/pelican", "animals/heron"], seed)
		).toEqual([])
	})
	it("fails when the list drops a line that is on main", () => {
		expect(
			shippedIdErrors(
				["wildlife/pelican", "wildlife/gone"],
				["wildlife/pelican", "animals/heron"],
				seed
			)
		).toEqual(["shipped-ids.txt drops wildlife/gone, which is on main"])
	})
	it("fails when a new id starts with another category", () => {
		const added = [...seed, { id: "wildlife/heron2", category: "animals" }]
		expect(
			shippedIdErrors(
				["wildlife/pelican"],
				["wildlife/pelican", "animals/heron", "wildlife/heron2"],
				added
			)
		).toEqual(["wildlife/heron2: a new id must start with animals/"])
	})
})

describe("ciShippedErrors", () => {
	it("passes while main has no list yet (the PR that adds it)", () => {
		expect(
			ciShippedErrors("", "wildlife/pelican\n", [{ id: "wildlife/pelican", category: "animals" }])
		).toEqual([])
	})
	it("checks once main has a list", () => {
		expect(ciShippedErrors("# ids\nanimals/a\n", "", [])).toEqual([
			"shipped-ids.txt drops animals/a, which is on main",
		])
	})
})
