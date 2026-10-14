// The dashboard's numbers (dashboard spec §6.2). Pure: no DOM, no clock; the caller passes `now`.
// Retired items and records without a seed item never count, as in stats.ts.
import { localDayKey } from "./days"
import type { Rumour, SeedItem } from "./schema"
import { groupItems } from "./seed"
import { countable, perCategory, type Records } from "./stats"

/** Where a player with nothing found starts. */
export const FIRST_GOAL = "wildlife"

/**
 * The category with the highest share found below 100 %. Ties go to category order. With nothing
 * found it is wildlife; with everything found it is undefined.
 */
export function closestCategory(items: SeedItem[], records: Records): string | undefined {
	const counts = perCategory(countable(items), records)
	if (counts.every((c) => c.done === 0)) {
		return counts.find((c) => c.category === FIRST_GOAL)?.category ?? counts[0]?.category
	}
	let best: { category: string; share: number } | undefined
	for (const c of counts) {
		if (c.done === c.total) continue
		const share = c.done / c.total
		if (!best || share > best.share) best = { category: c.category, share }
	}
	return best?.category
}

/** Unfound items of `category` in the tracker's order (group, then name), at most `limit`. */
export function whatsNext(
	items: SeedItem[],
	records: Records,
	category: string,
	limit: number
): SeedItem[] {
	const open = countable(items).filter(
		(item) => item.category === category && !records[item.id]?.done
	)
	return [...groupItems(open).values()].flat().slice(0, limit)
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
