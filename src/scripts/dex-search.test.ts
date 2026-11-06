// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SETTLE_MS } from "../model/search"
import { type DexSearchWindow, wireDexSearch } from "./dex-search"

// Search text is normalized on the server (dexSearchRows), so "båt" is stored as "bat".
const HTML = `
	<div data-dex-search data-one="1 result" data-other="{count} results"
		data-no-match='No match for "{query}".' data-cleared="Search cleared">
		<div role="search">
			<div class="search-field">
				<input id="dex-search" type="search" data-dex-input />
				<button type="button" class="search-clear" data-dex-clear hidden>Clear search</button>
			</div>
			<p data-dex-count hidden aria-hidden="true"></p>
			<p role="status" data-dex-status></p>
		</div>
		<ul data-dex-tiles><li><a href="/en/dex/vehicles/">Vehicles</a></li></ul>
		<ul data-dex-results hidden tabindex="-1">
			<li hidden data-search="declasse tulip car cars bil biler"><a href="#t">Declasse Tulip</a></li>
			<li hidden data-search="speedophile seashark boat boats bat bater"><a href="#s">Speedophile Seashark</a></li>
			<li hidden data-search="american alligator reptile reptiles animal animals krypdyr dyr"><a href="#a">American alligator</a></li>
		</ul>
		<div data-dex-empty hidden>
			<p data-dex-empty-text></p>
			<button type="button" data-dex-clear>Clear search</button>
		</div>
	</div>`

