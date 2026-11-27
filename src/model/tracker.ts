// The tracker's state and actions. No React, no DOM: the island subscribes and renders.
// Every action captures the current profile id before its first await and writes to the
// store before touching state, so a profile switch mid-write never misfiles a tick.

import type { ChunkFailure, ChunkOutcome } from "./chunks"
import { buildExport } from "./exportFile"
import { MAX_IMPORT_BYTES, TEXT } from "./limits"
import {
	activeProfiles,
	createProfile as createProfileRecord,
	ensureActiveProfile,
	listProfiles,
	purgeDeleted,
	renameProfile as renameProfileRecord,
	restoreProfile as restoreProfileRecord,
	softDeleteProfile,
} from "./profiles"
import { listRecords, setDone } from "./progress"
import type { ExportFile, Profile } from "./schema"
import { countItems, groupKey, type Records, shown } from "./stats"
import type { Store } from "./store"
import { categoryIds, groupItems, type TrackItem, withText } from "./trackItems"
import type { ImportError, ImportResult } from "./transfer"

/** The import and backup code. Loaded on first use, because it parses with Zod (Task 6b). */
type TransferModule = typeof import("./transfer")

export type Status = "loading" | "ready" | "error"
export type TrackerError = ImportError | "storage" | "name" | "closed" | "stale"

/** Per category: its card text chunk is on its way, has landed, or failed (spec §5). */
export type ChunkState = "loading" | "ready" | ChunkFailure

export interface Announcement {
	category: string
	done: number
	total: number
}

/** Where the active profile id is remembered between pages (dashboard spec §5). Must never throw. */
export interface ActiveProfileStore {
	read(): string | null
	write(id: string): void
}

export interface TrackerState {
	status: Status
	error?: TrackerError
	profiles: Profile[]
	profileId: string
	items: TrackItem[]
	/** Card text chunks by category. Empty on the hub, which never loads one. */
	chunks: Record<string, ChunkState>
	/** Categories the list may show, in list order (ruling 9). Once in, a category stays in. */
	revealed: string[]
	records: Records
	selected: string[]
	/** Pressed group chips as `groupKey`s, in list order, only under pressed categories (spec §14.1). */
	groups: string[]
	pendingImport?: ExportFile
	persistHint: boolean
	announcement?: Announcement
}

export interface TrackerDeps {
	openStore: () => Promise<Store>
	items: TrackItem[]
	/** Loads a category's card text. Leave undefined where no card is shown (the hub). */
	loadChunk?: (category: string) => Promise<ChunkOutcome>
	/** Calls `retry` when the browser comes back online; returns the unsubscribe. */
	onOnline?: (retry: () => void) => () => void
	defaultProfileName: string
	selected?: string[]
	groups?: string[]
	now?: () => Date
	newId?: () => string
	/** `navigator.storage.persist`; leave undefined when unsupported. */
	persist?: () => Promise<boolean>
	installed?: boolean
	hintSeen?: boolean
	/** Remembers the active profile across pages and reloads. Leave undefined to always open the first. */
	activeProfile?: ActiveProfileStore
	/** Called after each saved tick (not an untick), so the backup reminder can count them. */
	onTick?: () => void
	/** Loads the import and backup code. A test seam; the default is import("./transfer"). */
	transfer?: () => Promise<TransferModule>
}

export interface ImportFileLike {
	size: number
	text(): Promise<string>
}

export interface Tracker {
	getState(): TrackerState
	subscribe(listener: () => void): () => void
	init(): Promise<void>
	/** Re-reads profiles and ticks, for a page the browser restored from its back/forward cache. */
	refresh(): Promise<void>
	tick(itemId: string): Promise<void>
	untick(itemId: string): Promise<void>
	selectCategories(ids: string[]): void
	toggleGroup(key: string): void
	switchProfile(id: string): Promise<void>
	createProfile(name: string): Promise<void>
	renameProfile(id: string, name: string): Promise<void>
	deleteProfile(id: string): Promise<void>
	restoreProfile(id: string): Promise<void>
	exportProfile(): { filename: string; json: string } | undefined
	/** Every active profile in one version 2 file (Settings' Back up, the backup reminder). */
	exportAll(): Promise<{ filename: string; json: string } | undefined>
	readImport(file: ImportFileLike): Promise<void>
	cancelImport(): void
	/**
	 * "current" and "new" take a version 1 file; a version 2 backup always restores "all". Resolves
	 * with what each profile got, or undefined when nothing was imported.
	 */
	confirmImport(target: "current" | "new" | "all"): Promise<ImportResult[] | undefined>
	dismissPersistHint(): void
	clearError(): void
}

