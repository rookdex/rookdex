import { LANG_KEY } from "../i18n/locales"
import { ACTIVE_PROFILE_KEY, CHECKLIST_KEY } from "../islands/seenFlag"
import { DB_NAME } from "../model/store"

export type DeleteResult = "deleted" | "failed" | "unsupported"

/** Removes one localStorage key; blocked storage holds nothing to remove. */
function forget(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// Blocked storage holds no choice to remove.
	}
}

/**
 * Deletes every profile and all progress on this device (spec §7.2). `blocked` is not a failure:
 * the request stays pending and fires `success` once other tabs close their connections, so this
 * reports it once and keeps waiting. It never sends a second request. The language choice (`lang`),
 * the remembered profile and the before-launch list go too, because all data means all (locale
 * spec D9, dashboard spec §5, desktop dashboard spec §5). The install and hint flags stay, so the prompt and the hint don't come back (feedback spec
 * §7.3). The service worker cache stays too, so the app still opens offline.
 */
export function deleteAllData(
	idb: IDBFactory | undefined,
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
			forget(LANG_KEY)
			forget(ACTIVE_PROFILE_KEY)
			forget(CHECKLIST_KEY)
			resolve("deleted")
		}
	})
}
