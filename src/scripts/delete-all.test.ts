import { IDBFactory } from "fake-indexeddb"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DB_NAME, openStore } from "../model/store"
import { deleteAllData } from "./delete-all"

async function exists(factory: IDBFactory): Promise<boolean> {
	return (await factory.databases()).some((db) => db.name === DB_NAME)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("deleteAllData (spec §7.2, feedback spec §7.3)", () => {
	it("deletes the rookdex database and the language choice, and keeps the one-shot flags", async () => {
		const storage = { removeItem: vi.fn(), clear: vi.fn(), setItem: vi.fn() }
		vi.stubGlobal("localStorage", storage)
		const factory = new IDBFactory()
		const store = await openStore(factory)
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-23T10:00:00.000Z" })
		const onBlocked = vi.fn()
		await expect(deleteAllData(factory, onBlocked)).resolves.toBe("deleted")
		expect(await exists(factory)).toBe(false)
		expect(onBlocked).not.toHaveBeenCalled()
		expect(storage.removeItem.mock.calls).toEqual([["lang"]])
		expect(storage.clear).not.toHaveBeenCalled()
	})

	it("still reports deleted when removing the language choice throws", async () => {
		vi.stubGlobal("localStorage", {
			removeItem: () => {
				throw new Error("SecurityError")
			},
		})
		await expect(deleteAllData(new IDBFactory(), vi.fn())).resolves.toBe("deleted")
	})

	it("reports blocked once, then succeeds when the other tab closes, with one request", async () => {
		const factory = new IDBFactory()
		// A raw connection with no versionchange handler stands in for a tab that holds on.
		const other = await new Promise<IDBDatabase>((resolve) => {
			const open = factory.open(DB_NAME, 1)
			open.onsuccess = () => resolve(open.result)
		})
		const requests = vi.spyOn(factory, "deleteDatabase")
		const onBlocked = vi.fn(() => {
			setTimeout(() => other.close(), 10)
		})
		await expect(deleteAllData(factory, onBlocked)).resolves.toBe("deleted")
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(requests).toHaveBeenCalledOnce()
		expect(await exists(factory)).toBe(false)
	})

	it("reports failed on an error event", async () => {
		const request = {} as IDBOpenDBRequest
		const factory = { deleteDatabase: () => request } as unknown as IDBFactory
		const result = deleteAllData(factory, vi.fn())
		const fireError = request.onerror as unknown as () => void
		fireError()
		await expect(result).resolves.toBe("failed")
	})

	it("reports failed when deleteDatabase throws", async () => {
		const factory = {
			deleteDatabase: () => {
				throw new DOMException("denied", "SecurityError")
			},
		} as unknown as IDBFactory
		await expect(deleteAllData(factory, vi.fn())).resolves.toBe("failed")
	})

	it("reports unsupported without IndexedDB", async () => {
		await expect(deleteAllData(undefined, vi.fn())).resolves.toBe("unsupported")
	})
})