/** Spec §6: category ids renamed after launch. Old links and saved views still open what the old
 *  one held: Collectibles' races and jumps moved to Activities, so it opens both. */
export const CATEGORY_ALIASES: Readonly<Record<string, readonly string[]>> = {
	wildlife: ["animals"],
	collectibles: ["collections", "activities"],
}

/** Category ids named in `?show=`, kept in `known` order, unknown ones dropped. */
export function parseShow(search: string, known: string[]): string[] {
	const raw = new URLSearchParams(search).get("show") ?? ""
	const wanted = new Set(
		raw.split(",").flatMap((s) => {
			const id = s.trim()
			return Object.hasOwn(CATEGORY_ALIASES, id) ? CATEGORY_ALIASES[id] : [id]
		})
	)
	return known.filter((id) => wanted.has(id))
}

export function showParam(selected: string[]): string | null {
	return selected.length > 0 ? selected.join(",") : null
}

export interface ListChunks {
	/** Every chunk the view needs has landed or failed. Until then the list holds its space. */
	settled: boolean
	/** Needed categories whose chunk is on its way or not started, in the order they are needed. */
	pending: string[]
	failed: { category: string; reason: ChunkFailure }[]
	/** The categories the list may show (TrackerState.revealed). */
	revealed: string[]
}

/** The chunks the list needs: the pressed categories, or every category under All. */
export function listChunks(
	state: Pick<TrackerState, "chunks" | "selected" | "items" | "revealed">
): ListChunks {
	const needed = state.selected.length > 0 ? state.selected : categoryIds(state.items)
	const failed = needed.flatMap((category) => {
		const status = state.chunks[category]
		return status === "offline" || status === "stale" ? [{ category, reason: status }] : []
	})
	const pending = needed.filter((category) => {
		const status = state.chunks[category]
		return status === undefined || status === "loading"
	})
	return { settled: pending.length === 0, pending, failed, revealed: state.revealed }
}

/**
 * Per pressed category, the groups its chips offer (tracker refresh spec §14.1): every group with
 * a shown item, in the list's group order. A category with one group gets no chips, because
 * one chip would filter nothing. Categories come in seed order. A Map, so a category id such as
 * "constructor" can never read Object.prototype (R16).
 */
export function chipGroups(items: TrackItem[], selected: string[]): Map<string, string[]> {
	const live = shown(items)
	const chips = new Map<string, string[]>()
	for (const category of categoryIds(live)) {
		if (!selected.includes(category)) continue
		const groups = [...groupItems(live.filter((item) => item.category === category)).keys()]
		if (groups.length > 1) chips.set(category, groups)
	}
	return chips
}

/** The keys in `keys` that a chip offers, in list order (R20). */
function keepChips(keys: Iterable<string>, chips: Map<string, string[]>): string[] {
	const wanted = new Set(keys)
	return [...chips].flatMap(([category, groups]) =>
		groups.map((group) => groupKey(category, group)).filter((key) => wanted.has(key))
	)
}

/** Group keys named in `?group=`, read after `?show=`: only chips the pressed categories offer,
 *  in list order. Anything else is dropped, so the raw value is never echoed. */
export function parseGroups(search: string, chips: Map<string, string[]>): string[] {
	const raw = new URLSearchParams(search).get("group") ?? ""
	return keepChips(
		raw.split(",").map((s) => s.trim()),
		chips
	)
}

export function groupParam(groups: string[]): string | null {
	return groups.length > 0 ? groups.join(",") : null
}

