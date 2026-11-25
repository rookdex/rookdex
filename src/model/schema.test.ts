import { z } from "astro/zod"
import { describe, expect, it } from "vitest"
import {
	categoriesFileSchema,
	exportFileSchema,
	groupFileSchema,
	itemInputSchema,
	MAX_RECORDS,
	progressRecordSchema,
	rumourInputSchema,
	sourceInputSchema,
	specValueSchema,
	text,
} from "./schema"

const source = { url: "https://www.rockstargames.com/VI", title: "Grand Theft Auto VI" }
const record = {
	item_id: "wildlife/american-alligator",
	done: true,
	updated_at: "2026-09-16T10:00:00.000Z",
	origin: "manual",
}

describe("zod config", () => {
	it("runs jitless, so the CSP never sees Zod's Function() probe", () => {
		expect(z.config().jitless).toBe(true)
	})
})

describe("text", () => {
	it("trims and caps", () => {
		expect(text(5).parse("  abc ")).toBe("abc")
		expect(text(5).safeParse("abcdef").success).toBe(false)
		expect(text(5).safeParse("   ").success).toBe(false)
	})
	it("rejects markup and URLs", () => {
		expect(text(80).safeParse("a <b>bold</b> name").success).toBe(false)
		expect(text(80).safeParse("see https://x.y").success).toBe(false)
		expect(text(80).safeParse("HTTP in caps").success).toBe(false)
	})
})

describe("sourceInputSchema", () => {
	it("accepts https only", () => {
		expect(sourceInputSchema.safeParse(source).success).toBe(true)
		expect(sourceInputSchema.safeParse({ ...source, url: "http://ign.com/a" }).success).toBe(false)
	})
	it("rejects an authored tier", () => {
		expect(sourceInputSchema.safeParse({ ...source, tier: "press" }).success).toBe(false)
	})
})

describe("itemInputSchema", () => {
	const item = {
		id: "animals/pelican",
		name: "Pelican",
		status: "confirmed",
		sources: [{ url: "https://www.rockstargames.com/VI", title: "GTA VI site" }],
	}
	it("accepts a minimal item and an item with no sources (the header may carry them)", () => {
		expect(itemInputSchema.safeParse(item).success).toBe(true)
		expect(itemInputSchema.safeParse({ ...item, sources: [] }).success).toBe(true)
	})
	it("rejects bad ids, unknown fields, category and group fields", () => {
		expect(itemInputSchema.safeParse({ ...item, id: "Animals/Pelican" }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, id: "animals/a/b" }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, id: `animals/${"a".repeat(80)}` }).success).toBe(
			false
		)
		expect(itemInputSchema.safeParse({ ...item, extra: 1 }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, category: "animals" }).success).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, location: { x: 1, y: 2, region: "a" } }).success
		).toBe(false)
	})
	it("caps the name at 80 and the description at 300", () => {
		expect(itemInputSchema.safeParse({ ...item, name: "x".repeat(81) }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, description: "x".repeat(301) }).success).toBe(false)
	})
	it("takes a game source, but never one with a url", () => {
		const game = { kind: "game", screen: ["Progress", "Animals", "Birds"] }
		expect(itemInputSchema.safeParse({ ...item, sources: [game] }).success).toBe(true)
		expect(
			itemInputSchema.safeParse({
				...item,
				sources: [{ ...game, url: "https://www.rockstargames.com/VI" }],
			}).success
		).toBe(false)
	})
	it("caps the extras: 5 aliases, 3 tips with a source each, 10 locations", () => {
		const source = item.sources[0]
		expect(
			itemInputSchema.safeParse({ ...item, aliases: ["a", "b", "c", "d", "e", "f"] }).success
		).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, tips: [{ text: "Look up.", sources: [] }] }).success
		).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, tips: [{ text: "x".repeat(301), sources: [source] }] })
				.success
		).toBe(false)
		const spot = { area: "Ocean Beach piers", kind: "find" }
		expect(itemInputSchema.safeParse({ ...item, locations: [spot] }).success).toBe(true)
		expect(itemInputSchema.safeParse({ ...item, locations: Array(11).fill(spot) }).success).toBe(
			false
		)
		expect(
			itemInputSchema.safeParse({ ...item, locations: [{ ...spot, kind: "steal" }] }).success
		).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, locations: [{ ...spot, area: "x".repeat(121) }] })
				.success
		).toBe(false)
	})
})

