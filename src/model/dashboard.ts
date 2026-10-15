// The dashboard's numbers (dashboard spec §6.2). Pure: no DOM, no clock; the caller passes `now`.
// Retired items and records without a seed item never count, as in stats.ts.
import { localDayKey } from "./days"
import type { Rumour, SeedItem } from "./schema"
import { groupItems } from "./seed"
import { countable, perCategory, type Records } from "./stats"

/** Where a player with nothing found starts. */
export const FIRST_GOAL = "wildlife"

/** How many categories What's next draws from (dashboard spec §4). */
export const NEXT_GROUPS = 2

/** One category's rows in What's next. */
export interface NextGroup {
	category: string
	/** Every unfound item of the category, not only the ones shown. */
	left: number
	items: SeedItem[]
}

/**
 * Categories below 100 %, highest share found first, ties in category order. With nothing found,
 * wildlife comes first and the rest follow in category order.
 */
export function rankCategories(items: SeedItem[], records: Records): string[] {
	const counts = perCategory(countable(items), records)
	if (counts.every((c) => c.done === 0)) {
		const first = counts.find((c) => c.category === FIRST_GOAL) ?? counts[0]
		return first ? [first, ...counts.filter((c) => c !== first)].map((c) => c.category) : []
	}
	// sort is stable, so equal shares keep category order.
	return counts
		.filter((c) => c.done < c.total)
		.sort((a, b) => b.done / b.total - a.done / a.total)
		.map((c) => c.category)
}

/**
 * The category with the highest share found below 100 %. Ties go to category order. With nothing
 * found it is wildlife; with everything found it is undefined.
 */
export function closestCategory(items: SeedItem[], records: Records): string | undefined {
	return rankCategories(items, records)[0]
}

/** Unfound items of `category` in the tracker's order (group, then name). */
function openItems(items: SeedItem[], records: Records, category: string): SeedItem[] {
	const open = countable(items).filter(
		(item) => item.category === category && !records[item.id]?.done
	)
	return [...groupItems(open).values()].flat()
}

/**
 * What's next: up to `limit` unfound items, from the closest category first, then the next-closest,
 * from at most NEXT_GROUPS categories. Empty when everything is found.
 */
export function nextGroups(items: SeedItem[], records: Records, limit: number): NextGroup[] {
	const groups: NextGroup[] = []
	let room = limit
	for (const category of rankCategories(items, records)) {
		if (room <= 0 || groups.length === NEXT_GROUPS) break
		const open = openItems(items, records, category)
		groups.push({ category, left: open.length, items: open.slice(0, room) })
		room -= open.length
	}
	return groups
}

/** Finds whose tick (stored in UTC) falls on `now`'s local calendar day. */
export function foundToday(items: SeedItem[], records: Records, now: Date): number {
	const today = localDayKey(now)
	return countable(items).filter((item) => {
		const record = records[item.id]
		return record?.done === true && localDayKey(new Date(record.updated_at)) === today
	}).length
}

/** Newest `added` first, ties by id, at most `limit`. */
export function latestRumours(rumours: Rumour[], limit: number): Rumour[] {
	return [...rumours]
		.sort((a, b) => b.added.localeCompare(a.added) || a.id.localeCompare(b.id))
		.slice(0, limit)
}
