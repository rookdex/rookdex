// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { IDBObjectStore } from "fake-indexeddb"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { createProfile } from "../../model/profiles"
import { setDone } from "../../model/progress"
import { DB_NAME, openStore } from "../../model/store"
import { resetBrowser } from "../../test/tracker-fixtures"
import { Dashboard, type DashboardProps } from "./Dashboard"

vi.mock("../../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../model/seed")>()
	const { fixtures } = await import("../../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

/** While `hold` is set, every tick or untick waits for it before it writes, so a race can be staged. */
const writes = vi.hoisted(() => ({ hold: undefined as Promise<void> | undefined }))

vi.mock("../../model/progress", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../model/progress")>()
	return {
		...actual,
		setDone: async (...args: Parameters<typeof actual.setDone>) => {
			await writes.hold
			return actual.setDone(...args)
		},
	}
})

const announce = vi.fn()

beforeEach(() => {
	resetBrowser()
	announce.mockReset()
	writes.hold = undefined
})
afterEach(() => {
	vi.restoreAllMocks()
})

/** Profiles p1, p2, … in creation order; `found` maps item id to tick time, all on p1. */
async function seed(names: string[], found: Record<string, string> = {}) {
	const db = await openStore(indexedDB)
	for (const [index, name] of names.entries()) {
		await createProfile(
			db,
			name,
			new Date(Date.UTC(2026, 8, 1, 0, 0, index)),
			() => `p${index + 1}`
		)
	}
	for (const [id, at] of Object.entries(found)) await setDone(db, "p1", id, true, new Date(at))
	db.close()
}

function props(today = "2026-11-20"): DashboardProps {
	return {
		locale: "en",
		today,
		daysSince: 1,
		guideHref: "/en/guides/before-you-start/",
		trackerHref: "/en/tracker/",
		announce,
	}
}

async function ready(today?: string) {
	const view = render(<Dashboard {...props(today)} />)
	await screen.findByRole("button", { name: /^Profile: / })
	return view
}

/** A phone tile's value: the dd after its dt. Scoped to the phone pair; the hero repeats the labels. */
function tile(label: string) {
	const pair = document.querySelector<HTMLElement>(".stat-pair")
	if (!pair) throw new Error("no .stat-pair")
	return within(pair).getByText(label).nextElementSibling
}

// Midday UTC, so the local day matches in any time zone from UTC-12 to UTC+11.
const NOV_20 = "2026-11-20T12:00:00Z"
const NOV_19 = "2026-11-19T12:00:00Z"

