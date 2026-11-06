// Search on the Dex front page (Dex search spec §3, §5.2). Plain DOM: the page renders every row,
// and this only toggles `hidden`. The query is never stored and never leaves the page.
import { matches, normalize, SETTLE_MS } from "../model/search"

/** The slice of `window` the search reads. `window` satisfies it; the tests pass a fake. */
export interface DexSearchWindow {
	innerHeight: number
	addEventListener(type: "pageshow", listener: () => void): void
}

/** Fills `{name}` placeholders. A function as the replacement, so "$&" in a query stays text. */
function fill(template: string, vars: Record<string, string>): string {
	let text = template
	for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, () => value)
	return text
}

export function wireDexSearch(root: HTMLElement, win: DexSearchWindow): void {
	const input = root.querySelector<HTMLInputElement>("[data-dex-input]")
	const cross = root.querySelector<HTMLElement>(".search-field [data-dex-clear]")
	const count = root.querySelector<HTMLElement>("[data-dex-count]")
	const status = root.querySelector<HTMLElement>("[data-dex-status]")
	const tiles = root.querySelector<HTMLElement>("[data-dex-tiles]")
	const results = root.querySelector<HTMLElement>("[data-dex-results]")
	const empty = root.querySelector<HTMLElement>("[data-dex-empty]")
	const emptyText = root.querySelector<HTMLElement>("[data-dex-empty-text]")
	if (!input || !cross || !count || !status || !tiles || !results || !empty || !emptyText) return

	const rows = [...results.querySelectorAll<HTMLElement>("li[data-search]")]
	const copy = {
		one: root.dataset.one ?? "",
		other: root.dataset.other ?? "",
		noMatch: root.dataset.noMatch ?? "",
		cleared: root.dataset.cleared ?? "",
	}
	let timer: ReturnType<typeof setTimeout> | undefined

	// One writer for the status region: every write cancels what is pending, so the last event wins.
	const cancel = () => {
		clearTimeout(timer)
		timer = undefined
	}
	const say = (text: string) => {
		cancel()
		status.textContent = text
	}
	const sayLater = (text: string) => {
		cancel()
		timer = setTimeout(() => {
			timer = undefined
			status.textContent = text
		}, SETTLE_MS)
	}

	/** Shows what the box holds. Returns the line a screen reader should hear, "" for an empty box. */
	const apply = (): string => {
		const query = input.value
		const active = normalize(query) !== ""
		let shown = 0
		for (const row of rows) {
			const hit = active && matches(query, [row.dataset.search ?? ""])
			row.hidden = !hit
			if (hit) shown++
		}
		cross.hidden = query === ""
		tiles.hidden = active
		results.hidden = shown === 0
		count.hidden = shown === 0
		empty.hidden = !active || shown > 0
		if (shown > 0) {
			const line = fill(shown === 1 ? copy.one : copy.other, { count: String(shown) })
			count.textContent = line
			return line
		}
		count.textContent = ""
		if (!active) return ""
		const line = fill(copy.noMatch, { query: query.trim() })
		emptyText.textContent = line
		return line
	}

	const clear = () => {
		input.value = ""
		apply()
		say(copy.cleared)
		input.focus()
	}

	// Enter hands focus to the results (as the tracker does, #89). The list starts right under the
	// field, so it stays on screen when a phone keyboard closes; I scroll only when it is not.
	const search = () => {
		const line = apply()
		if (line) say(line)
		if (results.hidden) return
		results.focus({ preventScroll: true })
		const top = results.getBoundingClientRect().top
		if (top < 0 || top >= win.innerHeight) results.scrollIntoView({ block: "start" })
	}

	input.addEventListener("input", () => {
		const line = apply()
		if (line) sayLater(line)
		else cancel()
	})
	input.addEventListener("keydown", (event) => {
		// The phone keyboard's Search key arrives as Enter. An Enter that commits an input method's
		// composition is still typing.
		if (event.key === "Enter" && !event.isComposing) {
			event.preventDefault()
			search()
			return
		}
		if (event.key !== "Escape" || input.value === "") return
		// Mine, not the browser's: a native clear would skip the "Search cleared" line.
		event.preventDefault()
		clear()
	})
	for (const button of root.querySelectorAll<HTMLButtonElement>("[data-dex-clear]")) {
		button.addEventListener("click", clear)
	}
	// A restored page (back/forward cache, or a value the browser refilled) must show what the box
	// says. Silent: the user did nothing new.
	win.addEventListener("pageshow", () => {
		apply()
	})
	apply()
}
