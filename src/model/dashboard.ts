// The dashboard's numbers (dashboard spec §6.2). Pure: no DOM, no clock; the caller passes `now`.
// Retired items and records without a seed item never count, as in stats.ts.
import { addDays, localDayKey } from "./days"
import type { Fact, Rumour, SeedItem } from "./schema"
import { categoryIds, groupItems } from "./seed"
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

/** Newest `announced` first, ties by id: the Confirmed list on News. */
export function newestFacts(facts: Fact[]): Fact[] {
	return [...facts].sort(
		(a, b) => b.announced.localeCompare(a.announced) || a.id.localeCompare(b.id)
	)
}

/** One row of the Latest news tile (desktop dashboard spec §4.6). A fact's name is per locale. */
export interface NewsEntry {
	id: string
	kind: "confirmed" | "rumour"
	date: string
	name: string | Fact["name"]
}

/** Facts by `announced` and rumours by `added`, newest first. Same day: Confirmed first, then id. */
export function latestNews(facts: Fact[], rumours: Rumour[], limit: number): NewsEntry[] {
	const entries: NewsEntry[] = [
		...facts.map((f) => ({
			id: f.id,
			kind: "confirmed" as const,
			date: f.announced,
			name: f.name,
		})),
		...rumours.map((r) => ({ id: r.id, kind: "rumour" as const, date: r.added, name: r.name })),
	]
	const rank = (kind: NewsEntry["kind"]) => (kind === "confirmed" ? 0 : 1)
	return entries
		.sort(
			(a, b) =>
				b.date.localeCompare(a.date) || rank(a.kind) - rank(b.kind) || a.id.localeCompare(b.id)
		)
		.slice(0, limit)
}

/** Finds on one local calendar day. */
export interface DayCount {
	day: string
	count: number
}

/**
 * Finds per local day for the `days` days ending on `today` (`YYYY-MM-DD`), oldest first, zero
 * days kept (desktop dashboard spec §6.2). Retired items and records with no seed item never count.
 */
export function findsByDay(
	items: SeedItem[],
	records: Records,
	today: string,
	days: number
): DayCount[] {
	const counts = new Map<string, number>()
	for (let n = days - 1; n >= 0; n--) counts.set(addDays(today, -n), 0)
	for (const item of countable(items)) {
		const record = records[item.id]
		if (record?.done !== true) continue
		const day = localDayKey(new Date(record.updated_at))
		const count = counts.get(day)
		if (count !== undefined) counts.set(day, count + 1)
	}
	return [...counts].map(([day, count]) => ({ day, count }))
}

/** One category bar: its counts and its group ids in tracker order (desktop dashboard spec §6.1). */
export interface CategoryRow {
	id: string
	done: number
	total: number
	groups: string[]
}

/** Every category, in the order its first item appears in the tracker. Retired items are skipped. */
export function categoryRows(items: SeedItem[], records: Records): CategoryRow[] {
	const live = countable(items)
	const counts = perCategory(live, records)
	return categoryIds(live).map((id) => {
		const count = counts.find((c) => c.category === id) ?? { done: 0, total: 0 }
		const groups = [...groupItems(live.filter((item) => item.category === id)).keys()]
		return { id, done: count.done, total: count.total, groups }
	})
}
