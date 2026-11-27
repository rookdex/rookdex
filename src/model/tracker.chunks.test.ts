import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import type { ChunkOutcome } from "./chunks"
import { openStore } from "./store"
import { createTracker, listChunks, type TrackerDeps } from "./tracker"
import type { TrackItem } from "./trackItems"

const items: TrackItem[] = [
	{ id: "vehicles/bike", category: "vehicles", group: "bikes", name: "Bike", status: "confirmed" },
	{
		id: "wildlife/pelican",
		category: "animals",
		group: "birds",
		name: "Pelican",
		status: "expected",
	},
]
const texts: Record<string, ChunkOutcome> = {
	vehicles: { ok: true, text: { "vehicles/bike": { description: "Two wheels." } } },
	animals: { ok: true, text: { "wildlife/pelican": { precedent: "GTA V" } } },
}

/** Each category's load waits until the test releases it, so arrival order can be staged. */
function staged() {
	const release = new Map<string, () => void>()
	const loadChunk = vi.fn(
		(category: string) =>
			new Promise<ChunkOutcome>((resolve) => release.set(category, () => resolve(texts[category])))
	)
	return { loadChunk, release: (category: string) => release.get(category)?.() }
}

const make = (
	loadChunk?: (category: string) => Promise<ChunkOutcome>,
	selected: string[] = [],
	extra: Partial<TrackerDeps> = {}
) =>
	createTracker({
		openStore: () => openStore(new IDBFactory()),
		items,
		defaultProfileName: "Player 1",
		selected,
		loadChunk,
		...extra,
	})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const calls = (loadChunk: { mock: { calls: [string][] } }) => loadChunk.mock.calls.map(([c]) => c)

describe("chunk loading (spec §5)", () => {
	it("loads every chunk under All and merges the text when it lands", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk)
		void tracker.init()
		expect(calls(loadChunk)).toEqual(["vehicles", "animals"])
		expect(listChunks(tracker.getState()).settled).toBe(false)
		release("vehicles")
		release("animals")
		await flush()
		expect(listChunks(tracker.getState())).toEqual({
			settled: true,
			pending: [],
			failed: [],
			revealed: ["vehicles", "animals"],
			reserve: false,
		})
		expect(tracker.getState().items[0].description).toBe("Two wheels.")
		expect(tracker.getState().items[1].precedent).toBe("GTA V")
	})

	it("ends a category as offline when its loader rejects", async () => {
		const loadChunk = vi.fn(async (): Promise<ChunkOutcome> => {
			throw new Error("boom")
		})
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		await flush()
		expect(tracker.getState().chunks.animals).toBe("offline")
		expect(listChunks(tracker.getState()).settled).toBe(true)
	})

	it("loads only the pressed category, and the next one when it is pressed", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		expect(calls(loadChunk)).toEqual(["animals"])
		tracker.selectCategories(["vehicles"])
		expect(calls(loadChunk)).toEqual(["animals", "vehicles"])
		expect(listChunks(tracker.getState()).pending).toEqual(["vehicles"])
		release("vehicles")
		await flush()
		expect(listChunks(tracker.getState()).settled).toBe(true)
	})

	it("a slow chunk for a category no longer pressed never holds up the pressed one", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["vehicles"])
		void tracker.init()
		tracker.selectCategories(["animals"])
		release("animals")
		await flush()
		expect(listChunks(tracker.getState()).settled).toBe(true)
		release("vehicles")
		await flush()
		// Merged all the same: the list shows only pressed categories (amendment 5).
		expect(tracker.getState().items.map((i) => i.description ?? i.precedent)).toEqual([
			"Two wheels.",
			"GTA V",
		])
		expect(listChunks(tracker.getState()).settled).toBe(true)
	})

	it("reports failed chunks in tile order and tries again when the category is pressed again", async () => {
		const loadChunk = vi
			.fn<(category: string) => Promise<ChunkOutcome>>()
			.mockResolvedValueOnce({ ok: false, reason: "offline" })
			.mockResolvedValueOnce({ ok: false, reason: "stale" })
			.mockResolvedValue(texts.vehicles)
		const tracker = make(loadChunk)
		void tracker.init()
		await flush()
		expect(listChunks(tracker.getState())).toEqual({
			settled: true,
			pending: [],
			failed: [
				{ category: "vehicles", reason: "offline" },
				{ category: "animals", reason: "stale" },
			],
			revealed: [],
			reserve: false,
		})
		tracker.selectCategories(["vehicles"])
		await flush()
		expect(listChunks(tracker.getState())).toEqual({
			settled: true,
			pending: [],
			failed: [],
			revealed: ["vehicles"],
			reserve: false,
		})
	})

	it("without a loader (the hub) never loads anything", async () => {
		const tracker = make(undefined)
		await tracker.init()
		expect(tracker.getState().chunks).toEqual({})
		expect(tracker.getState().revealed).toEqual([])
	})
})

