import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { type Locale, seedLabel, translator } from "../i18n"
import { hubPhase } from "../model/launch"
import { activeProfiles, deletedProfiles } from "../model/profiles"
import { emptyState, type SearchView } from "../model/search"
import { categoryIds, seedItems } from "../model/seed"
import { countable, countItems, perCategory, recentFinds } from "../model/stats"
import { parseShow } from "../model/tracker"
import { buildTracker } from "./buildTracker"
import { HINT_SEEN_KEY, writeFlag } from "./seenFlag"
import { CategoryNav } from "./tracker/CategoryNav"
import { DeleteDialog } from "./tracker/DeleteDialog"
import { DeletedDialog } from "./tracker/DeletedDialog"
import { hashItemId, hashTarget } from "./tracker/hash"
import { ImportDialog } from "./tracker/ImportDialog"
import { ItemList } from "./tracker/ItemList"
import { NameDialog } from "./tracker/NameDialog"
import { ProfileMenu } from "./tracker/ProfileMenu"
import { SearchBar } from "./tracker/SearchBar"
import { StatsRail } from "./tracker/StatsRail"
import { useLiveStatus } from "./tracker/useLiveStatus"
import { useSearch } from "./tracker/useSearch"
import { useShowParam, useTrackerState } from "./useTracker"

export const HINT_KEY = HINT_SEEN_KEY

interface Props {
	locale: Locale
}

