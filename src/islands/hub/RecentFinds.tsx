import { useMemo } from "react"
import { type Locale, seedLabel, type Translate } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { daysAgo, localDayKey } from "../../model/days"
import type { RecentFind } from "../../model/stats"
import { FindsByDay, hasChart } from "./FindsByDay"

interface Props {
	recent: RecentFind[]
	days: DayCount[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	t: Translate
}

/**
 * Recent finds at every width (desktop spec §4.5). Phones show names only, as before: the day,
 * category line and Latest label are hidden below 1024 px. From 1024 px the first row is the
 * Latest highlight, and CSS limits the rows under it (4, or 2 when the chart shows).
 */
export function RecentFinds({ recent, days, today, locale, t }: Props) {
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])
	const chart = hasChart(days)
	return (
		<section
			className={chart ? "dash-recent has-chart" : "dash-recent"}
			aria-labelledby="dash-recent-heading"
		>
			<h2 id="dash-recent-heading">{t("tracker.recent")}</h2>
			{recent.length === 0 ? (
				<>
					<p className="stats-empty">{t("tracker.noRecent")}</p>
					<div className="recent-empty">
						<p className="recent-empty-title">{t("hub.noFindsYet")}</p>
						<p>{t("hub.noFindsBody")}</p>
					</div>
				</>
			) : (
				<ul className="recent" aria-labelledby="dash-recent-heading">
					{recent.map((find, n) => (
						<li key={find.item.id}>
							{n === 0 && <span className="recent-label">{t("hub.latestFind")}</span>}
							<time className="recent-when" dateTime={find.updated_at}>
								{relative.format(-daysAgo(localDayKey(new Date(find.updated_at)), today), "day")}
							</time>
							<span className="recent-name">{find.item.name}</span>
							<span className="recent-meta">
								{seedLabel(t, "category", find.item.category)} ·{" "}
								{seedLabel(t, "group", find.item.group)}
							</span>
						</li>
					))}
				</ul>
			)}
			<FindsByDay days={days} locale={locale} t={t} />
		</section>
	)
}
