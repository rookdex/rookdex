// Tracker search (tracker search spec §3.1). Pure: no React, no DOM. The functions take plain
// text fields, so a later site-wide search can reuse normalize and matches.
import type { SeedItem } from "./schema"
import { groupKey, type Records } from "./stats"

/** Group id to search words in both languages (searchTerms.ts). */
export type SearchTerms = Readonly<Record<string, readonly string[]>>

export interface SearchInput {
	items: SeedItem[]
	/** Category tile ids; empty means All. */
	selected: string[]
	/** Pressed group chips as `groupKey`s. A category with none pressed shows every group. */
	groups: string[]
	query: string
	/** The snapshot of found ids; empty while Hide found is off. */
	hidden: ReadonlySet<string>
	terms: SearchTerms
}

export interface SearchView {
	/** Inside the pressed tiles and chips, matching, not hidden, in seed order. */
	visible: SeedItem[]
	/** Matching and not hidden outside the filters; 0 with no query or with All. */
	elsewhere: number
	/** Matching and hidden inside the filters. */
	hiddenCount: number
}

export type EmptyState = "none" | "elsewhere" | "all-found" | "no-match"

/** NFD with combining marks removed, lowercase, trimmed, inner whitespace collapsed. ø and æ
 *  are letters, not accents, so they stay. */
export function normalize(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")
}

function words(query: string): string[] {
	const text = normalize(query)
	return text === "" ? [] : text.split(" ")
}

// includes(), never a RegExp built from the query, so "(" or "*" is plain text.
function hasAll(queryWords: string[], fields: string[]): boolean {
	const normalized = fields.map(normalize)
	return queryWords.every((word) => normalized.some((field) => field.includes(word)))
}

/** Every word of the query appears in at least one field. An empty query matches everything. */
export function matches(query: string, fields: string[]): boolean {
	return hasAll(words(query), fields)
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
	const visible: SeedItem[] = []
	let elsewhere = 0
	let hiddenCount = 0
	for (const item of items) {
		// The list never shows a retired item, so no count may include one.
		if (item.retired) continue
		if (queryWords.length > 0 && !hasAll(queryWords, [item.name, ...(terms[item.group] ?? [])]))
			continue
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
