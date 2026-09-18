// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { en } from "../../i18n/en"
import { ProfileMenu } from "./ProfileMenu"

const profiles = [
	{ id: "p1", name: "Player 1", created_at: "2026-09-01T00:00:00.000Z" },
	{ id: "p2", name: "Dad", created_at: "2026-09-02T00:00:00.000Z" },
]

function setup() {
	const handlers = {
		onSwitch: vi.fn(),
		onNew: vi.fn(),
		onRename: vi.fn(),
		onExport: vi.fn(),
		onImport: vi.fn(),
		onDelete: vi.fn(),
		onDeleted: vi.fn(),
	}
	const view = render(
		<ProfileMenu profiles={profiles} current={profiles[0]} strings={en.profile} {...handlers} />
	)
	return { ...handlers, ...view }
}

describe("ProfileMenu", () => {
	it("is a menu button that opens, moves focus in, and closes on Escape returning focus", () => {
		setup()
		const trigger = screen.getByRole("button", { name: "Profile: Player 1" })
		expect(trigger).toHaveAttribute("aria-haspopup", "menu")
		expect(trigger).toHaveAttribute("aria-expanded", "false")
		fireEvent.click(trigger)
		expect(trigger).toHaveAttribute("aria-expanded", "true")
		const menu = screen.getByRole("menu")
		const first = screen.getByRole("menuitemradio", { name: "Player 1" })
		expect(first).toHaveFocus()
		expect(first).toHaveAttribute("aria-checked", "true")
		fireEvent.keyDown(menu, { key: "ArrowDown" })
		expect(screen.getByRole("menuitemradio", { name: "Dad" })).toHaveFocus()
		fireEvent.keyDown(menu, { key: "Escape" })
		expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
	})

	it("Tab closes the menu and puts focus back on the trigger, so Tab moves on from there", () => {
		setup()
		const trigger = screen.getByRole("button", { name: "Profile: Player 1" })
		fireEvent.click(trigger)
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab" })
		expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
	})

	it("runs the action, closes and returns focus", () => {
		const { onDelete, onSwitch } = setup()
		const trigger = screen.getByRole("button", { name: "Profile: Player 1" })
		fireEvent.click(trigger)
		fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(screen.queryByRole("menu")).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
		fireEvent.click(trigger)
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		expect(onSwitch).toHaveBeenCalledWith("p2")
	})

	it("has no axe violations open", async () => {
		const { container } = setup()
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(await axe(container)).toHaveNoViolations()
	})
})
