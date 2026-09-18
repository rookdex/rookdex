// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { HINT_KEY, Tracker } from "./Tracker"

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

function stubPersist(granted: boolean) {
	Object.defineProperty(navigator, "storage", {
		value: { persist: () => Promise.resolve(granted) },
		configurable: true,
	})
}

beforeEach(() => {
	resetBrowser()
	stubPersist(true)
	localStorage.clear()
})

const ready = () => renderReady(<Tracker locale="en" rumoursHref="/en/tracker/rumours/" />)

function pickFile(container: HTMLElement, contents: string, name = "rookdex-dad.json") {
	const input = container.querySelector<HTMLInputElement>('input[type="file"]')
	if (!input) throw new Error("no file input")
	const file = new File([contents], name, { type: "application/json" })
	fireEvent.change(input, { target: { files: [file] } })
}

const dadExport = JSON.stringify({
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
})

describe("import", () => {
	it("shows an invalid file as words in the alert region", async () => {
		const { container } = await ready()
		pickFile(container, "{not json")
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent("That file isn't JSON.")
		)
		expect(screen.queryByRole("heading", { name: /^Import / })).not.toBeInTheDocument()
	})

	it("names both sides and imports into the current profile", async () => {
		const { container } = await ready()
		pickFile(container, dadExport)
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Import into Player 1" }))
		await waitFor(() =>
			expect(screen.queryByRole("heading", { name: /^Import / })).not.toBeInTheDocument()
		)
		expect(screen.getByRole("checkbox", { name: "American alligator" })).toBeChecked()
	})

	it("can create the profile named in the file instead", async () => {
		const { container } = await ready()
		pickFile(container, dadExport)
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Create profile Dad from this file" })
		)
		await screen.findByRole("button", { name: "Profile: Dad" })
		expect(screen.getByRole("checkbox", { name: "American alligator" })).toBeChecked()
	})

	it("cancel keeps everything as it was", async () => {
		const { container } = await ready()
		pickFile(container, dadExport)
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
		await waitFor(() =>
			expect(screen.queryByRole("heading", { name: /^Import / })).not.toBeInTheDocument()
		)
		expect(screen.getByRole("checkbox", { name: "American alligator" })).not.toBeChecked()
		// Focus goes to the menu button, not to whatever the file picker left focused.
		expect(screen.getByRole("button", { name: "Profile: Player 1" })).toHaveFocus()
	})
})

describe("persistence hint", () => {
	it("appears once when persist() is refused and remembers the dismissal", async () => {
		stubPersist(false)
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		const hint = await screen.findByText(/Install Rookdex or export your profile/)
		fireEvent.click(within(hint).getByRole("button", { name: "Got it" }))
		expect(screen.queryByText(/Install Rookdex/)).not.toBeInTheDocument()
		expect(localStorage.getItem(HINT_KEY)).toBe("1")
	})
})
