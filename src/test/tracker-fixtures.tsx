// Shared setup for the Tracker and Dashboard island tests. resetBrowser() puts the fixtures on the
// page the way the built pages deliver them: a data block with the seed index file's URL, and a
// stubbed fetch that serves that file and one chunk per category.
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IDBFactory } from "fake-indexeddb"
import type { ReactElement } from "react"
import { expect, type Mock, vi } from "vitest"
import { SEED_INDEX_ID } from "../model/chunks"
import type { SeedItem } from "../model/schema"
import {
	buildChunks,
	buildIndex,
	buildIndexFile,
	type SeedChunk,
	type SeedFile,
} from "../model/seedDelivery"
import { jsonLd } from "../model/seo"
import { categoryIds } from "../model/trackItems"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }

// In seed order: categories.json, then the game's group order (Reptiles & Amphibians before
// Birds), then name. The ids are the shipped ones, from before Wildlife became Animals.
export const fixtures: SeedItem[] = [
	{
		id: "vehicles/bike",
		category: "vehicles",
		group: "bikes",
		name: "Bike",
		status: "confirmed",
		sources: [src],
	},
	{
		id: "wildlife/american-alligator",
		category: "animals",
		group: "reptiles-amphibians",
		name: "American alligator",
		status: "confirmed",
		sources: [src],
		description: "Everglades native.",
	},
	{
		id: "wildlife/pelican",
		category: "animals",
		group: "birds",
		name: "Pelican",
		status: "expected",
		precedent: "GTA V",
		sources: [src],
	},
]

type Serve = (url: string) => Promise<Response>
type FetchStub = Mock<(url: string, init?: unknown) => Promise<Response>>

/** What the latest installSeed put on the page. `serve` answers a URL the way the server does
 *  (404 for anything else). `fetch` is the current stub, so a test can read every URL asked for. */
export const delivered: { chunks: SeedChunk[]; index: SeedFile; serve: Serve; fetch: FetchStub } = {
	chunks: [],
	index: { file: "", url: "", body: "" },
	serve: async () => new Response("Not found", { status: 404 }),
	fetch: vi.fn<(url: string, init?: unknown) => Promise<Response>>(),
}

/** Stubs fetch with `handler` and records every call in delivered.fetch. */
function stubFetch(handler: Serve): void {
	const fetch: FetchStub = vi.fn((url: string, _init?: unknown) => handler(url))
	delivered.fetch = fetch
	vi.stubGlobal("fetch", fetch)
}

/**
 * Puts `items` on the page as the built pages do: the data block holds the index file's URL, and
 * fetch serves the index file and each category's chunk (404 for any other URL). Groups keep their
 * first-seen order, as the fixtures are already in display order.
 */
export function installSeed(items: SeedItem[] = fixtures) {
	const chunks = buildChunks(items)
	const groups = [
		...new Map(
			items.map((i, n) => [
				`${i.category}/${i.group}`,
				{ category: i.category, id: i.group, order: n + 1, sets: [], counts: true },
			])
		).values(),
	]
	const index = buildIndex(
		{ categories: categoryIds(items).map((id) => ({ id })), groups, items },
		chunks
	)
	const indexFile = buildIndexFile(index)
	document.getElementById(SEED_INDEX_ID)?.remove()
	const node = document.createElement("script")
	node.type = "application/json"
	node.id = SEED_INDEX_ID
	node.textContent = jsonLd({ url: indexFile.url })
	document.head.append(node)
	const files = [...chunks, indexFile]
	delivered.chunks = chunks
	delivered.index = indexFile
	delivered.serve = async (url) => {
		const found = files.find((f) => f.url === url)
		return found
			? new Response(found.body, { headers: { "Content-Type": "application/json" } })
			: new Response("Not found", { status: 404 })
	}
	stubFetch(delivered.serve)
	return delivered
}

/** Serves the index file at once and sends each chunk request to `chunk` (B2): a chunk test never
 *  fails the index by accident. */
export function stubChunks(chunk: (category: string, url: string) => Promise<Response>): void {
	stubFetch((url) => {
		const found = delivered.chunks.find((c) => c.url === url)
		return found ? chunk(found.category, url) : delivered.serve(url)
	})
}

/** Holds each category's chunk request until release(category). Categories in `serveNow` are
 *  answered at once. Call before render, so a background load is held too (I7). */
export function deferChunks(serveNow: string[] = []) {
	const held = new Map<string, () => void>()
	stubChunks((category, url) => {
		if (serveNow.includes(category)) return delivered.serve(url)
		return new Promise<Response>((resolve) => {
			held.set(category, () => resolve(delivered.serve(url)))
		})
	})
	return {
		/** A request for `category` is waiting. */
		requested: (category: string) => held.has(category),
		/** Answers the waiting request for `category`. Throws when none waits, so a test can't
		 *  release nothing and pass. */
		release(category: string) {
			const answer = held.get(category)
			if (!answer) throw new Error(`No request held for ${category}`)
			held.delete(category)
			answer()
		},
	}
}

/** Answers the index file with `answer` and everything else as served (ruling 3 tests). */
export function stubIndex(answer: () => Promise<Response>): void {
	stubFetch((url) => (url === delivered.index.url ? answer() : delivered.serve(url)))
}

/** Anchors the island "clicked" to download a file since the last `resetBrowser()`. */
export const downloads: HTMLAnchorElement[] = []

/**
 * Fresh IndexedDB, localStorage and sessionStorage, a clean tracker URL, stubbed blob URLs and a no-op anchor click
 * that records the anchor (jsdom would otherwise try to navigate). Call from `beforeEach`.
 */
export function resetBrowser(): void {
	localStorage.clear()
	sessionStorage.clear()
	Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true })
	window.history.replaceState(null, "", "/en/tracker/")
	URL.createObjectURL = vi.fn(() => "blob:rookdex")
	URL.revokeObjectURL = vi.fn()
	downloads.length = 0
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement
	) {
		downloads.push(this)
	})
	installSeed()
}

/** Renders the island and waits until the store has loaded and the list is interactive. */
export async function renderReady(ui: ReactElement) {
	const view = render(ui)
	const box = await screen.findByRole("checkbox", { name: "American alligator" })
	await waitFor(() => expect(box).toBeEnabled())
	return view
}

export function openMenu(name = "Profile: Player 1") {
	const trigger = screen.getByRole("button", { name })
	fireEvent.click(trigger)
	return trigger
}