describe("specValueSchema", () => {
	it("takes a bar from 1 to 10 or plain text from the screen", () => {
		expect(specValueSchema.safeParse(7).success).toBe(true)
		expect(specValueSchema.safeParse("Classic").success).toBe(true)
		expect(specValueSchema.safeParse(0).success).toBe(false)
		expect(specValueSchema.safeParse(11).success).toBe(false)
		expect(specValueSchema.safeParse(6.5).success).toBe(false)
		expect(specValueSchema.safeParse("<b>Classic</b>").success).toBe(false)
	})
})

describe("groupFileSchema", () => {
	const file = { group: "birds", order: 1, sort: "name", items: [] }
	it("accepts a bare header and one with total, sets, counts and sources", () => {
		expect(groupFileSchema.safeParse(file).success).toBe(true)
		expect(
			groupFileSchema.safeParse({
				...file,
				total: 60,
				counts: false,
				sets: [{ id: "shorebirds", total: 4 }],
				sources: [{ kind: "game", screen: ["Progress", "Animals", "Birds"] }],
			}).success
		).toBe(true)
	})
	it("rejects an unknown sort, a zero total and unknown fields", () => {
		expect(groupFileSchema.safeParse({ ...file, sort: "date" }).success).toBe(false)
		expect(groupFileSchema.safeParse({ ...file, total: 0 }).success).toBe(false)
		expect(groupFileSchema.safeParse({ ...file, category: "animals" }).success).toBe(false)
	})
})

describe("categoriesFileSchema", () => {
	it("takes an ordered list where only story may be a spoiler", () => {
		expect(
			categoriesFileSchema.safeParse({
				categories: [{ id: "vehicles" }, { id: "story", spoiler: "story" }],
			}).success
		).toBe(true)
		expect(
			categoriesFileSchema.safeParse({ categories: [{ id: "story", spoiler: "gate" }] }).success
		).toBe(false)
		expect(categoriesFileSchema.safeParse({ categories: [] }).success).toBe(false)
	})
})

describe("rumourInputSchema", () => {
	it("accepts a rumour and rejects a status field", () => {
		const rumour = {
			id: "rumours/stock-market",
			name: "Stock market",
			claim_key: "stock-market",
			summary: "A returning stock market has been reported.",
			added: "2026-09-18",
			sources: [{ url: "https://www.ign.com/articles/x", title: "IGN report" }],
		}
		expect(rumourInputSchema.safeParse(rumour).success).toBe(true)
		expect(rumourInputSchema.safeParse({ ...rumour, status: "expected" }).success).toBe(false)
	})
})

describe("progressRecordSchema", () => {
	it("accepts manual records with an optional note ≤ 500", () => {
		expect(progressRecordSchema.safeParse(record).success).toBe(true)
		expect(progressRecordSchema.safeParse({ ...record, note: "x".repeat(500) }).success).toBe(true)
		expect(progressRecordSchema.safeParse({ ...record, note: "x".repeat(501) }).success).toBe(false)
		expect(progressRecordSchema.safeParse({ ...record, origin: "xbox" }).success).toBe(false)
		expect(progressRecordSchema.safeParse({ ...record, updated_at: "yesterday" }).success).toBe(
			false
		)
	})
})

describe("exportFileSchema", () => {
	const file = {
		version: 1,
		exported_at: "2026-09-16T10:00:00.000Z",
		profile_name: "Malin",
		records: [record],
	}
	it("accepts version 1 with records", () => {
		expect(exportFileSchema.safeParse(file).success).toBe(true)
	})
	it("rejects other versions, unknown fields and too many records", () => {
		expect(exportFileSchema.safeParse({ ...file, version: 2 }).success).toBe(false)
		expect(exportFileSchema.safeParse({ ...file, device_id: "abc" }).success).toBe(false)
		const many = Array.from({ length: MAX_RECORDS + 1 }, (_, i) => ({
			...record,
			item_id: `wildlife/item-${i}`,
		}))
		expect(exportFileSchema.safeParse({ ...file, records: many }).success).toBe(false)
	})
})
