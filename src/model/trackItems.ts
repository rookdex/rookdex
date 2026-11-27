// The seed as the browser sees it (data delivery plan). Zod-free and free of seed.ts, so an island
// that imports this never bundles the seed or its build checks (src/test/island-imports.test.ts).
import type { SeedItem } from "./schema"
import type { SeedCategory, SeedGroup } from "./seedBuild"

/** What the tracker and the hub read of an item. A SeedItem is one too, so pages and tests pass theirs. */
export type TrackItem = Pick<
	SeedItem,
	| "id"
	| "category"
	| "group"
	| "name"
	| "status"
	| "set"
	| "aliases"
	| "retired"
	| "uncounted"
	| "description"
	| "precedent"
>

/** The card text a category chunk carries per item: most of an item's bytes once sources are gone. */
export type ItemText = Pick<SeedItem, "description" | "precedent">

/** An item in the seed index. Its group gives category and group, its chunk gives the text. */
export type IndexItem = Omit<TrackItem, "category" | "group" | "description" | "precedent">

export interface IndexGroup extends SeedGroup {
	items: IndexItem[]
}

export interface IndexCategory extends SeedCategory {
	/** `/data/<category>.<hash>.json` */
	chunk: string
}

/** The seed index, served as /data/seed-index.<hash>.json (seedDelivery.ts). The tracker and hub pages carry only its URL (SeedIndex.astro). Groups are in display order. */
export interface SeedIndex {
	categories: IndexCategory[]
	groups: IndexGroup[]
}

/** The body of `/data/<category>.<hash>.json`. */
export interface ChunkBody {
	category: string
	text: Record<string, ItemText>
}

/** Category ids in item order. */
export function categoryIds(items: readonly { category: string }[]): string[] {
	return [...new Set(items.map((i) => i.category))]
}

/** Items by group in item order. seedBuild sorts once, so every page and the tracker list items the
 *  same way. */
export function groupItems<T extends { group: string }>(items: readonly T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>()
	for (const item of items) {
		const list = groups.get(item.group)
		if (list) list.push(item)
		else groups.set(item.group, [item])
	}
	return groups
}

/** The index's items in display order, each with its category and group. */
export function indexItems(index: SeedIndex): TrackItem[] {
	return index.groups.flatMap(({ category, id, items }) =>
		items.map((item) => ({ ...item, category, group: id }))
	)
}

/** Items with a chunk's text merged in. Items the chunk does not name keep their identity. */
export function withText<T extends TrackItem>(items: T[], text: Record<string, ItemText>): T[] {
	return items.map((item) => (Object.hasOwn(text, item.id) ? { ...item, ...text[item.id] } : item))
}
