import { useEffect, useState } from "react"
import type { Key, Translate } from "../../i18n"
import { isStandalone } from "../../scripts/standalone"
import {
	CHECKLIST_IDS,
	CHECKLIST_KEY,
	type ChecklistId,
	readChecklist,
	writeChecklistItem,
} from "../seenFlag"
import { Chev } from "./Chev"

/** Where a row's Open link goes, and the page name its hidden text reads out. */
export interface ChecklistLink {
	href: string
	page: string
}

interface Props {
	links: Record<ChecklistId, ChecklistLink>
	t: Translate
}

// The stored ids keep the spec's kebab-case; each maps to its two copy keys.
const COPY: Record<ChecklistId, { item: Key; sub: Key }> = {
	edition: { item: "hub.check.edition", sub: "hub.check.editionSub" },
	preload: { item: "hub.check.preload", sub: "hub.check.preloadSub" },
	space: { item: "hub.check.space", sub: "hub.check.spaceSub" },
	"first-hour": { item: "hub.check.firstHour", sub: "hub.check.firstHourSub" },
	install: { item: "hub.check.install", sub: "hub.check.installSub" },
}

/**
 * The tickable list before launch (desktop dashboard spec §4.8, §5). The server renders every box
 * unticked; saved ticks arrive after hydration. Ticked and unticked rows share one height, so that
 * shifts nothing. The checkbox's own state is the audible result, so the count is plain text.
 */
export function PrelaunchChecklist({ links, t }: Props) {
	const [ticked, setTicked] = useState<ChecklistId[]>([])
	const [installed, setInstalled] = useState(false)
	const [blocked, setBlocked] = useState(false)
	useEffect(() => {
		const load = () => {
			const saved = readChecklist()
			setBlocked(saved === null)
			if (saved) setTicked(saved)
		}
		load()
		setInstalled(isStandalone(window))
		// Another tab ticked something, or Delete all ran in Settings: show what is stored now.
		const onStorage = (event: StorageEvent) => {
			if (event.key === CHECKLIST_KEY || event.key === null) load()
		}
		window.addEventListener("storage", onStorage)
		return () => window.removeEventListener("storage", onStorage)
	}, [])

	// Outside the state updater, which React may run twice: the write is a side effect.
	const toggle = (id: ChecklistId, on: boolean) => {
		const { list, saved } = writeChecklistItem(id, on, ticked)
		setTicked(list)
		setBlocked(!saved)
	}

	const isDone = (id: ChecklistId) => (id === "install" && installed) || ticked.includes(id)
	const done = CHECKLIST_IDS.filter(isDone).length

	return (
		<section className="tile checklist" aria-labelledby="checklist-heading">
			<div className="tile-head">
				<h2 id="checklist-heading">{t("hub.beforeLaunch")}</h2>
				<p className="checklist-count">
					{t("hub.checklistDone", { done, total: CHECKLIST_IDS.length })}
				</p>
			</div>
			<ul className="check-list" aria-labelledby="checklist-heading">
				{CHECKLIST_IDS.map((id) => {
					const locked = id === "install" && installed
					return (
						<li key={id} className="check-row">
							<label className="check-label">
								<input
									type="checkbox"
									checked={isDone(id)}
									disabled={locked}
									onChange={(event) => toggle(id, event.target.checked)}
								/>
								<span className="check-text">
									<span className="check-item">{t(COPY[id].item)}</span>
									<small>{locked ? t("hub.installed") : t(COPY[id].sub)}</small>
								</span>
							</label>
							<a className="check-open" href={links[id].href}>
								{t("hub.open")}
								<span className="visually-hidden">
									{t("hub.openPage", { page: links[id].page })}
								</span>
								<Chev />
							</a>
						</li>
					)
				})}
			</ul>
			<p className="checklist-note">
				{t(blocked ? "hub.checklistNoStorage" : "hub.checklistNote")}
			</p>
		</section>
	)
}
