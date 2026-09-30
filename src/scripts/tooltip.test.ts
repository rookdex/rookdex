// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TAP_TIP_MS, wireTooltips } from "./tooltip"

let unwire: () => void

beforeEach(() => {
	document.body.innerHTML = `
		<button type="button" class="has-tip" id="flag" aria-disabled="true">
			<span class="visually-hidden">Report: coming soon</span>
			<span class="tip" aria-hidden="true">Report: coming soon</span>
		</button>
		<a class="has-tip" id="book" href="#x"><span class="tip" aria-hidden="true">Sources</span></a>
		<button type="button" id="plain">Plain</button>`
	unwire = wireTooltips(document)
})

afterEach(() => {
	unwire()
	vi.useRealTimers()
})

const el = (id: string) => document.getElementById(id) as HTMLElement
const key = (name: string) =>
	new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true })

describe("tooltips (feedback spec §3.3)", () => {
	it("shows a tapped aria-disabled control's tooltip for about 2 s", () => {
		vi.useFakeTimers()
		el("flag").click()
		expect(el("flag").hasAttribute("data-tip-open")).toBe(true)
		vi.advanceTimersByTime(TAP_TIP_MS)
		expect(el("flag").hasAttribute("data-tip-open")).toBe(false)
	})

	it("ignores taps on enabled controls", () => {
		el("book").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
		expect(el("book").hasAttribute("data-tip-open")).toBe(false)
	})

	it("hides the focused control's tooltip on Escape until focus moves", () => {
		el("book").focus()
		const event = key("Escape")
		document.dispatchEvent(event)
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		// Escape still reaches dialogs: nothing is cancelled.
		expect(event.defaultPrevented).toBe(false)
		el("plain").focus()
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})

	it("hides the hovered control's tooltip on Escape until the pointer leaves", () => {
		el("book").dispatchEvent(new MouseEvent("pointerover", { bubbles: true }))
		document.dispatchEvent(key("Escape"))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		// Moving onto the tip itself is still inside the control.
		const tip = el("book").querySelector(".tip") as HTMLElement
		el("book").dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: tip }))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		el("book").dispatchEvent(
			new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })
		)
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})

	it("closes a tapped tooltip on Escape", () => {
		el("flag").click()
		el("flag").focus()
		document.dispatchEvent(key("Escape"))
		expect(el("flag").hasAttribute("data-tip-open")).toBe(false)
		expect(el("flag").hasAttribute("data-tip-hidden")).toBe(true)
	})

	it("ignores other keys", () => {
		el("book").focus()
		document.dispatchEvent(key("Enter"))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})
})