describe("Dashboard blocks (dashboard spec §4)", () => {
	it("shows the skeleton first, then the player's numbers", async () => {
		const { container } = render(<Dashboard {...props()} />)
		expect(container.querySelector(".is-skeleton")).not.toBeNull()
		expect(screen.getByText("Loading your progress…")).toBeInTheDocument()
		await screen.findByRole("button", { name: "Profile: Player 1" })
		expect(container.querySelector(".is-skeleton")).toBeNull()
	})

	it("gives a newcomer 0 %, Wildlife as the goal and the before-you-start link", async () => {
		await ready()
		expect(tile("Overall")).toHaveTextContent("0%")
		expect(tile("Closest: Wildlife")).toHaveTextContent("0%")
		expect(screen.getByRole("link", { name: "New to GTA VI? Before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
		const strip = document.querySelector<HTMLElement>(".stat-strip")
		expect(strip).not.toBeNull()
		expect(within(strip as HTMLElement).getByText("Day 1 since launch")).toBeInTheDocument()
		expect(screen.getByText("Nothing ticked yet.")).toBeInTheDocument()
	})

	it("counts today's finds, fills the tiles and drops the newcomer link", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20, "vehicles/bike": NOV_19 })
		await ready("2026-11-20")
		expect(screen.getByText("1 found today")).toBeInTheDocument()
		expect(screen.queryByRole("link", { name: /New to GTA VI/ })).toBeNull()
		expect(tile("Overall")).toHaveTextContent("66%")
		// Vehicles is done, so the closest unfinished category is Wildlife at 1 of 2.
		expect(tile("Closest: Wildlife")).toHaveTextContent("50%")
		expect(
			screen.getAllByRole("progressbar").map((bar) => bar.getAttribute("aria-valuetext"))
		).toEqual(["1 of 1", "1 of 2"])
		expect(screen.getByRole("list", { name: "Recent finds" })).toHaveTextContent("Pelican")
	})

	it("rolls found today over when the day changes", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20 })
		const view = await ready("2026-11-20")
		expect(screen.getByText("1 found today")).toBeInTheDocument()
		view.rerender(<Dashboard {...props("2026-11-21")} />)
		expect(screen.getByText("0 found today")).toBeInTheDocument()
	})

	it("says All found once every item is found", async () => {
		await seed(["Player 1"], {
			"wildlife/pelican": NOV_20,
			"wildlife/american-alligator": NOV_20,
			"vehicles/bike": NOV_20,
		})
		await ready()
		expect(tile("All found")).toHaveTextContent("100%")
		expect(screen.queryByText(/^Closest:/)).toBeNull()
	})

	it("switches profile from the chip and announces it", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getByRole("menuitem", { name: "Manage profiles" })).toHaveAttribute(
			"href",
			"/en/tracker/"
		)
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await screen.findByRole("button", { name: "Profile: Dad" })
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
	})

	it("shows the storage alert when IndexedDB will not open", async () => {
		Object.defineProperty(globalThis, "indexedDB", {
			value: {
				open() {
					throw new Error("blocked")
				},
			},
			configurable: true,
		})
		render(<Dashboard {...props()} />)
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Your browser is blocking local storage"
		)
	})

	it("has no axe violations, loading or ready", async () => {
		const { container } = render(<Dashboard {...props()} />)
		expect(await axe(container)).toHaveNoViolations()
		await screen.findByRole("button", { name: "Profile: Player 1" })
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("desktop blocks (desktop spec §3)", () => {
	it("renders What's next and the profile chip once", async () => {
		await seed(["Player 1"])
		await ready()
		expect(screen.getAllByRole("heading", { name: "What's next" })).toHaveLength(1)
		expect(screen.getAllByRole("button", { name: /^Profile: / })).toHaveLength(1)
	})

	it("shows the hero, the category bars and the day line next to the chip", async () => {
		await seed(["Player 1"], { "wildlife/american-alligator": "2026-11-20T10:00:00Z" })
		await ready()
		expect(document.querySelector(".hero-big")).toHaveTextContent("1")
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Wildlife/ })).toHaveAttribute(
			"href",
			"/en/tracker/?show=wildlife"
		)
		expect(document.querySelector(".dash-top .dash-day")).toHaveTextContent("Day 1 since launch")
	})

	it("keeps the hero's visible label out of the reading order", async () => {
		await ready()
		// The hub owns the one visually hidden h2 with this text (Hub.test.tsx); the hero repeats it
		// as an aria-hidden label, so the Dashboard alone never exposes it as a second heading.
		expect(screen.queryByRole("heading", { name: "Your progress" })).toBeNull()
		expect(document.querySelector(".hero .tile-label")).toHaveAttribute("aria-hidden", "true")
		expect(document.querySelector(".hero .tile-label")).toHaveTextContent("Your progress")
	})

	it("tags no category and shows a dash for Closest with nothing found", async () => {
		await seed(["Player 1"])
		await ready()
		expect(document.querySelector(".tag")).toBeNull()
		const closest = screen.getByText("Closest", { selector: "dt" }).nextElementSibling
		expect(closest).toHaveTextContent("–")
	})

	it("gives Recent finds a Latest highlight with its day and category", async () => {
		await seed(["Player 1"], { "wildlife/american-alligator": "2026-11-20T10:00:00Z" })
		await ready()
		const first = document.querySelector(".dash-recent .recent li")
		expect(first?.querySelector(".recent-label")).toHaveTextContent("Latest")
		expect(first?.querySelector(".recent-when")).toHaveTextContent("today")
		expect(first?.querySelector(".recent-meta")).toHaveTextContent(/Wildlife · /)
	})

	it("shows the chart only with finds on 2 days", async () => {
		await seed(["Player 1"], {
			"wildlife/american-alligator": "2026-11-19T10:00:00Z",
			"wildlife/pelican": "2026-11-20T10:00:00Z",
		})
		await ready()
		expect(screen.getByRole("list", { name: "Finds by day" })).toBeInTheDocument()
		expect(document.querySelector(".dash-recent")).toHaveClass("has-chart")
	})
})

