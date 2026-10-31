import { useState } from "react"
import { foundIds, type SearchView, searchView } from "../../model/search"
import { SEARCH_TERMS } from "../../model/searchTerms"
import type { TrackerState } from "../../model/tracker"
import { clearFlag, HIDE_FOUND_KEY, readFlag, writeFlag } from "../seenFlag"

export type SearchSource = Pick<
	TrackerState,
	"status" | "profileId" | "items" | "records" | "selected"
>

export interface SearchChange {
	query?: string
	selected?: string[]
	hideFound?: boolean
}

export interface Search {
	query: string
	hideFound: boolean
	view: SearchView
	setQuery(query: string): void
	clearQuery(): void
	toggleHideFound(): void
	/** A new snapshot with nothing else changed: an import was confirmed into this profile. */
	resnapshot(): void
	/** The view `change` would give, with the snapshot that change takes. Changes nothing. */
	viewFor(change: SearchChange): SearchView
}

const NONE: ReadonlySet<string> = new Set()

/**
 * View state for tracker search (tracker search spec §3.4). The query is never stored. Hide found
 * hides what was found at the last snapshot, so an item ticked now stays where the finger is.
 * `arrival` is the seed id a Sources back link points at (`#item-<id>`): the first snapshot spares
 * it so the arrival effect can focus it.
 */
export function useSearch(source: SearchSource, arrival?: string): Search {
	const [query, setQuery] = useState("")
	const [hideFound, setHideFound] = useState(() => readFlag(HIDE_FOUND_KEY))
	const [imports, setImports] = useState(0)
	const ready = source.status === "ready"

	function snapshot(on: boolean, spare?: string): ReadonlySet<string> {
		if (!on || !ready) return NONE
		const ids = foundIds(source.records)
		if (spare) ids.delete(spare)
		return ids
	}

	// Every snapshot trigger is in this key and the records are not, so a tick alone keeps the
	// snapshot it had. The first one waits for ready: ticks load after mount.
	const key = JSON.stringify([ready, source.profileId, source.selected, query, hideFound, imports])
	const [snap, setSnap] = useState(() => ({ key, ready, hidden: snapshot(hideFound, arrival) }))
	let hidden = snap.hidden
	if (snap.key !== key) {
		// The item a Sources back link points at survives the snapshot taken as the tracker becomes
		// ready, so the arrival can focus it. Any later change hides it as usual.
		hidden = snapshot(hideFound, snap.ready ? undefined : arrival)
		// Set while rendering, React's pattern for state that follows props: no effect, so no frame
		// ever shows the old snapshot with the new query.
		setSnap({ key, ready, hidden })
	}

	function viewOf(selected: string[], q: string, hide: ReadonlySet<string>): SearchView {
		return searchView({
			items: source.items,
			selected,
			query: q,
			hidden: hide,
			terms: SEARCH_TERMS,
		})
	}

	return {
		query,
		hideFound,
		view: viewOf(source.selected, query, hidden),
		setQuery,
		clearQuery: () => setQuery(""),
		toggleHideFound() {
			const next = !hideFound
			setHideFound(next)
			if (next) writeFlag(HIDE_FOUND_KEY)
			else clearFlag(HIDE_FOUND_KEY)
		},
		resnapshot: () => setImports((n) => n + 1),
		viewFor: (change) =>
			viewOf(
				change.selected ?? source.selected,
				change.query ?? query,
				snapshot(change.hideFound ?? hideFound)
			),
	}
}
