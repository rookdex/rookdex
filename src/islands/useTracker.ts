import { useEffect, useSyncExternalStore } from "react"
import { showParam, type Tracker, type TrackerState } from "../model/tracker"

/** Controller: subscribes to the model and boots it once. The tracker page and the hub both use it. */
export function useTrackerState(tracker: Tracker): TrackerState {
	const state = useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState)

	useEffect(() => {
		tracker.init()
	}, [tracker])

	return state
}

/** Mirrors the category selection to `?show=`. Tracker page only. */
export function useShowParam(selected: string[]): void {
	useEffect(() => {
		// Always re-serialised from state; the raw parameter is never echoed back.
		const url = new URL(window.location.href)
		const value = showParam(selected)
		if (value) url.searchParams.set("show", value)
		else url.searchParams.delete("show")
		window.history.replaceState(null, "", url)
	}, [selected])
}
