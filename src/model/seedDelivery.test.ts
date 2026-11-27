import { describe, expect, it } from "vitest"
import type { SeedItem } from "./schema"
import { seedItems } from "./seed"
import type { SeedGroup } from "./seedBuild"
import { seedChunks, seedIndex, seedIndexFile } from "./seedDelivered"
import { buildChunks, buildIndex, chunkHash } from "./seedDelivery"
import { indexItems } from "./trackItems"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const item = (over: Partial<SeedItem> & Pick<SeedItem, "id" | "category" | "group">): SeedItem => ({
	name: over.id,
	status: "confirmed",
	sources: [src],
	...over,
})

const items: SeedItem[] = [
	item({
		id: "vehicles/bike",
		category: "vehicles",
		group: "bikes",
		name: "Bike",
		description: "Two wheels.",
	}),
	item({
		id: "vehicles/old",
		category: "vehicles",
		group: "bikes",
		name: "Old",
		retired: true,
		description: "Gone.",
	}),
	item({
		id: "wildlife/pelican",
		category: "animals",
		group: "birds",
		name: "Pelican",
		status: "expected",
		precedent: "GTA V",
		aliases: ["Brown pelican"],
	}),
	item({
		id: "wildlife/gull",
		category: "animals",
		group: "birds",
		name: "Gull",
		uncounted: true,
		set: "coast",
	}),
]
const groups: SeedGroup[] = [
	{ category: "vehicles", id: "bikes", order: 1, sets: [], counts: true },
	{
		category: "animals",
		id: "birds",
		order: 1,
		total: 40,
		sets: [{ id: "coast", total: 5 }],
		counts: true,
	},
]
const categories = [{ id: "vehicles" }, { id: "weapons" }, { id: "animals" }]

describe("buildChunks", () => {
	it("writes one chunk per category with the card text of its shown items only", () => {
		const chunks = buildChunks(items)
		expect(chunks.map((c) => c.category)).toEqual(["vehicles", "animals"])
		expect(JSON.parse(chunks[0].body)).toEqual({
			category: "vehicles",
			text: { "vehicles/bike": { description: "Two wheels." } },
		})
		expect(JSON.parse(chunks[1].body)).toEqual({
			category: "animals",
			text: { "wildlife/pelican": { precedent: "GTA V" } },
		})
	})

	it("names each chunk by a hash of its exact bytes", () => {
		const [vehicles] = buildChunks(items)
		expect(vehicles.file).toBe(`vehicles.${chunkHash(vehicles.body)}`)
		expect(vehicles.url).toBe(`/data/${vehicles.file}.json`)
		expect(vehicles.url).toMatch(/^\/data\/[a-z0-9-]+\.[0-9a-f]{10}\.json$/)
	})

	it("keeps the URL when the text is unchanged and changes it when one character changes", () => {
		const again = buildChunks(items.map((i) => ({ ...i })))
		expect(again[0].url).toBe(buildChunks(items)[0].url)
		const edited = items.map((i) =>
			i.id === "vehicles/bike" ? { ...i, description: "Two wheels!" } : i
		)
		expect(buildChunks(edited)[0].url).not.toBe(buildChunks(items)[0].url)
		expect(buildChunks(edited)[1].url).toBe(buildChunks(items)[1].url)
	})
})

describe("buildIndex (spec §10 index shape)", () => {
	it("holds categories with their chunk, groups in order and light items without text or sources", () => {
		const chunks = buildChunks(items)
		expect(buildIndex({ categories, groups, items }, chunks)).toEqual({
			categories: [
				{ id: "vehicles", chunk: chunks[0].url },
				{ id: "animals", chunk: chunks[1].url },
			],
			groups: [
				{
					category: "vehicles",
					id: "bikes",
					order: 1,
					sets: [],
					counts: true,
					items: [
						{ id: "vehicles/bike", name: "Bike", status: "confirmed" },
						{ id: "vehicles/old", name: "Old", status: "confirmed", retired: true },
					],
				},
				{
					category: "animals",
					id: "birds",
					order: 1,
					total: 40,
					sets: [{ id: "coast", total: 5 }],
					counts: true,
					items: [
						{
							id: "wildlife/pelican",
							name: "Pelican",
							status: "expected",
							aliases: ["Brown pelican"],
						},
						{
							id: "wildlife/gull",
							name: "Gull",
							status: "confirmed",
							set: "coast",
							uncounted: true,
						},
					],
				},
			],
		})
	})
})

describe("the shipped seed's delivery", () => {
	it("lists every item in the index in the seed's display order", () => {
		expect(indexItems(seedIndex).map((i) => i.id)).toEqual(seedItems.map((i) => i.id))
	})

	it("gives every category in the index a chunk that the build writes", () => {
		const urls = new Set(seedChunks.map((c) => c.url))
		for (const category of seedIndex.categories) expect(urls.has(category.chunk)).toBe(true)
	})

	it("never puts sources in the index", () => {
		expect(JSON.stringify(seedIndex)).not.toContain('"sources"')
	})

	it("serves the index as /data/seed-index.<hash>.json, named by a hash of its bytes", () => {
		expect(seedIndexFile.url).toMatch(/^\/data\/seed-index\.[0-9a-f]{10}\.json$/)
		expect(seedIndexFile.file).toBe(`seed-index.${chunkHash(seedIndexFile.body)}`)
		expect(seedIndexFile.url).toBe(`/data/${seedIndexFile.file}.json`)
	})

	it("serves exactly the index in the index file", () => {
		expect(JSON.parse(seedIndexFile.body)).toEqual(seedIndex)
	})

	it("never names a category chunk like the index file", () => {
		for (const chunk of seedChunks) expect(chunk.file.startsWith("seed-index.")).toBe(false)
	})
})