describe("background loading and retries (amendment 5)", () => {
	it("starts every other chunk once the view's own have landed", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		expect(calls(loadChunk)).toEqual(["animals"])
		release("animals")
		await flush()
		expect(calls(loadChunk)).toEqual(["animals", "vehicles"])
	})

	it("tries a failed chunk again when the browser comes back online", async () => {
		const tries: Record<string, number> = {}
		const loadChunk = vi.fn(async (category: string): Promise<ChunkOutcome> => {
			tries[category] = (tries[category] ?? 0) + 1
			return category === "vehicles" && tries[category] === 1
				? { ok: false, reason: "offline" }
				: texts[category]
		})
		let online: () => void = () => {}
		const tracker = make(loadChunk, ["vehicles"], {
			onOnline: (retry) => {
				online = retry
				return () => {}
			},
		})
		void tracker.init()
		await flush()
		expect(listChunks(tracker.getState()).failed).toEqual([
			{ category: "vehicles", reason: "offline" },
		])
		online()
		await flush()
		expect(tries.vehicles).toBe(2)
		expect(listChunks(tracker.getState()).failed).toEqual([])
		expect(tracker.getState().items[0].description).toBe("Two wheels.")
	})

	it("tries a failed chunk again on refresh (a page back from the back/forward cache)", async () => {
		const loadChunk = vi
			.fn<(category: string) => Promise<ChunkOutcome>>()
			.mockResolvedValueOnce({ ok: false, reason: "offline" })
			.mockResolvedValue(texts.vehicles)
		const tracker = make(loadChunk, ["vehicles"], { items: [items[0]] })
		await tracker.init()
		await flush()
		expect(listChunks(tracker.getState()).failed).toHaveLength(1)
		await tracker.refresh()
		await flush()
		expect(listChunks(tracker.getState()).failed).toEqual([])
	})

	it("holds the list's screen of height on a first load, never on a retry", async () => {
		const outcomes: ((outcome: ChunkOutcome) => void)[] = []
		const loadChunk = vi.fn(() => new Promise<ChunkOutcome>((resolve) => outcomes.push(resolve)))
		let online: () => void = () => {}
		const tracker = make(loadChunk, ["vehicles"], {
			items: [items[0]],
			onOnline: (retry) => {
				online = retry
				return () => {}
			},
		})
		void tracker.init()
		expect(listChunks(tracker.getState()).reserve).toBe(true)
		outcomes[0]({ ok: false, reason: "offline" })
		await flush()
		expect(listChunks(tracker.getState()).reserve).toBe(false)
		online()
		expect(tracker.getState().chunks.vehicles).toBe("retrying")
		expect(listChunks(tracker.getState())).toMatchObject({ settled: false, reserve: false })
		outcomes[1](texts.vehicles)
		await flush()
		expect(listChunks(tracker.getState())).toMatchObject({
			settled: true,
			reserve: false,
			revealed: ["vehicles"],
		})
	})

	it("starts a retrying chunk only once when its tile is pressed again", async () => {
		const loadChunk = vi
			.fn<(category: string) => Promise<ChunkOutcome>>()
			.mockResolvedValueOnce({ ok: false, reason: "offline" })
			.mockReturnValue(new Promise<ChunkOutcome>(() => {}))
		const tracker = make(loadChunk, ["vehicles"], { items: [items[0]] })
		void tracker.init()
		await flush()
		tracker.selectCategories([])
		tracker.selectCategories(["vehicles"])
		expect(loadChunk).toHaveBeenCalledTimes(2)
	})
})

