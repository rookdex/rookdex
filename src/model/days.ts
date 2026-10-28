// Calendar-day helpers for the hub. No seed import: the hub's before-launch bundle uses these and
// must not pull in the tracker model (dashboard spec §10).

const DAY_MS = 86_400_000

/** `YYYY-MM-DD` of `date` on the device's own calendar. */
export function localDayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${date.getFullYear()}-${month}-${day}`
}

/** Local noon on the day `key` names: a moment safely inside that day. */
export function dayFromKey(key: string): Date {
	const [year, month, day] = key.split("-").map(Number)
	return new Date(year, month - 1, day, 12)
}

/** Whole days from `added` to `today`, both `YYYY-MM-DD`. A date in the future counts as today. */
export function daysAgo(added: string, today: string): number {
	const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${added}T00:00:00Z`)
	return Math.max(0, Math.round(ms / DAY_MS))
}

/** The key `n` calendar days after `key` (negative goes back). Steps by date, never by 24 hours,
 *  so a daylight-saving change can't skip or repeat a day (desktop dashboard spec §6.2). */
export function addDays(key: string, n: number): string {
	const date = dayFromKey(key)
	date.setDate(date.getDate() + n)
	return localDayKey(date)
}
