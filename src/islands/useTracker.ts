import { useEffect, useSyncExternalStore } from "react"
import { groupParam, showParam, type Tracker, type TrackerState } from "../model/tracker"

/** Controller: subscribes to the model and boots it once. The tracker page and the hub both use it. */
export function useTrackerState(tracker: Tracker): TrackerState {
	const state = useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState)

	useEffect(() => {
		tracker.init()
	}, [tracker])

	return state
}

// Always re-serialised from state; the raw parameter is never echoed back. Keyed on the string,
// so a new array with the same content writes nothing.
function useSearchParam(name: string, value: string | null): void {
	useEffect(() => {
		const url = new URL(window.location.href)
		if (value) url.searchParams.set(name, value)
		else url.searchParams.delete(name)
		window.history.replaceState(null, "", url)
	}, [name, value])
}

/** Mirrors the category selection to `?show=`. Tracker page only. */
export function useShowParam(selected: string[]): void {
	useSearchParam("show", showParam(selected))
}

/** Mirrors the group chips to `?group=`, beside `?show=` (spec §14.1). Tracker page only. */
export function useGroupParam(groups: string[]): void {
	useSearchParam("group", groupParam(groups))
}
