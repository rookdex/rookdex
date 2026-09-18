import { describe, expect, it } from "vitest"
import type { SeedItem } from "./schema"
import { countItems, perCategory, type Records, recentFinds } from "./stats"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
function item(id: string, category: string, retired?: boolean): SeedItem {
	return { id, category, group: "g", name: id, status: "confirmed", sources: [src], retired }
}
const items = [
	item("wildlife/a", "wildlife"),
	item("wildlife/b", "wildlife"),
	item("wildlife/old", "wildlife", true),
	item("vehicles/c", "vehicles"),
]
const records: Records = {
	"wildlife/a": {
		item_id: "wildlife/a",
		done: true,
		updated_at: "2026-09-10T00:00:00.000Z",
		origin: "manual",
	},
	"wildlife/old": {
		item_id: "wildlife/old",
		done: true,
		updated_at: "2026-09-11T00:00:00.000Z",
		origin: "manual",
	},
	"vehicles/c": {
		item_id: "vehicles/c",
		done: false,
		updated_at: "2026-09-12T00:00:00.000Z",
		origin: "manual",
	},
	"gone/x": {
		item_id: "gone/x",
		done: true,
		updated_at: "2026-09-13T00:00:00.000Z",
		origin: "manual",
	},
}

describe("counts", () => {
	it("ignores retired items and records without a seed item", () => {
		expect(countItems(items, records)).toEqual({ done: 1, total: 3 })
		expect(countItems(items, records)).toEqual({ done: 1, total: 3 })
	})
	it("counts per category in seed order", () => {
		expect(perCategory(items, records)).toEqual([
			{ category: "wildlife", done: 1, total: 2 },
			{ category: "vehicles", done: 0, total: 1 },
		])
	})
})

describe("recentFinds", () => {
	it("lists done, countable items newest first, capped", () => {
		const more: Records = {
			...records,
			"wildlife/b": {
				item_id: "wildlife/b",
				done: true,
				updated_at: "2026-09-14T00:00:00.000Z",
				origin: "manual",
			},
		}
		expect(recentFinds(items, more).map((f) => f.item.id)).toEqual(["wildlife/b", "wildlife/a"])
		expect(recentFinds(items, more, 1).map((f) => f.item.id)).toEqual(["wildlife/b"])
	})
})
