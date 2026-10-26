import { useEffect, useMemo, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import { daysAgo } from "../../model/days"

/** A rumour as the page hands it to the hub: built in, never fetched (dashboard spec §6.3). */
export interface LatestItem {
	id: string
	name: string
	added: string
}

interface Props {
	latest: LatestItem[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	newsHref: string
	t: Translate
}

/**
 * The three newest rumours. Relative dates are written only after mount: the server HTML is built
 * on another clock and in another time zone, so a date there could disagree with the first client
 * render. The empty `<time>` keeps its line, so filling it in shifts nothing.
 */
export function Latest({ latest, today, locale, newsHref, t }: Props) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])

	return (
		<section className="latest" aria-labelledby="latest-heading">
			<h2 id="latest-heading">{t("hub.latest")}</h2>
			<ul className="latest-list">
				{latest.map((rumour) => (
					<li key={rumour.id}>
						<span>{rumour.name}</span>
						<time dateTime={rumour.added}>
							{mounted ? relative.format(-daysAgo(rumour.added, today), "day") : ""}
						</time>
					</li>
				))}
			</ul>
			<a className="go-link" href={newsHref}>
				{t("hub.allNews")}
			</a>
		</section>
	)
}
