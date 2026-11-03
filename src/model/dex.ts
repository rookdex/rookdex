// Page data for the Dex (category pages spec §4). Pure: it shapes live seed items, so the pages
// and the tests share one source of truth and the tracker's group order.
import type { SeedItem } from "./schema"
import { categoryIds, groupItems } from "./seed"

export interface DexGroup {
	id: string
	items: SeedItem[]
}

export interface DexCategory {
	id: string
	total: number
	confirmed: number
	expected: number
	groups: DexGroup[]
}

/** Callers filter retired items out, as the Sources page does. Throwing keeps a stale item from
 *  ever reaching a page. */
function assertLive(items: SeedItem[]): void {
	const retired = items.find((item) => item.retired)
	if (retired) throw new Error(`${retired.id} is retired; filter retired items out first`)
}

export function dexCategory(items: SeedItem[], category: string): DexCategory {
	assertLive(items)
	const own = items.filter((item) => item.category === category)
	if (own.length === 0) throw new Error(`No live items in category "${category}"`)
	const confirmed = own.filter((item) => item.status === "confirmed").length
	return {
		id: category,
		total: own.length,
		confirmed,
		expected: own.length - confirmed,
		groups: [...groupItems(own)].map(([id, list]) => ({ id, items: list })),
	}
}

export function dexIndex(items: SeedItem[]): DexCategory[] {
	assertLive(items)
	return categoryIds(items).map((category) => dexCategory(items, category))
}

/** The copy keys a category page needs. copy.test.ts checks both bundles hold them for every live
 *  category, so a new seed category fails CI until its copy exists. */
export function dexKeys(category: string): string[] {
	return [
		`seo.titles.dex.${category}`,
		`dex.lede.${category}.one`,
		`dex.lede.${category}.other`,
		`dex.description.${category}.one`,
		`dex.description.${category}.other`,
	]
}
