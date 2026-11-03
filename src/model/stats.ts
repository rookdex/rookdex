// Computed, never stored. Retired items and records without a seed item are never counted.
import type { ProgressRecord, SeedItem } from "./schema"
import { categoryIds } from "./seed"

export type Records = Record<string, ProgressRecord>

export interface Count {
	done: number
	total: number
}
export interface CategoryCount extends Count {
	category: string
}
export interface RecentFind {
	item: SeedItem
	updated_at: string
}

export function countable(items: SeedItem[]): SeedItem[] {
	return items.filter((item) => !item.retired)
}

export function countItems(items: SeedItem[], records: Records): Count {
	const live = countable(items)
	const done = live.filter((item) => records[item.id]?.done).length
	return { done, total: live.length }
}

export function perCategory(items: SeedItem[], records: Records): CategoryCount[] {
	return categoryIds(items).map((category) => ({
		category,
		...countItems(
			items.filter((item) => item.category === category),
			records
		),
	}))
}

/** The key `perGroup` and the list share. Group ids repeat across categories, so both are in it. */
export function groupKey(category: string, group: string): string {
	return `${category}/${group}`
}

/** Per group, keyed by `groupKey`. Always over every countable item, never a filtered view. */
export function perGroup(items: SeedItem[], records: Records): Record<string, Count> {
	const counts: Record<string, Count> = {}
	for (const item of countable(items)) {
		const key = groupKey(item.category, item.group)
		const count = counts[key] ?? { done: 0, total: 0 }
		count.total += 1
		if (records[item.id]?.done) count.done += 1
		counts[key] = count
	}
	return counts
}

export function recentFinds(items: SeedItem[], records: Records, limit = 5): RecentFind[] {
	return countable(items)
		.flatMap((item) => {
			const record = records[item.id]
			return record?.done ? [{ item, updated_at: record.updated_at }] : []
		})
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
		.slice(0, limit)
}
