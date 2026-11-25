import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	categoryRows,
	closestCategory,
	findsByDay,
	foundToday,
	latestNews,
	latestRumours,
	nextGroups,
	rankCategories,
} from "./dashboard"
import type { Fact, ProgressRecord, Rumour, SeedItem } from "./schema"
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
	item("animals/e"),
	item("animals/f"),
]

describe("closestCategory", () => {
	it("starts with animals when nothing is found", () => {
		expect(closestCategory(items, {})).toBe("animals")
	})

	it("picks the highest share below 100 %", () => {
		const r = records({
			"vehicles/c": "2026-11-20T10:00:00Z",
			"animals/e": "2026-11-20T10:00:00Z",
		})
		// Both at 50 %: the tie goes to category order (the first category to appear in the item list).
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
		const withRetired = [...items, item("animals/gone", "g", { retired: true })]
		// Only the retired item and an unknown id are ticked: still "nothing found".
		const r = records({
			"animals/gone": "2026-11-20T10:00:00Z",
			"weapons/x": "2026-11-20T10:00:00Z",
		})
		expect(closestCategory(withRetired, r)).toBe("animals")
		// Retired items don't hold a category below 100 % either.
		const done = records({
			"animals/e": "2026-11-20T10:00:00Z",
			"animals/f": "2026-11-20T10:00:00Z",
		})
		expect(closestCategory(withRetired, done)).toBe("collectibles")
	})
})

describe("rankCategories", () => {
	it("puts animals first, then category order, when nothing is found", () => {
		expect(rankCategories(items, {})).toEqual(["animals", "collectibles", "vehicles"])
	})
	it("ranks by share found, ties in category order, and drops finished categories", () => {
		const r = records({
			"collectibles/a": "2026-11-20T10:00:00Z",
			"collectibles/b": "2026-11-20T10:00:00Z",
			"vehicles/c": "2026-11-20T10:00:00Z",
		})
		expect(rankCategories(items, r)).toEqual(["vehicles", "animals"])
	})
	it("agrees with closestCategory on its first entry", () => {
		const cases: Records[] = [
			{},
			records({ "vehicles/c": "2026-11-20T10:00:00Z" }),
			records({ "collectibles/a": "2026-11-20T10:00:00Z", "animals/e": "2026-11-20T10:00:00Z" }),
		]
		for (const r of cases) expect(rankCategories(items, r)[0]).toBe(closestCategory(items, r))
	})
})

