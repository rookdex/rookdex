// The browser's side of the seed delivery (spec §5): the index file's URL the page carries, the
// index itself, and the card text chunks, keyed by category and kept in memory. No Zod: the build
// already checked every byte, so a shape check is enough to tell real data from an old page's 404
// or HTML.
import type { ChunkBody, ItemText, SeedIndex } from "./trackItems"

export const SEED_INDEX_ID = "seed-index"
/** A request that has not finished after this long reads as offline (Review Focus 5). */
export const FETCH_TIMEOUT_MS = 10_000

/** offline: the fetch itself failed or stalled. stale: the server answered, but not with this
 *  file, which is what an old tab sees after a deploy replaced it. */
export type ChunkFailure = "offline" | "stale"
export type ChunkOutcome =
	| { ok: true; text: Record<string, ItemText> }
	| { ok: false; reason: ChunkFailure }
export type IndexOutcome = { ok: true; index: SeedIndex } | { ok: false; reason: ChunkFailure }
export type FetchFn = (url: string, init: { signal: AbortSignal }) => Promise<Response>

/** The index file's URL that SeedIndex.astro put on the page. Throws when the page has none: a page
 *  whose island builds a tracker must render SeedIndex.astro (the page tests check both pages). */
export function readSeedIndexUrl(doc: Document = document): string {
	const text = doc.getElementById(SEED_INDEX_ID)?.textContent
	if (!text) throw new Error("Seed index missing")
	const { url } = JSON.parse(text) as { url?: unknown }
	if (typeof url !== "string") throw new Error("Seed index missing")
	return url
}

type Fetched = { ok: true; body: unknown } | { ok: false; reason: ChunkFailure }

/** One JSON fetch under a deadline that covers the body too. The deadline rejects even when
 *  fetchFn ignores the signal, so a stall always ends. */
async function fetchJson(url: string, fetchFn: FetchFn, timeoutMs: number): Promise<Fetched> {
	const controller = new AbortController()
	let timer: ReturnType<typeof setTimeout> | undefined
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort()
			reject(new Error("timeout"))
		}, timeoutMs)
	})
	try {
		let response: Response
		try {
			const request = fetchFn(url, { signal: controller.signal })
			// When the deadline wins, the aborted request rejects later with nobody listening.
			request.catch(() => {})
			response = await Promise.race([request, deadline])
		} catch {
			return { ok: false, reason: "offline" }
		}
		if (!response.ok) return { ok: false, reason: "stale" }
		try {
			const body = response.json() as Promise<unknown>
			body.catch(() => {})
			return { ok: true, body: await Promise.race([body, deadline]) }
		} catch {
			return { ok: false, reason: controller.signal.aborted ? "offline" : "stale" }
		}
	} finally {
		clearTimeout(timer)
	}
}

function isIndex(body: unknown): body is SeedIndex {
	if (typeof body !== "object" || body === null) return false
	const { categories, groups } = body as Partial<SeedIndex>
	return Array.isArray(categories) && Array.isArray(groups)
}

function isChunk(body: unknown, category: string): body is ChunkBody {
	if (typeof body !== "object" || body === null) return false
	const { category: own, text } = body as Partial<ChunkBody>
	return own === category && typeof text === "object" && text !== null && !Array.isArray(text)
}

/** Loads the seed index file. Not cached: the island calls it once, and again on Try again. */
export async function loadSeedIndex(
	url: string,
	fetchFn: FetchFn,
	timeoutMs = FETCH_TIMEOUT_MS
): Promise<IndexOutcome> {
	const fetched = await fetchJson(url, fetchFn, timeoutMs)
	if (!fetched.ok) return fetched
	return isIndex(fetched.body) ? { ok: true, index: fetched.body } : { ok: false, reason: "stale" }
}

/** Loads a category's chunk. A success is kept for the page's life; a failure is not, so the next
 *  call tries the network again. */
export function createChunkLoader(
	index: SeedIndex,
	fetchFn: FetchFn,
	timeoutMs = FETCH_TIMEOUT_MS
): (category: string) => Promise<ChunkOutcome> {
	const urls = new Map(index.categories.map((c) => [c.id, c.chunk]))
	const loaded = new Map<string, Promise<ChunkOutcome>>()

	async function fetchChunk(category: string): Promise<ChunkOutcome> {
		const url = urls.get(category)
		if (!url) return { ok: false, reason: "stale" }
		const fetched = await fetchJson(url, fetchFn, timeoutMs)
		if (!fetched.ok) return fetched
		return isChunk(fetched.body, category)
			? { ok: true, text: fetched.body.text }
			: { ok: false, reason: "stale" }
	}

	return (category) => {
		const known = loaded.get(category)
		if (known) return known
		const pending = fetchChunk(category).then((outcome) => {
			if (!outcome.ok) loaded.delete(category)
			return outcome
		})
		loaded.set(category, pending)
		return pending
	}
}