describe("list order on arrival (ruling 9)", () => {
	it("on All, shows a later category only once every earlier one has landed or failed", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk)
		void tracker.init()
		release("animals")
		await flush()
		expect(tracker.getState().revealed).toEqual([])
		release("vehicles")
		await flush()
		expect(tracker.getState().revealed).toEqual(["vehicles", "animals"])
	})

	it("hides a shown category while an earlier pressed one is still loading (plan ruling 9)", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		release("animals")
		await flush()
		expect(tracker.getState().revealed).toEqual(["animals"])
		tracker.selectCategories(["vehicles", "animals"])
		expect(listChunks(tracker.getState())).toMatchObject({ revealed: [], reserve: true })
		release("vehicles")
		await flush()
		expect(listChunks(tracker.getState())).toMatchObject({
			revealed: ["vehicles", "animals"],
			reserve: false,
		})
	})

	// The fixtures list vehicles first, so animals plays the part of a later category opened by
	// ?show= on a slow first visit, with the background load of the earlier one still on its way.
	it("on All after ?show=, holds the shown category until every earlier one is in (plan ruling 9)", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		release("animals")
		await flush()
		expect(calls(loadChunk)).toEqual(["animals", "vehicles"])
		tracker.selectCategories([])
		expect(listChunks(tracker.getState())).toMatchObject({
			settled: false,
			revealed: [],
			reserve: true,
		})
		release("vehicles")
		await flush()
		expect(listChunks(tracker.getState())).toMatchObject({
			settled: true,
			revealed: ["vehicles", "animals"],
			reserve: false,
		})
	})

	it("shows the later category once an earlier pressed one fails (plan ruling 9)", async () => {
		const outcomes = new Map<string, (outcome: ChunkOutcome) => void>()
		const loadChunk = vi.fn(
			(category: string) => new Promise<ChunkOutcome>((resolve) => outcomes.set(category, resolve))
		)
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		outcomes.get("animals")?.(texts.animals)
		await flush()
		tracker.selectCategories([])
		expect(tracker.getState().revealed).toEqual([])
		outcomes.get("vehicles")?.({ ok: false, reason: "offline" })
		await flush()
		expect(listChunks(tracker.getState())).toMatchObject({
			revealed: ["animals"],
			failed: [{ category: "vehicles", reason: "offline" }],
		})
	})

	it("keeps the shown categories while a failed earlier one is tried again", async () => {
		const tries: Record<string, number> = {}
		const loadChunk = vi.fn((category: string): Promise<ChunkOutcome> => {
			tries[category] = (tries[category] ?? 0) + 1
			if (category !== "vehicles") return Promise.resolve(texts[category])
			return tries.vehicles === 1
				? Promise.resolve({ ok: false, reason: "offline" })
				: new Promise<ChunkOutcome>(() => {})
		})
		let online: () => void = () => {}
		const tracker = make(loadChunk, [], {
			onOnline: (retry) => {
				online = retry
				return () => {}
			},
		})
		void tracker.init()
		await flush()
		expect(tracker.getState().revealed).toEqual(["animals"])
		online()
		expect(tracker.getState().chunks.vehicles).toBe("retrying")
		expect(tracker.getState().revealed).toEqual(["animals"])
	})

	it("never lets a failed earlier category hold up a later one", async () => {
		const loadChunk = vi.fn(
			async (category: string): Promise<ChunkOutcome> =>
				category === "vehicles" ? { ok: false, reason: "offline" } : texts[category]
		)
		const tracker = make(loadChunk)
		void tracker.init()
		await flush()
		expect(tracker.getState().revealed).toEqual(["animals"])
	})
})