describe("nextGroups", () => {
	// In seed order: seedBuild sorts groups and names once, and the dashboard keeps that order.
	const birds = [
		item("animals/egret", "birds"),
		item("animals/pelican", "birds"),
		item("animals/dodo", "birds", { retired: true }),
		item("animals/alligator", "reptiles"),
		item("vehicles/bike", "bikes"),
	]
	const names = (groups: ReturnType<typeof nextGroups>) =>
		groups.map((g) => [g.category, g.left, g.items.map((i) => i.name)])

	it("lists unfound items of the closest category in tracker order, up to the limit", () => {
		expect(names(nextGroups(birds, {}, 3))).toEqual([
			["animals", 3, ["egret", "pelican", "alligator"]],
		])
	})
	it("counts every unfound item in left, not only the ones shown", () => {
		expect(names(nextGroups(birds, {}, 2))).toEqual([["animals", 3, ["egret", "pelican"]]])
	})
	it("skips found and retired items and fills from the next-closest category", () => {
		const r = records({ "animals/egret": "2026-11-20T10:00:00Z" })
		expect(names(nextGroups(birds, r, 3))).toEqual([
			["animals", 2, ["pelican", "alligator"]],
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
			"animals/e": "2026-11-19T23:30:00Z", // 00:30 on 20 Nov in Oslo: today
			"animals/f": "2026-11-19T22:30:00Z", // 23:30 on 19 Nov in Oslo: yesterday
		})
		expect(foundToday(items, r, new Date("2026-11-20T09:00:00Z"))).toBe(1)
	})

	it("ignores unticked records, retired items and records with no seed item", () => {
		const retired = [...items, item("animals/gone", "g", { retired: true })]
		const r: Records = {
			...records({ "animals/gone": "2026-11-20T10:00:00Z", "weapons/x": "2026-11-20T10:00:00Z" }),
			"animals/e": { ...found(), item_id: "animals/e", done: false },
		}
		expect(foundToday(retired, r, new Date("2026-11-20T12:00:00Z"))).toBe(0)
	})

	it("counts a find in a counts: false group or an edition item, which the list shows", () => {
		const extra = [...items, item("animals/bonus", "g", { uncounted: true })]
		const r = records({ "animals/bonus": "2026-11-20T10:00:00Z" })
		expect(foundToday(extra, r, new Date("2026-11-20T12:00:00Z"))).toBe(1)
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

function fact(id: string, announced: string): Fact {
	return {
		id,
		claim_key: id.split("/")[1],
		name: { en: `${id} en`, nb: `${id} nb` },
		summary: { en: "s", nb: "s" },
		announced,
		sources: [src],
	}
}
function rumour(id: string, added: string): Rumour {
	return { id, name: id, claim_key: id.split("/")[1], summary: "s", added, sources: [src] }
}

describe("latestNews", () => {
	it("merges facts and rumours newest first", () => {
		const news = latestNews(
			[fact("facts/a", "2026-10-01"), fact("facts/b", "2026-10-20")],
			[rumour("rumours/c", "2026-10-10"), rumour("rumours/d", "2026-10-25")],
			5
		)
		expect(news.map((n) => n.id)).toEqual(["rumours/d", "facts/b", "rumours/c", "facts/a"])
		expect(news[1]).toEqual({
			id: "facts/b",
			kind: "confirmed",
			date: "2026-10-20",
			name: { en: "facts/b en", nb: "facts/b nb" },
		})
		expect(news[0]).toEqual({
			id: "rumours/d",
			kind: "rumour",
			date: "2026-10-25",
			name: "rumours/d",
		})
	})

	it("puts Confirmed first on the same day, then orders by id", () => {
		const news = latestNews(
			[fact("facts/z", "2026-10-20")],
			[rumour("rumours/b", "2026-10-20"), rumour("rumours/a", "2026-10-20")],
			5
		)
		expect(news.map((n) => n.id)).toEqual(["facts/z", "rumours/a", "rumours/b"])
	})

	it("returns at most limit items, and nothing from nothing", () => {
		const many = Array.from({ length: 8 }, (_, n) => rumour(`rumours/r${n}`, `2026-10-1${n}`))
		expect(latestNews([], many, 5)).toHaveLength(5)
		expect(latestNews([], [], 5)).toEqual([])
	})
})

describe("findsByDay", () => {
	beforeEach(() => {
		vi.stubEnv("TZ", "Europe/Oslo")
	})
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("returns the last `days` local days ending today, oldest first, zero days kept", () => {
		const r = records({
			"animals/e": "2026-11-20T10:00:00Z",
			"animals/f": "2026-11-22T10:00:00Z",
			"vehicles/c": "2026-11-22T11:00:00Z",
		})
		expect(findsByDay(items, r, "2026-11-22", 7)).toEqual([
			{ day: "2026-11-16", count: 0 },
			{ day: "2026-11-17", count: 0 },
			{ day: "2026-11-18", count: 0 },
			{ day: "2026-11-19", count: 0 },
			{ day: "2026-11-20", count: 1 },
			{ day: "2026-11-21", count: 0 },
			{ day: "2026-11-22", count: 2 },
		])
	})

	it("counts a tick by its local calendar day, not its UTC day", () => {
		const r = records({ "animals/e": "2026-11-21T23:30:00Z" }) // 00:30 on 22 Nov in Oslo
		const days = findsByDay(items, r, "2026-11-22", 2)
		expect(days).toEqual([
			{ day: "2026-11-21", count: 0 },
			{ day: "2026-11-22", count: 1 },
		])
	})

	it("skips unticked records, retired items and records with no seed item", () => {
		const withRetired = [...items, item("animals/old", "g", { retired: true })]
		const r: Records = {
			...records({ "animals/old": "2026-11-22T10:00:00Z", "ghost/x": "2026-11-22T10:00:00Z" }),
			"animals/e": { ...found("2026-11-22T10:00:00Z"), item_id: "animals/e", done: false },
		}
		expect(findsByDay(withRetired, r, "2026-11-22", 1)).toEqual([{ day: "2026-11-22", count: 0 }])
	})

	it("counts a find of an uncounted item, which the list shows", () => {
		const extra = [...items, item("animals/bonus", "g", { uncounted: true })]
		const r = records({ "animals/bonus": "2026-11-22T10:00:00Z" })
		expect(findsByDay(extra, r, "2026-11-22", 1)).toEqual([{ day: "2026-11-22", count: 1 }])
	})

	it("returns 7 distinct days across the 25 October 2026 daylight-saving change", () => {
		const days = findsByDay(items, {}, "2026-10-28", 7).map((d) => d.day)
		expect(days).toEqual([
			"2026-10-22",
			"2026-10-23",
			"2026-10-24",
			"2026-10-25",
			"2026-10-26",
			"2026-10-27",
			"2026-10-28",
		])
	})
})

describe("categoryRows", () => {
	it("gives each category its total, found count and group ids in tracker order", () => {
		const grouped = [
			item("vehicles/c", "bikes"),
			item("animals/f", "birds"),
			item("animals/e", "reptiles"),
			item("animals/g", "reptiles"),
			item("animals/old", "fish", { retired: true }),
		]
		const r = records({ "animals/e": "2026-11-20T10:00:00Z" })
		expect(categoryRows(grouped, r)).toEqual([
			{ id: "vehicles", done: 0, total: 1, groups: ["bikes"] },
			{ id: "animals", done: 1, total: 3, groups: ["birds", "reptiles"] },
		])
	})
})
