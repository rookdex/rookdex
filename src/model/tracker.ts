// The tracker's state and actions. No React, no DOM: the island subscribes and renders.
// Every action captures the current profile id before its first await and writes to the
// store before touching state, so a profile switch mid-write never misfiles a tick.
import {
	createProfile as createProfileRecord,
	ensureActiveProfile,
	listProfiles,
	purgeDeleted,
	renameProfile as renameProfileRecord,
	restoreProfile as restoreProfileRecord,
	softDeleteProfile,
} from "./profiles"
import { listRecords, setDone } from "./progress"
import { type ExportFile, type Profile, type SeedItem, TEXT } from "./schema"
import { categoryIds } from "./seed"
import { countItems, type Records } from "./stats"
import type { Store } from "./store"
import {
	buildExport,
	type ImportError,
	importRecords,
	MAX_IMPORT_BYTES,
	parseImport,
} from "./transfer"

export type Status = "loading" | "ready" | "error"
export type TrackerError = ImportError | "storage" | "name" | "closed"

export interface Announcement {
	category: string
	done: number
	total: number
}

export interface TrackerState {
	status: Status
	error?: TrackerError
	profiles: Profile[]
	profileId: string
	items: SeedItem[]
	records: Records
	selected: string[]
	pendingImport?: ExportFile
	persistHint: boolean
	announcement?: Announcement
}

export interface TrackerDeps {
	openStore: () => Promise<Store>
	items: SeedItem[]
	defaultProfileName: string
	selected?: string[]
	now?: () => Date
	newId?: () => string
	/** `navigator.storage.persist`; leave undefined when unsupported. */
	persist?: () => Promise<boolean>
	installed?: boolean
	hintSeen?: boolean
}

export interface ImportFileLike {
	size: number
	text(): Promise<string>
}

export interface Tracker {
	getState(): TrackerState
	subscribe(listener: () => void): () => void
	init(): Promise<void>
	tick(itemId: string): Promise<void>
	untick(itemId: string): Promise<void>
	selectCategories(ids: string[]): void
	switchProfile(id: string): Promise<void>
	createProfile(name: string): Promise<void>
	renameProfile(id: string, name: string): Promise<void>
	deleteProfile(id: string): Promise<void>
	restoreProfile(id: string): Promise<void>
	exportProfile(): { filename: string; json: string } | undefined
	readImport(file: ImportFileLike): Promise<void>
	cancelImport(): void
	confirmImport(target: "current" | "new"): Promise<void>
	dismissPersistHint(): void
	clearError(): void
}

/** Category ids named in `?show=`, kept in `known` order, unknown ones dropped. */
export function parseShow(search: string, known: string[]): string[] {
	const raw = new URLSearchParams(search).get("show") ?? ""
	const wanted = new Set(raw.split(",").map((s) => s.trim()))
	return known.filter((id) => wanted.has(id))
}

export function showParam(selected: string[]): string | null {
	return selected.length > 0 ? selected.join(",") : null
}

function validName(name: string): boolean {
	const trimmed = name.trim()
	return trimmed.length > 0 && trimmed.length <= TEXT.profileName
}

