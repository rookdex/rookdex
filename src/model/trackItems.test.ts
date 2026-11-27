import { describe, expect, it } from "vitest"
import {
	categoryIds,
	groupItems,
	indexItems,
	type SeedIndex,
	type TrackItem,
	withText,
} from "./trackItems"

const item = (id: string, category: string, group: string): TrackItem => ({
	id,
	category,
	group,
	name: id,
	status: "confirmed",
})

describe("trackItems", () => {
	it("lists categories in item order, once each", () => {
		const items = [item("a/1", "a", "x"), item("b/1", "b", "y"), item("a/2", "a", "x")]
		expect(categoryIds(items)).toEqual(["a", "b"])
	})

	it("groups items in order and keeps their own type", () => {
		const items = [item("a/1", "a", "x"), item("a/2", "a", "y"), item("a/3", "a", "x")]
		const groups = groupItems(items)
		expect([...groups.keys()]).toEqual(["x", "y"])
		expect(groups.get("x")?.map((i) => i.id)).toEqual(["a/1", "a/3"])
	})

	it("flattens the index in group order and gives each item its category and group", () => {
		const index: SeedIndex = {
			categories: [{ id: "a", chunk: "/data/a.0123456789.json" }],
			groups: [
				{
					category: "a",
					id: "x",
					order: 1,
					sets: [],
					counts: true,
					items: [{ id: "a/1", name: "One", status: "confirmed" }],
				},
				{
					category: "a",
					id: "y",
					order: 2,
					sets: [],
					counts: false,
					items: [{ id: "a/2", name: "Two", status: "expected", uncounted: true }],
				},
			],
		}
		expect(indexItems(index)).toEqual([
			{ id: "a/1", name: "One", status: "confirmed", category: "a", group: "x" },
			{ id: "a/2", name: "Two", status: "expected", uncounted: true, category: "a", group: "y" },
		])
	})

	it("merges card text into the items it names and leaves the rest as they are", () => {
		const items = [item("a/1", "a", "x"), item("a/2", "a", "x")]
		const merged = withText(items, { "a/1": { description: "Text.", precedent: "GTA V" } })
		expect(merged[0]).toEqual({ ...items[0], description: "Text.", precedent: "GTA V" })
		expect(merged[1]).toBe(items[1])
	})
})
