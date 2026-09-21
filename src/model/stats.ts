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

export function recentFinds(items: SeedItem[], records: Records, limit = 5): RecentFind[] {
	return countable(items)
		.flatMap((item) => {
			const record = records[item.id]
			return record?.done ? [{ item, updated_at: record.updated_at }] : []
		})
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
		.slice(0, limit)
}
