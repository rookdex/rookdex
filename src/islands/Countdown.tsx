import { type Locale, translator } from "../i18n"
import { prices } from "../model/prices"
import { useCountdown } from "./useCountdown"

interface Props {
	locale: Locale
	/** ISO timestamp from build time; see useCountdown. */
	initialNow: string
	guideHref: string
	trackerHref: string
}

/**
 * The sentence with its number in its own span, so CSS can give the number the display face
 * while the words stay in Inter (spec §7). The sentence comes filled from the translator, and the
 * number is found in it, so the translation stays in charge of word order ("70 days to go",
 * "Dag 3 etter lansering"). Countdown templates carry no other digits (copy.test.ts).
 */
function DaysLine({ text, n }: { text: string; n: number }) {
	const digits = String(n)
	const at = text.indexOf(digits)
	if (at === -1) return <>{text}</>
	return (
		<>
			{text.slice(0, at)}
			<span className="days-number">{digits}</span>
			{text.slice(at + digits.length)}
		</>
	)
}

export function Countdown({ locale, initialNow, guideHref, trackerHref }: Props) {
	const { t, plural, money } = translator(locale)
	const state = useCountdown(new Date(initialNow))
	const after = state.phase === "after"

	const n = after ? state.daysSince : state.daysToGo
	const text = after ? t("hub.daySince", { n }) : plural("hub.daysToGo", n)

	const units: [number, string][] = [
		[state.parts.days, t("hub.days")],
		[state.parts.hours, t("hub.hours")],
		[state.parts.minutes, t("hub.minutes")],
	]
	if (!state.reducedMotion) units.push([state.parts.seconds, t("hub.seconds")])

	return (
		<section className="hub-state" aria-labelledby="hub-heading">
			<h2 id="hub-heading">{after ? t("hub.launched") : t("hub.countdownHeading")}</h2>
			{/* One live region for both phases, so the flip itself is announced as one sentence. */}
			<p className="days" aria-live="polite" aria-atomic="true">
				<DaysLine text={text} n={n} />
			</p>
			{after ? (
				<p>
					<a href={trackerHref}>{t("hub.openTracker")}</a>
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
					<p>{t("hub.preload")}</p>
					<h2>{t("hub.buyHeading")}</h2>
					<p>{t("hub.buyBody", { standard: money(prices.standard) })}</p>
					<p>
						<a href={guideHref}>{t("hub.beforeYouStart")}</a>
					</p>
				</>
			)}
		</section>
	)
}
