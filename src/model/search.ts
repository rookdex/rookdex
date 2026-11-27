// Tracker search (tracker search spec §3.1). Pure: no React, no DOM. The functions take plain
// text fields, so a later site-wide search can reuse normalize and matches.
import { normalize } from "./normalize"
import { groupKey, type Records } from "./stats"
import type { TrackItem } from "./trackItems"

export { normalize }

/** Group id, or item id, to search words in both languages (searchTerms.ts). */
export type SearchTerms = Readonly<Record<string, readonly string[]>>

/** The text a query searches for one item: its name, its aliases, its group's words and its own
 *  words. One list for the tracker and the Dex, so both answer a query the same way. */
export function searchFields(
	item: TrackItem,
	terms: SearchTerms,
	itemTerms: SearchTerms
): string[] {
	return [
		item.name,
		...(item.aliases ?? []),
		...(terms[item.group] ?? []),
		...(itemTerms[item.id] ?? []),
	]
}

export interface SearchInput {
	items: TrackItem[]
	/** Category tile ids; empty means All. */
	selected: string[]
	/** Pressed group chips as `groupKey`s. A category with none pressed shows every group. */
	groups: string[]
	query: string
	/** The snapshot of found ids; empty while Hide found is off. */
	hidden: ReadonlySet<string>
	terms: SearchTerms
	/** Words true of one item only, keyed by item id (ITEM_TERMS). */
	itemTerms: SearchTerms
}

export interface SearchView {
	/** Inside the pressed tiles and chips, matching, not hidden, in seed order. */
	visible: TrackItem[]
	/** Matching and not hidden outside the filters; 0 with no query or with All. */
	elsewhere: number
	/** Matching and hidden inside the filters. */
	hiddenCount: number
}

export type EmptyState = "none" | "elsewhere" | "all-found" | "no-match"

/** How long typing must pause before its result is announced (tracker search spec §5). Shared by
 *  the tracker and the Dex search, so it lives here and not in a React module. */
export const SETTLE_MS = 500

function words(query: string): string[] {
	const text = normalize(query)
	return text === "" ? [] : text.split(" ")
}

// includes(), never a RegExp built from the query, so "(" or "*" is plain text.
function hasAllNormalized(queryWords: string[], normalized: string[]): boolean {
	return queryWords.every((word) => normalized.some((field) => field.includes(word)))
}

function hasAll(queryWords: string[], fields: string[]): boolean {
	return hasAllNormalized(queryWords, fields.map(normalize))
}

/** Every word of the query appears in at least one field. An empty query matches everything. */
export function matches(query: string, fields: string[]): boolean {
	return hasAll(words(query), fields)
}

/** As `matches`, for fields that are already normalized, such as the Dex rows' search text, which
 *  the server normalizes once. Skips normalizing every field on every keystroke. */
export function matchesNormalized(query: string, fields: string[]): boolean {
	return hasAllNormalized(words(query), fields)
}

export function foundIds(records: Records): Set<string> {
	return new Set(
		Object.values(records)
			.filter((record) => record.done)
			.map((record) => record.item_id)
	)
}

export function searchView({
	items,
	selected,
	groups,
	query,
	hidden,
	terms,
	itemTerms,
}: SearchInput): SearchView {
	const queryWords = words(query)
	const all = selected.length === 0
	const pressed = new Set(groups)
	// The categories a chip narrows: there, only the pressed groups are inside (spec §14.1).
	const narrowed = new Set(
		items
			.filter((item) => pressed.has(groupKey(item.category, item.group)))
			.map((item) => item.category)
	)
	const visible: TrackItem[] = []
	let elsewhere = 0
	let hiddenCount = 0
	for (const item of items) {
		// The list never shows a retired item, so no count may include one.
		if (item.retired) continue
		if (queryWords.length > 0 && !hasAll(queryWords, searchFields(item, terms, itemTerms))) continue
		// A category under All is never narrowed by chips.
		const inside =
			all ||
			(selected.includes(item.category) &&
				(!narrowed.has(item.category) || pressed.has(groupKey(item.category, item.group))))
		if (!inside) {
			if (queryWords.length > 0 && !hidden.has(item.id)) elsewhere++
		} else if (hidden.has(item.id)) hiddenCount++
		else visible.push(item)
	}
	return { visible, elsewhere, hiddenCount }
}

/** The message that replaces the list (spec §4), or "none" when the list renders. */
export function emptyState(view: SearchView, query: string): EmptyState {
	if (view.visible.length > 0) return "none"
	if (view.elsewhere > 0) return "elsewhere"
	if (view.hiddenCount > 0) return "all-found"
	return normalize(query) === "" ? "none" : "no-match"
}
