import { type Locale, translator } from "../../i18n"
import { prices } from "../../model/prices"
import type { CountdownState } from "../useCountdown"

interface Props {
	locale: Locale
	state: CountdownState
	guideHref: string
}

/**
 * The sentence with its number in its own span, so CSS can give the number the display face
 * while the words stay in Inter (spec §7). The sentence comes filled from the translator, and the
 * number is found in it, so the translation stays in charge of word order ("70 days to go").
 * Countdown templates carry no other digits (copy.test.ts).
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

/**
 * The hub before launch, moved from Countdown.tsx. The days line is no longer live: the hub's one
 * status region announces it (dashboard spec §3).
 */
export function CountdownView({ locale, state, guideHref }: Props) {
	const { t, plural, money } = translator(locale)
	// The seconds always render and CSS hides them under reduced motion. The server cannot know
	// that setting, so dropping the unit after hydration would shift the phone grid's columns.
	const units: [number, string, string][] = [
		[state.parts.days, t("hub.days"), "unit"],
		[state.parts.hours, t("hub.hours"), "unit"],
		[state.parts.minutes, t("hub.minutes"), "unit"],
		[state.parts.seconds, t("hub.seconds"), "unit unit-seconds"],
	]

	return (
		<section className="hub-state" aria-labelledby="hub-heading">
			<h2 id="hub-heading">{t("hub.countdownHeading")}</h2>
			<p className="days">
				<DaysLine text={plural("hub.daysToGo", state.daysToGo)} n={state.daysToGo} />
			</p>
			<div className="countdown" aria-live="off" data-testid="countdown-digits">
				{units.map(([value, label, className]) => (
					<div className={className} key={label}>
						<span className="value">{String(value).padStart(2, "0")}</span>
						<span className="label">{label}</span>
					</div>
				))}
			</div>
			<p>{t("hub.preload")}</p>
			<div className="countdown-more">
				<h2>{t("hub.buyHeading")}</h2>
				<p>{t("hub.buyBody", { standard: money(prices.standard) })}</p>
				<p>
					<a className="go-link" href={guideHref}>
						{t("hub.beforeYouStart")}
					</a>
				</p>
			</div>
		</section>
	)
}
