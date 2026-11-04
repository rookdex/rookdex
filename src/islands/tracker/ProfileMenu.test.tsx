// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { initial, ProfileMenu } from "./ProfileMenu"

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
		<ProfileMenu profiles={profiles} current={profiles[0]} t={translator("en").t} {...handlers} />
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

	it("in switch mode lists only the profiles and the manage link (dashboard spec §4)", async () => {
		const onSwitch = vi.fn()
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={onSwitch}
				manageHref="/en/tracker/"
				t={translator("en").t}
			/>
		)
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
			"Player 1",
			"Dad",
		])
		const manage = screen.getByRole("menuitem", { name: "Manage profiles" })
		expect(manage).toHaveAttribute("href", "/en/tracker/")
		expect(screen.getAllByRole("menuitem")).toHaveLength(1)
		// Arrow keys reach the link like any other item.
		fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" })
		expect(manage).toHaveFocus()
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		expect(onSwitch).toHaveBeenCalledWith("p2")
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(await axe(container)).toHaveNoViolations()
	})

	it("with no actions and no manage link, draws no separator", () => {
		render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				t={translator("en").t}
			/>
		)
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getByRole("menu").querySelector("hr")).toBeNull()
	})
})

describe("ProfileMenu in the title row (tracker refresh spec §5.5)", () => {
	const t = translator("en").t

	it("renders into the slot when it exists, and the menu still works from there", () => {
		const slot = document.createElement("div")
		slot.id = "tracker-profile"
		document.body.append(slot)
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				slotId="tracker-profile"
				t={t}
			/>
		)
		const trigger = screen.getByRole("button", { name: "Profile: Player 1" })
		expect(slot).toContainElement(trigger)
		expect(container).not.toContainElement(trigger)
		fireEvent.click(trigger)
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
		expect(trigger).toHaveFocus()
		slot.remove()
	})

	it("renders in place when the slot is missing", () => {
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				slotId="tracker-profile"
				t={t}
			/>
		)
		expect(container).toContainElement(screen.getByRole("button", { name: "Profile: Player 1" }))
	})

	it("shows an initial avatar hidden from screen readers, then the name", () => {
		render(<ProfileMenu profiles={profiles} current={profiles[1]} onSwitch={vi.fn()} t={t} />)
		const trigger = screen.getByRole("button", { name: "Profile: Dad" })
		expect(trigger.querySelector(".avatar")).toHaveAttribute("aria-hidden", "true")
		expect(trigger.querySelector(".avatar")).toHaveTextContent("D")
		expect(trigger.querySelector(".profile-name")).toHaveTextContent("Dad")
	})
})

describe("initial (tracker refresh spec §5.5)", () => {
	it("takes the first character of the trimmed name, upper-cased", () => {
		expect(initial("  malin ", "en")).toBe("M")
		expect(initial("   ", "en")).toBe("")
	})

	it("keeps a whole emoji or a letter with its combining mark", () => {
		expect(initial("👩‍🚀 Ana", "en")).toBe("👩‍🚀")
		// A decomposed e: the letter and U+0301 are one grapheme.
		expect(initial("e\u0301mile", "en")).toBe("E\u0301")
	})

	it("upper-cases for the page's language", () => {
		expect(initial("istanbul", "tr")).toBe("İ")
	})

	it("falls back to the first code point without Intl.Segmenter", () => {
		const saved = Intl.Segmenter
		Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true })
		try {
			expect(initial("👩‍🚀 Ana", "en")).toBe("👩")
		} finally {
			Object.defineProperty(Intl, "Segmenter", { value: saved, configurable: true })
		}
	})
})
