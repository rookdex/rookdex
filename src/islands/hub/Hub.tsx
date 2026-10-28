import { type ComponentType, useCallback, useEffect, useRef, useState } from "react"
import { type Locale, translator } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { dateLocale, localDayKey } from "../../model/days"
import { LAUNCH_AT } from "../../model/launch"
import type { ChecklistId } from "../seenFlag"
import { CategoryBars } from "./CategoryBars"
import { CountdownView } from "./CountdownView"
import type { DashboardProps } from "./Dashboard"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { HeroArt, SegmentBar } from "./Hero"
import { Latest, type LatestItem } from "./Latest"
import { LinkTiles } from "./LinkTiles"
import { type NewsItem, NewsTile } from "./NewsTile"
import { type ChecklistLink, PrelaunchChecklist } from "./PrelaunchChecklist"
import { daysSinceText } from "./StatStrip"
import { useHubPhase } from "./useHubPhase"

type DashboardModule = { Dashboard: ComponentType<DashboardProps> }

/** The pause between clearing the status region and writing to it, so every line is heard. */
export const ANNOUNCE_GAP_MS = 100

// A dynamic import, so visitors before launch never download the tracker model (spec §3, §10).
const loadDefault = (): Promise<DashboardModule> => import("./Dashboard")

interface Props {
	locale: Locale
	/** Build time as an ISO timestamp, or ROOKDEX_NOW; see useCountdown. */
	initialNow: string
	guideHref: string
	trackerHref: string
	newsHref: string
	/** The newest rumours, built into the page. */
	latest: LatestItem[]
	/** Every category at 0 found, from the seed at build time (desktop spec §6.1). */
	categories: CategoryRow[]
	/** The newest facts and rumours, mixed, names in the page's language. */
	news: NewsItem[]
	/** MAP_LINK.url. */
	mapLink: string
	settingsHref: string
	firstHourHref: string
	/** Guide titles from their frontmatter, for the tiles and the checklist's hidden link names. */
	guideTitle: string
	firstHourTitle: string
	/** Test seam for the dashboard chunk. The page never passes it. */
	loadDashboard?: () => Promise<DashboardModule>
}

/**
 * The home page's live part (dashboard spec §3): the countdown before launch, the dashboard after.
 * Owns the clock, Latest, and the one status region, which sits outside both views so the flip
 * at midnight never wipes it.
 */
