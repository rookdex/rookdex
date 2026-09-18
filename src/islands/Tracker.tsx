import { useState } from "react"
import { fill, type Locale, t } from "../i18n"
import { categoryIds, seedItems } from "../model/seed"
import { perCategory } from "../model/stats"
import { openStore } from "../model/store"
import { createTracker, parseShow, type Tracker as TrackerModel } from "../model/tracker"
import { CategoryNav } from "./tracker/CategoryNav"
import { ItemList } from "./tracker/ItemList"
import { useTracker } from "./useTracker"

export const HINT_KEY = "rookdex.persist-hint-seen"

interface Props {
	locale: Locale
	rumoursHref: string
}

function readHintSeen(): boolean {
	try {
		return localStorage.getItem(HINT_KEY) === "1"
	} catch {
		return false
	}
}

function buildTracker(defaultProfileName: string): TrackerModel {
	return createTracker({
		openStore: () => openStore(indexedDB),
		items: seedItems,
		defaultProfileName,
		selected: parseShow(window.location.search, categoryIds(seedItems)),
		persist:
			typeof navigator.storage?.persist === "function"
				? () => navigator.storage.persist()
				: undefined,
		installed: window.matchMedia("(display-mode: standalone)").matches,
		hintSeen: readHintSeen(),
	})
}

function label(map: Record<string, string>, key: string): string {
	return map[key] ?? key
}

/** Island root. `client:only`: the first render reads the URL and IndexedDB. */
export function Tracker({ locale, rumoursHref }: Props) {
	const s = t(locale)
	const [tracker] = useState(() => buildTracker(s.profile.defaultName))
	const state = useTracker(tracker)

	const categories = perCategory(state.items, state.records).map((c) => ({
		...c,
		id: c.category,
		label: label(s.category, c.category),
	}))
	const visible =
		state.selected.length === 0
			? state.items
			: state.items.filter((item) => state.selected.includes(item.category))
	const announcement = state.announcement
		? fill(s.tracker.announce, {
				category: label(s.category, state.announcement.category),
				done: state.announcement.done,
				total: state.announcement.total,
			})
		: ""
	const error = state.error ? s.tracker.errors[state.error] : ""

	if (state.status === "error") {
		return (
			<p className="tracker-alert" role="alert">
				{s.tracker.storageError}
			</p>
		)
	}

	return (
		<div className="tracker" aria-busy={state.status === "loading"}>
			{state.status === "loading" && <p className="visually-hidden">{s.tracker.loading}</p>}
			{/* Task 12 adds the profile menu here */}
			<CategoryNav
				categories={categories}
				selected={state.selected}
				onSelect={tracker.selectCategories}
				allLabel={s.tracker.all}
				navLabel={s.tracker.categories}
				rumoursHref={rumoursHref}
				rumoursLabel={s.tracker.rumours}
			/>
			<ItemList
				items={visible}
				records={state.records}
				disabled={state.status !== "ready"}
				categoryLabel={(id) => label(s.category, id)}
				groupLabel={(id) => label(s.group, id)}
				onToggle={(id, done) => (done ? tracker.tick(id) : tracker.untick(id))}
				strings={s.tracker}
			/>
			{/* Task 11 adds the stats rail here */}
			<p className="visually-hidden" role="status" aria-live="polite">
				{announcement}
			</p>
			<p className="tracker-alert" role="alert">
				{error}
			</p>
			{/* Task 12 and 13 add the dialogs and the file input here */}
		</div>
	)
}
