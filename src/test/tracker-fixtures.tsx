// Shared setup for the Tracker island tests. This file must not import the island: each test
// file mocks `../model/seed` with `fixtures`, and the mock factory runs while the island is
// being imported, so an import from here would run in the middle of that.
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IDBFactory } from "fake-indexeddb"
import type { ReactElement } from "react"
import { expect, vi } from "vitest"
import type { SeedItem } from "../model/schema"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }

export const fixtures: SeedItem[] = [
	{
		id: "vehicles/bike",
		category: "vehicles",
		group: "bikes",
		name: "Bike",
		status: "confirmed",
		sources: [src],
	},
	{
		id: "wildlife/american-alligator",
		category: "wildlife",
		group: "reptiles",
		name: "American alligator",
		status: "confirmed",
		sources: [src],
		description: "Everglades native.",
	},
	{
		id: "wildlife/pelican",
		category: "wildlife",
		group: "birds",
		name: "Pelican",
		status: "expected",
		precedent: "GTA V",
		sources: [src],
	},
]

/** Fresh IndexedDB, a clean tracker URL and stubbed blob URLs. Call from `beforeEach`. */
export function resetBrowser(): void {
	Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true })
	window.history.replaceState(null, "", "/en/tracker/")
	URL.createObjectURL = vi.fn(() => "blob:rookdex")
	URL.revokeObjectURL = vi.fn()
}

/** Renders the island and waits until the store has loaded and the list is interactive. */
export async function renderReady(ui: ReactElement) {
	const view = render(ui)
	const box = await screen.findByRole("checkbox", { name: "American alligator" })
	await waitFor(() => expect(box).toBeEnabled())
	return view
}

export function openMenu(name = "Profile: Player 1") {
	const trigger = screen.getByRole("button", { name })
	fireEvent.click(trigger)
	return trigger
}
