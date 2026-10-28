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

/** The before-launch list's ticks (desktop dashboard spec §5). Up to five fixed ids, nothing else. */
export const CHECKLIST_KEY = "rookdex.prelaunch-checklist"
export const CHECKLIST_IDS = ["edition", "preload", "space", "first-hour", "install"] as const
export type ChecklistId = (typeof CHECKLIST_IDS)[number]

/** The stored ids in list order, or null when storage is blocked. Garbage reads as empty. */
export function readChecklist(): ChecklistId[] | null {
	let raw: string | null
	try {
		raw = localStorage.getItem(CHECKLIST_KEY)
	} catch {
		return null
	}
	try {
		const parsed: unknown = JSON.parse(raw ?? "[]")
		if (!Array.isArray(parsed)) return []
		return CHECKLIST_IDS.filter((id) => parsed.includes(id))
	} catch {
		return []
	}
}

/**
 * Ticks or unticks one id. Reads storage again first, so a tick made in another open tab is kept.
 * Blocked storage falls back to `current`, so ticks last until the page closes, and `saved` comes
 * back false so the island can say so. Never throws.
 */
export function writeChecklistItem(
	id: ChecklistId,
	ticked: boolean,
	current: ChecklistId[]
): { list: ChecklistId[]; saved: boolean } {
	const base = readChecklist() ?? current
	const list = CHECKLIST_IDS.filter((known) => (known === id ? ticked : base.includes(known)))
	try {
		localStorage.setItem(CHECKLIST_KEY, JSON.stringify(list))
		return { list, saved: true }
	} catch {
		return { list, saved: false }
	}
}
