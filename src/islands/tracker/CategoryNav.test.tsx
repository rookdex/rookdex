// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { type Locale, translator } from "../../i18n"
import { CategoryNav } from "./CategoryNav"

const categories = [
	{ id: "vehicles", label: "Vehicles", done: 40, total: 148 },
	{ id: "wildlife", label: "Wildlife", done: 5, total: 24 },
]

function renderNav(selected: string[] = [], locale: Locale = "en") {
	const onSelect = vi.fn()
	const view = render(
		<CategoryNav
			categories={categories}
			overall={{ done: 45, total: 172 }}
			selected={selected}
			onSelect={onSelect}
			allLabel="All"
			navLabel="Categories"
			sources={{ href: "/en/tracker/sources/", label: "Sources" }}
			t={translator(locale).t}
		/>
	)
	return { onSelect, ...view }
}

describe("CategoryNav tiles (tracker refresh spec §4.1)", () => {
	it("names each tile with its count in words and hides the digits and the bar", () => {
		renderNav()
		expect(screen.getByRole("button", { name: "All, 45 of 172" })).toHaveAttribute(
			"aria-pressed",
			"true"
		)
		const vehicles = screen.getByRole("button", { name: "Vehicles, 40 of 148" })
		expect(vehicles).toHaveAttribute("aria-pressed", "false")
		expect(vehicles.querySelector(".tile-count")).toHaveAttribute("aria-hidden", "true")
		expect(vehicles.querySelector(".tile-count")).toHaveTextContent("40/148")
		expect(vehicles.querySelector(".tile-bar")).toHaveAttribute("aria-hidden", "true")
		expect(vehicles.querySelector(".bar-fill")).toHaveStyle({ width: "27%" })
		expect(vehicles.querySelector('[role="progressbar"]')).toBeNull()
	})

	it("says the count in the page language", () => {
		renderNav([], "nb")
		expect(screen.getByRole("button", { name: "All, 45 av 172" })).toBeInTheDocument()
	})

	it("keeps multi-select: a second category adds, a pressed one leaves, All clears", () => {
		const { onSelect } = renderNav(["vehicles"])
		fireEvent.click(screen.getByRole("button", { name: /^Wildlife,/ }))
		expect(onSelect).toHaveBeenLastCalledWith(["vehicles", "wildlife"])
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		expect(onSelect).toHaveBeenLastCalledWith([])
		fireEvent.click(screen.getByRole("button", { name: /^All,/ }))
		expect(onSelect).toHaveBeenLastCalledWith([])
	})

	it("ends with Sources as a link without aria-pressed, and has no axe violations", async () => {
		const { container } = renderNav()
		const sources = screen.getByRole("link", { name: "Sources" })
		expect(sources).toHaveAttribute("href", "/en/tracker/sources/")
		expect(sources).not.toHaveAttribute("aria-pressed")
		expect(await axe(container)).toHaveNoViolations()
	})
})
