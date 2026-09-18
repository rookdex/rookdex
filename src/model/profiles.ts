// Profile rules. Soft delete keeps progress for 30 days; there is always one active profile.
import type { Profile } from "./schema"
import { request, type Store } from "./store"

export const PURGE_AFTER_MS = 30 * 86_400_000

const defaultId = () => crypto.randomUUID()

export function activeProfiles(profiles: Profile[]): Profile[] {
	return profiles
		.filter((p) => !p.deleted_at)
		.sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function deletedProfiles(profiles: Profile[]): Profile[] {
	return profiles
		.filter((p) => p.deleted_at)
		.sort((a, b) => (b.deleted_at ?? "").localeCompare(a.deleted_at ?? ""))
}

export function listProfiles(store: Store): Promise<Profile[]> {
	return store.getAll<Profile>("profiles")
}

export async function createProfile(
	store: Store,
	name: string,
	now: Date,
	newId: () => string = defaultId
): Promise<Profile> {
	const profile: Profile = { id: newId(), name: name.trim(), created_at: now.toISOString() }
	await store.put("profiles", profile)
	return profile
}

/** The first active profile, or a new `defaultName` when none exists. */
export async function ensureActiveProfile(
	store: Store,
	defaultName: string,
	now: Date,
	newId: () => string = defaultId
): Promise<Profile> {
	const active = activeProfiles(await listProfiles(store))
	return active[0] ?? createProfile(store, defaultName, now, newId)
}

async function update(store: Store, id: string, change: (profile: Profile) => Profile) {
	await store.transaction(["profiles"], "readwrite", async (tx) => {
		const os = tx.objectStore("profiles")
		const profile = await request<Profile | undefined>(os.get(id))
		if (!profile) throw new Error(`No profile ${id}`)
		await request(os.put(change(profile)))
	})
}

export function renameProfile(store: Store, id: string, name: string): Promise<void> {
	return update(store, id, (p) => ({ ...p, name: name.trim() }))
}

export function softDeleteProfile(store: Store, id: string, now: Date): Promise<void> {
	return update(store, id, (p) => ({ ...p, deleted_at: now.toISOString() }))
}

export function restoreProfile(store: Store, id: string): Promise<void> {
	return update(store, id, ({ deleted_at: _removed, ...restored }) => restored)
}

/** Removes profiles deleted more than 30 days before `now`, with their progress. Returns their ids. */
export async function purgeDeleted(store: Store, now: Date): Promise<string[]> {
	const cutoff = now.getTime() - PURGE_AFTER_MS
	const stale = (await listProfiles(store)).filter(
		(p) => p.deleted_at && Date.parse(p.deleted_at) < cutoff
	)
	if (stale.length === 0) return []
	await store.transaction(["profiles", "progress"], "readwrite", async (tx) => {
		const profiles = tx.objectStore("profiles")
		const progress = tx.objectStore("progress")
		for (const profile of stale) {
			await request(profiles.delete(profile.id))
			const keys = await request(progress.index("profile_id").getAllKeys(profile.id))
			for (const key of keys) await request(progress.delete(key))
		}
	})
	return stale.map((p) => p.id)
}
