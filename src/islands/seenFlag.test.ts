import { afterEach, describe, expect, it, vi } from "vitest"
import {
	ACTIVE_PROFILE_KEY,
	activeProfileStorage,
	BACKUP_KEY,
	BACKUP_REMINDER_TICKS,
	backupDue,
	clearFlag,
	countBackupTick,
	HIDE_FOUND_KEY,
	readBackupLog,
	readFlag,
	recordBackup,
	snoozeBackupReminder,
	writeFlag,
} from "./seenFlag"

afterEach(() => {
	vi.unstubAllGlobals()
})

function memoryStorage() {
	const map = new Map<string, string>()
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => map.set(key, value),
	})
	return map
}

describe("backup log (last backup date and ticks since)", () => {
	const at = new Date("2026-11-12T12:20:00.000Z")

	it("starts with no backup and no ticks", () => {
		memoryStorage()
		expect(readBackupLog()).toEqual({ at: null, ticks: 0 })
	})

	it("counts ticks, and a backup stamps the date and starts the count again", () => {
		const map = memoryStorage()
		countBackupTick()
		countBackupTick()
		expect(readBackupLog()).toEqual({ at: null, ticks: 2 })
		recordBackup(at)
		expect(readBackupLog()).toEqual({ at: at.toISOString(), ticks: 0 })
		expect(JSON.parse(map.get(BACKUP_KEY) ?? "")).toEqual({ at: at.toISOString(), ticks: 0 })
		expect(BACKUP_KEY).toBe("rookdex.backup")
	})

	it("snoozing starts the count again and keeps the date", () => {
		memoryStorage()
		recordBackup(at)
		countBackupTick()
		snoozeBackupReminder()
		expect(readBackupLog()).toEqual({ at: at.toISOString(), ticks: 0 })
	})

	it.each(["not json", "[]", '{"at":5,"ticks":-1}', '{"at":"yesterday","ticks":1.5}'])(
		"reads garbage %s as nothing",
		(raw) => {
			const map = memoryStorage()
			map.set(BACKUP_KEY, raw)
			expect(readBackupLog()).toEqual({ at: null, ticks: 0 })
		}
	)

	it("is due at the reminder threshold, not before", () => {
		expect(backupDue({ at: null, ticks: BACKUP_REMINDER_TICKS - 1 })).toBe(false)
		expect(backupDue({ at: null, ticks: BACKUP_REMINDER_TICKS })).toBe(true)
	})

	it("never throws when storage is blocked", () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked")
			},
			setItem: () => {
				throw new Error("blocked")
			},
		})
		expect(readBackupLog()).toEqual({ at: null, ticks: 0 })
		expect(() => countBackupTick()).not.toThrow()
		expect(() => recordBackup(at)).not.toThrow()
		expect(() => snoozeBackupReminder()).not.toThrow()
	})
})

describe("activeProfileStorage (dashboard spec §5)", () => {
	it("reads and writes one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
		})
		expect(ACTIVE_PROFILE_KEY).toBe("rookdex.active-profile")
		expect(activeProfileStorage.read()).toBeNull()
		activeProfileStorage.write("p1")
		expect(map.get(ACTIVE_PROFILE_KEY)).toBe("p1")
		expect(activeProfileStorage.read()).toBe("p1")
	})

	it("reads null and writes nothing when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked })
		expect(activeProfileStorage.read()).toBeNull()
		expect(() => activeProfileStorage.write("p1")).not.toThrow()
	})
})

describe("Hide found flag (tracker search spec §3.3)", () => {
	it("writes, reads and clears one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
			removeItem: (key: string) => map.delete(key),
		})
		expect(HIDE_FOUND_KEY).toBe("rookdex.hide-found")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		writeFlag(HIDE_FOUND_KEY)
		expect(map.get(HIDE_FOUND_KEY)).toBe("1")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(true)
		clearFlag(HIDE_FOUND_KEY)
		expect(map.has(HIDE_FOUND_KEY)).toBe(false)
	})

	it("never throws when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked })
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		expect(() => clearFlag(HIDE_FOUND_KEY)).not.toThrow()
	})
})
