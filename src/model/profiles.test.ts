import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import {
	activeProfiles,
	createProfile,
	deletedProfiles,
	ensureActiveProfile,
	listProfiles,
	PURGE_AFTER_MS,
	purgeDeleted,
	renameProfile,
	restoreProfile,
	softDeleteProfile,
} from "./profiles"
import { openStore } from "./store"

const now = new Date("2026-09-16T10:00:00.000Z")
let counter = 0
const newId = () => `id-${++counter}`

describe("ensureActiveProfile", () => {
	it("creates the default profile when none exists, and reuses it afterwards", async () => {
		const store = await openStore(new IDBFactory())
		const first = await ensureActiveProfile(store, "Player 1", now, newId)
		expect(first).toMatchObject({ name: "Player 1", created_at: now.toISOString() })
		const again = await ensureActiveProfile(store, "Player 1", now, newId)
		expect(again.id).toBe(first.id)
		expect(await listProfiles(store)).toHaveLength(1)
	})
	it("creates a fresh default when every profile is deleted", async () => {
		const store = await openStore(new IDBFactory())
		const only = await createProfile(store, "Malin", now, newId)
		await softDeleteProfile(store, only.id, now)
		const fresh = await ensureActiveProfile(store, "Player 1", now, newId)
		expect(fresh.id).not.toBe(only.id)
		expect(activeProfiles(await listProfiles(store)).map((p) => p.name)).toEqual(["Player 1"])
	})
})

describe("rename, delete, restore", () => {
	it("renames with trimming", async () => {
		const store = await openStore(new IDBFactory())
		const p = await createProfile(store, "Malin", now, newId)
		await renameProfile(store, p.id, "  Dad ")
		expect((await listProfiles(store))[0].name).toBe("Dad")
	})
	it("soft-deletes and restores", async () => {
		const store = await openStore(new IDBFactory())
		const p = await createProfile(store, "Malin", now, newId)
		await softDeleteProfile(store, p.id, now)
		let all = await listProfiles(store)
		expect(activeProfiles(all)).toEqual([])
		expect(deletedProfiles(all)[0]).toMatchObject({ id: p.id, deleted_at: now.toISOString() })
		await restoreProfile(store, p.id)
		all = await listProfiles(store)
		expect(deletedProfiles(all)).toEqual([])
		expect(activeProfiles(all)[0].deleted_at).toBeUndefined()
	})
	it("orders active profiles by creation and deleted ones newest first", async () => {
		const store = await openStore(new IDBFactory())
		const a = await createProfile(store, "A", new Date("2026-09-01T00:00:00.000Z"), newId)
		const b = await createProfile(store, "B", new Date("2026-09-02T00:00:00.000Z"), newId)
		const c = await createProfile(store, "C", new Date("2026-09-03T00:00:00.000Z"), newId)
		await softDeleteProfile(store, a.id, new Date("2026-09-10T00:00:00.000Z"))
		await softDeleteProfile(store, c.id, new Date("2026-09-11T00:00:00.000Z"))
		const all = await listProfiles(store)
		expect(activeProfiles(all).map((p) => p.id)).toEqual([b.id])
		expect(deletedProfiles(all).map((p) => p.id)).toEqual([c.id, a.id])
	})
})

describe("purgeDeleted", () => {
	it("removes profiles deleted more than 30 days ago together with their progress", async () => {
		const store = await openStore(new IDBFactory())
		const old = await createProfile(store, "Old", now, newId)
		const recent = await createProfile(store, "Recent", now, newId)
		await store.put("progress", { profile_id: old.id, item_id: "wildlife/a", done: true })
		await store.put("progress", { profile_id: recent.id, item_id: "wildlife/a", done: true })
		await softDeleteProfile(store, old.id, new Date(now.getTime() - PURGE_AFTER_MS - 1000))
		await softDeleteProfile(store, recent.id, new Date(now.getTime() - 1000))
		expect(await purgeDeleted(store, now)).toEqual([old.id])
		expect((await listProfiles(store)).map((p) => p.id)).toEqual([recent.id])
		expect(await store.getAll("progress", "profile_id", old.id)).toEqual([])
		expect(await store.getAll("progress", "profile_id", recent.id)).toHaveLength(1)
	})
})
