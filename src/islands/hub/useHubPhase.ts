import { useEffect, useState } from "react"
import { type CountdownState, useCountdown } from "../useCountdown"

/**
 * Hosts where `?phase=after` may preview the dashboard: Workers previews, a local server and dev
 * (dashboard spec §3). Production is none of these, so nobody sees the dashboard early by accident.
 */
export function overrideAllowed(hostname: string, dev: boolean): boolean {
	return (
		dev || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".workers.dev")
	)
}

/** Exactly one `phase` parameter, exactly `after`. Anything else is ignored without a message. */
export function wantsAfter(search: string): boolean {
	const values = new URLSearchParams(search).getAll("phase")
	return values.length === 1 && values[0] === "after"
}

/**
 * The countdown's clock plus the preview override. The first render uses the build clock and no
 * override, so it matches the server HTML; the override is read once the page has mounted.
 */
export function useHubPhase(initialNow: Date, dev: boolean = import.meta.env.DEV): CountdownState {
	const state = useCountdown(initialNow)
	const [forced, setForced] = useState(false)

	useEffect(() => {
		setForced(wantsAfter(window.location.search) && overrideAllowed(window.location.hostname, dev))
	}, [dev])

	return forced ? { ...state, phase: "after" } : state
}
