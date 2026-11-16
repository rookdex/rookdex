import { useEffect, useMemo, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import { daysAgo } from "../../model/days"
import type { NewsItem } from "./NewsTile"

interface Props {
	/** The newest facts and rumours, mixed, as the desktop news tile gets them. */
	news: NewsItem[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	newsHref: string
	t: Translate
}

/**
 * The phone's news block: the same Confirmed and Rumor mix as the desktop news tile, stacked so a
 * long name wraps at 320 px. Relative dates are written only after mount: the server HTML is built
 * on another clock and in another time zone, so a date there could disagree with the first client
 * render. The empty `<time>` keeps its line, so filling it in shifts nothing.
 */
export function Latest({ news, today, locale, newsHref, t }: Props) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])

	return (
		<section className="latest" aria-labelledby="latest-heading">
			<h2 id="latest-heading">{t("hub.latestNews")}</h2>
			<ul className="latest-list">
				{news.map((entry) => (
					<li key={entry.id}>
						{/* News has no anchor per item, so a row goes to its section (news.astro ids). */}
						<a href={`${newsHref}#${entry.kind === "confirmed" ? "confirmed" : "rumours"}`}>
							{entry.name}
						</a>
						<span className="latest-meta">
							<span className={`news-chip is-${entry.kind}`}>
								{t(entry.kind === "confirmed" ? "facts.title" : "hub.chipRumour")}
							</span>
							<time dateTime={entry.date}>
								{mounted ? relative.format(-daysAgo(entry.date, today), "day") : ""}
							</time>
						</span>
					</li>
				))}
			</ul>
			<a className="go-link" href={newsHref}>
				{t("hub.allNews")}
			</a>
		</section>
	)
}