export function Hub({
	locale,
	initialNow,
	guideHref,
	trackerHref,
	newsHref,
	latest,
	categories,
	news,
	mapLink,
	settingsHref,
	firstHourHref,
	guideTitle,
	firstHourTitle,
	loadDashboard = loadDefault,
}: Props) {
	const { t, plural } = translator(locale)
	const [start] = useState(() => new Date(initialNow))
	const state = useHubPhase(start)
	const after = state.phase === "after"
	const today = localDayKey(state.now)

	const checklistLinks: Record<ChecklistId, ChecklistLink> = {
		edition: { href: guideHref, page: guideTitle },
		preload: { href: newsHref, page: t("nav.news") },
		space: { href: newsHref, page: t("nav.news") },
		"first-hour": { href: firstHourHref, page: firstHourTitle },
		install: { href: settingsHref, page: t("nav.settings") },
	}
	// The launch date only, never a time: Rockstar hasn't confirmed the unlock time (#73).
	// Day first, as the privacy page does: plain `en` would give "Thu, Nov 19".
	const launchDate = new Intl.DateTimeFormat(dateLocale(locale), {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "Europe/Oslo",
	}).format(LAUNCH_AT)
	const newsTile = <NewsTile news={news} today={today} locale={locale} newsHref={newsHref} t={t} />
	const tiles = (
		<LinkTiles
			mapLink={mapLink}
			guideHref={guideHref}
			guideTitle={guideTitle}
			settingsHref={settingsHref}
			t={t}
		/>
	)

	const [message, setMessage] = useState("")
	const gap = useRef<number | undefined>(undefined)
	const announce = useCallback((text: string) => {
		window.clearTimeout(gap.current)
		setMessage("")
		gap.current = window.setTimeout(() => setMessage(text), ANNOUNCE_GAP_MS)
	}, [])
	useEffect(() => () => window.clearTimeout(gap.current), [])

	// The days line is news only when it changes on the device clock: not on load, and not when
	// the first tick swaps the build clock for the device clock.
	const daysText = after
		? daysSinceText(t, state.daysSince)
		: plural("hub.daysToGo", state.daysToGo)
	const synced = state.now !== start
	const heard = useRef<string | null>(null)
	useEffect(() => {
		if (!synced) return
		if (heard.current === null || heard.current === daysText) {
			heard.current = daysText
			return
		}
		heard.current = daysText
		announce(daysText)
	}, [synced, daysText, announce])

	const [Loaded, setLoaded] = useState<ComponentType<DashboardProps> | null>(null)
	const [failed, setFailed] = useState(false)
	useEffect(() => {
		if (!after || Loaded) return
		let live = true
		loadDashboard().then(
			(module) => {
				if (live) setLoaded(() => module.Dashboard)
			},
			() => {
				if (live) setFailed(true)
			}
		)
		return () => {
			live = false
		}
	}, [after, Loaded, loadDashboard])

	// If focus was in the hub when it flips at midnight, it lands on the dashboard heading instead
	// of falling to body (spec §6.4). Focus that moved elsewhere on purpose is left alone.
	const root = useRef<HTMLDivElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	const hadFocus = useRef(false)
	useEffect(() => {
		const el = root.current
		if (!el) return
		let pending: number | undefined
		const onIn = () => {
			window.clearTimeout(pending)
			hadFocus.current = true
		}
		const onOut = (event: FocusEvent) => {
			window.clearTimeout(pending)
			const next = event.relatedTarget
			if (next instanceof Node) {
				if (!el.contains(next)) hadFocus.current = false
				return
			}
			// No target: a click on blank space or a window blur. Only the first leaves focus
			// outside the hub, so read where it really is once the event has finished.
			pending = window.setTimeout(() => {
				if (!el.contains(document.activeElement)) hadFocus.current = false
			}, 0)
		}
		el.addEventListener("focusin", onIn)
		el.addEventListener("focusout", onOut)
		return () => {
			window.clearTimeout(pending)
			el.removeEventListener("focusin", onIn)
			el.removeEventListener("focusout", onOut)
		}
	}, [])
	const wasAfter = useRef(after)
	useEffect(() => {
		if (after && !wasAfter.current && hadFocus.current) {
			const active = document.activeElement
			if (!active || active === document.body || root.current?.contains(active)) {
				heading.current?.focus()
			}
		}
		wasAfter.current = after
	}, [after])

	return (
		<div className="hub-live" ref={root}>
			{after ? (
				<section
					className="hub-state hub-dashboard"
					aria-labelledby="dashboard-heading"
					aria-busy={!Loaded && !failed}
				>
					<h2 id="dashboard-heading" className="visually-hidden" ref={heading} tabIndex={-1}>
						{t("hub.dashboardHeading")}
					</h2>
					{failed ? (
						<p className="tracker-alert" role="alert">
							{t("hub.loadFailed")}
						</p>
					) : Loaded ? (
						<Loaded
							locale={locale}
							today={today}
							daysSince={state.daysSince}
							guideHref={guideHref}
							trackerHref={trackerHref}
							announce={announce}
						/>
					) : (
						<DashboardSkeleton categoryCount={categories.length} t={t} />
					)}
					{latest.length > 0 && (
						<Latest latest={latest} today={today} locale={locale} newsHref={newsHref} t={t} />
					)}
					{newsTile}
					{tiles}
				</section>
			) : (
				<div className="hub-prelaunch">
					<div className="tile hero hero-before">
						<HeroArt />
						<CountdownView locale={locale} state={state} guideHref={guideHref} />
						<p className="hero-date">{launchDate}</p>
						<SegmentBar rows={categories} />
					</div>
					<PrelaunchChecklist links={checklistLinks} t={t} />
					<CategoryBars rows={categories} phase="before" trackerHref={trackerHref} t={t} />
					{newsTile}
					{tiles}
				</div>
			)}
			<p className="visually-hidden" role="status">
				{message}
			</p>
		</div>
	)
}
