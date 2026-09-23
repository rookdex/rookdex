import { HINT_SEEN_KEY, INSTALL_SEEN_KEY } from "../islands/seenFlag"
import { DB_NAME } from "../model/store"

export type DeleteResult = "deleted" | "failed" | "unsupported"

/** Everything Rookdex keeps in localStorage. The service worker cache stays, so the app still opens offline. */
export const LOCAL_KEYS = [INSTALL_SEEN_KEY, HINT_SEEN_KEY] as const

/**
 * Deletes every profile and all progress on this device (spec §7.2). `blocked` is not a failure:
 * the request stays pending and fires `success` once other tabs close their connections, so this
 * reports it once and keeps waiting. It never sends a second request. The flags go only after the
 * database is gone, so a failed delete leaves the device as it was.
 */
export function deleteAllData(
	idb: IDBFactory | undefined,
	storage: Pick<Storage, "removeItem"> | undefined,
	onBlocked: () => void
): Promise<DeleteResult> {
	if (!idb) return Promise.resolve("unsupported")
	return new Promise((resolve) => {
		let request: IDBOpenDBRequest
		try {
			request = idb.deleteDatabase(DB_NAME)
		} catch {
			resolve("failed")
			return
		}
		let told = false
		request.onblocked = () => {
			if (told) return
			told = true
			onBlocked()
		}
		request.onerror = () => resolve("failed")
		request.onsuccess = () => {
			for (const key of LOCAL_KEYS) {
				try {
					storage?.removeItem(key)
				} catch {
					// Blocked storage: the flags were never readable either, so nothing is left behind.
				}
			}
			resolve("deleted")
		}
	})
}
