import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { closestCategory, foundToday, latestRumours, nextGroups, rankCategories } from "./dashboard"
import type { ProgressRecord, Rumour, SeedItem } from "./schema"
import type { Records } from "./stats"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
function item(id: string, group = "g", extra: Partial<SeedItem> = {}): SeedItem {
	const [category, name] = id.split("/")
	return { id, category, group, name, status: "confirmed", sources: [src], ...extra }
}
function found(at = "2026-11-20T10:00:00.000Z"): ProgressRecord {
	return { item_id: "x/x", done: true, updated_at: at, origin: "manual" }
}
function records(entries: Record<string, string>): Records {
	return Object.fromEntries(
		Object.entries(entries).map(([id, at]) => [id, { ...found(at), item_id: id }])
	)
}

const items = [
	item("collectibles/a"),
	item("collectibles/b"),
	item("vehicles/c"),
	item("vehicles/d"),
	item("wildlife/e"),
	item("wildlife/f"),
]

describe("closestCategory", () => {
	it("starts with wildlife when nothing is found", () => {
		expect(closestCategory(items, {})).toBe("wildlife")
	})

	it("picks the highest share below 100 %", () => {
		const r = records({
			"vehicles/c": "2026-11-20T10:00:00Z",
			"wildlife/e": "2026-11-20T10:00:00Z",
		})
		// Both at 50 %: the tie goes to category order (alphabetical by file name).
		expect(closestCategory(items, r)).toBe("vehicles")
	})

	it("skips a finished category and moves on", () => {
		const r = records({
			"vehicles/c": "2026-11-20T10:00:00Z",
			"vehicles/d": "2026-11-20T10:00:00Z",
		})
		expect(closestCategory(items, r)).toBe("collectibles")
	})

	it("is undefined when everything is found", () => {
		const all = Object.fromEntries(items.map((i) => [i.id, "2026-11-20T10:00:00Z"]))
		expect(closestCategory(items, records(all))).toBeUndefined()
	})

	it("ignores retired items and records with no seed item", () => {
		const withRetired = [...items, item("wildlife/gone", "g", { retired: true })]
		// Only the retired item and an unknown id are ticked: still "nothing found".
		const r = records({
			"wildlife/gone": "2026-11-20T10:00:00Z",
			"weapons/x": "2026-11-20T10:00:00Z",
		})
		expect(closestCategory(withRetired, r)).toBe("wildlife")
		// Retired items don't hold a category below 100 % either.
		const done = records({
			"wildlife/e": "2026-11-20T10:00:00Z",
			"wildlife/f": "2026-11-20T10:00:00Z",
		})
		expect(closestCategory(withRetired, done)).toBe("collectibles")
	})
})

describe("rankCategories", () => {
	it("puts wildlife first, then category order, when nothing is found", () => {
		expect(rankCategories(items, {})).toEqual(["wildlife", "collectibles", "vehicles"])
	})
	it("ranks by share found, ties in category order, and drops finished categories", () => {
		const r = records({
			"collectibles/a": "2026-11-20T10:00:00Z",
			"collectibles/b": "2026-11-20T10:00:00Z",
			"vehicles/c": "2026-11-20T10:00:00Z",
		})
		expect(rankCategories(items, r)).toEqual(["vehicles", "wildlife"])
	})
	it("agrees with closestCategory on its first entry", () => {
		const cases: Records[] = [
			{},
			records({ "vehicles/c": "2026-11-20T10:00:00Z" }),
			records({ "collectibles/a": "2026-11-20T10:00:00Z", "wildlife/e": "2026-11-20T10:00:00Z" }),
		]
		for (const r of cases) expect(rankCategories(items, r)[0]).toBe(closestCategory(items, r))
	})
})

