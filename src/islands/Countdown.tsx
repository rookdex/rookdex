import { fill, type Locale, t } from "../i18n"
import { useCountdown } from "./useCountdown"

interface Props {
	locale: Locale
	/** ISO timestamp from build time; see useCountdown. */
	initialNow: string
	guideHref: string
}

export function Countdown({ locale, initialNow, guideHref }: Props) {
	const s = t(locale).hub
	const state = useCountdown(new Date(initialNow))

	if (state.phase === "after") {
		return (
			<section className="hub-state" aria-labelledby="launched-heading">
				<h2 id="launched-heading">{s.launched}</h2>
				<p className="days" aria-live="polite">
					{fill(s.daySince, { n: state.daysSince })}
				</p>
				<p>{s.statsSoon}</p>
			</section>
		)
	}

	const daysLine = state.daysToGo === 1 ? s.oneDayToGo : fill(s.daysToGo, { n: state.daysToGo })
	const units: [number, string][] = [
		[state.parts.days, s.days],
		[state.parts.hours, s.hours],
		[state.parts.minutes, s.minutes],
		[state.parts.seconds, s.seconds],
	]

	return (
		<section className="hub-state" aria-labelledby="countdown-heading">
			<h2 id="countdown-heading">{s.countdownHeading}</h2>
			<p className="days" aria-live="polite">
				{daysLine}
			</p>
			<div className="countdown" aria-live="off" data-testid="countdown-digits">
				{units.map(([value, label]) => (
					<div className="unit" key={label}>
						<span className="value">{String(value).padStart(2, "0")}</span>
						<span className="label">{label}</span>
					</div>
				))}
			</div>
			<p>{s.preload}</p>
			<h3>{s.buyHeading}</h3>
			<p>{s.buyBody}</p>
			<p>
				<a href={guideHref}>{s.beforeYouStart}</a>
			</p>
		</section>
	)
}
