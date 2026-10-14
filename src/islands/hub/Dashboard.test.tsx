// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { createProfile } from "../../model/profiles"
import { setDone } from "../../model/progress"
import { openStore } from "../../model/store"
import { resetBrowser } from "../../test/tracker-fixtures"
import { Dashboard, type DashboardProps } from "./Dashboard"

vi.mock("../../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../model/seed")>()
	const { fixtures } = await import("../../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

const announce = vi.fn()

beforeEach(() => {
	resetBrowser()
	announce.mockReset()
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

/** A tile's value: the dd after its dt. */
function tile(label: string) {
	return screen.getByText(label).nextElementSibling
}

// Midday UTC, so the local day matches in any time zone from UTC-11 to UTC+12.
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
		expect(screen.getByText("Day 1 since launch")).toBeInTheDocument()
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
