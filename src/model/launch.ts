// Launch timing rules. Pure functions: no DOM, no timers, no Date.now().
// The Countdown island's hook is the only caller.

const DAY_MS = 86_400_000

/** GTA VI release: 19 November 2026, 00:00 CET (UTC+1). */
export const LAUNCH_AT = new Date("2026-11-19T00:00:00+01:00")

/** Preload opens 12 November 2026. */
export const PRELOAD_AT = new Date("2026-11-12T00:00:00+01:00")

export type HubPhase = "before" | "after"

export interface CountdownParts {
	days: number
	hours: number
	minutes: number
	seconds: number
}

export function hubPhase(now: Date, launchAt = LAUNCH_AT): HubPhase {
	return now.getTime() < launchAt.getTime() ? "before" : "after"
}

export function countdownParts(now: Date, launchAt = LAUNCH_AT): CountdownParts {
	const total = Math.max(0, Math.floor((launchAt.getTime() - now.getTime()) / 1000))
	return {
		days: Math.floor(total / 86_400),
		hours: Math.floor((total % 86_400) / 3600),
		minutes: Math.floor((total % 3600) / 60),
		seconds: total % 60,
	}
}

/** Whole days left, rounded up: the evening before still says "1 day". */
export function daysToGo(now: Date, launchAt = LAUNCH_AT): number {
	const ms = launchAt.getTime() - now.getTime()
	return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS)
}

/** Whole days since launch, rounded down: launch night itself is day 0. */
export function daysSince(now: Date, launchAt = LAUNCH_AT): number {
	const ms = now.getTime() - launchAt.getTime()
	return ms < 0 ? 0 : Math.floor(ms / DAY_MS)
}
