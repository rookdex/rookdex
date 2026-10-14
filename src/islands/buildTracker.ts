import { seedItems } from "../model/seed"
import { openStore } from "../model/store"
import { createTracker, type Tracker } from "../model/tracker"
import { activeProfileStorage, HINT_SEEN_KEY, readFlag } from "./seenFlag"

/**
 * Both islands build their tracker here, so the hub and the tracker page open the same database,
 * the same seed and the same remembered profile in the same way (dashboard spec §3).
 */
export function buildTracker(defaultProfileName: string, selected: string[] = []): Tracker {
	return createTracker({
		openStore: () => openStore(indexedDB),
		items: seedItems,
		defaultProfileName,
		selected,
		persist:
			typeof navigator.storage?.persist === "function"
				? () => navigator.storage.persist()
				: undefined,
		installed: window.matchMedia("(display-mode: standalone)").matches,
		hintSeen: readFlag(HINT_SEEN_KEY),
		activeProfile: activeProfileStorage,
	})
}
