import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import { openStore, request, type Store } from "./store"

function fresh(): Promise<Store> {
	return openStore(new IDBFactory())
}

describe("openStore", () => {
	it("creates both stores and the profile_id index", async () => {
		const store = await fresh()
		await store.put("profiles", { id: "p1", name: "Malin", created_at: "2026-09-16T10:00:00.000Z" })
		await store.put("progress", { profile_id: "p1", item_id: "wildlife/a", done: true })
		await store.put("progress", { profile_id: "p2", item_id: "wildlife/a", done: false })
		expect(await store.get("profiles", "p1")).toMatchObject({ name: "Malin" })
		expect(await store.get("progress", ["p1", "wildlife/a"])).toMatchObject({ done: true })
		expect(await store.getAll("progress", "profile_id", "p1")).toHaveLength(1)
		expect(await store.getAll("progress")).toHaveLength(2)
		await store.delete("progress", ["p1", "wildlife/a"])
		expect(await store.getAll("progress", "profile_id", "p1")).toHaveLength(0)
	})

	it("fires onFirstWrite once, on the first readwrite transaction after registration", async () => {
		const store = await fresh()
		await store.put("profiles", { id: "p0", name: "Init", created_at: "2026-09-16T10:00:00.000Z" })
		const spy = vi.fn()
		store.onFirstWrite(spy)
		await store.getAll("profiles")
		expect(spy).not.toHaveBeenCalled()
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-16T10:00:00.000Z" })
		await store.put("profiles", { id: "p2", name: "B", created_at: "2026-09-16T10:00:00.000Z" })
		expect(spy).toHaveBeenCalledTimes(1)
	})
})

describe("transaction", () => {
	it("returns the callback's value and commits", async () => {
		const store = await fresh()
		const count = await store.transaction(["profiles"], "readwrite", async (tx) => {
			const os = tx.objectStore("profiles")
			await request(os.put({ id: "p1", name: "A", created_at: "2026-09-16T10:00:00.000Z" }))
			return request(os.count())
		})
		expect(count).toBe(1)
	})

	it("rolls back every write when the callback throws", async () => {
		const store = await fresh()
		await store.put("progress", { profile_id: "p1", item_id: "wildlife/a", done: true })
		await expect(
			store.transaction(["progress"], "readwrite", async (tx) => {
				const os = tx.objectStore("progress")
				await request(os.delete(["p1", "wildlife/a"]))
				await request(os.put({ profile_id: "p1", item_id: "wildlife/b", done: true }))
				throw new Error("mid-import failure")
			})
		).rejects.toThrow("mid-import failure")
		const records = await store.getAll<{ item_id: string }>("progress", "profile_id", "p1")
		expect(records.map((r) => r.item_id)).toEqual(["wildlife/a"])
	})
})
