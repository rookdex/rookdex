# Dex Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A search box on `/en/dex/` and `/nb/dex/` that finds any live item across all four categories and links each result to its card on the category page.

**Architecture:** The Astro page renders every live item as a hidden row, with its search text precomputed by a pure model function. A small vanilla script toggles `hidden` on rows, tiles and messages using the tracker's own `normalize` and `matches`. No React, no JSON payload, and the category pages stay zero-JS.

**Tech Stack:** Astro 5 pages, TypeScript, Vitest (node and jsdom environments), Biome, Playwright (scratch folder outside the repo), Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-11-06-dex-search-design.md` (approved 06.11.2026). Read it alongside this plan. Spec §3 item 2 already says rows follow `dexIndex` order.

## Global Constraints

- Matching is `matches(query, [row.search])` from `src/model/search.ts`; never a RegExp built from the query.
- The query is never stored, never put in the URL and never sent anywhere.
- Text that contains the query is set with `textContent`, never `innerHTML`. Template placeholders are replaced with a function (`text.replace("{query}", () => query)`).
- CSP: the script is a processed `<script>` (never `is:inline` or `define:vars`), adds no `on*` attributes and never writes a `style` attribute. Hiding uses the `hidden` attribute (the global `[hidden] { display: none !important }` rule makes it win over `display: grid`).
- Every row and button is at least 44 by 44 px (`var(--tap)`).
- Rows: 1 column on phones, 2 from 768 px, 3 from 1600 px.
- No em dashes anywhere (code, comments, copy, commits, PR text). Times take a colon, dates take periods.
- Code, comments and test names are in English, first person where a comment speaks.
- Category pages (`src/pages/[locale]/dex/[category].astro`) are not touched.
- On the main checkout, run `sed -i 's/\r$//' <file>` on each edited file before `git add` (Edit on a CRLF working copy stages CRLF). Stage explicit paths only, never `git commit -a`.
- Run every command from the repo root.
- Branch: `feat/dex-search`, cut from `main` once the spec PR (#105, which also carries this plan) is merged. If #105 is still open, cut it from `docs/dex-search-spec` and say so in the build PR.
- If the build runs in a worktree, the Stop hook's `npm test` runs in the MAIN checkout, not the worktree: read the task's own `npx vitest run` output, never the hook's.

## Review Focus

1. **Back from a category page.** A person taps a result, reads the card, presses Back. The list must still match the text in the box, with no announcement and no focus jump. Pinned in Task 2 (`pageshow` test) and Task 4 (Playwright back step).
2. **Norwegian letters.** "båt" must find boats (å loses its ring under `normalize`), and "bjørn" must not be folded to "bjorn" (ø is a letter). Pinned in Task 2 (`båt` test) and Task 1 (`search` is normalized on the server with the same function).
3. **Odd characters in the query.** `<b>`, `$&` and `$'` must print literally in the no-match message. Pinned in Task 2.
4. **A query of only spaces.** It must behave as an empty box: tiles visible, no message. Pinned in Task 2.
5. **Long names at 320 px and 200 % text.** Rows must wrap without horizontal overflow. Pinned in Task 3 (`overflow-wrap: anywhere` on `.row-name`) and Task 4 (measuring pass).

---

### Task 1: Search rows in the Dex model

**Files:**
- Modify: `src/model/dex.ts` (imports at the top; new interface and function after `dexIndex`)
- Test: `src/model/dex.test.ts` (new `describe` at the end)

**Interfaces:**
- Consumes: `dexIndex(items: SeedItem[]): DexCategory[]` (same file), `seedLabel(t, kind, id)` and `Translate` from `src/i18n`, `normalize` from `src/model/search.ts`, `SEARCH_TERMS` from `src/model/searchTerms.ts`.
- Produces:
  ```ts
  export interface DexSearchRow {
  	id: string
  	name: string
  	href: string
  	status: SeedItem["status"]
  	statusWord: string
  	place: string
  	search: string
  }
  export function dexSearchRows(
  	t: Translate,
  	urlFor: (category: string) => string,
  	items: SeedItem[],
  	terms?: SearchTerms
  ): DexSearchRow[]
  ```

- [ ] **Step 1: Write the failing tests**

