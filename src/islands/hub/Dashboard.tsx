import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type Locale, seedLabel, translator } from "../../i18n"
import {
	categoryRows,
	closestCategory,
	findsByDay,
	foundToday,
	nextGroups,
} from "../../model/dashboard"
import { dayFromKey } from "../../model/days"
import { activeProfiles } from "../../model/profiles"
import { type Count, countable, countItems, perCategory, recentFinds } from "../../model/stats"
import { buildTracker } from "../buildTracker"
import { ProfileMenu } from "../tracker/ProfileMenu"
import { Bar } from "../tracker/StatsRail"
import { useTrackerState } from "../useTracker"
import { CategoryBars } from "./CategoryBars"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { Hero } from "./Hero"
import { FINDS_DAYS, NEXT_LIMIT, RECENT_LIMIT } from "./limits"
import { RecentFinds } from "./RecentFinds"
import { StatPair } from "./StatPair"
import { daysSinceText, StatStrip } from "./StatStrip"
import { UndoToast } from "./UndoToast"
import { nextBoxId, WhatsNext } from "./WhatsNext"

export interface DashboardProps {
	locale: Locale
	/** The device's calendar day, `YYYY-MM-DD`, from the hub's clock. Rolls over at local midnight. */
	today: string
	daysSince: number
	guideHref: string
	trackerHref: string
	/** Writes one line to the hub's status region. */
	announce: (message: string) => void
}

/**
 * The hub after launch (dashboard spec §4). Loaded only in the after phase, so visitors before
 * launch never download the tracker model. Builds its own tracker over the shared IndexedDB.
 */