export function createTracker(deps: TrackerDeps): Tracker {
	const now = deps.now ?? (() => new Date())
	const known = new Set(categoryIds(deps.items))
	const listeners = new Set<() => void>()
	let store: Store | undefined
	// Set when another tab deletes the database under us; writes stop until the page reloads.
	let closed = false
	let state: TrackerState = {
		status: "loading",
		profiles: [],
		profileId: "",
		items: deps.items,
		records: {},
		selected: (deps.selected ?? []).filter((id) => known.has(id)),
		persistHint: false,
	}

	function set(patch: Partial<TrackerState>): void {
		state = { ...state, ...patch }
		for (const listener of listeners) listener()
	}

	function fail(error: TrackerError): void {
		set({ error })
	}

	function ready(): Store {
		if (closed) throw new Error("Store closed by another tab")
		if (!store) throw new Error("Tracker not initialised")
		return store
	}

	/** The error a failed write shows: the true cause when the store was closed under us. */
	function writeError(): TrackerError {
		return closed ? "closed" : "storage"
	}

	async function guard(fn: () => Promise<void>): Promise<void> {
		try {
			await fn()
		} catch {
			fail(writeError())
		}
	}

	// Actions that create a profile ignore a second call while the first is still writing, so a
	// double-clicked Save or "Create profile from this file" cannot make two profiles.
	let creating = false
	async function once(fn: () => Promise<void>): Promise<void> {
		if (creating) return
		creating = true
		try {
			await guard(fn)
		} finally {
			creating = false
		}
	}

	async function recordsOf(db: Store, profileId: string): Promise<Records> {
		const list = await listRecords(db, profileId)
		return Object.fromEntries(list.map((r) => [r.item_id, r]))
	}

	/** State for showing `profile`: refreshed list, its records, no stale announcement or error. */
	async function profilePatch(db: Store, profile: Profile): Promise<Partial<TrackerState>> {
		return {
			profiles: await listProfiles(db),
			profileId: profile.id,
			records: await recordsOf(db, profile.id),
			announcement: undefined,
			error: undefined,
		}
	}

	// Spec §5: persistence is always requested on the player's first write; the hint about it
	// is shown only in the browser tab, and only once.
	function requestPersist(): void {
		if (!deps.persist) return
		const showHint = !deps.installed && !deps.hintSeen
		deps.persist().then(
			(granted) => {
				if (!granted && showHint) set({ persistHint: true })
			},
			() => {}
		)
	}

	async function setDoneFor(itemId: string, done: boolean): Promise<void> {
		const profileId = state.profileId
		try {
			const record = await setDone(ready(), profileId, itemId, done, now())
			if (state.profileId !== profileId) return
			const records = { ...state.records, [itemId]: record }
			const item = deps.items.find((i) => i.id === itemId)
			const announcement = item
				? {
						category: item.category,
						...countItems(
							deps.items.filter((i) => i.category === item.category),
							records
						),
					}
				: undefined
			set({ records, announcement, error: undefined })
		} catch {
			fail(writeError())
		}
	}

	async function boot(): Promise<void> {
		try {
			const db = await deps.openStore()
			store = db
			await purgeDeleted(db, now())
			const profile = await ensureActiveProfile(db, deps.defaultProfileName, now(), deps.newId)
			// Armed after the silent default-profile write: the persistence request (and Firefox's
			// prompt for it) follows the first write the player makes.
			db.onFirstWrite(requestPersist)
			db.onClosed(() => {
				closed = true
				fail("closed")
			})
			set({ ...(await profilePatch(db, profile)), status: "ready" })
		} catch {
			set({ status: "error" })
		}
	}
	let booted: Promise<void> | undefined

	return {
		getState: () => state,
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		init() {
			// Idempotent: a second call (StrictMode, a remount) must not create a second default profile.
			booted ??= boot()
			return booted
		},
		tick: (itemId) => setDoneFor(itemId, true),
		untick: (itemId) => setDoneFor(itemId, false),
		selectCategories(ids) {
			set({ selected: ids.filter((id) => known.has(id)) })
		},
		switchProfile: (id) =>
			guard(async () => {
				const db = ready()
				const profile = (await listProfiles(db)).find((p) => p.id === id && !p.deleted_at)
				if (profile) set(await profilePatch(db, profile))
			}),
		createProfile: (name) =>
			once(async () => {
				if (!validName(name)) return fail("name")
				const db = ready()
				const profile = await createProfileRecord(db, name, now(), deps.newId)
				set(await profilePatch(db, profile))
			}),
		renameProfile: (id, name) =>
			guard(async () => {
				if (!validName(name)) return fail("name")
				const db = ready()
				await renameProfileRecord(db, id, name)
				set({ profiles: await listProfiles(db), error: undefined })
			}),
		deleteProfile: (id) =>
			guard(async () => {
				const db = ready()
				await softDeleteProfile(db, id, now())
				if (id !== state.profileId) {
					set({ profiles: await listProfiles(db), error: undefined })
					return
				}
				const next = await ensureActiveProfile(db, deps.defaultProfileName, now(), deps.newId)
				set(await profilePatch(db, next))
			}),
		restoreProfile: (id) =>
			guard(async () => {
				const db = ready()
				await restoreProfileRecord(db, id)
				set({ profiles: await listProfiles(db), error: undefined })
			}),
		exportProfile() {
			const profile = state.profiles.find((p) => p.id === state.profileId)
			if (!profile) return undefined
			const { filename, file } = buildExport(profile, Object.values(state.records), now())
			return { filename, json: JSON.stringify(file, null, "\t") }
		},
		async readImport(file) {
			if (file.size > MAX_IMPORT_BYTES) return fail("too-large")
			let text: string
			try {
				text = await file.text()
			} catch {
				return fail("not-json")
			}
			const result = parseImport(text, file.size)
			if (result.ok) set({ pendingImport: result.file, error: undefined })
			else fail(result.error)
		},
		cancelImport() {
			set({ pendingImport: undefined })
		},
		confirmImport: (target) =>
			once(async () => {
				const file = state.pendingImport
				if (!file) return
				const db = ready()
				if (target === "new") {
					const profile = await createProfileRecord(db, file.profile_name, now(), deps.newId)
					await importRecords(db, profile.id, file)
					set({ ...(await profilePatch(db, profile)), pendingImport: undefined })
					return
				}
				const profileId = state.profileId
				const merged = await importRecords(db, profileId, file)
				if (state.profileId !== profileId) {
					set({ pendingImport: undefined })
					return
				}
				set({
					records: Object.fromEntries(merged.map((r) => [r.item_id, r])),
					pendingImport: undefined,
					error: undefined,
				})
			}),
		dismissPersistHint() {
			set({ persistHint: false })
		},
		clearError() {
			set({ error: undefined })
		},
	}
}
