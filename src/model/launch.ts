// Launch timing rules. Pure functions: no DOM, no timers, no Date.now().
// The hub's clock hook, the tracker's Progress link and the footer countdown call these.

const DAY_MS = 86_400_000

/**
 * GTA VI release as one instant: 19 November 2026, 00:00 CET (UTC+1). The build uses this, so the
 * server HTML and the 00:05 CET launch rebuild don't depend on the build machine's time zone.
 */
export const LAUNCH_AT = new Date("2026-11-19T00:00:00+01:00")

/** Preload opens 10 November 2026: local midnight on PS5, 00:00 GMT on Xbox (Newswire 03.11). */
export const PRELOAD_AT = new Date("2026-11-10T00:00:00+01:00")

/**
 * The launch on this device: midnight on 19 November on its own clock. Rockstar unlocks the game
 * at midnight local time in every region (Rockstar Support, 03.11). Every helper below defaults
 * to it, so a visitor in New York counts to their own midnight, not to 18:00.
 */
export function localLaunchAt(): Date {
	return new Date(2026, 10, 19)
}

export type HubPhase = "before" | "after"

export interface CountdownParts {
	days: number
	hours: number
	minutes: number
	seconds: number
}

/** `date` moved `n` days on this device's calendar, keeping its wall-clock time. */
function shiftDays(date: Date, n: number): Date {
	const moved = new Date(date.getTime())
	moved.setDate(moved.getDate() + n)
	return moved
}

export function hubPhase(now: Date, launchAt = localLaunchAt()): HubPhase {
	return now.getTime() < launchAt.getTime() ? "before" : "after"
}

export function countdownParts(now: Date, launchAt = localLaunchAt()): CountdownParts {
	const total = Math.max(0, Math.floor((launchAt.getTime() - now.getTime()) / 1000))
	return {
		days: Math.floor(total / 86_400),
		hours: Math.floor((total % 86_400) / 3600),
		minutes: Math.floor((total % 3600) / 60),
		seconds: total % 60,
	}
}

/**
 * Whole days left, rounded up: the evening before still says "1 day". Counted in calendar days,
 * so a daylight-saving change between now and launch can't shift when the number drops.
 */
export function daysToGo(now: Date, launchAt = localLaunchAt()): number {
	if (now.getTime() >= launchAt.getTime()) return 0
	let n = Math.ceil((launchAt.getTime() - now.getTime()) / DAY_MS)
	while (n > 1 && shiftDays(launchAt, 1 - n).getTime() <= now.getTime()) n--
	while (shiftDays(launchAt, -n).getTime() > now.getTime()) n++
	return n
}

/**
 * Whole days since launch, rounded down: launch night itself is day 0. Each new day starts at
 * midnight on this device's calendar, also after a daylight-saving change.
 */
export function daysSince(now: Date, launchAt = localLaunchAt()): number {
	if (now.getTime() < launchAt.getTime()) return 0
	let n = Math.floor((now.getTime() - launchAt.getTime()) / DAY_MS)
	while (n > 0 && shiftDays(launchAt, n).getTime() > now.getTime()) n--
	while (shiftDays(launchAt, n + 1).getTime() <= now.getTime()) n++
	return n
}