export function Dashboard({
	locale,
	today,
	daysSince,
	guideHref,
	trackerHref,
	announce,
}: DashboardProps) {
	const { t, plural } = translator(locale)
	const [tracker] = useState(() => buildTracker(t("profile.defaultName")))
	const state = useTrackerState(tracker)
	const { items, records } = state
	const zone = useRef<HTMLElement>(null)
	const nextHeading = useRef<HTMLHeadingElement>(null)
	// One toast per tick; `key` remounts it so every toast starts with a fresh timer. It carries
	// the profile it was ticked on, so Undo can never act on another profile (spec §6.1 step 6).
	const [toast, setToast] = useState<{
		key: number
		id: string
		name: string
		profileId: string
	} | null>(null)
	const [focusId, setFocusId] = useState<string | null>(null)
	const closeToast = useCallback(() => setToast(null), [])
	const focusInNext = useCallback(() => {
		const boxes = zone.current?.querySelectorAll<HTMLInputElement>(".next-list input")
		const last = boxes?.[boxes.length - 1]
		if (last) last.focus()
		else nextHeading.current?.focus()
	}, [])

	// After Undo: the restored item's checkbox (spec §9), else the heading. Never body.
	useEffect(() => {
		if (!focusId) return
		setFocusId(null)
		const restored = document.getElementById(nextBoxId(focusId))
		if (restored) restored.focus()
		else nextHeading.current?.focus()
	}, [focusId])

	// One pass per change of data or day (spec §6.1 step 3).
	const view = useMemo(() => {
		const closest = closestCategory(items, records)
		return {
			overall: countItems(items, records),
			categories: perCategory(countable(items), records),
			closest,
			next: nextGroups(items, records, NEXT_LIMIT),
			foundToday: foundToday(items, records, dayFromKey(today)),
			recent: recentFinds(items, records, RECENT_LIMIT),
			rows: categoryRows(items, records),
			days: findsByDay(items, records, today, FINDS_DAYS),
		}
	}, [items, records, today])

	// Titled groups for What's next. Stable between renders, so a row sliding in is detected once.
	const groups = useMemo(() => {
		const { t: translate } = translator(locale)
		return view.next.map((g, index) => ({
			category: g.category,
			items: g.items,
			title: translate(index === 0 ? "hub.nextGroup" : "hub.nextGroupThen", {
				category: seedLabel(translate, "category", g.category),
				count: g.left,
			}),
		}))
	}, [view.next, locale])

	if (state.status === "error") {
		return (
			<p className="tracker-alert" role="alert">
				{t("tracker.storageError")}
			</p>
		)
	}
	if (state.status === "loading") {
		return <DashboardSkeleton categoryCount={view.categories.length} t={t} />
	}

	const current = state.profiles.find((p) => p.id === state.profileId)
	const label = (id: string) => seedLabel(t, "category", id)
	const countText = (count: Count) => t("tracker.count", { done: count.done, total: count.total })
	const closest = view.categories.find((c) => c.category === view.closest)
	const error = state.error ? t(`tracker.errors.${state.error}`) : ""
	const nameOf = (id: string) => items.find((item) => item.id === id)?.name ?? id

	async function tick(id: string): Promise<boolean> {
		const profileId = tracker.getState().profileId
		await tracker.tick(id)
		const landed = tracker.getState()
		if (landed.error) {
			setToast(null)
			return false
		}
		// A profile switch landed while this tick was saving. The model filed the tick under the
		// old profile, so there is nothing on screen to undo or announce.
		if (landed.profileId !== profileId) return false
		const name = nameOf(id)
		setToast((old) => ({ key: (old?.key ?? 0) + 1, id, name, profileId }))
		announce(t("hub.markedFound", { item: name }))
		return true
	}

	async function undo() {
		if (!toast) return
		if (toast.profileId !== tracker.getState().profileId) {
			closeToast()
			return
		}
		const { id, name } = toast
		await tracker.untick(id)
		// A failed Undo keeps the toast open with the error, and the item stays ticked (spec §7).
		if (tracker.getState().error) return
		setToast(null)
		announce(t("hub.undone", { item: name }))
		setFocusId(id)
	}

	async function switchTo(id: string) {
		closeToast()
		await tracker.switchProfile(id)
		closeToast()
		const after = tracker.getState()
		const name = after.profiles.find((p) => p.id === id)?.name
		if (after.profileId === id && name) announce(t("hub.switched", { name }))
	}

	return (
		<div className="dashboard">
			<div className="dash-top">
				<span className="dash-day">{daysSinceText(t, daysSince)}</span>
				<ProfileMenu
					profiles={activeProfiles(state.profiles)}
					current={current}
					onSwitch={switchTo}
					manageHref={trackerHref}
					t={t}
				/>
			</div>
			<Hero
				locale={locale}
				overall={view.overall}
				foundToday={view.foundToday}
				closestLabel={closest && view.overall.done > 0 ? label(closest.category) : undefined}
				rows={view.rows}
				t={t}
			/>
			<StatPair
				locale={locale}
				overall={view.overall}
				closest={closest ? { ...closest, label: label(closest.category) } : undefined}
				t={t}
			/>
			<StatStrip
				newcomer={view.overall.done === 0}
				foundToday={view.foundToday}
				daysSince={daysSince}
				guideHref={guideHref}
				t={t}
				plural={plural}
			/>
			{/* An open toast shows its own error, so the page alert stays empty meanwhile. */}
			<p className="tracker-alert" role="alert">
				{toast ? "" : error}
			</p>
			<WhatsNext
				groups={groups}
				disabled={state.error === "closed"}
				onTick={tick}
				t={t}
				zoneRef={zone}
				headingRef={nextHeading}
			>
				{toast && toast.profileId === state.profileId && (
					<UndoToast
						key={toast.key}
						item={toast}
						error={error}
						onUndo={undo}
						onClose={closeToast}
						zoneRef={zone}
						onEscapeFocus={focusInNext}
						t={t}
					/>
				)}
			</WhatsNext>
			<section className="dash-progress" aria-labelledby="dash-progress-heading">
				<h2 id="dash-progress-heading">{t("tracker.progress")}</h2>
				{view.categories.map((c) => (
					<Bar
						key={c.category}
						id={`dash-progress-${c.category}`}
						label={label(c.category)}
						count={c}
						countText={countText(c)}
					/>
				))}
			</section>
			<CategoryBars
				rows={view.rows}
				phase="after"
				closest={view.overall.done > 0 ? view.closest : undefined}
				trackerHref={trackerHref}
				t={t}
			/>
			<RecentFinds recent={view.recent} days={view.days} today={today} locale={locale} t={t} />
		</div>
	)
}
