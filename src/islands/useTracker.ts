import { useEffect, useSyncExternalStore } from "react"
import { showParam, type Tracker, type TrackerState } from "../model/tracker"

/** Controller: subscribes to the model, boots it once, mirrors the selection to `?show=`. */
export function useTracker(tracker: Tracker): TrackerState {
	const state = useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState)

	useEffect(() => {
		tracker.init()
	}, [tracker])

	useEffect(() => {
		// Always re-serialised from state; the raw parameter is never echoed back.
		const url = new URL(window.location.href)
		const value = showParam(state.selected)
		if (value) url.searchParams.set("show", value)
		else url.searchParams.delete("show")
		window.history.replaceState(null, "", url)
	}, [state.selected])

	return state
}
