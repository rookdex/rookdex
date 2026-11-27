// Build only (it imports node:crypto): the seed index file and the per-category chunks (spec §5,
// data delivery plan). The endpoint, SeedIndex.astro and the tests reach the shipped seed's files
// through seedDelivered.ts, so seed.ts never imports Node code.
import { createHash } from "node:crypto"
import type { SeedItem } from "./schema"
import type { SeedResult } from "./seedBuild"
import {
	type ChunkBody,
	categoryIds,
	type IndexItem,
	type ItemText,
	type SeedIndex,
} from "./trackItems"

export interface SeedChunk {
	category: string
	/** "vehicles.0123456789": the endpoint's route param. */
	file: string
	/** "/data/vehicles.0123456789.json" */
	url: string
	/** The exact bytes served, which the hash covers. */
	body: string
}

/** 10 hex characters of SHA-256. The service worker's copy rule matches exactly this length. */
export function chunkHash(body: string): string {
	return createHash("sha256").update(body).digest("hex").slice(0, 10)
}

/** One chunk per category that has items, with the card text of its shown items. A category whose
 *  items have no text still gets a chunk, so the tracker never lacks a URL. */
export function buildChunks(items: SeedItem[]): SeedChunk[] {
	return categoryIds(items).map((category) => {
		const text: Record<string, ItemText> = {}
		for (const item of items) {
			if (item.category !== category || item.retired) continue
			const entry: ItemText = {}
			if (item.description !== undefined) entry.description = item.description
			if (item.precedent !== undefined) entry.precedent = item.precedent
			if (Object.keys(entry).length > 0) text[item.id] = entry
		}
		const body = JSON.stringify({ category, text } satisfies ChunkBody)
		const file = `${category}.${chunkHash(body)}`
		return { category, file, url: `/data/${file}.json`, body }
	})
}

function indexItem(item: SeedItem): IndexItem {
	const out: IndexItem = { id: item.id, name: item.name, status: item.status }
	if (item.set !== undefined) out.set = item.set
	if (item.aliases !== undefined) out.aliases = item.aliases
	if (item.retired) out.retired = true
	if (item.uncounted) out.uncounted = true
	return out
}

/** Categories that have a chunk, in categories.json order, and every group in display order with
 *  its light items. Retired items stay in, flagged, so the model sees what it sees today. */
export function buildIndex(
	seed: Pick<SeedResult, "categories" | "groups" | "items">,
	chunks: SeedChunk[]
): SeedIndex {
	const urls = new Map(chunks.map((c) => [c.category, c.url]))
	return {
		categories: seed.categories.flatMap((category) => {
			const chunk = urls.get(category.id)
			return chunk ? [{ ...category, chunk }] : []
		}),
		groups: seed.groups
			.filter((group) => urls.has(group.category))
			.map((group) => ({
				...group,
				items: seed.items
					.filter((i) => i.category === group.category && i.group === group.id)
					.map(indexItem),
			})),
	}
}

/** A served data file: the endpoint's route param, its URL and the exact bytes the hash covers. */
export type SeedFile = Omit<SeedChunk, "category">

/** The index as its own hashed file, /data/seed-index.<hash>.json (plan review ruling 3). Plain
 *  JSON: it is a file, not a script block, so nothing needs escaping. */
export function buildIndexFile(index: SeedIndex): SeedFile {
	const body = JSON.stringify(index)
	const file = `seed-index.${chunkHash(body)}`
	return { file, url: `/data/${file}.json`, body }
}