describe("ticking on the hub (dashboard spec §6.1, §7)", () => {
	const next = () => screen.getByRole("region", { name: "What's next" })

	it("ticks from What's next, announces it, and Undo puts it back with focus on it", async () => {
		await ready()
		// Tracker order: the birds group before reptiles, then Vehicles fills the third row.
		expect(
			within(next())
				.getAllByRole("checkbox")
				.map((b) => b.getAttribute("id"))
		).toEqual(["next-wildlife/pelican", "next-wildlife/american-alligator", "next-vehicles/bike"])
		fireEvent.click(within(next()).getByRole("checkbox", { name: "American alligator" }))
		const undo = await screen.findByRole("button", { name: "Undo" })
		expect(announce).toHaveBeenCalledWith("American alligator marked as found.")
		await waitFor(() =>
			expect(within(next()).queryByRole("checkbox", { name: "American alligator" })).toBeNull()
		)
		// Focus lands on the row now in the ticked row's place, here the first of the next group.
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "Bike" })).toHaveFocus()
		)
		fireEvent.click(undo)
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "American alligator" })).toHaveFocus()
		)
		expect(announce).toHaveBeenCalledWith("American alligator marked as not found.")
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("moves on when the closest category is done, and Undo brings it back", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20 })
		await ready()
		const titles = () =>
			within(next())
				.getAllByRole("heading", { level: 3 })
				.map((h) => h.textContent)
		expect(titles()).toEqual(["Wildlife · 1 left", "Then: Vehicles · 1 left"])
		fireEvent.click(within(next()).getByRole("checkbox", { name: "American alligator" }))
		const bike = await within(next()).findByRole("checkbox", { name: "Bike" })
		await waitFor(() => expect(bike).toHaveFocus())
		await waitFor(() => expect(titles()).toEqual(["Vehicles · 1 left"]))
		expect(screen.getByText("Closest: Vehicles")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Undo" }))
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "American alligator" })).toHaveFocus()
		)
		expect(titles()).toEqual(["Wildlife · 1 left", "Then: Vehicles · 1 left"])
		expect(screen.getByText("Closest: Wildlife")).toBeInTheDocument()
	})

	it("shows the all-found line and no checkboxes when everything is found", async () => {
		await seed(["Player 1"], {
			"wildlife/pelican": NOV_20,
			"wildlife/american-alligator": NOV_20,
			"vehicles/bike": NOV_20,
		})
		await ready()
		expect(within(next()).getByText("You've found everything tracked so far.")).toBeInTheDocument()
		expect(within(next()).queryByRole("checkbox")).toBeNull()
	})

	it("closes the toast when the profile changes", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: "Undo" })
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("never opens a toast for a tick that lands after a profile switch", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		let release = () => {}
		writes.hold = new Promise<void>((resolve) => {
			release = resolve
		})
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
		// The switch has landed and the tick is still waiting to write.
		expect(within(next()).getByRole("checkbox", { name: "Pelican" })).toBeChecked()
		await act(async () => {
			release()
		})
		// What's next lets go of the checkbox once the tick has landed.
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "Pelican" })).not.toBeChecked()
		)
		expect(announce).not.toHaveBeenCalledWith("Pelican marked as found.")
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("keeps the row and opens no toast when a tick fails", async () => {
		await ready()
		vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
			throw new DOMException("Quota", "QuotaExceededError")
		})
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		expect(
			await screen.findByText("Saving failed. Your browser may be blocking storage.")
		).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
		// The error renders before What's next lets go of the checkbox, one render later.
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "Pelican" })).not.toBeChecked()
		)
	})

	it("leaves the item ticked and shows the error in the toast when Undo fails", async () => {
		await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		const undo = await screen.findByRole("button", { name: "Undo" })
		vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
			throw new DOMException("Quota", "QuotaExceededError")
		})
		fireEvent.click(undo)
		const toast = undo.parentElement as HTMLElement
		expect(await within(toast).findByRole("alert")).toHaveTextContent("Saving failed.")
		// The ticked row stays out once its slide ends.
		await waitFor(() =>
			expect(within(next()).queryByRole("checkbox", { name: "Pelican" })).toBeNull()
		)
	})

	it("disables ticking when another tab changes the data", async () => {
		await ready()
		indexedDB.deleteDatabase(DB_NAME)
		expect(
			await screen.findByText("Your data changed in another tab. Reload to continue.")
		).toBeInTheDocument()
		expect(within(next()).getByRole("checkbox", { name: "Pelican" })).toBeDisabled()
	})

	it("has no axe violations with the toast open", async () => {
		const { container } = await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: "Undo" })
		expect(await axe(container)).toHaveNoViolations()
	})
})