/** Island root. `client:only`: the first render reads the URL and IndexedDB. */
export function Tracker({ locale }: Props) {
	const { t, plural } = translator(locale)
	const [tracker] = useState(() =>
		buildTracker(
			t("profile.defaultName"),
			parseShow(window.location.search, categoryIds(seedItems))
		)
	)
	const state = useTrackerState(tracker)
	useShowParam(state.selected)
	// The item a Sources back link points at stays visible on arrival, even if found (Task 4).
	const [arrival] = useState(() => hashItemId(window.location.hash) ?? undefined)
	const search = useSearch(state, arrival)
	const live = useLiveStatus()
	const searchField = useRef<HTMLInputElement>(null)
	// From launch on the hub is the dashboard, so Progress links there (dashboard spec §4).
	const [hubHref] = useState(() => (hubPhase(new Date()) === "after" ? `/${locale}/` : undefined))
	const [dialog, setDialog] = useState<"new" | "rename" | "delete" | "deleted" | null>(null)
	// Bumped per opening: the NameDialog keys on this alone, so its field resets on each opening
	// but the element is not remounted while it is closing (which would skip the focus return).
	const [opening, setOpening] = useState(0)
	// Owned here so dialogs opened from the menu can return focus to its button.
	const menuButton = useRef<HTMLButtonElement>(null)
	const fileInput = useRef<HTMLInputElement>(null)
	const current = state.profiles.find((p) => p.id === state.profileId)
	const currentName = current?.name ?? ""

	// Arriving from a Sources page back link (feedback spec §4): once, when the store is ready and
	// the checkboxes can take focus. focusVisible is passed because a focus right after a page load
	// counts as non-keyboard focus, so the ring would not draw. Chromium ignores focusVisible, so
	// the card is marked and styled while the checkbox keeps that focus. Nothing here may throw
	// into React: an uncaught error would unmount the whole Tracker, and the hash survives a reload.
	const arrived = useRef(false)
	useEffect(() => {
		if (state.status !== "ready" || arrived.current) return
		arrived.current = true
		try {
			const box = hashTarget(window.location.hash, document)
			if (!box) return
			const card = box.closest(".item")
			if (card) {
				card.setAttribute("data-arrived", "")
				box.addEventListener("blur", () => card.removeAttribute("data-arrived"), { once: true })
			}
			box.focus({ preventScroll: true, focusVisible: true })
			box.scrollIntoView({ block: "center" })
		} catch {
			// A browser without scrollIntoView options still got the focus.
		}
	}, [state.status])

	function openDialog(kind: "new" | "rename" | "delete" | "deleted") {
		setOpening((n) => n + 1)
		setDialog(kind)
	}

	function closeDialog() {
		tracker.clearError()
		setDialog(null)
	}

	function exportNow() {
		const result = tracker.exportProfile()
		if (!result) return
		const blob = new Blob([result.json], { type: "application/json" })
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement("a")
		anchor.href = url
		anchor.download = result.filename
		anchor.click()
		// Revoking synchronously can cancel the download in some browsers.
		window.setTimeout(() => URL.revokeObjectURL(url), 1000)
	}

	async function saveName(name: string) {
		if (dialog === "rename" && current) await tracker.renameProfile(current.id, name)
		else await tracker.createProfile(name)
		if (!tracker.getState().error) setDialog(null)
	}

	function deleteCurrent() {
		setDialog(null)
		if (current) tracker.deleteProfile(current.id)
	}

	async function onFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		// Cleared first so picking the same file again still fires `change`.
		event.target.value = ""
		if (file) await tracker.readImport(file)
	}

	function dismissHint() {
		writeFlag(HINT_KEY)
		tracker.dismissPersistHint()
	}

	// Says what the screen shows: the same three empty states as the list (spec §4). Only called
	// with a non-empty query, so "none" here means the list has results.
	function resultsText(view: SearchView, query: string): string {
		const kind = emptyState(view, query)
		if (kind === "no-match") return t("tracker.search.noMatch", { query: query.trim() })
		if (kind === "elsewhere") return t("tracker.search.resultsElsewhere", { count: view.elsewhere })
		if (kind === "all-found") return t("tracker.search.allFound")
		return plural("tracker.search.results", view.visible.length)
	}

	// A typing result still pending would describe the old chips.
	function selectCategories(ids: string[]) {
		live.cancel()
		tracker.selectCategories(ids)
	}

	function onQuery(query: string) {
		search.setQuery(query)
		if (query.trim() === "") live.cancel()
		else live.sayLater(resultsText(search.viewFor({ query }), query))
	}

	function clearSearch() {
		search.clearQuery()
		live.say(t("tracker.search.cleared"))
	}

	function toggleHideFound() {
		const on = !search.hideFound
		search.toggleHideFound()
		live.say(
			on
				? t("tracker.search.hideFoundOn", {
						count: search.viewFor({ hideFound: true }).hiddenCount,
					})
				: t("tracker.search.hideFoundOff")
		)
	}

	// The button disappears with the hint, so focus goes to the field rather than to <body>.
	function showAllCategories() {
		tracker.selectCategories([])
		searchField.current?.focus()
		live.say(resultsText(search.viewFor({ selected: [] }), search.query))
	}

	// A tick is announced as before, and it cancels a pending typing result (spec §5).
	async function toggleItem(id: string, done: boolean) {
		live.cancel()
		const before = tracker.getState().announcement
		await (done ? tracker.tick(id) : tracker.untick(id))
		const after = tracker.getState().announcement
		if (after && after !== before)
			live.say(
				t("tracker.announce", {
					category: seedLabel(t, "category", after.category),
					done: after.done,
					total: after.total,
				})
			)
	}

	async function confirmImport(target: "current" | "new") {
		await tracker.confirmImport(target)
		search.resnapshot()
	}

	// A restore keeps the current profile, but the list can change under a new snapshot (F16).
	async function restoreProfile(id: string) {
		await tracker.restoreProfile(id)
		search.resnapshot()
	}

	const categories = perCategory(countable(state.items), state.records).map((c) => ({
		...c,
		id: c.category,
		label: seedLabel(t, "category", c.category),
	}))
	const error = state.error ? t(`tracker.errors.${state.error}`) : ""
	const nameError = state.error === "name" ? error : ""
	const pageError = state.error === "name" ? "" : error

	const sourcesHref = `/${locale}/tracker/sources/`
	const { view } = search
	const empty = emptyState(view, search.query)

	if (state.status === "error") {
		return (
			<p className="tracker-alert" role="alert">
				{t("tracker.storageError")}
			</p>
		)
	}

	return (
		<div className="tracker" aria-busy={state.status === "loading"}>
			{state.status === "loading" && <p className="visually-hidden">{t("tracker.loading")}</p>}
			<SearchBar
				query={search.query}
				hideFound={search.hideFound}
				hiddenCount={view.hiddenCount}
				inputRef={searchField}
				onQuery={onQuery}
				onClear={clearSearch}
				onToggleHideFound={toggleHideFound}
				t={t}
			/>
			{state.persistHint && (
				<p className="hint" role="status">
					{t("tracker.persistHint")}{" "}
					<button type="button" onClick={dismissHint}>
						{t("tracker.dismiss")}
					</button>
				</p>
			)}
			<div className="tracker-layout">
				<div className="tracker-top">
					<ProfileMenu
						triggerRef={menuButton}
						profiles={activeProfiles(state.profiles)}
						current={current}
						onSwitch={tracker.switchProfile}
						onNew={() => openDialog("new")}
						onRename={() => openDialog("rename")}
						onExport={exportNow}
						onImport={() => fileInput.current?.click()}
						onDelete={() => openDialog("delete")}
						onDeleted={() => openDialog("deleted")}
						t={t}
					/>
				</div>
				<CategoryNav
					categories={categories}
					selected={state.selected}
					onSelect={selectCategories}
					allLabel={t("tracker.all")}
					navLabel={t("tracker.categories")}
					sources={{ href: sourcesHref, label: t("tracker.sources") }}
				/>
				<div className="tracker-results">
					{empty === "none" && (
						<ItemList
							items={view.visible}
							records={state.records}
							disabled={state.status !== "ready"}
							categoryLabel={(id) => seedLabel(t, "category", id)}
							groupLabel={(id) => seedLabel(t, "group", id)}
							onToggle={toggleItem}
							sourcesHref={sourcesHref}
							t={t}
						/>
					)}
					{empty === "all-found" && <p className="item-empty">{t("tracker.search.allFound")}</p>}
					{empty === "no-match" && (
						<p className="item-empty">
							{t("tracker.search.noMatch", { query: search.query.trim() })}
						</p>
					)}
					{view.elsewhere > 0 && (
						<p className="search-elsewhere">
							{plural("tracker.search.elsewhere", view.elsewhere)}{" "}
							<button type="button" className="search-elsewhere-btn" onClick={showAllCategories}>
								{t("tracker.search.showAll")}
							</button>
						</p>
					)}
				</div>
				<StatsRail
					overall={countItems(state.items, state.records)}
					categories={categories}
					recent={recentFinds(state.items, state.records)}
					hubHref={hubHref}
					t={t}
				/>
			</div>
			<p className="visually-hidden" role="status" aria-live="polite">
				{live.message}
			</p>
			<p className="tracker-alert" role="alert">
				{pageError}
			</p>
			<NameDialog
				key={opening}
				open={dialog === "new" || dialog === "rename"}
				title={
					dialog === "rename"
						? t("profile.renameTitle", { name: currentName })
						: t("profile.newTitle")
				}
				initial={dialog === "rename" ? currentName : ""}
				error={nameError}
				t={t}
				onSave={saveName}
				onCancel={closeDialog}
			/>
			<DeleteDialog
				open={dialog === "delete"}
				name={currentName}
				t={t}
				onExport={exportNow}
				onDelete={deleteCurrent}
				onCancel={closeDialog}
			/>
			<DeletedDialog
				open={dialog === "deleted"}
				profiles={deletedProfiles(state.profiles)}
				t={t}
				onRestore={restoreProfile}
				onClose={closeDialog}
			/>
			<ImportDialog
				file={state.pendingImport}
				into={currentName}
				t={t}
				onInto={() => confirmImport("current")}
				onCreate={() => confirmImport("new")}
				onCancel={tracker.cancelImport}
				returnTo={menuButton}
			/>
			<input
				ref={fileInput}
				type="file"
				accept=".json,application/json"
				className="visually-hidden"
				tabIndex={-1}
				aria-label={t("profile.import")}
				onChange={onFile}
			/>
		</div>
	)
}
