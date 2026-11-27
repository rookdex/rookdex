import { createChunkLoader } from "../model/chunks"
import { openStore } from "../model/store"
import { createTracker, type Tracker } from "../model/tracker"
import { indexItems, type SeedIndex } from "../model/trackItems"
import { activeProfileStorage, countBackupTick, HINT_SEEN_KEY, readFlag } from "./seenFlag"

export interface BuildOptions {
	selected?: string[]
	groups?: string[]
	/** Load card text chunks. The tracker page shows cards; the hub shows none. */
	chunks?: boolean
}

/**
 * Both islands build their tracker here, so the hub and the tracker page open the same database,
 * the same seed index and the same remembered profile in the same way (dashboard spec §3).
 */
export function buildTracker(
	defaultProfileName: string,
	index: SeedIndex,
	options: BuildOptions = {}
): Tracker {
	return createTracker({
		openStore: () => openStore(indexedDB),
		items: indexItems(index),
		loadChunk: options.chunks
			? createChunkLoader(index, (url, init) => fetch(url, init))
			: undefined,
		onOnline: options.chunks
			? (retry) => {
					window.addEventListener("online", retry)
					return () => window.removeEventListener("online", retry)
				}
			: undefined,
		defaultProfileName,
		selected: options.selected ?? [],
		groups: options.groups ?? [],
		persist:
			typeof navigator.storage?.persist === "function"
				? () => navigator.storage.persist()
				: undefined,
		installed: window.matchMedia("(display-mode: standalone)").matches,
		hintSeen: readFlag(HINT_SEEN_KEY),
		activeProfile: activeProfileStorage,
		// Ticks from the hub count too: the reminder is about everything since the last backup.
		onTick: countBackupTick,
	})
}