/** The pressed tiles and chips as one query string, the form the tracker saves for the session. */
export function viewParams(selected: string[], groups: string[]): string | null {
	const params = new URLSearchParams()
	const show = showParam(selected)
	const group = groupParam(groups)
	if (show) params.set("show", show)
	if (group) params.set("group", group)
	return show || group ? params.toString() : null
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
	const selected = (deps.selected ?? []).filter((id) => known.has(id))
	let state: TrackerState = {
		status: "loading",
		profiles: [],
		profileId: "",
		items: deps.items,
		chunks: {},
		revealed: [],
		records: {},
		selected,
		groups: keepChips(deps.groups ?? [], chipGroups(deps.items, selected)),
		persistHint: false,
	}

	function set(patch: Partial<TrackerState>): void {
		state = { ...state, ...patch }
		for (const listener of listeners) listener()
	}

	const order = [...known]

	/** Ruling 9: a needed category shows once its text is in and every needed category before it
	 *  in list order has landed or failed. A shown one stays shown, so a press never hides cards. */
	function reveal(chunks: Record<string, ChunkState>, selected: string[]): string[] {
		const needed = selected.length > 0 ? order.filter((c) => selected.includes(c)) : order
		const next = new Set(state.revealed)
		for (const category of needed) {
			const status = chunks[category]
			if (status === undefined || status === "loading") break
			if (status === "ready") next.add(category)
		}
		return order.filter((c) => next.has(c))
	}

	// Amendment 5: set once the view's own chunks have settled for the first time.
	let background = false

	/** Fetches one category's chunk and merges its text. A chunk that lands after its category
	 *  was unpressed is merged all the same: it is the same seed text, and the list only shows
	 *  revealed categories. */
	function start(category: string): void {
		const load = deps.loadChunk
		if (!load) return
		set({ chunks: { ...state.chunks, [category]: "loading" } })
		void load(category).then((outcome) => {
			const chunks: Record<string, ChunkState> = {
				...state.chunks,
				[category]: outcome.ok ? "ready" : outcome.reason,
			}
			set({
				...(outcome.ok ? { items: withText(state.items, outcome.text) } : {}),
				chunks,
				revealed: reveal(chunks, state.selected),
			})
			// The rest follow quietly, so a later tile press is instant. Only never-started ones:
			// a failed chunk waits for a press, refresh() or the online event.
			if (!background && listChunks(state).settled) {
				background = true
				for (const other of order) if (state.chunks[other] === undefined) start(other)
			}
		})
	}

	/** Starts every needed chunk that is neither on its way nor in. A failed one is tried again. */
	function loadChunks(selected: string[]): void {
		if (!deps.loadChunk) return
		for (const category of selected.length > 0 ? selected : order) {
			const status = state.chunks[category]
			if (status === "loading" || status === "ready") continue
			start(category)
		}
	}

	/** Tries every failed chunk again (refresh(), the online event). */
	function retryFailed(): void {
		for (const category of order) {
			const status = state.chunks[category]
			if (status === "offline" || status === "stale") start(category)
		}
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

	const loadTransfer = deps.transfer ?? (() => import("./transfer"))

	/** The import and backup code, loaded on first use (Task 6b). In an old tab after a deploy the
	 *  file can be gone; that reads as "stale", whose message asks for a reload. Never rejects. */
	async function transfer(): Promise<TransferModule | undefined> {
		try {
			return await loadTransfer()
		} catch {
			fail("stale")
			return undefined
		}
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

	/** Shows `profile` and remembers it, so the next page or reload opens the same one. */
	async function show(
		db: Store,
		profile: Profile,
		extra: Partial<TrackerState> = {}
	): Promise<void> {
		set({ ...(await profilePatch(db, profile)), ...extra })
		deps.activeProfile?.write(profile.id)
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
			if (done) deps.onTick?.()
		} catch {
			fail(writeError())
		}
	}

	/** The remembered profile when it still exists; otherwise the first active one. */
	async function pickProfile(db: Store): Promise<{ profile: Profile; saved: string | null }> {
		const saved = deps.activeProfile?.read() ?? null
		const remembered = saved
			? (await listProfiles(db)).find((p) => p.id === saved && !p.deleted_at)
			: undefined
		const profile =
			remembered ?? (await ensureActiveProfile(db, deps.defaultProfileName, now(), deps.newId))
		return { profile, saved }
	}

	async function boot(): Promise<void> {
		try {
			const db = await deps.openStore()
			store = db
			await purgeDeleted(db, now())
			const { profile, saved } = await pickProfile(db)
			// Armed after the silent default-profile write: the persistence request (and Firefox's
			// prompt for it) follows the first write the player makes.
			db.onFirstWrite(requestPersist)
			db.onClosed(() => {
				closed = true
				fail("closed")
			})
			set({ ...(await profilePatch(db, profile)), status: "ready" })
			if (profile.id !== saved) deps.activeProfile?.write(profile.id)
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
			// Idempotent: a second call (StrictMode, a remount) must not create a second default
			// profile or start a second set of loads.
			if (!booted) {
				deps.onOnline?.(retryFailed)
				// First, so the chunks travel while the store opens.
				loadChunks(state.selected)
			}
			booted ??= boot()
			return booted
		},
		async refresh() {
			retryFailed()
			// Only a booted, open store: before init there is nothing on screen to bring up to date.
			if (state.status !== "ready" || closed || !store) return
			await guard(async () => {
				const db = ready()
				const { profile, saved } = await pickProfile(db)
				set(await profilePatch(db, profile))
				if (profile.id !== saved) deps.activeProfile?.write(profile.id)
			})
		},
		tick: (itemId) => setDoneFor(itemId, true),
		untick: (itemId) => setDoneFor(itemId, false),
		// Unpressing a category drops its chips, so pressing it again starts with none (spec §14.1).
		selectCategories(ids) {
			const selected = ids.filter((id) => known.has(id))
			set({
				selected,
				groups: keepChips(state.groups, chipGroups(deps.items, selected)),
				revealed: reveal(state.chunks, selected),
			})
			loadChunks(selected)
		},
		toggleGroup(key) {
			const chips = chipGroups(deps.items, state.selected)
			if (keepChips([key], chips).length === 0) return
			const next = new Set(state.groups)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			set({ groups: keepChips(next, chips) })
		},
		switchProfile: (id) =>
			guard(async () => {
				const db = ready()
				const profile = (await listProfiles(db)).find((p) => p.id === id && !p.deleted_at)
				if (profile) await show(db, profile)
			}),
		createProfile: (name) =>
			once(async () => {
				if (!validName(name)) return fail("name")
				const db = ready()
				const profile = await createProfileRecord(db, name, now(), deps.newId)
				await show(db, profile)
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
				await show(db, next)
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
		async exportAll() {
			const mod = await transfer()
			if (!mod) return undefined
			try {
				const backup = await mod.collectBackup(ready(), now())
				if (!backup) return undefined
				return { filename: backup.filename, json: JSON.stringify(backup.file, null, "\t") }
			} catch {
				fail(writeError())
				return undefined
			}
		},
		async readImport(file) {
			// Before the import code loads, so an oversized file never costs a download.
			if (file.size > MAX_IMPORT_BYTES) return fail("too-large")
			const mod = await transfer()
			if (!mod) return
			let text: string
			try {
				text = await file.text()
			} catch {
				return fail("not-json")
			}
			const result = mod.parseImport(text, file.size)
			if (result.ok) set({ pendingImport: result.file, error: undefined })
			else fail(result.error)
		},
		cancelImport() {
			set({ pendingImport: undefined })
		},
		async confirmImport(target) {
			let results: ImportResult[] | undefined
			await once(async () => {
				const file = state.pendingImport
				if (!file) return
				const profileId = state.profileId
				const mod = await transfer()
				if (!mod) return
				const db = ready()
				if (file.version === 2 || target === "all") {
					results = await mod.restoreBackup(db, mod.backupEntries(file), now(), deps.newId)
					// The shown profile may have gained records; it stays the shown one.
					const profiles = activeProfiles(await listProfiles(db))
					const current = profiles.find((p) => p.id === state.profileId) ?? profiles[0]
					if (current) await show(db, current, { pendingImport: undefined })
					return
				}
				if (target === "new") {
					const { profile, count } = await mod.importAsNewProfile(
						db,
						file.profile_name,
						file.records,
						now(),
						deps.newId
					)
					results = [{ profileId: profile.id, name: profile.name, count, created: true }]
					await show(db, profile, { pendingImport: undefined })
					return
				}
				const name = state.profiles.find((p) => p.id === profileId)?.name ?? ""
				const { records, count } = await mod.importRecords(db, profileId, file.records)
				results = [{ profileId, name, count, created: false }]
				if (state.profileId !== profileId) {
					set({ pendingImport: undefined })
					return
				}
				set({
					records: Object.fromEntries(records.map((r) => [r.item_id, r])),
					pendingImport: undefined,
					error: undefined,
				})
			})
			return results
		},
		dismissPersistHint() {
			set({ persistHint: false })
		},
		clearError() {
			set({ error: undefined })
		},
	}
}
