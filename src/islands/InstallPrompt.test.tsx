// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { InstallPrompt, SEEN_KEY } from "./InstallPrompt"

function fireInstallPrompt() {
	const event = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEvent
	Object.assign(event, { prompt: vi.fn().mockResolvedValue(undefined) })
	act(() => {
		window.dispatchEvent(event)
	})
	return event
}

afterEach(() => {
	localStorage.clear()
})

describe("InstallPrompt", () => {
	it("opens once, is dismissible, remembers the dismissal and returns focus", async () => {
		const trigger = document.createElement("button")
		document.body.append(trigger)
		trigger.focus()

		render(<InstallPrompt locale="en" />)
		const dialog = screen.getByRole("dialog", { hidden: true })
		expect(dialog).not.toHaveAttribute("open")

		const event = fireInstallPrompt()
		expect(event.defaultPrevented).toBe(true)
		expect(dialog).toHaveAttribute("open")
		expect(await axe(dialog)).toHaveNoViolations()

		act(() => {
			screen.getByRole("button", { name: "Not now" }).click()
		})
		expect(dialog).not.toHaveAttribute("open")
		expect(localStorage.getItem(SEEN_KEY)).toBe("1")
		expect(document.activeElement).toBe(trigger)

		fireInstallPrompt()
		expect(dialog).not.toHaveAttribute("open")
		trigger.remove()
	})

	it("calls prompt() on install", () => {
		render(<InstallPrompt locale="no" />)
		const event = fireInstallPrompt()
		act(() => {
			screen.getByRole("button", { name: "Installer" }).click()
		})
		expect(event.prompt).toHaveBeenCalledOnce()
	})
})
