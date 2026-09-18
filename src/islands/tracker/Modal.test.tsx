// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Modal } from "./Modal"

afterEach(() => {
	document.body.replaceChildren()
})

describe("Modal", () => {
	it("moves focus in on open and, on the native close event, calls onClose and returns focus", () => {
		const opener = document.createElement("button")
		opener.textContent = "Opener"
		document.body.append(opener)
		opener.focus()

		const onClose = vi.fn()
		render(
			<Modal open labelledBy="t" onClose={onClose}>
				<h2 id="t">Title</h2>
				<button type="button">Inside</button>
			</Modal>
		)
		expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus()

		// What Escape does in a browser: the dialog closes itself and fires `close`.
		fireEvent(screen.getByRole("dialog"), new Event("close"))
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(opener).toHaveFocus()
	})

	it("prefers returnTo over the opener", () => {
		const opener = document.createElement("button")
		const target = document.createElement("button")
		document.body.append(opener, target)
		opener.focus()

		render(
			<Modal open labelledBy="t" onClose={() => {}} returnTo={{ current: target }}>
				<h2 id="t">Title</h2>
				<button type="button">Inside</button>
			</Modal>
		)
		fireEvent(screen.getByRole("dialog"), new Event("close"))
		expect(target).toHaveFocus()
	})
})
