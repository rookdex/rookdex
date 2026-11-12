// Export file build and import validation. A file carries profile names and records only.
// Version 1 holds one profile (Tracker's profile menu); version 2 holds every profile (Settings).
import { activeProfiles, listProfiles } from "./profiles"
import { listRecords, mergeInto } from "./progress"
import {
	type BackupFile,
	type ExportFile,
	type ExportFileV1,
	exportFileSchema,
	MAX_BACKUP_PROFILES,
	MAX_RECORDS,
	type Profile,
	type ProgressRecord,
	recordCount,
} from "./schema"
import { request, type Store } from "./store"

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
/** The newest file version this build reads. A higher one comes from a newer Rookdex. */
export const EXPORT_VERSION = 2

export type ImportError = "too-large" | "not-json" | "not-export" | "newer-version" | "too-many"
export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: ImportError }

/** One profile as a file holds it: the name and the records, never the device's profile id. */
export interface BackupEntry {
	name: string
	records: ProgressRecord[]
}

/** What one profile got from an import: `count` records came in, `created` if it is new. */
export interface ImportResult {
	profileId: string
	name: string
	count: number
	created: boolean
}

const day = (now: Date) => now.toISOString().slice(0, 10)

export function buildExport(
	profile: Profile,
	records: ProgressRecord[],
	now: Date
): { filename: string; file: ExportFileV1 } {
	const file: ExportFileV1 = {
		version: 1,
		exported_at: now.toISOString(),
		profile_name: profile.name,
		records,
	}
	const slug =
		profile.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "profile"
	return { filename: `rookdex-${slug}-${day(now)}.json`, file }
}

export function buildBackup(
	profiles: BackupEntry[],
	now: Date
): { filename: string; file: BackupFile } {
	const file: BackupFile = { version: 2, exported_at: now.toISOString(), profiles }
	return { filename: `rookdex-backup-${day(now)}.json`, file }
}

/** Every active profile with its records, oldest first. Undefined when there is none yet. */
export async function collectBackup(
	store: Store,
	now: Date
): Promise<{ filename: string; file: BackupFile } | undefined> {
	const profiles = activeProfiles(await listProfiles(store))
	if (profiles.length === 0) return undefined
	const entries: BackupEntry[] = []
	for (const profile of profiles) {
		entries.push({ name: profile.name, records: await listRecords(store, profile.id) })
	}
	return buildBackup(entries, now)
}

/** A file's profiles as entries: one for version 1, all of them for version 2. */
export function backupEntries(file: ExportFile): BackupEntry[] {
	return file.version === 1 ? [{ name: file.profile_name, records: file.records }] : file.profiles
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Checked before the schema so the player hears why, not only that the file is wrong. */
function tooMany(data: Record<string, unknown>): boolean {
	if (data.version === 1) return listOf(data.records).length > MAX_RECORDS
	if (data.version !== 2) return false
	const profiles = listOf(data.profiles)
	if (profiles.length > MAX_BACKUP_PROFILES) return true
	return (
		recordCount(profiles.map((p) => ({ records: listOf(isObject(p) && p.records) }))) > MAX_RECORDS
	)
}

/** `bytes` is the file size checked before reading; it defaults to the text length. */
export function parseImport(text: string, bytes = text.length): ParseResult {
	if (bytes > MAX_IMPORT_BYTES) return { ok: false, error: "too-large" }
	let data: unknown
	try {
		data = JSON.parse(text)
	} catch {
		return { ok: false, error: "not-json" }
	}
	if (isObject(data)) {
		const { version } = data
		if (typeof version === "number" && Number.isInteger(version) && version > EXPORT_VERSION) {
			return { ok: false, error: "newer-version" }
		}
		if (tooMany(data)) return { ok: false, error: "too-many" }
	}
	const parsed = exportFileSchema.safeParse(data)
	return parsed.success ? { ok: true, file: parsed.data } : { ok: false, error: "not-export" }
}

/** Merges `records` into the profile's in one transaction, newest wins. */
export function importRecords(
	store: Store,
	profileId: string,
	records: ProgressRecord[]
): Promise<{ records: ProgressRecord[]; count: number }> {
	return store.transaction(["progress"], "readwrite", (tx) =>
		mergeInto(tx.objectStore("progress"), profileId, records)
	)
}

/** The profile and its records in one transaction: a failed write leaves no empty profile. */
export async function importAsNewProfile(
	store: Store,
	name: string,
	records: ProgressRecord[],
	now: Date,
	newId: () => string = () => crypto.randomUUID()
): Promise<{ profile: Profile; count: number }> {
	const profile: Profile = { id: newId(), name: name.trim(), created_at: now.toISOString() }
	return store.transaction(["profiles", "progress"], "readwrite", async (tx) => {
		await request(tx.objectStore("profiles").put(profile))
		const { count } = await mergeInto(tx.objectStore("progress"), profile.id, records)
		return { profile, count }
	})
}

/**
 * Restores every entry in one transaction, so a failure writes nothing. An entry merges into the
 * active profile with the same name; when names repeat, the n-th entry pairs with the n-th
 * profile (oldest first). An entry without a partner becomes a new profile, in the file's order.
 */
export function restoreBackup(
	store: Store,
	entries: BackupEntry[],
	now: Date,
	newId: () => string = () => crypto.randomUUID()
): Promise<ImportResult[]> {
	return store.transaction(["profiles", "progress"], "readwrite", async (tx) => {
		const profiles = tx.objectStore("profiles")
		const progress = tx.objectStore("progress")
		const free = activeProfiles(await request<Profile[]>(profiles.getAll()))
		const results: ImportResult[] = []
		let created = 0
		for (const entry of entries) {
			const name = entry.name.trim()
			const index = free.findIndex((p) => p.name === name)
			let profileId: string
			if (index >= 0) {
				profileId = free[index].id
				free.splice(index, 1)
			} else {
				// A millisecond apart, so the new profiles sort in the file's order.
				const created_at = new Date(now.getTime() + created++).toISOString()
				profileId = newId()
				await request(profiles.put({ id: profileId, name, created_at } satisfies Profile))
			}
			const { count } = await mergeInto(progress, profileId, entry.records)
			results.push({ profileId, name, count, created: index < 0 })
		}
		return results
	})
}