Add `dexSearchRows` to the existing import from `./dex`, add these imports at the top of `src/model/dex.test.ts`:

```ts
import { matches } from "./search"
```

and append:

```ts
describe("dexSearchRows (Dex search spec §5.1)", () => {
	const { t } = translator("nb")
	const urlFor = (category: string) => `/nb/dex/${category}/`

	it("has one row per live item, in the order the Dex pages list them", () => {
		const rows = dexSearchRows(t, urlFor, live)
		const order = dexIndex(live).flatMap((c) => c.groups.flatMap((g) => g.items.map((i) => i.id)))
		expect(rows.map((row) => row.id)).toEqual(order)
		expect(rows).toHaveLength(live.length)
	})

	it("orders the fixture by group, then by name", () => {
		const rows = dexSearchRows(t, urlFor, fixture)
		expect(rows.map((row) => row.name)).toEqual(["crane", "ibis", "gator"])
	})

	it("links each row to its card on the category page", () => {
		const [crane] = dexSearchRows(t, urlFor, fixture)
		expect(crane.href).toBe("/nb/dex/wildlife/#wildlife/crane")
	})

	it("says the short status word in the page language", () => {
		const [crane, ibis] = dexSearchRows(t, urlFor, fixture)
		expect([crane.status, crane.statusWord]).toEqual(["confirmed", "Bekreftet"])
		expect([ibis.status, ibis.statusWord]).toEqual(["expected", "Forventet"])
	})

	it("names the category and group in the page language", () => {
		const [crane, , gator] = dexSearchRows(t, urlFor, fixture)
		expect(crane.place).toBe("Dyreliv · Fugler")
		expect(gator.place).toBe("Dyreliv · Krypdyr")
		expect(dexSearchRows(translator("en").t, urlFor, fixture)[0].place).toBe("Wildlife · Birds")
	})

	it("searches the name and every group term, normalized like the query", () => {
		const [crane] = dexSearchRows(t, urlFor, fixture)
		expect(crane.search).toBe(crane.search.toLowerCase())
		for (const word of ["crane", "bird", "fugler", "dyr"]) expect(matches(word, [crane.search])).toBe(true)
		expect(matches("reptile", [crane.search])).toBe(false)
	})

	it("finds boats with the Norwegian word", () => {
		const boats = dexSearchRows(t, urlFor, live).filter((row) => matches("båt", [row.search]))
		expect(boats.length).toBeGreaterThan(0)
		expect(boats.every((row) => row.place.endsWith("Båter"))).toBe(true)
	})

	it("throws on a retired item", () => {
		const retired = item("dodo", "birds", "confirmed", { retired: true })
		expect(() => dexSearchRows(t, urlFor, [retired])).toThrow(/retired/)
	})
})
```

Before running, confirm the nb label for boats: `grep -n '"group.boats"' src/locales/nb.json`. If it is not "Båter", change the `endsWith` literal to the real label.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/model/dex.test.ts`
Expected: FAIL, `dexSearchRows` is not exported.

- [ ] **Step 3: Implement**

In `src/model/dex.ts`, extend the i18n import with `seedLabel` and add two imports:

```ts
import { hasKey, type Key, type PluralKey, seedLabel, type Translate, type Translator } from "../i18n"
import { normalize, type SearchTerms } from "./search"
import { SEARCH_TERMS } from "./searchTerms"
```

After `dexIndex`, add:

```ts
/** One result row on the Dex front page (Dex search spec §4, §5.1). */
export interface DexSearchRow {
	id: string
	name: string
	/** The category page with the item's card as the fragment. */
	href: string
	status: SeedItem["status"]
	/** The short word only: the precedent text is too long for a row and lives on the card. */
	statusWord: string
	/** "<category> · <group>" in the page language. */
	place: string
	/** The name and the group's search words, normalized. One string is enough: a query word never
	 *  holds a space after normalize, so it cannot match across two fields. */
	search: string
}

/** Every live item as a search row, in the order the Dex pages list them. `urlFor` builds a
 *  category page URL, so this module stays free of astro:i18n. */
