// Progress records per profile and the one merge rule used by imports and, later, sync.
import type { ProgressRecord } from "./schema"
import { request, type Store } from "./store"

export interface StoredRecord extends ProgressRecord {
	profile_id: string
}

/** Newest `updated_at` wins, ticks and un-ticks alike; an equal timestamp keeps the existing record. */
export function mergeRecords(
	existing: ProgressRecord[],
	incoming: ProgressRecord[]
): ProgressRecord[] {
	const byId = new Map(existing.map((r) => [r.item_id, r]))
	for (const record of incoming) {
		const current = byId.get(record.item_id)
		if (!current || Date.parse(record.updated_at) > Date.parse(current.updated_at)) {
			byId.set(record.item_id, record)
		}
	}
	return [...byId.values()]
}

function toStored(profileId: string, record: ProgressRecord): StoredRecord {
	return { ...record, profile_id: profileId }
}

function fromStored({ profile_id: _profileId, ...record }: StoredRecord): ProgressRecord {
	return record
}

export async function listRecords(store: Store, profileId: string): Promise<ProgressRecord[]> {
	const stored = await store.getAll<StoredRecord>("progress", "profile_id", profileId)
	return stored.map(fromStored)
}

/** Ticks or un-ticks one item, stamping `now`. An existing note survives. */
export function setDone(
	store: Store,
	profileId: string,
	itemId: string,
	done: boolean,
	now: Date
): Promise<ProgressRecord> {
	return store.transaction(["progress"], "readwrite", async (tx) => {
		const os = tx.objectStore("progress")
		const current = await request<StoredRecord | undefined>(os.get([profileId, itemId]))
		const record: ProgressRecord = {
			item_id: itemId,
			done,
			updated_at: now.toISOString(),
			origin: "manual",
		}
		if (current?.note !== undefined) record.note = current.note
		await request(os.put(toStored(profileId, record)))
		return record
	})
}

/**
 * Runs inside the caller's readwrite transaction, so an import can create profiles and records
 * together. Writes only the incoming records that win the merge; `count` is how many came in.
 */
export async function mergeInto(
	progress: IDBObjectStore,
	profileId: string,
	incoming: ProgressRecord[]
): Promise<{ records: ProgressRecord[]; count: number }> {
	const stored = await request<StoredRecord[]>(progress.index("profile_id").getAll(profileId))
	const existing = stored.map(fromStored)
	const merged = mergeRecords(existing, incoming)
	const kept = new Set(existing)
	const changed = merged.filter((record) => !kept.has(record))
	for (const record of changed) await request(progress.put(toStored(profileId, record)))
	return { records: merged, count: changed.length }
}

/** One readwrite transaction: delete the profile's records, put `records`. A failure keeps the old set. */
export async function replaceRecords(
	store: Store,
	profileId: string,
	records: ProgressRecord[]
): Promise<void> {
	await store.transaction(["progress"], "readwrite", async (tx) => {
		const os = tx.objectStore("progress")
		const keys = await request(os.index("profile_id").getAllKeys(profileId))
		for (const key of keys) await request(os.delete(key))
		for (const record of records) await request(os.put(toStored(profileId, record)))
	})
}
