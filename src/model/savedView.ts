// The tracker view saved for the session. No imports, so the Settings page's delete script can
// name it through seenFlag without pulling the seed or React into its bundle.

/** The tracker search field's limit, and the cap on a saved query. */
export const MAX_QUERY = 100

/**
 * What the tracker saves for the session (sessionStorage), so leaving for the Dex and coming back
 * keeps it: the pressed tiles and chips as `viewParams`, the search text and the scroll position.
 */
export interface SavedView {
	params: string
	query: string
	scroll: number
}

/** The saved view, or null when it is missing or malformed. The query is capped like the field. */
export function parseSavedView(raw: string | null): SavedView | null {
	if (raw === null) return null
	let value: unknown
	try {
		value = JSON.parse(raw)
	} catch {
		return null
	}
	if (typeof value !== "object" || value === null) return null
	const { params, query, scroll } = value as Record<string, unknown>
	if (typeof params !== "string" || typeof query !== "string") return null
	if (typeof scroll !== "number" || !Number.isFinite(scroll)) return null
	return { params, query: query.slice(0, MAX_QUERY), scroll: Math.max(0, Math.round(scroll)) }
}

export interface OpeningView {
	/** The search the tiles and chips are parsed from. */
	search: string
	query: string
	/** Where to scroll once the list is ready, or null to leave the page where it is. */
	scroll: number | null
}

/**
 * What the tracker opens with. A bare tracker URL (the nav tab) gets the whole saved view. A URL
 * naming the same tiles and chips as the saved view (a reload, or Back) keeps the saved search and
 * scroll too. A link that names other tiles or chips, or an item hash from a Sources back link,
 * starts fresh. Whatever comes back still goes through parseShow and parseGroups, so the saved
 * params are never echoed raw.
 */
export function openingView(
	location: { search: string; hash: string },
	saved: SavedView | null
): OpeningView {
	const fresh = { search: location.search, query: "", scroll: null }
	if (location.hash !== "" || !saved) return fresh
	const url = new URLSearchParams(location.search)
	if (!url.has("show") && !url.has("group")) {
		return { search: saved.params, query: saved.query, scroll: saved.scroll }
	}
	const kept = new URLSearchParams(saved.params)
	const same = url.get("show") === kept.get("show") && url.get("group") === kept.get("group")
	return same ? { search: location.search, query: saved.query, scroll: saved.scroll } : fresh
}
