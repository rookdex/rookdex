import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import { HINT_SEEN_KEY, INSTALL_SEEN_KEY } from "../islands/seenFlag"
import { DB_NAME, openStore } from "../model/store"
import { deleteAllData } from "./delete-all"

async function exists(factory: IDBFactory): Promise<boolean> {
	return (await factory.databases()).some((db) => db.name === DB_NAME)
}

function memory(entries: string[]) {
	const keys = new Set(entries)
	const storage = {
		removeItem: (key: string) => {
			keys.delete(key)
		},
	}
	return { keys, storage }
}

describe("deleteAllData (spec §7.2)", () => {
	it("deletes the rookdex database and both flags, and nothing else", async () => {
		const factory = new IDBFactory()
		const store = await openStore(factory)
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-23T10:00:00.000Z" })
		const { keys, storage } = memory([INSTALL_SEEN_KEY, HINT_SEEN_KEY, "unrelated"])
		const onBlocked = vi.fn()
		await expect(deleteAllData(factory, storage, onBlocked)).resolves.toBe("deleted")
		expect(await exists(factory)).toBe(false)
		expect([...keys]).toEqual(["unrelated"])
		expect(onBlocked).not.toHaveBeenCalled()
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
		await expect(deleteAllData(factory, undefined, onBlocked)).resolves.toBe("deleted")
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(requests).toHaveBeenCalledOnce()
		expect(await exists(factory)).toBe(false)
	})

	it("reports failed on an error event, and keeps the flags", async () => {
		const request = {} as IDBOpenDBRequest
		const factory = { deleteDatabase: () => request } as unknown as IDBFactory
		const removeItem = vi.fn()
		const result = deleteAllData(factory, { removeItem }, vi.fn())
		const fireError = request.onerror as unknown as () => void
		fireError()
		await expect(result).resolves.toBe("failed")
		expect(removeItem).not.toHaveBeenCalled()
	})

	it("reports failed when deleteDatabase throws", async () => {
		const factory = {
			deleteDatabase: () => {
				throw new DOMException("denied", "SecurityError")
			},
		} as unknown as IDBFactory
		await expect(deleteAllData(factory, undefined, vi.fn())).resolves.toBe("failed")
	})

	it("reports unsupported without IndexedDB", async () => {
		await expect(deleteAllData(undefined, undefined, vi.fn())).resolves.toBe("unsupported")
	})

	it("still reports deleted when localStorage throws", async () => {
		const storage = {
			removeItem: () => {
				throw new DOMException("blocked", "SecurityError")
			},
		}
		await expect(deleteAllData(new IDBFactory(), storage, vi.fn())).resolves.toBe("deleted")
	})
})
