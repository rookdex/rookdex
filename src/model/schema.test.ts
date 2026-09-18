import { describe, expect, it } from "vitest"
import {
	exportFileSchema,
	MAX_RECORDS,
	progressRecordSchema,
	rumourInputSchema,
	seedItemInputSchema,
	sourceInputSchema,
	text,
} from "./schema"

const source = { url: "https://www.rockstargames.com/VI", title: "Grand Theft Auto VI" }
const item = {
	id: "wildlife/american-alligator",
	category: "wildlife",
	group: "reptiles",
	name: "American alligator",
	status: "confirmed",
	sources: [source],
}
const record = {
	item_id: "wildlife/american-alligator",
	done: true,
	updated_at: "2026-09-16T10:00:00.000Z",
	origin: "manual",
}

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

describe("seedItemInputSchema", () => {
	it("accepts a minimal confirmed item", () => {
		expect(seedItemInputSchema.safeParse(item).success).toBe(true)
	})
	it("rejects bad ids, unknown fields and empty sources", () => {
		expect(seedItemInputSchema.safeParse({ ...item, id: "Wildlife/Gator" }).success).toBe(false)
		expect(seedItemInputSchema.safeParse({ ...item, id: "wildlife/a/b" }).success).toBe(false)
		expect(seedItemInputSchema.safeParse({ ...item, id: "wildlife" }).success).toBe(false)
		expect(seedItemInputSchema.safeParse({ ...item, extra: 1 }).success).toBe(false)
		expect(seedItemInputSchema.safeParse({ ...item, sources: [] }).success).toBe(false)
	})
	it("caps the name at 80 and the description at 300", () => {
		expect(seedItemInputSchema.safeParse({ ...item, name: "x".repeat(81) }).success).toBe(false)
		expect(seedItemInputSchema.safeParse({ ...item, description: "x".repeat(301) }).success).toBe(
			false
		)
	})
})

describe("rumourInputSchema", () => {
	it("accepts a rumour and rejects a status field", () => {
		const rumour = {
			id: "rumours/stock-market",
			name: "Stock market",
			claim_key: "stock-market",
			summary: "A returning stock market has been reported.",
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
