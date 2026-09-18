import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import { listRecords, replaceRecords } from "./progress"
import type { ExportFile, ProgressRecord } from "./schema"
import { openStore } from "./store"
import { buildExport, importRecords, MAX_IMPORT_BYTES, parseImport } from "./transfer"

const now = new Date("2026-09-16T10:00:00.000Z")
const profile = { id: "p1", name: "Malin & Dad", created_at: "2026-09-01T00:00:00.000Z" }
const record: ProgressRecord = {
	item_id: "wildlife/a",
	done: true,
	updated_at: "2026-09-10T00:00:00.000Z",
	origin: "manual",
	note: "near the marina",
}

describe("buildExport", () => {
	it("holds only version, timestamp, profile name and records", () => {
		const { filename, file } = buildExport(profile, [record], now)
		expect(file).toEqual({
			version: 1,
			exported_at: now.toISOString(),
			profile_name: "Malin & Dad",
			records: [record],
		})
		expect(Object.keys(file)).toEqual(["version", "exported_at", "profile_name", "records"])
		expect(filename).toBe("rookdex-malin-dad-2026-09-16.json")
	})
})

describe("parseImport", () => {
	const valid: ExportFile = buildExport(profile, [record], now).file
	it("accepts a valid export", () => {
		expect(parseImport(JSON.stringify(valid))).toEqual({ ok: true, file: valid })
	})
	it("rejects by size before parsing", () => {
		expect(parseImport("{}", MAX_IMPORT_BYTES + 1)).toEqual({ ok: false, error: "too-large" })
	})
	it("rejects bad JSON", () => {
		expect(parseImport("{not json")).toEqual({ ok: false, error: "not-json" })
	})
	it("rejects wrong version, unknown fields, over-long fields", () => {
		expect(parseImport(JSON.stringify({ ...valid, version: 2 }))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(JSON.stringify({ ...valid, device: "x" }))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(JSON.stringify({ ...valid, profile_name: "x".repeat(41) }))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(JSON.stringify([]))).toEqual({ ok: false, error: "not-export" })
	})
})

describe("importRecords", () => {
	it("merges newest-wins and swaps in one transaction", async () => {
		const store = await openStore(new IDBFactory())
		await replaceRecords(store, "p1", [
			{
				item_id: "wildlife/a",
				done: false,
				updated_at: "2026-09-12T00:00:00.000Z",
				origin: "manual",
			},
			{
				item_id: "wildlife/b",
				done: true,
				updated_at: "2026-09-01T00:00:00.000Z",
				origin: "manual",
			},
		])
		const file = buildExport(profile, [record, { ...record, item_id: "wildlife/c" }], now).file
		const merged = await importRecords(store, "p1", file)
		const byId = Object.fromEntries(merged.map((r) => [r.item_id, r]))
		expect(byId["wildlife/a"].done).toBe(false)
		expect(byId["wildlife/b"].done).toBe(true)
		expect(byId["wildlife/c"].note).toBe("near the marina")
		expect(await listRecords(store, "p1")).toHaveLength(3)
	})
})
