import { useMemo, useState } from "react"
import { type Locale, seedLabel, translator } from "../../i18n"
import { closestCategory, foundToday, whatsNext } from "../../model/dashboard"
import { dayFromKey } from "../../model/days"
import { activeProfiles } from "../../model/profiles"
import { type Count, countable, countItems, perCategory, recentFinds } from "../../model/stats"
import { buildTracker } from "../buildTracker"
import { ProfileMenu } from "../tracker/ProfileMenu"
import { Bar } from "../tracker/StatsRail"
import { useTrackerState } from "../useTracker"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { NEXT_LIMIT, RECENT_LIMIT } from "./limits"
import { StatPair } from "./StatPair"
import { StatStrip } from "./StatStrip"

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

	// One pass per change of data or day (spec §6.1 step 3).
	const view = useMemo(() => {
		const closest = closestCategory(items, records)
		return {
			overall: countItems(items, records),
			categories: perCategory(countable(items), records),
			closest,
			next: closest ? whatsNext(items, records, closest, NEXT_LIMIT) : [],
			foundToday: foundToday(items, records, dayFromKey(today)),
			recent: recentFinds(items, records, RECENT_LIMIT),
		}
	}, [items, records, today])

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

	async function switchTo(id: string) {
		await tracker.switchProfile(id)
		const after = tracker.getState()
		const name = after.profiles.find((p) => p.id === id)?.name
		if (after.profileId === id && name) announce(t("hub.switched", { name }))
	}

	return (
		<div className="dashboard">
			<div className="dash-top">
				<ProfileMenu
					profiles={activeProfiles(state.profiles)}
					current={current}
					onSwitch={switchTo}
					manageHref={trackerHref}
					t={t}
				/>
			</div>
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
			<section className="dash-recent" aria-labelledby="dash-recent-heading">
				<h2 id="dash-recent-heading">{t("tracker.recent")}</h2>
				{view.recent.length === 0 ? (
					<p className="stats-empty">{t("tracker.noRecent")}</p>
				) : (
					<ul className="recent" aria-labelledby="dash-recent-heading">
						{view.recent.map((find) => (
							<li key={find.item.id}>{find.item.name}</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}
