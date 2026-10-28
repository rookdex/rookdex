import { useEffect, useMemo, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import { daysAgo } from "../../model/days"

/** A news row as the page hands it to the hub, its name already in the page's language. */
export interface NewsItem {
	id: string
	kind: "confirmed" | "rumour"
	name: string
	date: string
}

interface Props {
	news: NewsItem[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	newsHref: string
	t: Translate
}

/**
 * The newest Confirmed facts and rumours, mixed (desktop dashboard spec §4.6). Relative dates are
 * written after mount for the same reason as in Latest.tsx: the server builds on another clock.
 */
export function NewsTile({ news, today, locale, newsHref, t }: Props) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])
	if (news.length === 0) return null

	return (
		<section className="tile news-tile" aria-labelledby="news-tile-heading">
			<div className="tile-head">
				<h2 id="news-tile-heading">{t("hub.latestNews")}</h2>
				<a className="go-link" href={newsHref}>
					{t("hub.allNews")}
				</a>
			</div>
			<ul className="news-tile-list">
				{news.map((entry) => (
					<li key={entry.id}>
						<span className={`news-chip is-${entry.kind}`}>
							{t(entry.kind === "confirmed" ? "facts.title" : "hub.chipRumour")}
						</span>
						{/* News has no anchor per item, so a row goes to its section (news.astro ids). */}
						<a href={`${newsHref}#${entry.kind === "confirmed" ? "confirmed" : "rumours"}`}>
							{entry.name}
						</a>
						<time dateTime={entry.date}>
							{mounted ? relative.format(-daysAgo(entry.date, today), "day") : ""}
						</time>
					</li>
				))}
			</ul>
		</section>
	)
}
