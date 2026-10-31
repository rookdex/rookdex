// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
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

	it("points to other categories and shows them all on request", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
		type("pelican")
		expect(names()).toEqual([])
		expect(screen.getByText("1 more in other categories")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Show all categories" }))
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true")
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
})

describe("Tracker search announcements (tracker search spec §5)", () => {
	it("announces the result once typing settles", async () => {
		await ready()
		type("peli")
		expect(status()).not.toHaveTextContent("1 result")
		await waitFor(() => expect(status()).toHaveTextContent("1 result"))
	})

	it("announces the other categories when the chips hold no match", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
		type("pelican")
		await waitFor(() =>
			expect(status()).toHaveTextContent(
				"No results in the selected categories. 1 in other categories."
			)
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

	it("drops a pending result when the chips change", async () => {
		await ready()
		type("peli")
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
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

	it("keeps one status region", async () => {
		await ready()
		expect(screen.getAllByRole("status")).toHaveLength(1)
	})
})
