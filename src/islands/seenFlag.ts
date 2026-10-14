// The keys Rookdex keeps in localStorage. Here, not in the islands, so the Settings page's
// delete script can name them without pulling React into its bundle.
import type { ActiveProfileStore } from "../model/tracker"

export const INSTALL_SEEN_KEY = "rookdex.install-prompt-seen"
export const HINT_SEEN_KEY = "rookdex.persist-hint-seen"
/** The profile the hub and the tracker open (dashboard spec §5). Holds a random id, nothing else. */
export const ACTIVE_PROFILE_KEY = "rookdex.active-profile"

/** One-shot "already shown" flags in localStorage, tolerant of private mode and blocked storage. */
export function readFlag(key: string): boolean {
	try {
		return localStorage.getItem(key) === "1"
	} catch {
		return false
	}
}

export function writeFlag(key: string): void {
	try {
		localStorage.setItem(key, "1")
	} catch {
		// Blocked storage: the prompt or hint simply shows again next visit.
	}
}

/** The remembered profile id. Never throws: blocked storage reads as null and writes nowhere. */
export const activeProfileStorage: ActiveProfileStore = {
	read() {
		try {
			return localStorage.getItem(ACTIVE_PROFILE_KEY)
		} catch {
			return null
		}
	},
	write(id) {
		try {
			localStorage.setItem(ACTIVE_PROFILE_KEY, id)
		} catch {
			// Blocked storage: the first active profile opens next time, as before.
		}
	},
}
