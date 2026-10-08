// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

const markup = `
	<details data-picker="lang">
		<summary>Language</summary>
		<ul class="picker-list">
			<li><a class="picker-row" href="#en">English</a></li>
			<li><a class="picker-row" href="#nb" aria-current="page">Norsk bokmål</a></li>
		</ul>
	</details>
	<button id="outside">x</button>`

const details = () => document.querySelector("details") as HTMLDetailsElement
const rows = () => [...document.querySelectorAll<HTMLAnchorElement>(".picker-row")]
const key = (name: string) =>
	document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }))

function open() {
	details().open = true
	// picker.js listens for toggle in the capture phase on document.
	details().dispatchEvent(new Event("toggle"))
}

beforeAll(async () => {
	// picker.js is a classic script with no exports, so TypeScript calls it "not a module".
	// @ts-expect-error
	await import("../lib/picker.js")
})

beforeEach(() => {
	document.body.innerHTML = markup
})

describe("vendored picker.js (standard §6.2)", () => {
	it("opens on the current row", () => {
		open()
		expect(document.activeElement).toBe(rows()[1])
	})

	it("wraps with the arrows and jumps with Home and End", () => {
		open()
		key("ArrowDown")
		expect(document.activeElement).toBe(rows()[0])
		key("ArrowUp")
		expect(document.activeElement).toBe(rows()[1])
		key("Home")
		expect(document.activeElement).toBe(rows()[0])
		key("End")
		expect(document.activeElement).toBe(rows()[1])
	})

	it("closes on Escape and gives focus back to the trigger", () => {
		open()
		key("Escape")
		expect(details().open).toBe(false)
		expect(document.activeElement).toBe(document.querySelector("summary"))
	})

	it("closes when focus leaves", () => {
		open()
		rows()[1].dispatchEvent(
			new FocusEvent("focusout", {
				bubbles: true,
				relatedTarget: document.getElementById("outside"),
			})
		)
		expect(details().open).toBe(false)
	})

	it("skips a hidden row without the picker class, and takes it in once it is shown", () => {
		document.body.innerHTML = markup.replace(
			'<ul class="picker-list">',
			'<ul class="picker-list"><li id="system" hidden><a href="#sys">System</a></li>'
		)
		open()
		key("ArrowDown")
		expect(document.activeElement).toBe(rows()[0])
		const item = document.getElementById("system") as HTMLElement
		item.querySelector("a")?.classList.add("picker-row")
		item.hidden = false
		key("Home")
		expect(document.activeElement?.textContent).toBe("System")
	})
})
