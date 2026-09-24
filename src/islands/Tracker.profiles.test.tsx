// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { downloads, openMenu, renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

beforeEach(resetBrowser)

const ready = () => renderReady(<Tracker locale="en" />)

describe("profiles in the island", () => {
	it("creates a profile through the name dialog and switches to it", async () => {
		await ready()
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "New profile" }))
		const dialog = screen.getByRole("dialog", { name: "New profile" })
		fireEvent.change(within(dialog).getByLabelText("Profile name"), { target: { value: "Dad" } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
		const trigger = await screen.findByRole("button", { name: "Profile: Dad" })
		// The save lands outside an event handler, so the close effect that removes the dialog and
		// returns focus flushes a tick later.
		await waitFor(() =>
			expect(screen.queryByRole("heading", { name: "New profile" })).not.toBeInTheDocument()
		)
		await waitFor(() => expect(trigger).toHaveFocus())
	})

	it("shows a blank-name error inside the dialog", async () => {
		await ready()
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }))
		const dialog = screen.getByRole("dialog", { name: "Rename Player 1" })
		fireEvent.change(within(dialog).getByLabelText("Profile name"), { target: { value: "  " } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
		await waitFor(() =>
			expect(within(dialog).getByRole("alert")).toHaveTextContent("Give the profile a name")
		)
		expect(screen.getByRole("heading", { name: "Rename Player 1" })).toBeInTheDocument()
		// The error belongs to the dialog: cancelling clears it and the root alert never showed it.
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
		await waitFor(() =>
			expect(screen.queryByRole("heading", { name: "Rename Player 1" })).not.toBeInTheDocument()
		)
		expect(screen.queryByText(/Give the profile a name/)).not.toBeInTheDocument()
	})

	it("delete offers export first, then soft-deletes and falls back to a fresh default", async () => {
		await ready()
		const box = screen.getByRole("checkbox", { name: "American alligator" })
		fireEvent.click(box)
		// The tick is async: wait for it to land, or the "not checked" check below passes vacuously.
		await waitFor(() => expect(box).toBeChecked())
		const trigger = openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
		const dialog = screen.getByRole("dialog", { name: "Delete Player 1?" })
		const buttons = within(dialog).getAllByRole("button")
		expect(buttons.map((b) => b.textContent)).toEqual(["Export first", "Delete", "Cancel"])
		fireEvent.click(buttons[0])
		expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("heading", { name: "Delete Player 1?" })).toBeInTheDocument()
		fireEvent.click(buttons[1])
		await waitFor(() =>
			expect(screen.queryByRole("heading", { name: "Delete Player 1?" })).not.toBeInTheDocument()
		)
		expect(trigger).toHaveFocus()
		await waitFor(() =>
			expect(screen.getByRole("checkbox", { name: "American alligator" })).not.toBeChecked()
		)
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "Deleted profiles" }))
		const deleted = screen.getByRole("dialog", { name: "Deleted profiles" })
		fireEvent.click(within(deleted).getByRole("button", { name: "Restore Player 1" }))
		await waitFor(() =>
			expect(
				within(deleted).queryByRole("button", { name: "Restore Player 1" })
			).not.toBeInTheDocument()
		)
		expect(within(deleted).getByRole("button", { name: "Close" })).toHaveFocus()
	})

	it("export downloads a file named after the profile", async () => {
		await ready()
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "Export" }))
		expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
		expect(downloads).toHaveLength(1)
		expect(downloads[0].download).toMatch(/^rookdex-player-1-\d{4}-\d{2}-\d{2}\.json$/)
		expect(downloads[0].href).toBe("blob:rookdex")
	})
})
