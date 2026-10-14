import { type ComponentType, useCallback, useEffect, useRef, useState } from "react"
import { type Locale, translator } from "../../i18n"
import { localDayKey } from "../../model/days"
import { CountdownView } from "./CountdownView"
import type { DashboardProps } from "./Dashboard"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { Latest, type LatestItem } from "./Latest"
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
	/** How many progress bars the skeleton reserves. */
	categoryCount: number
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
	categoryCount,
	loadDashboard = loadDefault,
}: Props) {
	const { t, plural } = translator(locale)
	const [start] = useState(() => new Date(initialNow))
	const state = useHubPhase(start)
	const after = state.phase === "after"
	const today = localDayKey(state.now)

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
		? t("hub.daySince", { n: state.daysSince })
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
		const onIn = () => {
			hadFocus.current = true
		}
		const onOut = (event: FocusEvent) => {
			const next = event.relatedTarget
			if (next instanceof Node && !el.contains(next)) hadFocus.current = false
		}
		el.addEventListener("focusin", onIn)
		el.addEventListener("focusout", onOut)
		return () => {
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
						<DashboardSkeleton categoryCount={categoryCount} t={t} />
					)}
					{latest.length > 0 && (
						<Latest latest={latest} today={today} locale={locale} newsHref={newsHref} t={t} />
					)}
				</section>
			) : (
				<CountdownView locale={locale} state={state} guideHref={guideHref} />
			)}
			<p className="visually-hidden" role="status">
				{message}
			</p>
		</div>
	)
}
