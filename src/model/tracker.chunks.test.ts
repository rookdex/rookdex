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
		})
		expect(tracker.getState().items[0].description).toBe("Two wheels.")
		expect(tracker.getState().items[1].precedent).toBe("GTA V")
	})

	it("ends a category as offline when its loader rejects (gate G5)", async () => {
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
		})
		tracker.selectCategories(["vehicles"])
		await flush()
		expect(listChunks(tracker.getState())).toEqual({
			settled: true,
			pending: [],
			failed: [],
			revealed: ["vehicles"],
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

	it("keeps a shown category when an earlier one is pressed and still loading", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		release("animals")
		await flush()
		expect(tracker.getState().revealed).toEqual(["animals"])
		tracker.selectCategories(["vehicles", "animals"])
		expect(tracker.getState().revealed).toEqual(["animals"])
		release("vehicles")
		await flush()
		expect(tracker.getState().revealed).toEqual(["vehicles", "animals"])
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
