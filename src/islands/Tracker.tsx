import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { type Locale, seedLabel, translator } from "../i18n"
import { hubPhase } from "../model/launch"
import { activeProfiles, deletedProfiles } from "../model/profiles"
import { type EmptyState, emptyState, type SearchView } from "../model/search"
import { categoryIds, seedItems } from "../model/seed"
import { countable, countItems, perCategory, perGroup, recentFinds } from "../model/stats"
import { parseShow } from "../model/tracker"
import { buildTracker } from "./buildTracker"
import { HINT_SEEN_KEY, writeFlag } from "./seenFlag"
import { CategoryNav } from "./tracker/CategoryNav"
import { DeleteDialog } from "./tracker/DeleteDialog"
import { DeletedDialog } from "./tracker/DeletedDialog"
import { hashItemId, hashTarget } from "./tracker/hash"
import { ImportDialog } from "./tracker/ImportDialog"
import { ItemList } from "./tracker/ItemList"
import { jumpable, LastFound } from "./tracker/LastFound"
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

// The phone keyboard closes after focus leaves the field, and the page height or the browser's
// pan changes under it as it goes. One scroll at Enter left the list mid-screen on my phone, so
// the scroll repeats on each viewport resize until the keyboard has settled, or until the user
// touches or scrolls the page themselves.
const KEYBOARD_SETTLE_MS = 1000
// Not keydown: the Enter that started this is still bubbling up to window.
const USER_SCROLL = ["touchstart", "wheel"] as const

function scrollToStart(element: HTMLElement) {
	const scroll = () => element.scrollIntoView({ block: "start" })
	scroll()
	const viewport = window.visualViewport
	if (!viewport) return
	const stop = () => {
		clearTimeout(timer)
		viewport.removeEventListener("resize", scroll)
		for (const type of USER_SCROLL) window.removeEventListener(type, stop)
	}
	const timer = setTimeout(stop, KEYBOARD_SETTLE_MS)
	viewport.addEventListener("resize", scroll)
	for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true })
}

/** Island root. `client:only`: the first render reads the URL and IndexedDB. */
// Draws the card's ring where the browser skips :focus-visible (after a click or a page load, in
// Chromium); the mark goes when the checkbox loses focus.
function markCard(box: HTMLElement) {
	const card = box.closest(".item")
	if (!card) return
	card.setAttribute("data-arrived", "")
	box.addEventListener("blur", () => card.removeAttribute("data-arrived"), { once: true })
}

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
	const results = useRef<HTMLDivElement>(null)
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
			markCard(box)
			box.focus({ preventScroll: true, focusVisible: true })
			box.scrollIntoView({ block: "center" })
		} catch {
			// A browser without scrollIntoView options still got the focus.
		}
	}, [state.status])

	// The Last found row (spec §5.3). The card scrolls, not the checkbox: the checkbox sits 22 px
	// below the card's top, so a focus scroll would tuck the card under the sticky search row.
	// scroll-padding-top still clears the row for scrollIntoView. Instant: a focus move, not motion.
	function jumpTo(id: string) {
		const box = document.getElementById(`item-${id}`)
		if (!(box instanceof HTMLInputElement)) return
		markCard(box)
		box.focus({ preventScroll: true, focusVisible: true })
		box.closest(".item")?.scrollIntoView({ block: "start", behavior: "instant" })
	}

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

	// The text that stands in for the list when it is empty (spec §4). "elsewhere" has none: the
	// list area shows only the other-categories line then.
	function emptyText(kind: EmptyState, query: string): string | undefined {
		if (kind === "no-match") return t("tracker.search.noMatch", { query: query.trim() })
		if (kind === "all-found") return t("tracker.search.allFound")
		return undefined
	}

	// Says what the screen shows: the same three empty states as the list (spec §4). Only called
	// with a non-empty query, so "none" here means the list has results.
	function resultsText(view: SearchView, query: string): string {
		const kind = emptyState(view, query)
		if (kind === "elsewhere") return t("tracker.search.resultsElsewhere", { count: view.elsewhere })
		return emptyText(kind, query) ?? plural("tracker.search.results", view.visible.length)
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

	// Enter or the phone's Search key: the list already matches, so say it now and move focus
	// there. Leaving the field closes the phone keyboard, and the results are where the user
	// goes next, so a keyboard user's place moves forward instead of back to <body>.
	function finishSearch() {
		if (search.query.trim() !== "") live.say(resultsText(search.view, search.query))
		const list = results.current
		if (!list) return
		// The browser's own focus scroll centres a long list and hides its first cards under the
		// sticky row. Scroll its start into view only when it is off screen, so a desktop page
		// with the list already showing stays put.
		list.focus({ preventScroll: true })
		const top = list.getBoundingClientRect().top
		const rowBottom = searchField.current?.closest(".search-row")?.getBoundingClientRect().bottom
		if (top < Math.max(rowBottom ?? 0, 0) || top >= window.innerHeight) scrollToStart(list)
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
	const overall = countItems(state.items, state.records)
	const categoryCounts = Object.fromEntries(categories.map((c) => [c.id, c]))
	const recent = recentFinds(state.items, state.records)
	const error = state.error ? t(`tracker.errors.${state.error}`) : ""
	const nameError = state.error === "name" ? error : ""
	const pageError = state.error === "name" ? "" : error

	const sourcesHref = `/${locale}/tracker/sources/`
	const { view } = search
	const empty = emptyState(view, search.query)
	const emptyMessage = emptyText(empty, search.query)

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
				onSearch={finishSearch}
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
						slotId="tracker-profile"
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
					overall={overall}
					selected={state.selected}
					onSelect={selectCategories}
					allLabel={t("tracker.all")}
					navLabel={t("tracker.categories")}
					sources={{ href: sourcesHref, label: t("tracker.sources") }}
					t={t}
				/>
				<LastFound
					find={recent[0]}
					canJump={jumpable(recent[0], view.visible, state.status === "ready")}
					onJump={jumpTo}
					locale={locale}
					t={t}
				/>
				<div className="tracker-results" ref={results} tabIndex={-1}>
					{empty === "none" && (
						<ItemList
							items={view.visible}
							records={state.records}
							disabled={state.status !== "ready"}
							categoryLabel={(id) => seedLabel(t, "category", id)}
							groupLabel={(id) => seedLabel(t, "group", id)}
							categoryCounts={categoryCounts}
							groupCounts={perGroup(state.items, state.records)}
							onToggle={toggleItem}
							sourcesHref={sourcesHref}
							t={t}
						/>
					)}
					{emptyMessage && <p className="item-empty">{emptyMessage}</p>}
					{view.elsewhere > 0 && (
						<p className="search-elsewhere">
							{plural("tracker.search.elsewhere", view.elsewhere)}{" "}
							<button type="button" className="search-elsewhere-btn" onClick={showAllCategories}>
								{t("tracker.search.showAll")}
							</button>
						</p>
					)}
				</div>
				<StatsRail overall={overall} recent={recent} hubHref={hubHref} locale={locale} t={t} />
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
