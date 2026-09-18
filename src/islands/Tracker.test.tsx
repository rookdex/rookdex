// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

beforeEach(resetBrowser)

const ready = (locale: "en" | "no" = "en") =>
	renderReady(<Tracker locale={locale} rumoursHref="/en/tracker/rumours/" />)

describe("Tracker list", () => {
	it("renders groups, tiers, sources and a disabled report button", async () => {
		await ready()
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

	it("reads a deep link and drops unknown ids", async () => {
		window.history.replaceState(null, "", "/en/tracker/?show=wildlife,evil")
		await ready()
		expect(screen.getByRole("button", { name: "Wildlife" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false")
		expect(window.location.search).toBe("?show=wildlife")
	})

	it("links to Rumours", async () => {
		await ready()
		expect(screen.getByRole("link", { name: "Rumours" })).toHaveAttribute(
			"href",
			"/en/tracker/rumours/"
		)
	})
})

describe("Tracker accessibility", () => {
	it("has no axe violations", async () => {
		const { container } = await ready()
		expect(await axe(container)).toHaveNoViolations()
	})
})
