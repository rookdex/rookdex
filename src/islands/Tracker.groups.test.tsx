// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

beforeEach(resetBrowser)

// Vehicles has one group (Bikes), so it never gets chips. Wildlife has Birds (Pelican) and
// Reptiles (American alligator); birds sort first, so the Pelican's card comes first.
const ready = () => renderReady(<Tracker locale="en" />)
const names = () => screen.queryAllByRole("checkbox").map((box) => box.getAttribute("id"))
const button = (name: RegExp | string) => screen.getByRole("button", { name })
const press = (name: RegExp | string) => fireEvent.click(button(name))
const chipRow = () => screen.queryByRole("group", { name: "Groups: Wildlife" })
const groupParam = () => new URLSearchParams(window.location.search).get("group")
const type = (value: string) =>
	fireEvent.change(screen.getByRole("searchbox"), { target: { value } })
const status = () => screen.getByRole("status")
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Group chips (tracker refresh spec §14.1)", () => {
	it("shows chips under a pressed category with more than one group, never under All", async () => {
		await ready()
		expect(screen.queryByRole("group", { name: /^Groups:/ })).toBeNull()
		press(/^Wildlife,/)
		press(/^Vehicles,/)
		const row = chipRow() as HTMLElement
		expect(
			within(row)
				.getAllByRole("button")
				.map((b) => b.getAttribute("aria-label"))
		).toEqual(["Birds, 0 of 1", "Reptiles, 0 of 1"])
		expect(screen.queryByRole("group", { name: "Groups: Vehicles" })).toBeNull()
	})

	it("narrows only its own category and mirrors the chips to ?group=", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(button(/^Birds,/)).toHaveAttribute("aria-pressed", "true")
		expect(groupParam()).toBe("wildlife/birds")
		press(/^Vehicles,/)
		expect(names()).toEqual(["item-vehicles/bike", "item-wildlife/pelican"])
	})

	it("drops a category's chips when it is unpressed", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		press(/^Wildlife,/)
		expect(groupParam()).toBeNull()
		press(/^Wildlife,/)
		expect(button(/^Birds,/)).toHaveAttribute("aria-pressed", "false")
		expect(names()).toEqual(["item-wildlife/pelican", "item-wildlife/american-alligator"])
	})

	it("counts whole groups on the chips while a search narrows the list", async () => {
		await ready()
		press(/^Wildlife,/)
		type("peli")
		expect(button("Reptiles, 0 of 1")).toBeInTheDocument()
	})

	it("reads ?group= on load and drops keys no chip offers", async () => {
		window.history.replaceState(
			null,
			"",
			"/en/tracker/?show=wildlife&group=wildlife/birds,vehicles/bikes,evil"
		)
		render(<Tracker locale="en" />)
		const box = await screen.findByRole("checkbox", { name: "Pelican" })
		await waitFor(() => expect(box).toBeEnabled())
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(groupParam()).toBe("wildlife/birds")
	})

	it("keeps the title and chips when a press empties the view, with focus on the chip (R17)", async () => {
		await ready()
		press(/^Wildlife,/)
		type("zzz")
		expect(chipRow()).not.toBeNull()
		expect(screen.getByText('No match for "zzz".')).toBeInTheDocument()
		const birds = button(/^Birds,/)
		birds.focus()
		fireEvent.click(birds)
		fireEvent.click(birds)
		// Unpressing the last chip under a search with no match: the row stays, the node is the same.
		expect(chipRow()).not.toBeNull()
		expect(screen.getByRole("heading", { name: "Wildlife" })).toBeInTheDocument()
		expect(birds).toHaveFocus()
	})

	it("keeps the title, chips and focus when a chip press empties a matching view (spec §14.1)", async () => {
		await ready()
		press(/^Wildlife,/)
		type("peli")
		expect(names()).toEqual(["item-wildlife/pelican"])
		const reptiles = button(/^Reptiles,/)
		reptiles.focus()
		fireEvent.click(reptiles)
		expect(names()).toEqual([])
		expect(screen.getByText("1 more outside your filters")).toBeInTheDocument()
		expect(chipRow()).not.toBeNull()
		expect(screen.getByRole("heading", { name: "Wildlife" })).toBeInTheDocument()
		expect(document.activeElement).toBe(reptiles)
	})

	it("keeps an unmatched chip category on screen while another pressed category matches (R17)", async () => {
		await ready()
		press(/^Vehicles,/)
		press(/^Wildlife,/)
		type("bike")
		expect(names()).toEqual(["item-vehicles/bike"])
		expect(screen.getByRole("heading", { name: "Wildlife" })).toBeInTheDocument()
		expect(chipRow()).not.toBeNull()
		expect(screen.queryByText(/outside your filters/)).toBeNull()
	})

	it("points to a match a chip hides, and Clear filters clears tiles and chips", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		type("gator")
		expect(names()).toEqual([])
		expect(screen.getByText("1 more outside your filters")).toBeInTheDocument()
		press("Clear filters")
		expect(button(/^All,/)).toHaveAttribute("aria-pressed", "true")
		expect(groupParam()).toBeNull()
		expect(chipRow()).toBeNull()
		expect(names()).toEqual(["item-wildlife/american-alligator"])
		expect(document.activeElement).toBe(screen.getByRole("searchbox"))
		expect(screen.getByRole("searchbox")).toHaveValue("gator")
		expect(status()).toHaveTextContent("1 result")
	})

	it("lets a chip toggle cancel a pending result", async () => {
		await ready()
		press(/^Wildlife,/)
		type("peli")
		press(/^Birds,/)
		await wait(700)
		expect(status()).not.toHaveTextContent("1 result")
	})

	it("shows Last found as plain text when a chip hides its card", async () => {
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: /^Last found Pelican/ })
		press(/^Wildlife,/)
		press(/^Reptiles,/)
		expect(screen.queryByRole("button", { name: /^Last found/ })).toBeNull()
		expect(document.querySelector(".last-found")?.tagName).toBe("P")
	})
})
