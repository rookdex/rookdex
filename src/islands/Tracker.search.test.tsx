// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openMenu, renderReady, resetBrowser } from "../test/tracker-fixtures"
import { HIDE_FOUND_KEY } from "./seenFlag"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

// jsdom's File may lack text(); the island only needs size + text().
if (typeof File.prototype.text !== "function") {
	File.prototype.text = function () {
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = () => resolve(String(reader.result))
			reader.readAsText(this)
		})
	}
}

beforeEach(resetBrowser)

const ready = (locale: "en" | "nb" = "en") => renderReady(<Tracker locale={locale} />)
const field = () => screen.getByRole("searchbox")
const type = (value: string) => fireEvent.change(field(), { target: { value } })
const names = () => screen.queryAllByRole("checkbox").map((box) => box.getAttribute("id"))
const status = () => screen.getByRole("status")
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const tick = async (name: string) => {
	fireEvent.click(screen.getByRole("checkbox", { name }))
	await waitFor(() => expect(screen.getByRole("checkbox", { name })).toBeChecked())
}

describe("Tracker search (tracker search spec §4)", () => {
	it("filters on every keystroke by name and by group term", async () => {
		await ready()
		type("peli")
		expect(names()).toEqual(["item-wildlife/pelican"])
		type("dyr")
		expect(names()).toEqual(["item-wildlife/pelican", "item-wildlife/american-alligator"])
	})

	it("finds the same items with English terms on the Norwegian page", async () => {
		await ready("nb")
		type("animal")
		expect(names()).toEqual(["item-wildlife/pelican", "item-wildlife/american-alligator"])
	})

	it("keeps a ticked item visible with Hide found on until the search changes", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		expect(names()).toContain("item-wildlife/pelican")
		type("peli")
		expect(names()).toEqual([])
		expect(
			screen.getByText("Everything that matches is found. Turn off Hide found to see it.")
		).toBeInTheDocument()
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBe("1")
	})

	it("points to matches outside the filters and clears them on request", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		type("pelican")
		expect(names()).toEqual([])
		expect(screen.getByText("1 more outside your filters")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
		expect(screen.getByRole("button", { name: /^All,/ })).toHaveAttribute("aria-pressed", "true")
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(document.activeElement).toBe(field())
		expect(field()).toHaveValue("pelican")
		expect(status()).toHaveTextContent("1 result")
	})

	it("says when nothing matches, as text", async () => {
		await ready()
		type("<b>zzz</b>")
		expect(screen.getByText('No match for "<b>zzz</b>".')).toBeInTheDocument()
		expect(document.querySelector(".tracker b")).toBeNull()
	})

	it("hides what was found before a reload when Hide found is remembered", async () => {
		const first = await ready()
		await tick("Pelican")
		first.unmount()
		localStorage.setItem(HIDE_FOUND_KEY, "1")

		await ready()
		expect(names()).not.toContain("item-wildlife/pelican")
		expect(names()).toHaveLength(2)
		const toggle = screen.getByRole("button", { name: /^Hide found/ })
		expect(toggle).toHaveAttribute("aria-pressed", "true")
		expect(toggle).toHaveAccessibleName("Hide found 1 hidden")
	})

	it("spares the item a Sources back link points at until the search changes", async () => {
		const first = await ready()
		await tick("Pelican")
		await tick("Bike")
		first.unmount()
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		window.history.replaceState(null, "", "/en/tracker/#item-wildlife/pelican")

		await ready()
		const pelican = screen.getByRole("checkbox", { name: "Pelican" })
		await waitFor(() => expect(document.activeElement).toBe(pelican))
		expect(names()).not.toContain("item-vehicles/bike")
		expect(screen.getByRole("button", { name: /^Hide found/ })).toHaveAccessibleName(
			"Hide found 1 hidden"
		)
		// Any change to the search takes a new snapshot, and that one spares nothing.
		type("a")
		type("")
		expect(names()).toEqual(["item-wildlife/american-alligator"])
		expect(screen.getByRole("button", { name: /^Hide found/ })).toHaveAccessibleName(
			"Hide found 2 hidden"
		)
	})

	it("hides what an import brings in when Hide found is on", async () => {
		const { container } = await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		const input = container.querySelector<HTMLInputElement>('input[type="file"]')
		if (!input) throw new Error("no file input")
		const file = new File(
			[
				JSON.stringify({
					version: 1,
					exported_at: "2026-09-16T10:00:00.000Z",
					profile_name: "Dad",
					records: [
						{
							item_id: "wildlife/american-alligator",
							done: true,
							updated_at: "2026-09-16T09:00:00.000Z",
							origin: "manual",
						},
					],
				}),
			],
			"rookdex-dad.json",
			{ type: "application/json" }
		)
		fireEvent.change(input, { target: { files: [file] } })
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Import into Player 1" }))
		await waitFor(() =>
			expect(screen.queryByRole("checkbox", { name: "American alligator" })).toBeNull()
		)
	})

	// Restore keeps the current profile, but the snapshot is still retaken (as-built note).
	it("takes a new snapshot when a deleted profile is restored", async () => {
		await ready()
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
		const confirm = screen.getByRole("dialog", { name: "Delete Player 1?" })
		fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }))
		// The dialog closes before the switch to the fresh default profile lands, so wait for that.
		const openDeleted = () => {
			openMenu()
			fireEvent.click(screen.getByRole("menuitem", { name: "Deleted profiles" }))
			return screen.getByRole("dialog", { name: "Deleted profiles" })
		}
		const deleted = openDeleted()
		await within(deleted).findByRole("button", { name: "Restore Player 1" })
		fireEvent.click(within(deleted).getByRole("button", { name: "Close" }))

		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		await tick("Pelican")
		expect(names()).toContain("item-wildlife/pelican")

		fireEvent.click(within(openDeleted()).getByRole("button", { name: "Restore Player 1" }))
		await waitFor(() => expect(names()).not.toContain("item-wildlife/pelican"))
		expect(screen.getByRole("button", { name: /^Hide found/ })).toHaveAccessibleName(
			"Hide found 1 hidden"
		)
	})
})

