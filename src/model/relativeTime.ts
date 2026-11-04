// "2 min ago" for the rail and the Last found row (tracker refresh spec §5.4). Pure: the caller
// passes `now`, so a minute tick decides when it changes. Words come from the browser's CLDR data.
import type { Locale } from "../i18n"
import { dateLocale, daysAgo, localDayKey } from "./days"

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

export function relativeTime(then: string, now: Date, locale: Locale): string {
	const format = new Intl.RelativeTimeFormat(dateLocale(locale), {
		numeric: "auto",
		style: "short",
	})
	const at = new Date(then)
	const ms = now.getTime() - at.getTime()
	// A future time (clock skew, an import from another device) or a broken one reads "now".
	if (!(ms >= MINUTE_MS)) return format.format(0, "second")
	if (ms < HOUR_MS) return format.format(-Math.floor(ms / MINUTE_MS), "minute")
	const days = daysAgo(localDayKey(at), localDayKey(now))
	if (days === 0) return format.format(-Math.floor(ms / HOUR_MS), "hour")
	return format.format(-days, "day")
}
