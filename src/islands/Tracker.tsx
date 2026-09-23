import { type ChangeEvent, useRef, useState } from "react"
import { fill, type Locale, t } from "../i18n"
import { activeProfiles, deletedProfiles } from "../model/profiles"
import { categoryIds, seedItems } from "../model/seed"
import { countable, countItems, perCategory, recentFinds } from "../model/stats"
import { openStore } from "../model/store"
import { createTracker, parseShow, type Tracker as TrackerModel } from "../model/tracker"
import { readFlag, writeFlag } from "./seenFlag"
import { CategoryNav } from "./tracker/CategoryNav"
import { DeleteDialog } from "./tracker/DeleteDialog"
import { DeletedDialog } from "./tracker/DeletedDialog"
import { ImportDialog } from "./tracker/ImportDialog"
import { ItemList } from "./tracker/ItemList"
import { NameDialog } from "./tracker/NameDialog"
import { ProfileMenu } from "./tracker/ProfileMenu"
import { StatsRail } from "./tracker/StatsRail"
import { useTracker } from "./useTracker"

export const HINT_KEY = "rookdex.persist-hint-seen"

interface Props {
	locale: Locale
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
		hintSeen: readFlag(HINT_KEY),
	})
}

function label(map: Record<string, string>, key: string): string {
	return map[key] ?? key
}

/** Island root. `client:only`: the first render reads the URL and IndexedDB. */
export function Tracker({ locale }: Props) {
	const s = t(locale)
	const [tracker] = useState(() => buildTracker(s.profile.defaultName))
	const state = useTracker(tracker)
	const [dialog, setDialog] = useState<"new" | "rename" | "delete" | "deleted" | null>(null)
	// Bumped per opening: the NameDialog keys on this alone, so its field resets on each opening
	// but the element is not remounted while it is closing (which would skip the focus return).
	const [opening, setOpening] = useState(0)
	// Owned here so dialogs opened from the menu can return focus to its button.
	const menuButton = useRef<HTMLButtonElement>(null)
	const fileInput = useRef<HTMLInputElement>(null)
	const current = state.profiles.find((p) => p.id === state.profileId)
	const currentName = current?.name ?? ""

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

	const categories = perCategory(countable(state.items), state.records).map((c) => ({
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
	const nameError = state.error === "name" ? error : ""
	const pageError = state.error === "name" ? "" : error

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
					strings={s.profile}
				/>
				{state.persistHint && (
					<p className="hint" role="status">
						{s.tracker.persistHint}{" "}
						<button type="button" onClick={dismissHint}>
							{s.tracker.dismiss}
						</button>
					</p>
				)}
			</div>
			<CategoryNav
				categories={categories}
				selected={state.selected}
				onSelect={tracker.selectCategories}
				allLabel={s.tracker.all}
				navLabel={s.tracker.categories}
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
			<StatsRail
				overall={countItems(state.items, state.records)}
				categories={categories}
				recent={recentFinds(state.items, state.records)}
				strings={s.tracker}
			/>
			<p className="visually-hidden" role="status" aria-live="polite">
				{announcement}
			</p>
			<p className="tracker-alert" role="alert">
				{pageError}
			</p>
			<NameDialog
				key={opening}
				open={dialog === "new" || dialog === "rename"}
				title={
					dialog === "rename"
						? fill(s.profile.renameTitle, { name: currentName })
						: s.profile.newTitle
				}
				initial={dialog === "rename" ? currentName : ""}
				error={nameError}
				strings={s.profile}
				onSave={saveName}
				onCancel={closeDialog}
			/>
			<DeleteDialog
				open={dialog === "delete"}
				name={currentName}
				strings={s.profile}
				onExport={exportNow}
				onDelete={deleteCurrent}
				onCancel={closeDialog}
			/>
			<DeletedDialog
				open={dialog === "deleted"}
				profiles={deletedProfiles(state.profiles)}
				strings={s.profile}
				onRestore={tracker.restoreProfile}
				onClose={closeDialog}
			/>
			<ImportDialog
				file={state.pendingImport}
				into={currentName}
				strings={s.profile}
				onInto={() => tracker.confirmImport("current")}
				onCreate={() => tracker.confirmImport("new")}
				onCancel={tracker.cancelImport}
				returnTo={menuButton}
			/>
			<input
				ref={fileInput}
				type="file"
				accept=".json,application/json"
				className="visually-hidden"
				tabIndex={-1}
				aria-label={s.profile.import}
				onChange={onFile}
			/>
		</div>
	)
}
