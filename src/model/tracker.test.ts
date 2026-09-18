import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import { listRecords } from "./progress"
import type { SeedItem } from "./schema"
import { openStore, type Store } from "./store"
import { createTracker, parseShow, showParam, type TrackerDeps } from "./tracker"
import { buildExport } from "./transfer"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
function item(id: string, category: string): SeedItem {
	return { id, category, group: "g", name: id, status: "confirmed", sources: [src] }
}
const items = [
	item("wildlife/a", "wildlife"),
	item("wildlife/b", "wildlife"),
	item("vehicles/c", "vehicles"),
]
const now = () => new Date("2026-09-16T10:00:00.000Z")

let counter = 0
function make(overrides: Partial<TrackerDeps> = {}) {
	const factory = new IDBFactory()
	const deps: TrackerDeps = {
		openStore: () => openStore(factory),
		items,
		defaultProfileName: "Player 1",
		now,
		newId: () => `id-${++counter}`,
		...overrides,
	}
	return { tracker: createTracker(deps), factory }
}

describe("init", () => {
	it("creates the default profile and becomes ready", async () => {
		const { tracker } = make()
		const listener = vi.fn()
		tracker.subscribe(listener)
		expect(tracker.getState().status).toBe("loading")
		await tracker.init()
		const state = tracker.getState()
		expect(state.status).toBe("ready")
		expect(state.profiles.map((p) => p.name)).toEqual(["Player 1"])
		expect(state.profileId).toBe(state.profiles[0].id)
		expect(listener).toHaveBeenCalled()
	})
	it("runs once even when called twice", async () => {
		const { tracker } = make()
		await Promise.all([tracker.init(), tracker.init()])
		expect(tracker.getState().profiles).toHaveLength(1)
	})
	it("reports a storage error when the database cannot open", async () => {
		const { tracker } = make({ openStore: () => Promise.reject(new Error("blocked")) })
		await tracker.init()
		expect(tracker.getState().status).toBe("error")
	})
	it("filters the initial selection to known categories", () => {
		const { tracker } = make({ selected: ["wildlife", "weapons"] })
		expect(tracker.getState().selected).toEqual(["wildlife"])
	})
})

describe("tick and untick", () => {
	it("stores the record and announces the category count", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.tick("wildlife/a")
		let state = tracker.getState()
		expect(state.records["wildlife/a"]).toMatchObject({
			done: true,
			updated_at: now().toISOString(),
		})
		expect(state.announcement).toEqual({ category: "wildlife", done: 1, total: 2 })
		await tracker.untick("wildlife/a")
		state = tracker.getState()
		expect(state.records["wildlife/a"].done).toBe(false)
		expect(state.announcement).toEqual({ category: "wildlife", done: 0, total: 2 })
	})
	it("files a slow tick under the profile that was current when it was called", async () => {
		const factory = new IDBFactory()
		const slow = async (): Promise<Store> => {
			const db = await openStore(factory)
			return {
				...db,
				transaction: async (names, mode, fn) => {
					if (mode === "readwrite" && names[0] === "progress") {
						await new Promise((r) => setTimeout(r, 20))
					}
					return db.transaction(names, mode, fn)
				},
			}
		}
		const { tracker } = make({ openStore: slow })
		await tracker.init()
		const first = tracker.getState().profileId
		await tracker.createProfile("Dad")
		await tracker.switchProfile(first)
		const pending = tracker.tick("wildlife/a")
		const dad = tracker.getState().profiles.find((p) => p.name === "Dad")
		if (!dad) throw new Error("no Dad")
		await tracker.switchProfile(dad.id)
		await pending
		expect(tracker.getState().records["wildlife/a"]).toBeUndefined()
		expect(await listRecords(await openStore(factory), first)).toHaveLength(1)
	})
})

describe("categories", () => {
	it("selectCategories drops unknown ids", async () => {
		const { tracker } = make()
		tracker.selectCategories(["vehicles", "nope"])
		expect(tracker.getState().selected).toEqual(["vehicles"])
	})
	it("parseShow keeps known ids in known order; showParam serialises or drops", () => {
		expect(parseShow("?show=vehicles,wildlife,evil", ["wildlife", "vehicles"])).toEqual([
			"wildlife",
			"vehicles",
		])
		expect(parseShow("", ["wildlife"])).toEqual([])
		expect(showParam(["wildlife", "vehicles"])).toBe("wildlife,vehicles")
		expect(showParam([])).toBeNull()
	})
})

