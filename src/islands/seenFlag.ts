// The keys Rookdex keeps in localStorage. Here, not in the islands, so the Settings page's
// delete script can name them without pulling React into its bundle.
import type { ActiveProfileStore } from "../model/tracker"

export const INSTALL_SEEN_KEY = "rookdex.install-prompt-seen"
export const HINT_SEEN_KEY = "rookdex.persist-hint-seen"
/** "Hide found" on the tracker (tracker search spec §3.3). "1" while on, absent while off. */
export const HIDE_FOUND_KEY = "rookdex.hide-found"
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

export function clearFlag(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// Blocked storage holds no flag to clear.
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

/** When the last export or backup ran, and how many ticks were saved since. Nothing else. */
export const BACKUP_KEY = "rookdex.backup"

/**
 * The backup reminder shows after this many new ticks. 25 is roughly one evening's finds on
 * launch night: enough that losing them would hurt, few enough to still remember. A lower number
 * would nag through every session; the list has about 200 items.
 */
export const BACKUP_REMINDER_TICKS = 25

export interface BackupLog {
	/** ISO time of the last successful export or backup, or null when there has been none. */
	at: string | null
	ticks: number
}

/** Never throws. Blocked storage and garbage read as no backup and no ticks. */
export function readBackupLog(): BackupLog {
	let raw: string | null
	try {
		raw = localStorage.getItem(BACKUP_KEY)
	} catch {
		raw = null
	}
	let data: unknown
	try {
		data = JSON.parse(raw ?? "{}")
	} catch {
		data = {}
	}
	const { at, ticks } = (typeof data === "object" && data !== null ? data : {}) as Record<
		string,
		unknown
	>
	return {
		at: typeof at === "string" && !Number.isNaN(Date.parse(at)) ? at : null,
		ticks: Number.isInteger(ticks) && (ticks as number) >= 0 ? (ticks as number) : 0,
	}
}

function writeBackupLog(log: BackupLog): void {
	try {
		localStorage.setItem(BACKUP_KEY, JSON.stringify(log))
	} catch {
		// Blocked storage: no date to show and no reminder, which is the safe side.
	}
}

export function countBackupTick(): void {
	const log = readBackupLog()
	writeBackupLog({ ...log, ticks: log.ticks + 1 })
}

/** Any export that produced a file: stamps the date and starts the tick count again. */
export function recordBackup(now: Date): void {
	writeBackupLog({ at: now.toISOString(), ticks: 0 })
}

/** "Not now" on the reminder: it comes back after another BACKUP_REMINDER_TICKS ticks. */
export function snoozeBackupReminder(): void {
	writeBackupLog({ ...readBackupLog(), ticks: 0 })
}

export function backupDue(log: BackupLog): boolean {
	return log.ticks >= BACKUP_REMINDER_TICKS
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
