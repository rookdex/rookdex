import { fill, type Locale, t } from "../i18n"
import { useCountdown } from "./useCountdown"

interface Props {
	locale: Locale
	/** ISO timestamp from build time; see useCountdown. */
	initialNow: string
	guideHref: string
	trackerHref: string
}

export function Countdown({ locale, initialNow, guideHref, trackerHref }: Props) {
	const s = t(locale).hub
	const state = useCountdown(new Date(initialNow))
	const after = state.phase === "after"

	const daysLine = after
		? fill(s.daySince, { n: state.daysSince })
		: state.daysToGo === 1
			? s.oneDayToGo
			: fill(s.daysToGo, { n: state.daysToGo })

	const units: [number, string][] = [
		[state.parts.days, s.days],
		[state.parts.hours, s.hours],
		[state.parts.minutes, s.minutes],
	]
	if (!state.reducedMotion) units.push([state.parts.seconds, s.seconds])

	return (
		<section className="hub-state" aria-labelledby="hub-heading">
			<h2 id="hub-heading">{after ? s.launched : s.countdownHeading}</h2>
			{/* One live region for both phases, so the flip itself is announced. */}
			<p className="days" aria-live="polite">
				{daysLine}
			</p>
			{after ? (
				<p>
					<a href={trackerHref}>{s.openTracker}</a>
				</p>
			) : (
				<>
					<div className="countdown" aria-live="off" data-testid="countdown-digits">
						{units.map(([value, label]) => (
							<div className="unit" key={label}>
								<span className="value">{String(value).padStart(2, "0")}</span>
								<span className="label">{label}</span>
							</div>
						))}
					</div>
					<p>{s.preload}</p>
					<h2>{s.buyHeading}</h2>
					<p>{s.buyBody}</p>
					<p>
						<a href={guideHref}>{s.beforeYouStart}</a>
					</p>
				</>
			)}
		</section>
	)
}
