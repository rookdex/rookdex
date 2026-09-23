// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { wireLanguageMenu } from "./language-menu"

let cleanup: (() => void) | undefined
afterEach(() => cleanup?.())

function setup() {
	document.body.innerHTML = `
		<button type="button" id="outside">Outside</button>
		<nav>
			<details data-language-menu>
				<summary>EN</summary>
				<ul>
					<li><a href="/en/" aria-current="page">English</a></li>
					<li><a href="/no/">Norsk</a></li>
				</ul>
			</details>
		</nav>`
	const details = document.querySelector("details") as HTMLDetailsElement
	cleanup = wireLanguageMenu(details, document)
	const summary = details.querySelector("summary") as HTMLElement
	const [english, norsk] = [...details.querySelectorAll("a")]
	const outside = document.getElementById("outside") as HTMLButtonElement
	return { details, summary, english, norsk, outside }
}

function open(details: HTMLDetailsElement) {
	details.open = true
	details.dispatchEvent(new Event("toggle"))
}

function press(target: Element, key: string) {
	target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
}

describe("wireLanguageMenu (spec §6)", () => {
	it("moves focus to the current language when it opens", () => {
		const { details, english } = setup()
		open(details)
		expect(document.activeElement).toBe(english)
	})

	it("closes on Escape and returns focus to the button", () => {
		const { details, summary, english } = setup()
		open(details)
		press(english, "Escape")
		expect(details.open).toBe(false)
		expect(document.activeElement).toBe(summary)
	})

	it("moves between links with the arrow keys, wrapping at the ends", () => {
		const { details, english, norsk } = setup()
		open(details)
		press(english, "ArrowDown")
		expect(document.activeElement).toBe(norsk)
		press(norsk, "ArrowDown")
		expect(document.activeElement).toBe(english)
		press(english, "ArrowUp")
		expect(document.activeElement).toBe(norsk)
	})

	it("closes on a tap outside, not on one inside", () => {
		const { details, outside } = setup()
		open(details)
		// A click on the panel itself (not the summary, which toggles natively, nor a link, which navigates).
		details.querySelector("ul")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
		expect(details.open).toBe(true)
		outside.click()
		expect(details.open).toBe(false)
	})

	it("closes when focus leaves the menu, not when it moves inside", () => {
		const { details, english, norsk, outside } = setup()
		open(details)
		english.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: norsk }))
		expect(details.open).toBe(true)
		norsk.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }))
		expect(details.open).toBe(false)
	})

	it("ignores keys while closed", () => {
		const { details, summary } = setup()
		summary.focus()
		press(summary, "ArrowDown")
		expect(document.activeElement).toBe(summary)
		expect(details.open).toBe(false)
	})
})
