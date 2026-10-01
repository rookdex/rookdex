// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { wireTooltips } from "../scripts/tooltip"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

beforeEach(resetBrowser)

const ready = (locale: "en" | "no" = "en") => renderReady(<Tracker locale={locale} />)

describe("Tracker list", () => {
	it("renders one card per item, with a book link and a flag instead of source links", async () => {
		await ready()
		expect(screen.getByRole("heading", { name: "Wildlife", level: 2 })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: /reptiles/i, level: 3 })).toBeInTheDocument()
		expect(screen.getByText("Expected, as in GTA V")).toBeInTheDocument()
		expect(document.querySelectorAll("li.item")).toHaveLength(3)
		expect(screen.queryByRole("link", { name: "Site" })).toBeNull()

		const book = screen.getByRole("link", { name: "Sources: Pelican" })
		expect(book).toHaveAttribute("href", "/en/tracker/sources/#wildlife/pelican")
		expect(book).not.toHaveAttribute("aria-label")
		expect(book.querySelector(".tip")).toHaveAttribute("aria-hidden", "true")
		expect(book.querySelector(".tip")).toHaveTextContent("Sources")

		const flags = screen.getAllByRole("button", { name: "Report: coming soon" })
		expect(flags).toHaveLength(3)
		expect(flags[0]).toHaveAttribute("aria-disabled", "true")
		// aria-disabled, not disabled: it stays focusable so its tooltip is reachable.
		expect(flags[0]).not.toBeDisabled()

		// Tab runs top to bottom: checkbox, book (top right), flag (bottom right).
		const card = document.querySelector("li.item") as HTMLElement
		expect([...card.querySelectorAll("input, a, button")].map((e) => e.tagName)).toEqual([
			"INPUT",
			"A",
			"BUTTON",
		])
	})

	it("toggles an item from its label, and a flag tap shows the tooltip without toggling", async () => {
		await ready()
		fireEvent.click(screen.getByText("Pelican"))
		// The tick goes through IndexedDB before the controlled checkbox re-renders.
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())

		const unwire = wireTooltips(document)
		const flag = screen.getAllByRole("button", { name: "Report: coming soon" })[0]
		fireEvent.click(flag)
		expect(flag).toHaveAttribute("data-tip-open")
		expect(screen.getByRole("checkbox", { name: "Bike" })).not.toBeChecked()
		unwire()
	})

	it("ticking announces the category count in the live region", async () => {
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Wildlife: 1 of 2"))
		expect(screen.getByRole("checkbox", { name: "American alligator" })).toBeChecked()
	})
})

describe("Category toggles", () => {
	it("start on All, mirror to ?show=, and All clears", async () => {
		await ready()
		const all = screen.getByRole("button", { name: "All" })
		const vehicles = screen.getByRole("button", { name: "Vehicles" })
		expect(all).toHaveAttribute("aria-pressed", "true")
		fireEvent.click(vehicles)
		expect(vehicles).toHaveAttribute("aria-pressed", "true")
		expect(all).toHaveAttribute("aria-pressed", "false")
		expect(window.location.search).toBe("?show=vehicles")
		expect(screen.queryByRole("heading", { name: "Wildlife", level: 2 })).not.toBeInTheDocument()
		fireEvent.click(all)
		expect(all).toHaveAttribute("aria-pressed", "true")
		expect(window.location.search).toBe("")
	})

	it("ends the chip row with a Sources link, not a toggle", async () => {
		await ready()
		const nav = screen.getByRole("navigation", { name: "Categories" })
		const items = [...nav.querySelectorAll("li")]
		const last = items[items.length - 1].firstElementChild
		expect(last?.tagName).toBe("A")
		expect(last).toHaveAttribute("href", "/en/tracker/sources/")
		expect(last).toHaveTextContent("Sources")
		expect(last).not.toHaveAttribute("aria-pressed")
	})

	it("reads a deep link and drops unknown ids", async () => {
		window.history.replaceState(null, "", "/en/tracker/?show=wildlife,evil")
		await ready()
		expect(screen.getByRole("button", { name: "Wildlife" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false")
		expect(window.location.search).toBe("?show=wildlife")
	})

	it("has no Rumours link now that News is a tab", async () => {
		await ready()
		expect(screen.queryByRole("link", { name: "Rumours" })).toBeNull()
	})
})

describe("Tracker accessibility", () => {
	it("has no axe violations", async () => {
		const { container } = await ready()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Arriving from the Sources page (feedback spec §4)", () => {
	const scroll = vi.fn()
	beforeEach(() => {
		scroll.mockClear()
		Element.prototype.scrollIntoView = scroll
	})

	it("waits for the store, then focuses the checkbox once, even with a slash in the id", async () => {
		window.history.replaceState(null, "", "/en/tracker/#item-wildlife/pelican")
		render(<Tracker locale="en" />)
		const box = await screen.findByRole("checkbox", { name: "Pelican" })
		await waitFor(() => expect(document.activeElement).toBe(box))
		expect(box).toBeEnabled()
		expect(scroll).toHaveBeenCalledOnce()
		expect(scroll).toHaveBeenCalledWith({ block: "center" })
	})

	it.each(["#item-wildlife/dodo", "#item-%", "#nothing"])(
		"does nothing for %j and the tracker stays mounted",
		async (hash) => {
			window.history.replaceState(null, "", `/en/tracker/${hash}`)
			await ready()
			expect(document.activeElement).toBe(document.body)
			expect(scroll).not.toHaveBeenCalled()
			expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeInTheDocument()
		}
	)
})
