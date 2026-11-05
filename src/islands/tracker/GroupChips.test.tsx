// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { seedLabel, translator } from "../../i18n"
import { GroupChips } from "./GroupChips"

const { t } = translator("en")
const counts = {
	"wildlife/birds": { done: 1, total: 3 },
	"wildlife/reptiles": { done: 0, total: 2 },
}

function setup(pressed: string[] = []) {
	const onToggle = vi.fn()
	render(
		<GroupChips
			category="wildlife"
			categoryLabel="Wildlife"
			groups={["birds", "reptiles"]}
			pressed={pressed}
			counts={counts}
			groupLabel={(id) => seedLabel(t, "group", id)}
			onToggle={onToggle}
			t={t}
		/>
	)
	return onToggle
}

describe("GroupChips (tracker refresh spec §14.1)", () => {
	it("is a group named after its category, with a chip per group in list order", () => {
		setup()
		const row = screen.getByRole("group", { name: "Groups: Wildlife" })
		expect(
			within(row)
				.getAllByRole("button")
				.map((b) => b.getAttribute("aria-label"))
		).toEqual(["Birds, 1 of 3", "Reptiles, 0 of 2"])
	})

	it("marks pressed chips with aria-pressed and a hidden ✓, and only those", () => {
		setup(["wildlife/birds"])
		const birds = screen.getByRole("button", { name: "Birds, 1 of 3" })
		const reptiles = screen.getByRole("button", { name: "Reptiles, 0 of 2" })
		expect(birds).toHaveAttribute("aria-pressed", "true")
		expect(reptiles).toHaveAttribute("aria-pressed", "false")
		expect(birds.querySelector(".chip-check")).toHaveAttribute("aria-hidden", "true")
		expect(birds).toHaveTextContent("✓")
		expect(reptiles).not.toHaveTextContent("✓")
	})

	it("shows the count as done/total", () => {
		setup()
		expect(screen.getByRole("button", { name: "Birds, 1 of 3" })).toHaveTextContent("Birds1/3")
	})

	it("hands the group key to onToggle", () => {
		const onToggle = setup()
		fireEvent.click(screen.getByRole("button", { name: "Reptiles, 0 of 2" }))
		expect(onToggle).toHaveBeenCalledWith("wildlife/reptiles")
	})
})