describe("profiles", () => {
	it("create switches to the new profile; blank names are an error", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.createProfile("   ")
		expect(tracker.getState().error).toBe("name")
		await tracker.createProfile("Dad")
		const state = tracker.getState()
		expect(state.error).toBeUndefined()
		expect(state.profiles.find((p) => p.id === state.profileId)?.name).toBe("Dad")
		expect(state.records).toEqual({})
	})
	it("ignores a second create while the first is still writing", async () => {
		const { tracker } = make()
		await tracker.init()
		await Promise.all([tracker.createProfile("Dad"), tracker.createProfile("Dad")])
		expect(tracker.getState().profiles.filter((p) => p.name === "Dad")).toHaveLength(1)
	})
	it("rename updates the list", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.renameProfile(tracker.getState().profileId, "Malin")
		expect(tracker.getState().profiles[0].name).toBe("Malin")
	})
	it("deleting the current profile falls back to another, or to a fresh default", async () => {
		const { tracker } = make()
		await tracker.init()
		const first = tracker.getState().profileId
		await tracker.createProfile("Dad")
		await tracker.deleteProfile(tracker.getState().profileId)
		expect(tracker.getState().profileId).toBe(first)
		await tracker.deleteProfile(first)
		const state = tracker.getState()
		expect(state.profileId).not.toBe(first)
		expect(state.profiles.filter((p) => !p.deleted_at).map((p) => p.name)).toEqual(["Player 1"])
		expect(state.profiles.filter((p) => p.deleted_at)).toHaveLength(2)
	})
	it("restore brings a deleted profile back", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.createProfile("Dad")
		const dad = tracker.getState().profileId
		await tracker.deleteProfile(dad)
		await tracker.restoreProfile(dad)
		expect(tracker.getState().profiles.find((p) => p.id === dad)?.deleted_at).toBeUndefined()
	})
})

describe("export and import", () => {
	function fileOf(json: string, size = json.length) {
		return { size, text: () => Promise.resolve(json) }
	}
	it("exports the current profile", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.tick("wildlife/a")
		const result = tracker.exportProfile()
		expect(result?.filename).toBe("rookdex-player-1-2026-09-16.json")
		expect(JSON.parse(result?.json ?? "")).toMatchObject({ version: 1, profile_name: "Player 1" })
	})
	it("rejects oversized and invalid files in words the view can map", async () => {
		const { tracker } = make()
		await tracker.init()
		await tracker.readImport(fileOf("{}", 5 * 1024 * 1024 + 1))
		expect(tracker.getState().error).toBe("too-large")
		await tracker.readImport(fileOf("{oops"))
		expect(tracker.getState().error).toBe("not-json")
		await tracker.readImport(fileOf(JSON.stringify({ version: 3 })))
		expect(tracker.getState().error).toBe("not-export")
		expect(tracker.getState().pendingImport).toBeUndefined()
	})
	it("stages a valid file, then imports into the current profile", async () => {
		const { tracker } = make()
		await tracker.init()
		const profile = { id: "x", name: "Dad", created_at: now().toISOString() }
		const { file } = buildExport(
			profile,
			[{ item_id: "wildlife/b", done: true, updated_at: now().toISOString(), origin: "manual" }],
			now()
		)
		await tracker.readImport(fileOf(JSON.stringify(file)))
		expect(tracker.getState().pendingImport?.profile_name).toBe("Dad")
		await tracker.confirmImport("current")
		const state = tracker.getState()
		expect(state.pendingImport).toBeUndefined()
		expect(state.records["wildlife/b"].done).toBe(true)
	})
	it("can create a profile named from the file instead", async () => {
		const { tracker } = make()
		await tracker.init()
		const profile = { id: "x", name: "Dad", created_at: now().toISOString() }
		const { file } = buildExport(profile, [], now())
		await tracker.readImport(fileOf(JSON.stringify(file)))
		await tracker.confirmImport("new")
		const state = tracker.getState()
		expect(state.profiles.find((p) => p.id === state.profileId)?.name).toBe("Dad")
	})
	it("cancel clears the staged file", async () => {
		const { tracker } = make()
		await tracker.init()
		const { file } = buildExport(
			{ id: "x", name: "Dad", created_at: now().toISOString() },
			[],
			now()
		)
		await tracker.readImport(fileOf(JSON.stringify(file)))
		tracker.cancelImport()
		expect(tracker.getState().pendingImport).toBeUndefined()
	})
})

describe("persist hint", () => {
	it("is not requested by init alone, only by the player's first write", async () => {
		const persist = vi.fn(() => Promise.resolve(true))
		const { tracker } = make({ persist })
		await tracker.init()
		expect(persist).not.toHaveBeenCalled()
		await tracker.tick("wildlife/a")
		await tracker.tick("wildlife/b")
		expect(persist).toHaveBeenCalledTimes(1)
	})
	it("shows once when persistence is refused and the app is not installed", async () => {
		const { tracker } = make({ persist: () => Promise.resolve(false) })
		await tracker.init()
		await tracker.tick("wildlife/a")
		await vi.waitFor(() => expect(tracker.getState().persistHint).toBe(true))
		tracker.dismissPersistHint()
		expect(tracker.getState().persistHint).toBe(false)
	})
	it("stays hidden when installed, already seen, or granted, while persistence is still requested", async () => {
		for (const overrides of [
			{ persist: vi.fn(() => Promise.resolve(false)), installed: true },
			{ persist: vi.fn(() => Promise.resolve(false)), hintSeen: true },
			{ persist: vi.fn(() => Promise.resolve(true)) },
		]) {
			const { tracker } = make(overrides)
			await tracker.init()
			await tracker.tick("wildlife/a")
			// Let the persist() promise settle before reading the hint.
			await Promise.resolve()
			await Promise.resolve()
			expect(overrides.persist).toHaveBeenCalledTimes(1)
			expect(tracker.getState().persistHint).toBe(false)
		}
	})
})
