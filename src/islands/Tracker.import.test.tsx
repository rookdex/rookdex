// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { BACKUP_KEY } from "./seenFlag"
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

const ready = () => renderReady(<Tracker locale="en" />)

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
			expect(screen.getByRole("alert")).toHaveTextContent("That file is damaged and can't be read.")
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

const liveText = () => document.querySelector(".tracker > p.visually-hidden[role='status']")

describe("import feedback", () => {
	it("says how many items came in and into which profile", async () => {
		const { container } = await ready()
		pickFile(container, dadExport)
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Import into Player 1" }))
		await screen.findByText("Imported 1 item into Player 1.", { selector: ".tracker-note" })
		expect(liveText()).toHaveTextContent("Imported 1 item into Player 1.")
	})

	it("names the new profile when the file creates one", async () => {
		const { container } = await ready()
		pickFile(container, dadExport)
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Create profile Dad from this file" })
		)
		await screen.findByText("Imported 1 item into Dad.", { selector: ".tracker-note" })
	})

	it.each([
		[JSON.stringify({ version: 9 }), "That file comes from a newer Rookdex."],
		[JSON.stringify({ hello: "world" }), "That file isn't a Rookdex backup or export."],
		["{broken", "That file is damaged and can't be read."],
	])("gives the reason a file is refused", async (contents, reason) => {
		const { container } = await ready()
		pickFile(container, contents)
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(reason))
	})

	it("restores every profile from a backup file", async () => {
		const backup = JSON.stringify({
			version: 2,
			exported_at: "2026-11-12T10:00:00.000Z",
			profiles: [
				{ name: "Player 1", records: [] },
				{
					name: "Dad",
					records: [
						{
							item_id: "wildlife/american-alligator",
							done: true,
							updated_at: "2026-11-12T09:00:00.000Z",
							origin: "manual",
						},
					],
				},
			],
		})
		const { container } = await ready()
		pickFile(container, backup)
		const dialog = await screen.findByRole("dialog", {
			name: "Restore the backup from 12.11.2026?",
		})
		expect(dialog).toHaveTextContent("It holds Player 1, Dad.")
		fireEvent.click(within(dialog).getByRole("button", { name: "Restore all" }))
		await screen.findByText("Restored 2 profiles: Player 1, Dad. 1 item came in.", {
			selector: ".tracker-note",
		})
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(await screen.findByRole("menuitemradio", { name: "Dad" })).toBeInTheDocument()
	})
})

describe("backup reminder", () => {
	function stubDownload() {
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
		Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} })
		return click
	}

	it("appears after the 25th new tick, spoken politely, and Not now hides it", async () => {
		localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: null, ticks: 24 }))
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		const text =
			"25 ticks and no backup yet. A backup file keeps them safe if this browser is cleared."
		const nudge = (
			await screen.findByText(text, { exact: false, selector: ".backup-nudge > span" })
		).closest("p") as HTMLElement
		await waitFor(() => expect(liveText()).toHaveTextContent(text))
		expect(nudge.getAttribute("role")).toBeNull()
		expect(document.activeElement).not.toBe(
			within(nudge).getByRole("button", { name: "Back up now" })
		)
		fireEvent.click(within(nudge).getByRole("button", { name: "Not now" }))
		expect(
			screen.queryByText(text, { exact: false, selector: ".backup-nudge > span" })
		).not.toBeInTheDocument()
		expect(JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "").ticks).toBe(0)
		expect(liveText()).toHaveTextContent("Reminder hidden until 25 more ticks.")
	})

	it("Back up now saves every profile and stamps the date", async () => {
		const click = stubDownload()
		localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: "2026-11-01T10:00:00.000Z", ticks: 30 }))
		await ready()
		const nudge = (
			await screen.findByText(/30 new ticks since your last backup/, {
				selector: ".backup-nudge > span",
			})
		).closest("p") as HTMLElement
		fireEvent.click(within(nudge).getByRole("button", { name: "Back up now" }))
		await waitFor(() => expect(click).toHaveBeenCalled())
		const anchor = click.mock.contexts[0] as HTMLAnchorElement
		expect(anchor.download).toMatch(/^rookdex-backup-\d{4}-\d{2}-\d{2}\.json$/)
		const log = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "")
		expect(log.ticks).toBe(0)
		expect(log.at).not.toBe("2026-11-01T10:00:00.000Z")
		await waitFor(() => expect(liveText()).toHaveTextContent(`Backup saved as ${anchor.download}.`))
		expect(
			screen.queryByText(/new ticks since/, { selector: ".backup-nudge > span" })
		).not.toBeInTheDocument()
		click.mockRestore()
	})

	it("passes axe with the reminder and the restore dialog showing", async () => {
		localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: null, ticks: 30 }))
		const { container } = await ready()
		await screen.findByText(/ticks and no backup yet/, { selector: ".backup-nudge > span" })
		pickFile(
			container,
			JSON.stringify({
				version: 2,
				exported_at: "2026-11-12T10:00:00.000Z",
				profiles: [{ name: "Dad", records: [] }],
			})
		)
		await screen.findByRole("dialog", { name: "Restore the backup from 12.11.2026?" })
		expect(await axe(document.body)).toHaveNoViolations()
	})

	it("a single-profile export counts as a backup too", async () => {
		const click = stubDownload()
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		fireEvent.click(await screen.findByRole("menuitem", { name: "Export" }))
		expect(click).toHaveBeenCalled()
		expect(JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "").at).not.toBeNull()
		click.mockRestore()
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
