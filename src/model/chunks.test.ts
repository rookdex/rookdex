// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { createChunkLoader, loadSeedIndex, readSeedIndexUrl, SEED_INDEX_ID } from "./chunks"
import type { SeedIndex } from "./trackItems"

const index: SeedIndex = {
	categories: [
		{ id: "vehicles", chunk: "/data/vehicles.0123456789.json" },
		{ id: "animals", chunk: "/data/animals.abcdef0123.json" },
	],
	groups: [],
}
const INDEX_URL = "/data/seed-index.0123456789.json"
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const vehicles = { category: "vehicles", text: { "vehicles/bike": { description: "Two wheels." } } }
const never = () => new Promise<Response>(() => {})

afterEach(() => {
	vi.useRealTimers()
})

describe("readSeedIndexUrl", () => {
	it("reads the index file's URL from the page's data block", () => {
		const node = document.createElement("script")
		node.type = "application/json"
		node.id = SEED_INDEX_ID
		node.textContent = JSON.stringify({ url: INDEX_URL })
		document.head.append(node)
		expect(readSeedIndexUrl()).toBe(INDEX_URL)
		node.remove()
	})

	it("throws when the page has none, so a missing block fails loudly", () => {
		expect(() => readSeedIndexUrl()).toThrow("Seed index missing")
	})
})

describe("loadSeedIndex (plan review ruling 3)", () => {
	it("loads the index", async () => {
		const fetchFn = vi.fn(async () => json(index))
		expect(await loadSeedIndex(INDEX_URL, fetchFn)).toEqual({ ok: true, index })
		expect(fetchFn).toHaveBeenCalledWith(
			INDEX_URL,
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		)
	})

	it("reads a rejected fetch as offline", async () => {
		const outcome = await loadSeedIndex(INDEX_URL, async () => {
			throw new TypeError("Failed to fetch")
		})
		expect(outcome).toEqual({ ok: false, reason: "offline" })
	})

	it("reads a 404 as an old page after an update", async () => {
		const outcome = await loadSeedIndex(
			INDEX_URL,
			async () => new Response("Not found", { status: 404 })
		)
		expect(outcome).toEqual({ ok: false, reason: "stale" })
	})

	it("reads an HTML body as an old page after an update", async () => {
		const outcome = await loadSeedIndex(
			INDEX_URL,
			async () => new Response("<!doctype html><p>hi</p>")
		)
		expect(outcome).toEqual({ ok: false, reason: "stale" })
	})

	it("reads JSON of the wrong shape as an old page after an update", async () => {
		const outcome = await loadSeedIndex(INDEX_URL, async () => json({ categories: {}, groups: [] }))
		expect(outcome).toEqual({ ok: false, reason: "stale" })
	})

	it("reads a fetch that stalls past the timeout as offline", async () => {
		vi.useFakeTimers()
		const outcome = loadSeedIndex(INDEX_URL, never)
		await vi.advanceTimersByTimeAsync(10_000)
		expect(await outcome).toEqual({ ok: false, reason: "offline" })
	})
})

describe("createChunkLoader (spec §5)", () => {
	it("fetches a category's chunk once and answers later calls from memory", async () => {
		const fetchFn = vi.fn(async () => json(vehicles))
		const load = createChunkLoader(index, fetchFn)
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
		expect(fetchFn).toHaveBeenCalledOnce()
		expect(fetchFn).toHaveBeenCalledWith(
			"/data/vehicles.0123456789.json",
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		)
	})

	it("reads a rejected fetch as offline", async () => {
		const load = createChunkLoader(index, async () => {
			throw new TypeError("Failed to fetch")
		})
		expect(await load("vehicles")).toEqual({ ok: false, reason: "offline" })
	})

	it("reads a 404 as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => new Response("Not found", { status: 404 }))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads an HTML body as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => new Response("<!doctype html><p>hi</p>"))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads another category's chunk as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => json({ ...vehicles, category: "animals" }))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads a category the index does not know as an old page after an update", async () => {
		const fetchFn = vi.fn(async () => json(vehicles))
		expect(await createChunkLoader(index, fetchFn)("weapons")).toEqual({
			ok: false,
			reason: "stale",
		})
		expect(fetchFn).not.toHaveBeenCalled()
	})

	it("tries again after a failure, so coming back online loads the chunk", async () => {
		const fetchFn = vi
			.fn<(url: string) => Promise<Response>>()
			.mockRejectedValueOnce(new TypeError("offline"))
			.mockResolvedValueOnce(json(vehicles))
		const load = createChunkLoader(index, fetchFn)
		expect(await load("vehicles")).toEqual({ ok: false, reason: "offline" })
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
	})

	it("reads a fetch that stalls past the timeout as offline (amendment 4)", async () => {
		vi.useFakeTimers()
		const outcome = createChunkLoader(index, never)("vehicles")
		await vi.advanceTimersByTimeAsync(10_000)
		expect(await outcome).toEqual({ ok: false, reason: "offline" })
	})
})
