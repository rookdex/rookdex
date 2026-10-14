/**
 * The hub's server-side "now" (dashboard spec §6.4): the build clock, or `ROOKDEX_NOW` when a test
 * build sets it to an ISO timestamp. Production never sets it. A value that doesn't parse fails the
 * build here, instead of shipping `Invalid Date`.
 */
export function buildNow(raw: string | undefined, fallback: () => Date = () => new Date()): Date {
	if (raw === undefined || raw === "") return fallback()
	const date = new Date(raw)
	if (Number.isNaN(date.getTime())) {
		throw new Error(`ROOKDEX_NOW must be an ISO timestamp, got "${raw}"`)
	}
	return date
}
