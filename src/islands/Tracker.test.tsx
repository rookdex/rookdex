// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { Tracker } from "./Tracker"

const fixtures = vi.hoisted(() => {
	const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
	return [
		{
			id: "vehicles/bike",
			category: "vehicles",
			group: "bikes",
			name: "Bike",
			status: "confirmed" as const,
			sources: [src],
		},
		{
			id: "wildlife/american-alligator",
			category: "wildlife",
			group: "reptiles",
			name: "American alligator",
			status: "confirmed" as const,
			sources: [src],
			description: "Everglades native.",
		},
		{
			id: "wildlife/pelican",
			category: "wildlife",
			group: "birds",
			name: "Pelican",
			status: "expected" as const,
			precedent: "GTA V",
			sources: [src],
		},
	]
})
vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	return { ...actual, seedItems: fixtures }
})

beforeEach(() => {
	Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true })
	window.history.replaceState(null, "", "/en/tracker/")
})

async function renderReady(locale: "en" | "no" = "en") {
	const view = render(<Tracker locale={locale} rumoursHref="/en/tracker/rumours/" />)
	const box = await screen.findByRole("checkbox", { name: "American alligator" })
	await waitFor(() => expect(box).toBeEnabled())
	return view
}

describe("Tracker list", () => {
	it("renders groups, tiers, sources and a disabled report button", async () => {
		await renderReady()
		expect(screen.getByRole("heading", { name: "Wildlife", level: 2 })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: /reptiles/i, level: 3 })).toBeInTheDocument()
		expect(screen.getByText("Expected, as in GTA V")).toBeInTheDocument()
		expect(screen.getAllByRole("link", { name: "Site" })[0]).toHaveAttribute(
			"rel",
			"noopener noreferrer"
		)
		const report = screen.getAllByRole("button", { name: "Report" })[0]
		expect(report).toBeDisabled()
		expect(report).toHaveAttribute("title", "Reporting a wrong item comes in the next release")
	})

	it("ticking announces the category count in the live region", async () => {
		await renderReady()
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Wildlife: 1 of 2"))
		expect(screen.getByRole("checkbox", { name: "American alligator" })).toBeChecked()
	})
})

describe("Category toggles", () => {
	it("start on All, mirror to ?show=, and All clears", async () => {
		await renderReady()
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

	it("reads a deep link and drops unknown ids", async () => {
		window.history.replaceState(null, "", "/en/tracker/?show=wildlife,evil")
		await renderReady()
		expect(screen.getByRole("button", { name: "Wildlife" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false")
		expect(window.location.search).toBe("?show=wildlife")
	})

	it("links to Rumours", async () => {
		await renderReady()
		expect(screen.getByRole("link", { name: "Rumours" })).toHaveAttribute(
			"href",
			"/en/tracker/rumours/"
		)
	})
})

describe("Tracker accessibility", () => {
	it("has no axe violations", async () => {
		const { container } = await renderReady()
		expect(await axe(container)).toHaveNoViolations()
	})
})
