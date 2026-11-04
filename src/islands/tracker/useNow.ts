import { useEffect, useState } from "react"

/**
 * The time, refreshed every `intervalMs` and whenever the page is shown again (a background tab's
 * timers are throttled, and a sleeping device skips them). Call it in the small component that
 * shows a time, never in the island root: the tick re-renders only its caller (spec §5.4).
 */
export function useNow(intervalMs = 60_000): Date {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const tick = () => setNow(new Date())
		const timer = window.setInterval(tick, intervalMs)
		const onVisibility = () => {
			if (document.visibilityState !== "hidden") tick()
		}
		document.addEventListener("visibilitychange", onVisibility)
		return () => {
			window.clearInterval(timer)
			document.removeEventListener("visibilitychange", onVisibility)
		}
	}, [intervalMs])
	return now
}
