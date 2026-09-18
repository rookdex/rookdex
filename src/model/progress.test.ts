import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import { listRecords, mergeRecords, replaceRecords, setDone } from "./progress"
import type { ProgressRecord } from "./schema"
import { openStore } from "./store"

function rec(item_id: string, done: boolean, updated_at: string, note?: string): ProgressRecord {
	return note === undefined
		? { item_id, done, updated_at, origin: "manual" }
		: { item_id, done, updated_at, origin: "manual", note }
}

describe("mergeRecords", () => {
	it("newest updated_at wins, un-ticks included", () => {
		const existing = [rec("a", true, "2026-09-10T00:00:00.000Z")]
		const incoming = [rec("a", false, "2026-09-12T00:00:00.000Z")]
		expect(mergeRecords(existing, incoming)).toEqual(incoming)
	})
	it("an older incoming tick loses to a newer existing un-tick", () => {
		const existing = [rec("a", false, "2026-09-12T00:00:00.000Z")]
		const incoming = [rec("a", true, "2026-09-10T00:00:00.000Z")]
		expect(mergeRecords(existing, incoming)).toEqual(existing)
	})
	it("ties keep the existing record", () => {
		const existing = [rec("a", true, "2026-09-12T00:00:00.000Z", "mine")]
		const incoming = [rec("a", false, "2026-09-12T00:00:00.000Z", "theirs")]
		expect(mergeRecords(existing, incoming)).toEqual(existing)
	})
	it("keeps records the other side does not have", () => {
		const existing = [rec("a", true, "2026-09-10T00:00:00.000Z")]
		const incoming = [rec("b", true, "2026-09-10T00:00:00.000Z")]
		expect(mergeRecords(existing, incoming).map((r) => r.item_id)).toEqual(["a", "b"])
	})
})

describe("setDone and listRecords", () => {
	it("writes per profile, keeps an existing note, and lists only that profile", async () => {
		const store = await openStore(new IDBFactory())
		const now = new Date("2026-09-16T10:00:00.000Z")
		await replaceRecords(store, "p1", [rec("wildlife/a", false, "2026-09-01T00:00:00.000Z", "hi")])
		const record = await setDone(store, "p1", "wildlife/a", true, now)
		expect(record).toEqual(rec("wildlife/a", true, now.toISOString(), "hi"))
		await setDone(store, "p2", "wildlife/a", true, now)
		expect(await listRecords(store, "p1")).toEqual([record])
		expect(await listRecords(store, "p2")).toHaveLength(1)
	})
})

describe("replaceRecords", () => {
	it("swaps the whole set in one transaction", async () => {
		const store = await openStore(new IDBFactory())
		await replaceRecords(store, "p1", [rec("a", true, "2026-09-01T00:00:00.000Z")])
		await replaceRecords(store, "p1", [rec("b", true, "2026-09-01T00:00:00.000Z")])
		expect((await listRecords(store, "p1")).map((r) => r.item_id)).toEqual(["b"])
	})
	it("leaves the old set when a record cannot be stored", async () => {
		const store = await openStore(new IDBFactory())
		await replaceRecords(store, "p1", [rec("a", true, "2026-09-01T00:00:00.000Z")])
		const broken = { ...rec("b", true, "2026-09-01T00:00:00.000Z"), item_id: undefined }
		await expect(
			replaceRecords(store, "p1", [broken as unknown as ProgressRecord])
		).rejects.toBeDefined()
		expect((await listRecords(store, "p1")).map((r) => r.item_id)).toEqual(["a"])
	})
})