export function dexSearchRows(
	t: Translate,
	urlFor: (category: string) => string,
	items: SeedItem[],
	terms: SearchTerms = SEARCH_TERMS
): DexSearchRow[] {
	return dexIndex(items).flatMap((category) =>
		category.groups.flatMap((group) =>
			group.items.map((item) => ({
				id: item.id,
				name: item.name,
				href: `${urlFor(category.id)}#${item.id}`,
				status: item.status,
				statusWord: item.status === "confirmed" ? t("tracker.confirmed") : t("dex.expected"),
				place: `${seedLabel(t, "category", category.id)} · ${seedLabel(t, "group", group.id)}`,
				search: normalize([item.name, ...(terms[item.group] ?? [])].join(" ")),
			}))
		)
	)
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/model/dex.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Lint and commit**

```bash
npx biome check src/model/dex.ts src/model/dex.test.ts
sed -i 's/\r$//' src/model/dex.ts src/model/dex.test.ts
git add src/model/dex.ts src/model/dex.test.ts
git commit -m "feat(dex): build search rows for every live item"
```

---

### Task 2: The Dex search script

**Files:**
- Modify: `src/model/search.ts` (add `SETTLE_MS`)
- Modify: `src/islands/tracker/useLiveStatus.ts:4` (import it instead of declaring it)
- Create: `src/scripts/dex-search.ts`
- Test: `src/scripts/dex-search.test.ts`

**Interfaces:**
- Consumes: `matches`, `normalize` from `src/model/search.ts`.
- Produces:
  ```ts
  export const SETTLE_MS = 500 // in src/model/search.ts
  export interface DexSearchWindow {
  	innerHeight: number
  	addEventListener(type: "pageshow", listener: () => void): void
  }
  export function wireDexSearch(root: HTMLElement, win: DexSearchWindow): void
  ```
- DOM contract (Task 3 renders it; the hooks are the interface): inside `root` (which carries `data-dex-search` and the copy templates `data-one`, `data-other`, `data-no-match`, `data-cleared`):
  `input[data-dex-input]`, `.search-field [data-dex-clear]` (the ×), `[data-dex-count]`, `[data-dex-status]`, `[data-dex-tiles]`, `[data-dex-results]` holding `li[data-search]` rows, `[data-dex-empty]` holding `[data-dex-empty-text]` and a second `[data-dex-clear]` button.

- [ ] **Step 1: Move the settle time**

In `src/model/search.ts`, after the `EmptyState` type, add:

```ts
/** How long typing must pause before its result is announced (tracker search spec §5). Shared by
 *  the tracker and the Dex search, so it lives here and not in a React module. */
export const SETTLE_MS = 500
```

In `src/islands/tracker/useLiveStatus.ts`, replace the lines

```ts
/** How long typing must pause before its result is announced (tracker search spec §5). */
export const SETTLE_MS = 500
```

with

```ts
import { SETTLE_MS } from "../../model/search"

export { SETTLE_MS }
```

and move the new `import` line up beside the existing `react` import (Biome sorts imports; `npx biome check --write` on the file fixes the order).

Run: `npx vitest run src/islands/tracker/useLiveStatus.test.ts`
Expected: PASS (its `SETTLE_MS` is 500 test still holds).

- [ ] **Step 2: Write the failing tests**

Create `src/scripts/dex-search.test.ts`:

```ts
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
			const event = new KeyboardEvent("keydown", { key, isComposing, bubbles: true, cancelable: true })
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/scripts/dex-search.test.ts`
Expected: FAIL, cannot resolve `./dex-search`.

- [ ] **Step 4: Implement**

Create `src/scripts/dex-search.ts`:

```ts
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
	function cancel() {
		clearTimeout(timer)
		timer = undefined
	}
	function say(text: string) {
		cancel()
		status.textContent = text
	}
	function sayLater(text: string) {
		cancel()
		timer = setTimeout(() => {
			timer = undefined
			status.textContent = text
		}, SETTLE_MS)
	}

	/** Shows what the box holds. Returns the line a screen reader should hear, "" for an empty box. */
	function apply(): string {
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

	function clear() {
		input.value = ""
		apply()
		say(copy.cleared)
		input.focus()
	}

	// Enter hands focus to the results (as the tracker does, #89). The list starts right under the
	// field, so it stays on screen when a phone keyboard closes; I scroll only when it is not.
	function search() {
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
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/scripts/dex-search.test.ts src/islands/tracker/useLiveStatus.test.ts src/model/search.test.ts`
Expected: PASS, all three files.

- [ ] **Step 6: Lint and commit**

```bash
npx biome check --write src/model/search.ts src/islands/tracker/useLiveStatus.ts src/scripts/dex-search.ts src/scripts/dex-search.test.ts
sed -i 's/\r$//' src/model/search.ts src/islands/tracker/useLiveStatus.ts src/scripts/dex-search.ts src/scripts/dex-search.test.ts
git add src/model/search.ts src/islands/tracker/useLiveStatus.ts src/scripts/dex-search.ts src/scripts/dex-search.test.ts
git commit -m "feat(dex): add the search script for the Dex front page"
```

---

### Task 3: The page, copy, CSS and Lighthouse

**Files:**
- Modify: `src/pages/[locale]/dex/index.astro` (frontmatter, template, `<script>`, `<style>`)
- Modify: `src/locales/en.json`, `src/locales/nb.json` (three keys after `dex.expectedCount`)
- Modify: `src/styles/global.css` (the five `.tracker .search-clear` selectors)
- Modify: `lighthouserc.json` (`collect.url`)
- Test: `src/test/dex-index-page.test.ts`, `src/styles/search.test.ts`

**Interfaces:**
- Consumes: `dexSearchRows` and `DexSearchRow` (Task 1), `wireDexSearch` (Task 2) and its DOM contract, `CloseIcon` from `src/islands/tracker/icons.tsx`.
- Produces: the rendered page. Nothing later imports from it.

- [ ] **Step 1: Write the failing page tests**

Append to the `describe` in `src/test/dex-index-page.test.ts`:

```ts
	it("has a search box with a name, and no form (Dex search spec §4)", async () => {
		const doc = await page("nb")
		const input = doc.querySelector<HTMLInputElement>('[role="search"] input#dex-search')
		expect(input?.getAttribute("type")).toBe("search")
		expect(input?.getAttribute("maxlength")).toBe("100")
		expect(input?.getAttribute("autocomplete")).toBe("off")
		expect(input?.getAttribute("enterkeyhint")).toBe("search")
		expect(text(doc.querySelector('label[for="dex-search"]'))).toBe("Søk i Dex-en")
		expect(doc.querySelector("main form")).toBeNull()
		const cross = doc.querySelector(".search-field [data-dex-clear]")
		expect(cross?.hasAttribute("hidden")).toBe(true)
		expect(text(cross)).toBe("Tøm søket")
		expect(doc.querySelector('[data-dex-status][role="status"]')).not.toBeNull()
	})

	it("hands the script its copy as templates", async () => {
		const root = (await page("nb")).querySelector<HTMLElement>("[data-dex-search]")
		expect(root?.dataset).toMatchObject({
			one: "1 treff",
			other: "{count} treff",
			noMatch: "Ingen treff på «{query}».",
			cleared: "Søket er tømt",
		})
	})

	it("renders one hidden result row per live item", async () => {
		const doc = await page("en")
		const list = doc.querySelector("[data-dex-results]")
		expect(list?.hasAttribute("hidden")).toBe(true)
		expect(list?.getAttribute("tabindex")).toBe("-1")
		expect(list?.getAttribute("aria-label")).toBe("Search results")
		const rows = [...doc.querySelectorAll("[data-dex-results] > li")]
		expect(rows).toHaveLength(live.length)
		expect(rows.every((row) => row.hasAttribute("hidden") && row.getAttribute("data-search"))).toBe(true)
		const first = rows[0].querySelector("a")
		expect(first?.getAttribute("href")).toMatch(/^\/en\/dex\/[a-z-]+\/#[a-z-]+\/[a-z0-9-]+$/)
		expect(rows[0].querySelector(".dot")?.getAttribute("aria-hidden")).toBe("true")
		expect(doc.querySelector("[data-dex-empty]")?.hasAttribute("hidden")).toBe(true)
	})

	it("marks item names as English on the Norwegian page only", async () => {
		const nbName = (await page("nb")).querySelector("[data-dex-results] .row-name")
		const enName = (await page("en")).querySelector("[data-dex-results] .row-name")
		expect(nbName?.getAttribute("lang")).toBe("en")
		expect(enName?.hasAttribute("lang")).toBe(false)
	})
```

Append to `src/styles/search.test.ts` (inside a new `describe` at the end of the file):

```ts
describe("clear button CSS (Dex search spec §6.1)", () => {
	it("shares the tracker's clear button rules instead of copying them", () => {
		expect(css).not.toContain(".tracker .search-clear")
		expect(css).toMatch(/:is\(\.tracker, \.dex-search\) \.search-clear\s*\{[^}]*position:\s*absolute/)
		for (const state of ["hover", "active", "focus-visible"]) {
			expect(css).toContain(`:is(.tracker, .dex-search) .search-clear:${state}`)
		}
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/test/dex-index-page.test.ts src/styles/search.test.ts`
Expected: FAIL, no search box on the page, and `.tracker .search-clear` still in `global.css`.

- [ ] **Step 3: Add the copy**

In `src/locales/en.json`, after the `"dex.expectedCount"` line:

```json
	"dex.search.label": "Search the Dex",
	"dex.search.placeholder": "Name or type, e.g. Tulip or boat",
	"dex.search.resultsLabel": "Search results",
```

In `src/locales/nb.json`, after the `"dex.expectedCount"` line:

```json
	"dex.search.label": "Søk i Dex-en",
	"dex.search.placeholder": "Navn eller type, f.eks. Tulip eller båt",
	"dex.search.resultsLabel": "Søkeresultater",
```

- [ ] **Step 4: Widen the clear button selectors**

In `src/styles/global.css`, replace each of these five selectors with the `:is()` form (same specificity, 0,2,0):

| Before | After |
|---|---|
| `.tracker .search-clear:hover,` | `:is(.tracker, .dex-search) .search-clear:hover,` |
| `.tracker .search-clear:active,` | `:is(.tracker, .dex-search) .search-clear:active,` |
| `.tracker .search-clear:focus-visible,` | `:is(.tracker, .dex-search) .search-clear:focus-visible,` |
| `.tracker .search-clear {` | `:is(.tracker, .dex-search) .search-clear {` |

Use `grep -n "\.tracker \.search-clear" src/styles/global.css` before and after; after, it must print nothing.

- [ ] **Step 5: Build the page**

In `src/pages/[locale]/dex/index.astro`, replace the frontmatter imports and setup with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { isLocale, type Locale, locales, seedLabel, translator } from "../../../i18n"
import { CloseIcon } from "../../../islands/tracker/icons"
import Base from "../../../layouts/Base.astro"
import { dexIndex, dexSearchRows } from "../../../model/dex"
import { seedItems } from "../../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale }, props: {} }))
}