describe("nextGroups", () => {
	const birds = [
		item("wildlife/pelican", "birds"),
		item("wildlife/egret", "birds"),
		item("wildlife/alligator", "reptiles"),
		item("wildlife/dodo", "birds", { retired: true }),
		item("vehicles/bike", "bikes"),
	]
	const names = (groups: ReturnType<typeof nextGroups>) =>
		groups.map((g) => [g.category, g.left, g.items.map((i) => i.name)])

	it("lists unfound items of the closest category in tracker order, up to the limit", () => {
		expect(names(nextGroups(birds, {}, 3))).toEqual([
			["wildlife", 3, ["egret", "pelican", "alligator"]],
		])
	})
	it("counts every unfound item in left, not only the ones shown", () => {
		expect(names(nextGroups(birds, {}, 2))).toEqual([["wildlife", 3, ["egret", "pelican"]]])
	})
	it("skips found and retired items and fills from the next-closest category", () => {
		const r = records({ "wildlife/egret": "2026-11-20T10:00:00Z" })
		expect(names(nextGroups(birds, r, 3))).toEqual([
			["wildlife", 2, ["pelican", "alligator"]],
			["vehicles", 1, ["bike"]],
		])
	})
	it("fills from the next category when the closest has one left", () => {
		const r = records({ "collectibles/a": "2026-11-20T10:00:00Z" })
		expect(names(nextGroups(items, r, 3))).toEqual([
			["collectibles", 1, ["b"]],
			["vehicles", 2, ["c", "d"]],
		])
	})
	it("draws from at most two categories, even with room left", () => {
		const r = records({
			"collectibles/a": "2026-11-20T10:00:00Z",
			"vehicles/c": "2026-11-20T10:00:00Z",
		})
		expect(names(nextGroups(items, r, 3))).toEqual([
			["collectibles", 1, ["b"]],
			["vehicles", 1, ["d"]],
		])
	})
	it("is empty when everything is found", () => {
		const all = Object.fromEntries(items.map((i) => [i.id, "2026-11-20T10:00:00Z"]))
		expect(nextGroups(items, records(all), 3)).toEqual([])
	})
})

describe("foundToday", () => {
	beforeEach(() => {
		vi.stubEnv("TZ", "Europe/Oslo")
	})
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("counts finds on the local calendar day of now", () => {
		const r = records({
			"wildlife/e": "2026-11-19T23:30:00Z", // 00:30 on 20 Nov in Oslo: today
			"wildlife/f": "2026-11-19T22:30:00Z", // 23:30 on 19 Nov in Oslo: yesterday
		})
		expect(foundToday(items, r, new Date("2026-11-20T09:00:00Z"))).toBe(1)
	})

	it("ignores unticked records, retired items and records with no seed item", () => {
		const retired = [...items, item("wildlife/gone", "g", { retired: true })]
		const r: Records = {
			...records({ "wildlife/gone": "2026-11-20T10:00:00Z", "weapons/x": "2026-11-20T10:00:00Z" }),
			"wildlife/e": { ...found(), item_id: "wildlife/e", done: false },
		}
		expect(foundToday(retired, r, new Date("2026-11-20T12:00:00Z"))).toBe(0)
	})
})

describe("latestRumours", () => {
	function rumour(id: string, added: string): Rumour {
		return {
			id: `rumours/${id}`,
			name: id,
			claim_key: id,
			summary: "A claim.",
			added,
			sources: [{ ...src, tier: "press" }],
		}
	}
	it("puts the newest first, breaks ties by id and stops at the limit", () => {
		const list = [
			rumour("b", "2026-09-18"),
			rumour("c", "2026-10-01"),
			rumour("a", "2026-09-18"),
			rumour("d", "2026-08-01"),
		]
		expect(latestRumours(list, 3).map((r) => r.name)).toEqual(["c", "a", "b"])
	})
	it("leaves the input untouched", () => {
		const list = [rumour("b", "2026-09-18"), rumour("c", "2026-10-01")]
		latestRumours(list, 2)
		expect(list.map((r) => r.name)).toEqual(["b", "c"])
	})
})
