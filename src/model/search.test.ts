import { describe, expect, it } from "vitest"
import type { SeedItem } from "./schema"
import { emptyState, foundIds, matches, normalize, searchView } from "./search"
import type { Records } from "./stats"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }

function item(id: string, group: string, name: string, extra: Partial<SeedItem> = {}): SeedItem {
	return {
		id,
		category: id.split("/")[0],
		group,
		name,
		status: "confirmed",
		sources: [src],
		...extra,
	}
}

const items: SeedItem[] = [
	item("vehicles/albany-primo", "cars", "Albany Primo"),
	item("vehicles/ubermacht-sentinel", "cars", "Übermacht Sentinel"),
	item("vehicles/speedophile", "boats", "Speedophile Seashark"),
	item("vehicles/old-bravado", "cars", "Old Bravado", { retired: true }),
	item("wildlife/pelican", "birds", "Pelican"),
	item("wildlife/alligator", "reptiles", "American alligator"),
]

const terms = {
	cars: ["car", "cars", "bil", "biler"],
	boats: ["boat", "boats", "båt", "båter"],
	birds: ["bird", "birds", "animal", "fugl", "fugler", "dyr"],
	reptiles: ["reptile", "reptiles", "animal", "krypdyr", "dyr"],
}

const none: ReadonlySet<string> = new Set()
const ids = (list: SeedItem[]) => list.map((i) => i.id)
const view = (patch: Partial<Parameters<typeof searchView>[0]>) =>
	searchView({ items, selected: [], query: "", hidden: none, terms, ...patch })

describe("normalize (spec §3.1)", () => {
	it("folds accents and case, keeps ø and æ as letters", () => {
		expect(normalize("Übermacht")).toBe("ubermacht")
		expect(normalize("Båter")).toBe("bater")
		expect(normalize("Øyer")).toBe("øyer")
		expect(normalize("Nyttekjøretøy")).toBe("nyttekjøretøy")
		expect(normalize("Ærfugl")).toBe("ærfugl")
	})

	it("trims and collapses runs of whitespace", () => {
		expect(normalize("  albany \t  primo  ")).toBe("albany primo")
	})
})

describe("matches (spec §3.1)", () => {
	it("needs every word in some field", () => {
		expect(matches("albany primo", ["Albany Primo"])).toBe(true)
		expect(matches("primo albany", ["Albany Primo"])).toBe(true)
		expect(matches("albany sentinel", ["Albany Primo"])).toBe(false)
		expect(matches("primo car", ["Albany Primo", "car"])).toBe(true)
	})

	it("matches parts of words, accent- and case-insensitively", () => {
		expect(matches("uber", ["Übermacht Sentinel"])).toBe(true)
		expect(matches("BÅT", ["boats", "båter"])).toBe(true)
		expect(matches("bat", ["båter"])).toBe(true)
	})

	it("treats regex characters as plain text", () => {
		expect(matches("(", ["Albany Primo"])).toBe(false)
		expect(matches("*", ["Albany Primo"])).toBe(false)
		expect(matches(".*", ["Albany Primo"])).toBe(false)
		expect(matches("(2)", ["Pegasi (2)"])).toBe(true)
	})

	it("lets an empty or space-only query match everything", () => {
		expect(matches("", ["Albany Primo"])).toBe(true)
		expect(matches("   ", ["Albany Primo"])).toBe(true)
	})
})

describe("foundIds", () => {
	it("lists the done ids only", () => {
		const records = {
			"wildlife/pelican": { item_id: "wildlife/pelican", done: true },
			"vehicles/albany-primo": { item_id: "vehicles/albany-primo", done: false },
		} as unknown as Records
		expect([...foundIds(records)]).toEqual(["wildlife/pelican"])
	})
})

describe("searchView (spec §3.1)", () => {
	it("is today's chip view with no query", () => {
		expect(ids(view({}).visible)).toEqual([
			"vehicles/albany-primo",
			"vehicles/ubermacht-sentinel",
			"vehicles/speedophile",
			"wildlife/pelican",
			"wildlife/alligator",
		])
		expect(ids(view({ selected: ["wildlife"] }).visible)).toEqual([
			"wildlife/pelican",
			"wildlife/alligator",
		])
	})

	it("matches names and group terms, with the same set for car and bil", () => {
		expect(ids(view({ query: "car" }).visible)).toEqual(ids(view({ query: "bil" }).visible))
		expect(ids(view({ query: "bil" }).visible)).toEqual([
			"vehicles/albany-primo",
			"vehicles/ubermacht-sentinel",
		])
		expect(ids(view({ query: "dyr" }).visible)).toEqual(["wildlife/pelican", "wildlife/alligator"])
		expect(ids(view({ query: "seashark" }).visible)).toEqual(["vehicles/speedophile"])
	})

	it("runs inside the chips and counts the matches elsewhere", () => {
		const v = view({ selected: ["wildlife"], query: "car" })
		expect(v.visible).toEqual([])
		expect(v.elsewhere).toBe(2)
	})

	it("counts nothing elsewhere with no query or with All", () => {
		expect(view({ selected: ["wildlife"] }).elsewhere).toBe(0)
		expect(view({ query: "car" }).elsewhere).toBe(0)
	})

	it("hides the snapshot and counts it inside the chips only", () => {
		const hidden = new Set(["wildlife/pelican", "vehicles/albany-primo"])
		const v = view({ selected: ["wildlife"], query: "animal", hidden })
		expect(ids(v.visible)).toEqual(["wildlife/alligator"])
		expect(v.hiddenCount).toBe(1)
		// A hidden match outside the chips is not "elsewhere": Show all would not show it.
		expect(view({ selected: ["wildlife"], query: "primo", hidden }).elsewhere).toBe(0)
	})

	it("shows an item found after the snapshot", () => {
		const hidden = new Set(["wildlife/pelican"])
		// The alligator was ticked after the snapshot: it is not in `hidden`, so it stays.
		expect(ids(view({ selected: ["wildlife"], hidden }).visible)).toEqual(["wildlife/alligator"])
	})

	it("never counts a retired item", () => {
		const v = view({ selected: ["wildlife"], query: "bravado" })
		expect(v.elsewhere).toBe(0)
		expect(view({ query: "bravado" }).visible).toEqual([])
		const hidden = new Set(["vehicles/old-bravado"])
		expect(view({ query: "bravado", hidden }).hiddenCount).toBe(0)
	})
})

describe("emptyState (spec §4)", () => {
	const empty = { visible: [], elsewhere: 0, hiddenCount: 0 }
	it("picks the messages in the spec's order", () => {
		expect(emptyState({ ...empty, visible: [items[0]] }, "x")).toBe("none")
		expect(emptyState({ ...empty, elsewhere: 2, hiddenCount: 3 }, "x")).toBe("elsewhere")
		expect(emptyState({ ...empty, hiddenCount: 3 }, "x")).toBe("all-found")
		expect(emptyState({ ...empty, hiddenCount: 3 }, "")).toBe("all-found")
		expect(emptyState(empty, "x")).toBe("no-match")
	})

	it("leaves an empty list with no query to the list's own message", () => {
		expect(emptyState(empty, "  ")).toBe("none")
	})
})
