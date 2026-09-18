import { useEffect, useState } from "react"
import {
	type CountdownParts,
	countdownParts,
	daysSince,
	daysToGo,
	type HubPhase,
	hubPhase,
} from "../model/launch"

export interface CountdownState {
	phase: HubPhase
	parts: CountdownParts
	daysToGo: number
	daysSince: number
	/** Seconds are hidden and the tick slows to once a minute. */
	reducedMotion: boolean
}

function compute(now: Date, reducedMotion: boolean): CountdownState {
	return {
		phase: hubPhase(now),
		parts: countdownParts(now),
		daysToGo: daysToGo(now),
		daysSince: daysSince(now),
		reducedMotion,
	}
}

/**
 * Ticks every second, or once a minute under prefers-reduced-motion.
 * `initialNow` is the build-time clock so the server HTML and the first client render match;
 * the effect then switches to the device clock, which is what flips the page at midnight.
 */
export function useCountdown(initialNow: Date): CountdownState {
	const [state, setState] = useState(() => compute(initialNow, false))

	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		const tick = () => setState(compute(new Date(), reduced))
		tick()
		const id = window.setInterval(tick, reduced ? 60_000 : 1_000)
		return () => window.clearInterval(id)
	}, [])

	return state
}