describe("Tracker search announcements (tracker search spec §5)", () => {
	it("announces the result once typing settles", async () => {
		await ready()
		type("peli")
		expect(status()).not.toHaveTextContent("1 result")
		await waitFor(() => expect(status()).toHaveTextContent("1 result"))
	})

	it("announces the matches outside the filters", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		type("pelican")
		await waitFor(() =>
			expect(status()).toHaveTextContent("No results inside your filters. 1 outside them.")
		)
	})

	it("announces everything found the way the screen shows it", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		type("peli")
		await waitFor(() =>
			expect(status()).toHaveTextContent(
				"Everything that matches is found. Turn off Hide found to see it."
			)
		)
	})

	it("announces the no-match text the way the screen shows it", async () => {
		await ready()
		type("zzzz")
		await waitFor(() => expect(status()).toHaveTextContent('No match for "zzzz".'))
		expect(status()).not.toHaveTextContent("0 results")
	})

	it("drops a pending result when the tiles change", async () => {
		await ready()
		type("peli")
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		await wait(700)
		expect(status()).not.toHaveTextContent("1 result")
	})

	it("lets a tick cancel a pending result", async () => {
		await ready()
		type("alli")
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		await waitFor(() => expect(status()).toHaveTextContent("Wildlife: 1 of 2"))
		await wait(700)
		expect(status()).toHaveTextContent("Wildlife: 1 of 2")
	})

	it("announces Hide found on with its count, and off", async () => {
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		expect(status()).toHaveTextContent("Hide found on. 1 hidden.")
		fireEvent.click(screen.getByRole("button", { name: /^Hide found/ }))
		expect(status()).toHaveTextContent("Hide found off.")
	})

	it("announces a cleared search from the button and from Escape", async () => {
		await ready()
		type("peli")
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(field()).toHaveValue("")
		expect(status()).toHaveTextContent("Search cleared")
		type("peli")
		await waitFor(() => expect(status()).toHaveTextContent("1 result"))
		fireEvent.keyDown(field(), { key: "Escape" })
		expect(field()).toHaveValue("")
		expect(status()).toHaveTextContent("Search cleared")
	})

	it("moves focus to the results on Enter and says the count at once", async () => {
		await ready()
		type("peli")
		fireEvent.keyDown(field(), { key: "Enter" })
		expect(status()).toHaveTextContent("1 result")
		const results = document.querySelector(".tracker-results")
		expect(document.activeElement).toBe(results)
		expect(results).toHaveAttribute("tabindex", "-1")
		type("zzz")
		fireEvent.keyDown(field(), { key: "Enter" })
		expect(document.activeElement).toBe(results)
		expect(within(results as HTMLElement).getByText(/zzz/)).toBeInTheDocument()
	})

	it("scrolls the list's start into view again while the phone keyboard closes", async () => {
		const scroll = vi.fn()
		Element.prototype.scrollIntoView = scroll
		const viewport = new EventTarget()
		Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true })
		// jsdom lays nothing out, so every top is 0: a zero-height window puts the list off screen.
		Object.defineProperty(window, "innerHeight", { value: 0, configurable: true })
		try {
			await ready()
			type("boat")
			fireEvent.keyDown(field(), { key: "Enter" })
			expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: "start" })
			viewport.dispatchEvent(new Event("resize"))
			expect(scroll).toHaveBeenCalledTimes(2)
			// A finger on the page means the user scrolls from here, so the list stops following.
			fireEvent.touchStart(window)
			viewport.dispatchEvent(new Event("resize"))
			expect(scroll).toHaveBeenCalledTimes(2)
		} finally {
			Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true })
			Object.defineProperty(window, "innerHeight", { value: 768, configurable: true })
		}
	})

	it("keeps one status region", async () => {
		await ready()
		expect(screen.getAllByRole("status")).toHaveLength(1)
	})
})