// The Dex's front page (category pages spec §6): one whole-card link per category, and a search
// across every category (Dex search spec §4). The rows are all here, hidden; the script only
// toggles them.
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const { t } = translator(locale as Locale)
const live = seedItems.filter((item) => !item.retired)
const categories = dexIndex(live)
const rows = dexSearchRows(t, (category) => getRelativeLocaleUrl(locale as Locale, `dex/${category}`), live)
// Seed text is English; nb pages say so (category pages spec §10).
const itemLang = locale === "en" ? undefined : "en"
---
```

Replace the template between `<p class="lede">…</p>` and the Sources `<p>` with:

```astro
	<div
		data-dex-search
		data-one={t("tracker.search.results.one")}
		data-other={t("tracker.search.results.other")}
		data-no-match={t("tracker.search.noMatch")}
		data-cleared={t("tracker.search.cleared")}
	>
		{/* A div with the role, not <search>: Testing Library cannot find <search> (tracker SearchBar). */}
		<div class="dex-search" role="search">
			<label for="dex-search" class="visually-hidden">{t("dex.search.label")}</label>
			{/* No form: Enter hands focus to the results instead of submitting anything. */}
			<div class="search-field">
				<input
					id="dex-search"
					type="search"
					maxlength="100"
					autocomplete="off"
					enterkeyhint="search"
					placeholder={t("dex.search.placeholder")}
					data-dex-input
				/>
				<button type="button" class="search-clear" hidden data-dex-clear>
					<CloseIcon />
					<span class="visually-hidden">{t("tracker.search.clear")}</span>
				</button>
			</div>
			<p class="dex-search-count" hidden aria-hidden="true" data-dex-count></p>
			<p class="visually-hidden" role="status" data-dex-status></p>
		</div>
		<ul class="dex-index" data-dex-tiles>
			{
				categories.map((c) => (
					<li>
						<a class="dex-tile" href={getRelativeLocaleUrl(locale as Locale, `dex/${c.id}`)}>
							<span class="name">{seedLabel(t, "category", c.id)}</span>
							<span class="counts">
								<span class="dot confirmed" aria-hidden="true" />
								{t("dex.confirmedCount", { count: c.confirmed })}
								<span class="visually-hidden">, </span>
								<span class="sep" aria-hidden="true">·</span>
								<span class="dot expected" aria-hidden="true" />
								{t("dex.expectedCount", { count: c.expected })}
							</span>
							<span class="groups">{c.groups.map((g) => seedLabel(t, "group", g.id)).join(" · ")}</span>
						</a>
					</li>
				))
			}
		</ul>
		<ul class="dex-results" hidden tabindex="-1" aria-label={t("dex.search.resultsLabel")} data-dex-results>
			{
				rows.map((row) => (
					<li hidden data-search={row.search}>
						<a class="dex-row" href={row.href}>
							<span class="row-name" lang={itemLang}>{row.name}</span>
							<span class="row-meta">
								<span class:list={["dot", row.status]} aria-hidden="true" />
								{row.statusWord}
								<span class="visually-hidden">, </span>
								<span class="sep" aria-hidden="true">·</span>
								{row.place}
							</span>
						</a>
					</li>
				))
			}
		</ul>
		<div class="dex-no-match" hidden data-dex-empty>
			<p data-dex-empty-text></p>
			<button type="button" data-dex-clear>{t("tracker.search.clear")}</button>
		</div>
	</div>