function setup(initial = "", innerHeight = 800) {
	document.body.innerHTML = HTML
	const pageshow: (() => void)[] = []
	const win: DexSearchWindow = {
		innerHeight,
		addEventListener: (_type, listener) => pageshow.push(listener),
	}
	const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
		document.querySelector(selector) as T
	const input = $<HTMLInputElement>("[data-dex-input]")
	input.value = initial
	wireDexSearch($("[data-dex-search]"), win)
	const results = $("[data-dex-results]")
	return {
		input,
		results,
		tiles: $("[data-dex-tiles]"),
		count: $("[data-dex-count]"),
		status: $("[data-dex-status]"),
		empty: $("[data-dex-empty]"),
		emptyText: $("[data-dex-empty-text]"),
		cross: $<HTMLButtonElement>(".search-field [data-dex-clear]"),
		emptyClear: $<HTMLButtonElement>("[data-dex-empty] [data-dex-clear]"),
		visible: () => [...results.querySelectorAll("li:not([hidden]) a")].map((a) => a.textContent),
		type(value: string) {
			input.value = value
			input.dispatchEvent(new Event("input", { bubbles: true }))
		},
		key(key: string, isComposing = false) {
			const event = new KeyboardEvent("keydown", {
				key,
				isComposing,
				bubbles: true,
				cancelable: true,
			})
			input.dispatchEvent(event)
			return event
		},
		pageshow: () => {
			for (const listener of pageshow) listener()
		},
	}
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe("wireDexSearch (Dex search spec §3)", () => {
	it("shows the tiles and nothing else while the box is empty", () => {
		const page = setup()
		expect(page.tiles.hidden).toBe(false)
		expect(page.results.hidden).toBe(true)
		expect(page.empty.hidden).toBe(true)
		expect(page.count.hidden).toBe(true)
		expect(page.cross.hidden).toBe(true)
	})

	it("filters the rows and hides the tiles while typing", () => {
		const page = setup()
		page.type("bil")
		expect(page.visible()).toEqual(["Declasse Tulip"])
		expect(page.tiles.hidden).toBe(true)
		expect(page.results.hidden).toBe(false)
		expect(page.count.hidden).toBe(false)
		expect(page.count.textContent).toBe("1 result")
		expect(page.cross.hidden).toBe(false)
	})

	it("uses the plural template above one", () => {
		const page = setup()
		page.type("a")
		expect(page.visible()).toHaveLength(3)
		expect(page.count.textContent).toBe("3 results")
	})

	it("finds boats with the Norwegian word", () => {
		const page = setup()
		page.type("båt")
		expect(page.visible()).toEqual(["Speedophile Seashark"])
	})

	it("treats a query of only spaces as an empty box", () => {
		const page = setup()
		page.type("   ")
		expect(page.tiles.hidden).toBe(false)
		expect(page.results.hidden).toBe(true)
		expect(page.empty.hidden).toBe(true)
		vi.advanceTimersByTime(SETTLE_MS)
		expect(page.status.textContent).toBe("")
	})

	it("prints the query literally when nothing matches", () => {
		const page = setup()
		page.type("<b>$&$'")
		expect(page.results.hidden).toBe(true)
		expect(page.count.hidden).toBe(true)
		expect(page.empty.hidden).toBe(false)
		expect(page.emptyText.textContent).toBe(`No match for "<b>$&$'".`)
		expect(page.emptyText.querySelector("b")).toBeNull()
	})

	it("announces the result only after typing pauses", () => {
		const page = setup()
		page.type("bil")
		vi.advanceTimersByTime(SETTLE_MS - 1)
		expect(page.status.textContent).toBe("")
		vi.advanceTimersByTime(1)
		expect(page.status.textContent).toBe("1 result")
	})

	it("empties the status when the box is emptied by typing, so the same query is heard again", () => {
		const page = setup()
		page.type("bil")
		vi.advanceTimersByTime(SETTLE_MS)
		expect(page.status.textContent).toBe("1 result")
		page.type("")
		expect(page.status.textContent).toBe("")
	})

	it("clears with the ×, focuses the field and lets the clear win over a pending result", () => {
		const page = setup()
		page.type("bil")
		page.cross.click()
		vi.advanceTimersByTime(SETTLE_MS * 2)
		expect(page.input.value).toBe("")
		expect(page.status.textContent).toBe("Search cleared")
		expect(page.tiles.hidden).toBe(false)
		expect(page.results.hidden).toBe(true)
		expect(page.cross.hidden).toBe(true)
		expect(document.activeElement).toBe(page.input)
	})

	it("clears with the button under a no-match message", () => {
		const page = setup()
		page.type("zzz")
		page.emptyClear.click()
		expect(page.input.value).toBe("")
		expect(page.empty.hidden).toBe(true)
		expect(document.activeElement).toBe(page.input)
	})

	it("clears on Escape only when the box has text", () => {
		const page = setup()
		expect(page.key("Escape").defaultPrevented).toBe(false)
		page.type("bil")
		expect(page.key("Escape").defaultPrevented).toBe(true)
		expect(page.input.value).toBe("")
		expect(page.status.textContent).toBe("Search cleared")
	})

	it("focuses the list on Enter and announces at once", () => {
		const page = setup()
		page.input.focus()
		page.type("a")
		const event = page.key("Enter")
		expect(event.defaultPrevented).toBe(true)
		expect(page.status.textContent).toBe("3 results")
		expect(document.activeElement).toBe(page.results)
	})

	it("only announces on Enter when nothing matches", () => {
		const page = setup()
		page.input.focus()
		page.type("zzz")
		page.key("Enter")
		expect(page.status.textContent).toBe(`No match for "zzz".`)
		expect(document.activeElement).toBe(page.input)
	})

	it("ignores an Enter that commits an input method's composition", () => {
		const page = setup()
		page.input.focus()
		page.type("bil")
		page.key("Enter", true)
		expect(page.status.textContent).toBe("")
		expect(document.activeElement).toBe(page.input)
	})

	it("scrolls the list into view on Enter only when it is off screen", () => {
		const onScreen = setup("", 800)
		onScreen.results.scrollIntoView = vi.fn()
		onScreen.type("bil")
		onScreen.key("Enter")
		expect(onScreen.results.scrollIntoView).not.toHaveBeenCalled()

		// jsdom puts every box at top 0, so a 0 px tall window has the list below its bottom edge.
		const offScreen = setup("", 0)
		offScreen.results.scrollIntoView = vi.fn()
		offScreen.type("bil")
		offScreen.key("Enter")
		expect(offScreen.results.scrollIntoView).toHaveBeenCalledWith({ block: "start" })
	})

	it("applies a value the browser restored before the script ran", () => {
		const page = setup("bil")
		expect(page.visible()).toEqual(["Declasse Tulip"])
		expect(page.tiles.hidden).toBe(true)
	})

	it("re-applies the box on pageshow without announcing or moving focus", () => {
		const page = setup()
		page.input.value = "båt"
		page.pageshow()
		vi.advanceTimersByTime(SETTLE_MS * 2)
		expect(page.visible()).toEqual(["Speedophile Seashark"])
		expect(page.status.textContent).toBe("")
		expect(document.activeElement).toBe(document.body)
	})
})
