// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { TOAST_MS, UndoToast } from "./UndoToast"

const { t } = translator("en")

function Page({
	onClose = vi.fn(),
	onUndo = vi.fn(),
	onEscapeFocus = vi.fn(),
	error = "",
}: {
	onClose?: () => void
	onUndo?: () => void
	onEscapeFocus?: () => void
	error?: string
}) {
	const zone = useRef<HTMLElement>(null)
	return (
		<main>
			<section ref={zone} aria-label="What's next">
				<button type="button">Row</button>
				<UndoToast
					item={{ id: "wildlife/pelican", name: "Pelican" }}
					error={error}
					onUndo={onUndo}
					onClose={onClose}
					zoneRef={zone}
					onEscapeFocus={onEscapeFocus}
					t={t}
				/>
			</section>
			<button type="button">Elsewhere</button>
		</main>
	)
}

const focus = (name: string) => act(() => screen.getByRole("button", { name }).focus())
const wait = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms)
	})

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Undo toast (dashboard spec §4, §9)", () => {
	it("waits while focus is in What's next, then closes 5 s after focus leaves", () => {
		const onClose = vi.fn()
		render(<Page onClose={onClose} />)
		focus("Row")
		wait(60_000)
		focus("Undo")
		wait(60_000)
		expect(onClose).not.toHaveBeenCalled()
		focus("Elsewhere")
		wait(TOAST_MS - 1)
		expect(onClose).not.toHaveBeenCalled()
		wait(1)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it("waits while the pointer is over it", () => {
		const onClose = vi.fn()
		render(<Page onClose={onClose} />)
		focus("Elsewhere")
		const toast = screen.getByRole("button", { name: "Undo" }).parentElement as HTMLElement
		fireEvent.pointerEnter(toast)
		wait(60_000)
		expect(onClose).not.toHaveBeenCalled()
		fireEvent.pointerLeave(toast)
		wait(TOAST_MS)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it("closes on Escape inside What's next, and hands focus back from the Undo button", () => {
		const onClose = vi.fn()
		const onEscapeFocus = vi.fn()
		render(<Page onClose={onClose} onEscapeFocus={onEscapeFocus} />)
		focus("Elsewhere")
		fireEvent.keyDown(screen.getByRole("button", { name: "Elsewhere" }), { key: "Escape" })
		expect(onClose).not.toHaveBeenCalled()
		focus("Row")
		fireEvent.keyDown(screen.getByRole("button", { name: "Row" }), { key: "Escape" })
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(onEscapeFocus).not.toHaveBeenCalled()
		focus("Undo")
		fireEvent.keyDown(screen.getByRole("button", { name: "Undo" }), { key: "Escape" })
		expect(onClose).toHaveBeenCalledTimes(2)
		expect(onEscapeFocus).toHaveBeenCalledTimes(1)
	})

	it("runs Undo, shows a failed Undo as an alert, and keeps the page clear of it", async () => {
		const onUndo = vi.fn()
		const { unmount } = render(<Page onUndo={onUndo} error="Saving failed." />)
		expect(screen.getByText("Pelican marked as found.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Undo" })).toHaveAccessibleDescription(
			"Pelican marked as found."
		)
		fireEvent.click(screen.getByRole("button", { name: "Undo" }))
		expect(onUndo).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("alert")).toHaveTextContent("Saving failed.")
		const root = document.documentElement.style
		expect(root.getPropertyValue("--toast-h")).toBe("calc(0px + var(--space-2))")
		unmount()
		expect(root.getPropertyValue("--toast-h")).toBe("")
	})

	it("has no axe violations", async () => {
		const { container } = render(<Page />)
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})