```

The tile markup inside `.dex-index` is the existing markup, unchanged; only `data-dex-tiles` is new on the `<ul>`.

After `</Base>` and before `<style>`, add:

```astro
<script>
	import { wireDexSearch } from "../../../scripts/dex-search"

	const root = document.querySelector<HTMLElement>("[data-dex-search]")
	if (root) wireDexSearch(root, window)
</script>
```

In the `<style>` block, add after the `.dex-index` media query:

```css
	.dex-search {
		display: grid;
		gap: var(--space-2);
		margin-block: var(--space-3);
	}

	.dex-search-count {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.dex-results {
		display: grid;
		gap: 12px;
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}

	/* Enter lands here. A ring round the whole list reads as a fault; the next Tab reaches the first
	   row, which carries its own ring. */
	.dex-results:focus {
		outline: none;
	}

	@media (min-width: 768px) {
		.dex-results {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1600px) {
		.dex-results {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.dex-row {
		display: grid;
		align-content: center;
		gap: 2px;
		height: 100%;
		min-height: var(--tap);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		color: var(--text);
		text-decoration: none;
		transition: background-color 120ms, border-color 120ms;
	}

	.row-name {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.row-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.dex-no-match {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	/* A 100-character query with no spaces still wraps inside 320 px. */
	.dex-no-match p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.dex-no-match button {
		min-height: var(--tap);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		color: var(--text);
		font: inherit;
	}
```

and widen the three existing tile state rules so rows and the no-match button share them:

```css
	@media (hover: hover) {
		.dex-tile:hover,
		.dex-row:hover,
		.dex-no-match button:hover {
			background: var(--bg-hover);
			border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		}
	}

	@media (hover: none) {
		.dex-tile:active,
		.dex-row:active,
		.dex-no-match button:active {
			background: var(--bg-hover);
		}
	}

	/* Same lift as the chips: the global ring alone is thin on a large card. */
	.dex-tile:focus-visible,
	.dex-row:focus-visible,
	.dex-no-match button:focus-visible {
		background: var(--bg-hover);
	}
```

The existing `.dot`, `.confirmed`, `.expected` and forced-colours rules already apply to the row dots.

- [ ] **Step 6: Add the page to Lighthouse CI**

In `lighthouserc.json`, add `"http://localhost/en/dex/",` to `ci.collect.url`, directly after `"http://localhost/en/tracker/",`.

- [ ] **Step 7: Run the tests, the build and the linter**

Run: `npx vitest run src/test/dex-index-page.test.ts src/styles/search.test.ts src/i18n`
Expected: PASS, including `bundles.test.ts` parity for the three new keys.

Run: `npm run build`
Expected: build succeeds; `dist/en/dex/index.html` contains `data-dex-search` and one `<script type="module"` pointing at a hashed file under `/_astro/`.

Run: `npx biome check "src/pages/[locale]/dex/index.astro" src/styles/global.css src/locales lighthouserc.json src/test/dex-index-page.test.ts src/styles/search.test.ts`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
sed -i 's/\r$//' "src/pages/[locale]/dex/index.astro" src/styles/global.css src/locales/en.json src/locales/nb.json lighthouserc.json src/test/dex-index-page.test.ts src/styles/search.test.ts
git add "src/pages/[locale]/dex/index.astro" src/styles/global.css src/locales/en.json src/locales/nb.json lighthouserc.json src/test/dex-index-page.test.ts src/styles/search.test.ts
git commit -m "feat(dex): search every category from the Dex front page"
```

---

### Task 4: Verify in a real browser, then open the PR

**Files:**
- Create (scratch, outside the repo): `%TEMP%/rookdex-e2e/specs/dex-search.spec.mjs`
- No repo files change unless a check fails; a fix goes into the task that owns the code, with its own test.

**Interfaces:**
- Consumes: the built site served by the `preview` launch config (`npm run preview`, port 8787).

- [ ] **Step 1: Full suite and a fresh build**

Run: `npx vitest run` then `GITHUB_SHA=$(git rev-parse HEAD) npm run build`
Expected: every test passes; build succeeds. Read the test count off the output and note it for the PR.

- [ ] **Step 2: Serve the build**

Start the `preview` configuration with `preview_start` (never Bash). Before measuring, unregister any service worker and clear caches in the Browser pane (`navigator.serviceWorker.getRegistrations()` then `unregister()`, `caches.keys()` then `caches.delete()`), then reload `/en/dex/`.

- [ ] **Step 3: Write the Playwright spec**

Create `%TEMP%/rookdex-e2e/specs/dex-search.spec.mjs`:

```js
import { expect, test } from "@playwright/test"

const visibleRows = (page) => page.locator("[data-dex-results] > li:not([hidden])")

for (const [locale, word, label] of [
	["en", "boat", "Search the Dex"],
	["nb", "bil", "Søk i Dex-en"],
]) {
	test(`${locale}: typing filters, the count line agrees, Enter then Tab reaches the first row`, async ({ page }) => {
		const violations = []
		await page.exposeFunction("cspViolation", (v) => violations.push(v))
		await page.addInitScript(() =>
			document.addEventListener("securitypolicyviolation", (e) => window.cspViolation(e.violatedDirective))
		)
		await page.goto(`/${locale}/dex/`)
		const box = page.getByRole("searchbox", { name: label })
		await box.fill(word)
		const n = await visibleRows(page).count()
		expect(n).toBeGreaterThan(0)
		await expect(page.locator("[data-dex-count]")).toContainText(String(n))
		await expect(page.locator("[data-dex-tiles]")).toBeHidden()
		await box.press("Enter")
		await expect(page.locator("[data-dex-results]")).toBeFocused()
		await page.keyboard.press("Tab")
		await expect(visibleRows(page).first().locator("a")).toBeFocused()
		expect(violations).toEqual([])
	})
}

test("a result lands on its card, and Back restores a matching list", async ({ page }) => {
	await page.goto("/en/dex/")
	const box = page.getByRole("searchbox", { name: "Search the Dex" })
	await box.fill("tulip")
	const link = visibleRows(page).first().locator("a")
	const href = await link.getAttribute("href")
	await link.click()
	const id = decodeURIComponent(href.split("#")[1])
	await expect(page.locator(`[id="${id}"]`)).toBeVisible()
	expect(await page.evaluate(() => document.querySelector(":target")?.id)).toBe(id)
	await page.goBack()
	const value = await box.inputValue()
	const shown = await visibleRows(page).count()
	// Either the browser kept the text or it did not; the list must agree with the box either way.
	if (value === "") {
		await expect(page.locator("[data-dex-tiles]")).toBeVisible()
		expect(shown).toBe(0)
	} else {
		expect(value).toBe("tulip")
		expect(shown).toBeGreaterThan(0)
		await expect(page.locator("[data-dex-count]")).toContainText(String(shown))
		await expect(page.locator("[data-dex-tiles]")).toBeHidden()
	}
})

test("Escape, the × and the no-match button all clear", async ({ page }) => {
	await page.goto("/en/dex/")
	const box = page.getByRole("searchbox", { name: "Search the Dex" })
	await box.fill("tulip")
	await box.press("Escape")
	await expect(box).toHaveValue("")
	await expect(page.locator("[data-dex-tiles]")).toBeVisible()
	await box.fill("tulip")
	await page.locator(".search-field [data-dex-clear]").click()
	await expect(box).toHaveValue("")
	await expect(box).toBeFocused()
	await box.fill("zzzz")
	await expect(page.locator("[data-dex-empty-text]")).toHaveText('No match for "zzzz".')
	await page.locator("[data-dex-empty] [data-dex-clear]").click()
	await expect(box).toHaveValue("")
	await expect(page.locator("[data-dex-empty]")).toBeHidden()
})
```

Run: `cd "$TEMP/rookdex-e2e" && BASE_URL=http://localhost:8787 npx playwright test specs/dex-search.spec.mjs > logs/dex-search.log 2>&1; tail -20 logs/dex-search.log`
Expected: 4 passed.

- [ ] **Step 4: Measuring pass**

In the Browser pane on the preview build, for `/en/dex/` and `/nb/dex/`, at widths 320, 768, 1024, 1280, 1600 and 1920 px (hidden same-origin iframe of set width, see the s119 trap; `html { font-size: 200% }` for 200 % text). If the iframe stays blank because `X-Frame-Options: DENY` applies on this build, fall back to `resize_window` with a custom width per step and measure the top document instead, with the query "a" typed so every row shows, read off in one batched script:
- `document.documentElement.scrollWidth <= innerWidth` (no horizontal overflow);
- the number of distinct row `left` values (1 below 768, 2 from 768, 3 from 1600);
- every `.dex-row` and visible button `getBoundingClientRect().height >= 44` and width `>= 44`;
- the input and the × share one `bottom` and one `height`;
- CLS on load with the empty box (`PerformanceObserver` on `layout-shift`, buffered) is 0.

Fix anything that fails in Task 3's files, re-run that task's tests, commit, and re-measure once. Then take one screenshot at 320 px and one at 1600 px with results showing.

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --repo rookdex/rookdex --base main --title "feat(dex): search every category from the Dex front page" --body-file "$TEMP/rookdex-dex-search-pr.md"
```

Write `$TEMP/rookdex-dex-search-pr.md` with the Write tool first, and show the same text in chat before opening the PR. The PR body (first person, no em dashes) states what ships, the test count from Step 1, the Playwright result, the measured widths and the two screenshots' findings. Only `ward / gate` is required, so auto-merge would land before Lighthouse: do not enable auto-merge; merge by hand once every check, including the new `/en/dex/` Lighthouse run, is green.

---

## Considered and rejected (plan stress test)

- **A copy test for the three new keys in `copy.test.ts`.** `bundles.test.ts` holds en/nb parity and the `satisfies` in `src/i18n/index.ts` makes a missing nb key a type error; the page test reads the nb strings. A fourth check adds nothing.
- **Testing the `<script>` wiring in the page render test.** The Astro container does not emit processed scripts; Task 3 Step 7 checks the built HTML for the module tag and Task 4's Playwright run exercises the real wiring.
- **Re-scroll after the phone keyboard closes (the tracker's `KEYBOARD_SETTLE_MS`).** The list starts under the field and nothing is sticky (spec §3 item 5); the Playwright Enter step covers focus, and the measuring pass at 320 px covers placement.

> Stress-tested 2026-11-06 (skill a217382): 7 applied, 0 adapted, 0 decided by me.
