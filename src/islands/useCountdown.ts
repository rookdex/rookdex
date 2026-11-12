import { useEffect, useState } from "react"
import {
	type CountdownParts,
	countdownParts,
	daysSince,
	daysToGo,
	type HubPhase,
	hubPhase,
	LAUNCH_AT,
	localLaunchAt,
} from "../model/launch"

export interface CountdownState {
	/** The moment this state was computed. The first render's is the build-time `initialNow`. */
	now: Date
	phase: HubPhase
	parts: CountdownParts
	daysToGo: number
	daysSince: number
}

function compute(now: Date, launchAt: Date): CountdownState {
	return {
		now,
		phase: hubPhase(now, launchAt),
		parts: countdownParts(now, launchAt),
		daysToGo: daysToGo(now, launchAt),
		daysSince: daysSince(now, launchAt),
	}
}

/**
 * Ticks every second, or once a minute under prefers-reduced-motion (CSS hides the seconds then).
 * `initialNow` is the build-time clock, and the first render counts to the build's CET instant,
 * so the server HTML and the first client render match. The effect then switches to the device
 * clock and the device's own midnight, which is what flips the page at the visitor's launch,
 * earlier or later than the static page says.
 */
export function useCountdown(initialNow: Date): CountdownState {
	const [state, setState] = useState(() => compute(initialNow, LAUNCH_AT))

	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		const tick = () => setState(compute(new Date(), localLaunchAt()))
		tick()
		const id = window.setInterval(tick, reduced ? 60_000 : 1_000)
		return () => window.clearInterval(id)
	}, [])

	return state
}
