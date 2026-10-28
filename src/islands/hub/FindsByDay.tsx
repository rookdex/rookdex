import type { Locale, Translate } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { dateLocale, dayFromKey } from "../../model/days"

/** A chart with one bar says nothing: show it once 2 days have finds (desktop spec §2). */
export function hasChart(days: DayCount[]): boolean {
	return days.filter((d) => d.count > 0).length >= 2
}

interface Props {
	days: DayCount[]
	locale: Locale
	t: Translate
}

/**
 * The last 7 local days as plain HTML bars (desktop spec §4.5). Client-only (inside the dashboard
 * chunk), so inline heights are fine under the CSP. The bars and digits are hidden from screen
 * readers; each day's hidden sentence carries the number.
 */
export function FindsByDay({ days, locale, t }: Props) {
	if (!hasChart(days)) return null
	const max = Math.max(...days.map((d) => d.count))
	const short = new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short" })
	const long = new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long" })
	const last = days.length - 1
	return (
		<div className="finds-by-day">
			<p className="tile-label" id="fbd-label">
				{t("hub.findsByDay")}
			</p>
			<ol className="fbd-list" aria-labelledby="fbd-label">
				{days.map((d, n) => {
					const date = dayFromKey(d.day)
					return (
						<li key={d.day} className={n === last ? "fbd-item is-today" : "fbd-item"}>
							<span className="fbd-count" aria-hidden="true">
								{d.count}
							</span>
							<span className="fbd-track" aria-hidden="true">
								<span className="fbd-bar" style={{ height: `${(d.count / max) * 100}%` }} />
							</span>
							<span className="fbd-day" aria-hidden="true">
								{n === last ? t("hub.today") : short.format(date)}
							</span>
							<span className="visually-hidden">
								{t("hub.findsOnDay", { count: d.count, date: long.format(date) })}
							</span>
						</li>
					)
				})}
			</ol>
		</div>
	)
}
