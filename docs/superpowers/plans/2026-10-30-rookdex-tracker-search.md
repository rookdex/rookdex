# Tracker search and hide found Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A search field and a "Hide found" toggle in one sticky row above the tracker's category chips, matching item names and group terms in English and Norwegian, offline.

**Architecture:** Pure matching and view functions in `src/model/search.ts` with a term map in `src/model/searchTerms.ts`. A `useSearch` hook owns the query, the remembered flag and the hidden snapshot; a `useLiveStatus` hook owns the one polite status region's text and its 500 ms timer. `SearchBar` is a stateless row; `Tracker.tsx` wires them. The tracker model (`src/model/tracker.ts`) does not change.

**Tech Stack:** Astro 5 island (`client:only="react"`), React 19, TypeScript, Vitest + Testing Library (jsdom) + fake-indexeddb, Biome, plain CSS in `src/styles/global.css`.

**Spec:** `docs/superpowers/specs/2026-10-30-tracker-search-design.md` (stress-tested 30.10.2026). Executors read both.

## Global Constraints

- Code, identifiers, comments and commit messages in English. Comments in first person where they speak about decisions ("I measure", not "the developer measures").
- No em dashes anywhere: code, comments, copy, commits, PR text.
- Times take a colon, dates take periods in prose (`30.10.2026`). ISO dates stay in filenames and code constants.
- Mobile-first CSS: base styles target 320 px; changes only inside `min-width` queries (768 px tablet, 1024 px desktop). One exception, required by the spec: `@media (min-height: 500px)` for stickiness.
- Controls on one row share one height (44 px, `var(--tap)`) and one bottom edge.
- No network calls. The query is never stored, logged or put in the URL. The only new stored value is `rookdex.hide-found` = `"1"`.
- The query is rendered as React text only, never `innerHTML`, never a `RegExp`.
- Copy keys exactly as spec §6 (16 keys, en and nb). Plurals use `.one` / `.other`.
- One polite status region per page: the existing `<p className="visually-hidden" role="status" aria-live="polite">` in `Tracker.tsx`.
- Biome is the formatter and linter: tabs, double quotes, no semicolons, line width 100. Run `npx biome check --write <files>` on touched files before each commit.
- **CRLF trap:** Edit on this Windows working copy can stage CRLF. Before each `git add`, run `sed -i 's/\r$//' <each touched file>`.
- **Escape trap:** Edit can write `æ`-style escapes into test files. After editing a file with æ, ø or å, check with `grep -n '\\\\u00' <file>` (expect no output).
- Stage explicit paths only, never `git commit -a`.
- Commit messages: one imperative sentence, sentence case, no prefix (house style: "Add the tracker search and hide found design spec"). No `Co-Authored-By`, no AI attribution.

## Plan rulings (where this plan departs from or fills in the spec)

- **P1. Sticky needs a flex wrapper.** A sticky grid item can never leave its own grid area, so a search row in a grid row of its own would never stick. Search row, chips and results move into `.tracker-main` (a flex column, so its containing block is the whole column), with chips and results in an inner grid `.tracker-body`. Desktop geometry stays the same: 170 px chips, list up to 640 px, 180 px stats.
- **P2. Privacy and Delete all.** The privacy page lists every localStorage value, so `privacy.storedChoices` (en, nb) gains Hide found and the page's `UPDATED` date moves. Settings' "Delete all data" forgets `rookdex.hide-found` like the other choices ("all data means all"); the install and hint flags still stay.
- **P3. Forced colours for pressed chips too.** The spec says the toggle reuses "the chips' `forced-colors` handling", but the chips have none: in forced colours a pressed chip and an unpressed chip look the same. One new rule covers both.
- **P4. No synced ticks exist.** The tracker has no cross-tab tick sync (only the hub checklist listens to `storage`). "No new snapshot on a synced tick" is tested as "no new snapshot when only the records change".
- **P5. Terms.** `aircraft` gains `fly og helikoptre` (the full nb label) so the label guard holds. Retired items are left out of `visible`, `elsewhere` and `hiddenCount`, as `ItemList` already hides them.
- **P6. Units the spec did not name.** `useLiveStatus` (`src/islands/tracker/useLiveStatus.ts`) holds the status text and the 500 ms timer, and `emptyState()` in `search.ts` picks the message under the list. Both keep `Tracker.tsx` thin and testable. `searchView` takes no `records` (the snapshot carries what it needs).
- **P7. Timer tests.** The 500 ms rule and "no write after unmount" are proven with fake timers in `useLiveStatus.test.ts`. The island tests use real time with short waits, because fake timers stall fake-indexeddb.

## Review Focus

1. **Sticky actually sticks on a long list.** Scrolled to the last card on a phone, the row's top is 0 and it stays above the cards, tooltips included. Pinned by the CSS test in Task 8 and measured in Task 9.
2. **A retired item never shows up in a count.** "N more in other categories" and the hidden count only count items the list can show. Pinned in Task 1 (`searchView` ignores retired items).
3. **A 100-character query with no spaces** in "No match for …" wraps inside a 320 px screen and never pushes the page sideways. `.item-empty` gets `overflow-wrap: anywhere` (Task 8), measured in Task 9.
4. **Only one clear button.** Chromium and Safari draw their own ✕ in `type="search"`; it is hidden, so a sighted user never sees two (Task 8, measured in Task 9). Escape is handled by me, not the browser, so "Search cleared" is announced (Task 6).
5. **Firefox placeholder contrast.** Firefox lowers placeholder opacity by default, so the 4.5:1 colour would fail there. The rule sets `opacity: 1` (Task 8), checked in Task 9.

---

### Task 1: Pure search functions

**Files:**
- Create: `src/model/search.ts`
- Test: `src/model/search.test.ts`

**Interfaces:**
- Consumes: `SeedItem` from `src/model/schema.ts`, `Records` from `src/model/stats.ts`.
- Produces:
  - `normalize(text: string): string`
  - `matches(query: string, fields: string[]): boolean`
  - `foundIds(records: Records): Set<string>`
  - `type SearchTerms = Readonly<Record<string, readonly string[]>>`
  - `interface SearchInput { items: SeedItem[]; selected: string[]; query: string; hidden: ReadonlySet<string>; terms: SearchTerms }`
  - `interface SearchView { visible: SeedItem[]; elsewhere: number; hiddenCount: number }`
  - `searchView(input: SearchInput): SearchView`
  - `type EmptyState = "none" | "elsewhere" | "all-found" | "no-match"`
  - `emptyState(view: SearchView, query: string): EmptyState`

- [ ] **Step 0: Record the bundle baseline**

Run from the repo root: `npm run build`, then `ls -l dist/_astro/ | grep -i tracker`.
Write the tracker island chunk's file name and byte size into the SDD ledger (or the PR notes file). Task 9 compares against it.

- [ ] **Step 1: Write the failing tests**

```ts
// src/model/search.test.ts
import { describe, expect, it } from "vitest"
import type { SeedItem } from "./schema"
import { emptyState, foundIds, matches, normalize, searchView } from "./search"
import type { Records } from "./stats"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }

function item(id: string, group: string, name: string, extra: Partial<SeedItem> = {}): SeedItem {
	return {
		id,
		category: id.split("/")[0],
		group,
		name,
		status: "confirmed",
		sources: [src],
		...extra,
	}
}

const items: SeedItem[] = [
	item("vehicles/albany-primo", "cars", "Albany Primo"),
	item("vehicles/ubermacht-sentinel", "cars", "Übermacht Sentinel"),
	item("vehicles/speedophile", "boats", "Speedophile Seashark"),
	item("vehicles/old-bravado", "cars", "Old Bravado", { retired: true }),
	item("wildlife/pelican", "birds", "Pelican"),
	item("wildlife/alligator", "reptiles", "American alligator"),
]

const terms = {
	cars: ["car", "cars", "bil", "biler"],
	boats: ["boat", "boats", "båt", "båter"],
	birds: ["bird", "birds", "animal", "fugl", "fugler", "dyr"],
	reptiles: ["reptile", "reptiles", "animal", "krypdyr", "dyr"],
}

const none: ReadonlySet<string> = new Set()
const ids = (list: SeedItem[]) => list.map((i) => i.id)
const view = (patch: Partial<Parameters<typeof searchView>[0]>) =>
	searchView({ items, selected: [], query: "", hidden: none, terms, ...patch })

describe("normalize (spec §3.1)", () => {
	it("folds accents and case, keeps ø and æ as letters", () => {
		expect(normalize("Übermacht")).toBe("ubermacht")
		expect(normalize("Båter")).toBe("bater")
		expect(normalize("Øyer")).toBe("øyer")
		expect(normalize("Nyttekjøretøy")).toBe("nyttekjøretøy")
		expect(normalize("Ærfugl")).toBe("ærfugl")
	})

	it("trims and collapses runs of whitespace", () => {
		expect(normalize("  albany \t  primo  ")).toBe("albany primo")
	})
})

describe("matches (spec §3.1)", () => {
	it("needs every word in some field", () => {
		expect(matches("albany primo", ["Albany Primo"])).toBe(true)
		expect(matches("primo albany", ["Albany Primo"])).toBe(true)
		expect(matches("albany sentinel", ["Albany Primo"])).toBe(false)
		expect(matches("primo car", ["Albany Primo", "car"])).toBe(true)
	})

	it("matches parts of words, accent- and case-insensitively", () => {
		expect(matches("uber", ["Übermacht Sentinel"])).toBe(true)
		expect(matches("BÅT", ["boats", "båter"])).toBe(true)
		expect(matches("bat", ["båter"])).toBe(true)
	})

	it("treats regex characters as plain text", () => {
		expect(matches("(", ["Albany Primo"])).toBe(false)
		expect(matches("*", ["Albany Primo"])).toBe(false)
		expect(matches(".*", ["Albany Primo"])).toBe(false)
		expect(matches("(2)", ["Pegasi (2)"])).toBe(true)
	})

	it("lets an empty or space-only query match everything", () => {
		expect(matches("", ["Albany Primo"])).toBe(true)
		expect(matches("   ", ["Albany Primo"])).toBe(true)
	})
})

describe("foundIds", () => {
	it("lists the done ids only", () => {
		const records = {
			"wildlife/pelican": { item_id: "wildlife/pelican", done: true },
			"vehicles/albany-primo": { item_id: "vehicles/albany-primo", done: false },
		} as unknown as Records
		expect([...foundIds(records)]).toEqual(["wildlife/pelican"])
	})
})

describe("searchView (spec §3.1)", () => {
	it("is today's chip view with no query", () => {
		expect(ids(view({}).visible)).toEqual([
			"vehicles/albany-primo",
			"vehicles/ubermacht-sentinel",
			"vehicles/speedophile",
			"wildlife/pelican",
			"wildlife/alligator",
		])
		expect(ids(view({ selected: ["wildlife"] }).visible)).toEqual([
			"wildlife/pelican",
			"wildlife/alligator",
		])
	})

	it("matches names and group terms, with the same set for car and bil", () => {
		expect(ids(view({ query: "car" }).visible)).toEqual(ids(view({ query: "bil" }).visible))
		expect(ids(view({ query: "bil" }).visible)).toEqual([
			"vehicles/albany-primo",
			"vehicles/ubermacht-sentinel",
		])
		expect(ids(view({ query: "dyr" }).visible)).toEqual(["wildlife/pelican", "wildlife/alligator"])
		expect(ids(view({ query: "seashark" }).visible)).toEqual(["vehicles/speedophile"])
	})

	it("runs inside the chips and counts the matches elsewhere", () => {
		const v = view({ selected: ["wildlife"], query: "car" })
		expect(v.visible).toEqual([])
		expect(v.elsewhere).toBe(2)
	})

	it("counts nothing elsewhere with no query or with All", () => {
		expect(view({ selected: ["wildlife"] }).elsewhere).toBe(0)
		expect(view({ query: "car" }).elsewhere).toBe(0)
	})

	it("hides the snapshot and counts it inside the chips only", () => {
		const hidden = new Set(["wildlife/pelican", "vehicles/albany-primo"])
		const v = view({ selected: ["wildlife"], query: "animal", hidden })
		expect(ids(v.visible)).toEqual(["wildlife/alligator"])
		expect(v.hiddenCount).toBe(1)
		// A hidden match outside the chips is not "elsewhere": Show all would not show it.
		expect(view({ selected: ["wildlife"], query: "primo", hidden }).elsewhere).toBe(0)
	})

	it("shows an item found after the snapshot", () => {
		const hidden = new Set(["wildlife/pelican"])
		// The alligator was ticked after the snapshot: it is not in `hidden`, so it stays.
		expect(ids(view({ selected: ["wildlife"], hidden }).visible)).toEqual(["wildlife/alligator"])
	})

	it("never counts a retired item", () => {
		const v = view({ selected: ["wildlife"], query: "bravado" })
		expect(v.elsewhere).toBe(0)
		expect(view({ query: "bravado" }).visible).toEqual([])
		const hidden = new Set(["vehicles/old-bravado"])
		expect(view({ query: "bravado", hidden }).hiddenCount).toBe(0)
	})
})

describe("emptyState (spec §4)", () => {
	const empty = { visible: [], elsewhere: 0, hiddenCount: 0 }
	it("picks the messages in the spec's order", () => {
		expect(emptyState({ ...empty, visible: [items[0]] }, "x")).toBe("none")
		expect(emptyState({ ...empty, elsewhere: 2, hiddenCount: 3 }, "x")).toBe("elsewhere")
		expect(emptyState({ ...empty, hiddenCount: 3 }, "x")).toBe("all-found")
		expect(emptyState({ ...empty, hiddenCount: 3 }, "")).toBe("all-found")
		expect(emptyState(empty, "x")).toBe("no-match")
	})

	it("leaves an empty list with no query to the list's own message", () => {
		expect(emptyState(empty, "  ")).toBe("none")
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/model/search.test.ts`
Expected: FAIL, `Failed to resolve import "./search"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/model/search.ts
// Tracker search (tracker search spec §3.1). Pure: no React, no DOM. The functions take plain
// text fields, so a later site-wide search can reuse normalize and matches.
import type { SeedItem } from "./schema"
import type { Records } from "./stats"

/** Group id to search words in both languages (searchTerms.ts). */
export type SearchTerms = Readonly<Record<string, readonly string[]>>

export interface SearchInput {
	items: SeedItem[]
	/** Chip ids; empty means All. */
	selected: string[]
	query: string
	/** The snapshot of found ids; empty while Hide found is off. */
	hidden: ReadonlySet<string>
	terms: SearchTerms
}

export interface SearchView {
	/** Inside the chips, matching, not hidden, in seed order. */
	visible: SeedItem[]
	/** Matching and not hidden outside the chips; 0 with no query or with All. */
	elsewhere: number
	/** Matching and hidden inside the chips. */
	hiddenCount: number
}

export type EmptyState = "none" | "elsewhere" | "all-found" | "no-match"

/** NFD with combining marks removed, lowercase, trimmed, inner whitespace collapsed. ø and æ
 *  are letters, not accents, so they stay. */
export function normalize(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")
}

function words(query: string): string[] {
	const text = normalize(query)
	return text === "" ? [] : text.split(" ")
}

// includes(), never a RegExp built from the query, so "(" or "*" is plain text.
function hasAll(queryWords: string[], fields: string[]): boolean {
	const normalized = fields.map(normalize)
	return queryWords.every((word) => normalized.some((field) => field.includes(word)))
}

/** Every word of the query appears in at least one field. An empty query matches everything. */
export function matches(query: string, fields: string[]): boolean {
	return hasAll(words(query), fields)
}

export function foundIds(records: Records): Set<string> {
	return new Set(
		Object.values(records)
			.filter((record) => record.done)
			.map((record) => record.item_id)
	)
}

export function searchView({ items, selected, query, hidden, terms }: SearchInput): SearchView {
	const queryWords = words(query)
	const all = selected.length === 0
	const visible: SeedItem[] = []
	let elsewhere = 0
	let hiddenCount = 0
	for (const item of items) {
		// The list never shows a retired item, so no count may include one.
		if (item.retired) continue
		if (queryWords.length > 0 && !hasAll(queryWords, [item.name, ...(terms[item.group] ?? [])]))
			continue
		const inside = all || selected.includes(item.category)
		if (!inside) {
			if (queryWords.length > 0 && !hidden.has(item.id)) elsewhere++
		} else if (hidden.has(item.id)) hiddenCount++
		else visible.push(item)
	}
	return { visible, elsewhere, hiddenCount }
}

/** The message that replaces the list (spec §4), or "none" when the list renders. */
export function emptyState(view: SearchView, query: string): EmptyState {
	if (view.visible.length > 0) return "none"
	if (view.elsewhere > 0) return "elsewhere"
	if (view.hiddenCount > 0) return "all-found"
	return normalize(query) === "" ? "none" : "no-match"
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/model/search.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Lint, normalise line endings, commit**

```bash
npx biome check --write src/model/search.ts src/model/search.test.ts
sed -i 's/\r$//' src/model/search.ts src/model/search.test.ts
git add src/model/search.ts src/model/search.test.ts
git commit -m "Add the pure search functions for the tracker"
```

---

### Task 2: Search terms and the label guard

**Files:**
- Create: `src/model/searchTerms.ts`
- Test: `src/model/searchTerms.test.ts`

**Interfaces:**
- Consumes: `normalize`, `SearchTerms` from Task 1; `seedItems` from `src/model/seed.ts`; `src/locales/en.json`, `src/locales/nb.json` (flat keys `group.<id>`).
- Produces:
  - `SEARCH_TERMS: SearchTerms`
  - `missingTerms(groups: string[], terms: SearchTerms, labels: Record<string, Record<string, string | undefined>>): string[]`. `labels` is keyed by locale, then group id. Each problem is one string: `"<group>: no terms"` or `"<group>: no <locale> label \"<label>\""`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/model/searchTerms.test.ts
import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import { seedItems } from "./seed"
import { missingTerms, SEARCH_TERMS } from "./searchTerms"

function groupLabels(bundle: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(bundle)
			.filter(([key]) => key.startsWith("group."))
			.map(([key, value]) => [key.slice("group.".length), value])
	)
}

describe("search terms (spec §3.2)", () => {
	it("cover every seed group with both of its labels", () => {
		const groups = [...new Set(seedItems.map((item) => item.group))]
		expect(groups.length).toBe(21)
		expect(
			missingTerms(groups, SEARCH_TERMS, { en: groupLabels(en), nb: groupLabels(nb) })
		).toEqual([])
	})

	it("report a group with no entry and an entry missing a label", () => {
		const labels = {
			en: { boats: "Boats", bikes: "Bikes" },
			nb: { boats: "Båter", bikes: "Sykler" },
		}
		expect(missingTerms(["boats", "bikes"], { boats: ["boat", "boats"] }, labels)).toEqual([
			'boats: no nb label "Båter"',
			"bikes: no terms",
		])
	})

	it("compare labels the way search does, ignoring case and accents", () => {
		const labels = { en: { boats: "Boats" }, nb: { boats: "Båter" } }
		expect(missingTerms(["boats"], { boats: ["BOATS", "bater"] }, labels)).toEqual([])
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/model/searchTerms.test.ts`
Expected: FAIL, `Failed to resolve import "./searchTerms"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/model/searchTerms.ts
// Search words per seed group, in both languages (tracker search spec §3.2). They carry no page
// language: "car" and "bil" find the same items on /en/ and /nb/. Each entry holds the group's en
// and nb labels (searchTerms.test.ts holds that) plus singulars and common words, because a
// Norwegian plural changes the stem ("motorsykkel" is not inside "Motorsykler").
import { normalize, type SearchTerms } from "./search"

export const SEARCH_TERMS: SearchTerms = {
	cars: ["car", "cars", "bil", "biler"],
	motorcycles: [
		"motorcycle",
		"motorcycles",
		"motorbike",
		"bike",
		"motorsykkel",
		"motorsykler",
		"mc",
	],
	boats: ["boat", "boats", "båt", "båter"],
	aircraft: [
		"aircraft",
		"plane",
		"planes",
		"helicopter",
		"helicopters",
		"fly",
		"helikopter",
		"helikoptre",
		"fly og helikoptre",
	],
	emergency: ["emergency", "police", "ambulance", "utrykning", "politi", "ambulanse"],
	commercial: [
		"commercial",
		"van",
		"truck",
		"bus",
		"nyttekjøretøy",
		"varebil",
		"lastebil",
		"buss",
	],
	service: ["service", "services", "garage", "shop", "tjeneste", "tjenester", "verksted"],
	vehicles: ["vehicle", "vehicles", "kjøretøy"],
	reptiles: ["reptile", "reptiles", "animal", "animals", "krypdyr", "dyr"],
	birds: ["bird", "birds", "animal", "animals", "fugl", "fugler", "dyr"],
	mammals: ["mammal", "mammals", "animal", "animals", "pattedyr", "dyr"],
	marine: ["marine life", "fish", "sea", "animal", "animals", "sjødyr", "fisk", "hav", "dyr"],
	cities: ["city", "cities", "by", "byer"],
	keys: ["keys", "island", "islands", "øy", "øyer"],
	regions: ["region", "regions", "regioner"],
	landmarks: ["landmark", "landmarks", "landemerke", "landemerker"],
	businesses: ["business", "businesses", "shop", "store", "bedrift", "bedrifter", "butikk"],
	neighborhoods: ["neighborhood", "neighborhoods", "district", "bydel", "bydeler"],
	"hidden-items": ["hidden item", "hidden items", "skjult gjenstand", "skjulte gjenstander"],
	stunts: ["stunt", "stunts", "jump", "hopp"],
	challenges: ["challenge", "challenges", "utfordring", "utfordringer"],
}

/** Every group needs an entry that contains each locale's label. Returns the problems, if any. */
export function missingTerms(
	groups: string[],
	terms: SearchTerms,
	labels: Record<string, Record<string, string | undefined>>
): string[] {
	const problems: string[] = []
	for (const group of groups) {
		const entry = terms[group]
		if (!entry) {
			problems.push(`${group}: no terms`)
			continue
		}
		const normalized = entry.map(normalize)
		for (const [locale, byGroup] of Object.entries(labels)) {
			const label = byGroup[group]
			if (label === undefined || !normalized.includes(normalize(label)))
				problems.push(`${group}: no ${locale} label "${label ?? ""}"`)
		}
	}
	return problems
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/model/searchTerms.test.ts`
Expected: PASS, 3 tests. If the first test reports a label, fix the entry in `SEARCH_TERMS`, never the test.

- [ ] **Step 5: Lint, check escapes, commit**

```bash
npx biome check --write src/model/searchTerms.ts src/model/searchTerms.test.ts
sed -i 's/\r$//' src/model/searchTerms.ts src/model/searchTerms.test.ts
grep -n '\\u00' src/model/searchTerms.ts src/model/searchTerms.test.ts
git add src/model/searchTerms.ts src/model/searchTerms.test.ts
git commit -m "Add the search terms for every tracker group in both languages"
```

The `grep` must print nothing.

---

### Task 3: The Hide found flag, Delete all and the privacy note

**Files:**
- Modify: `src/islands/seenFlag.ts` (add `HIDE_FOUND_KEY`, `clearFlag`)
- Modify: `src/scripts/delete-all.ts:2,16-23,45-47`
- Modify: `src/locales/en.json`, `src/locales/nb.json` (`privacy.storedChoices`)
- Modify: `src/pages/[locale]/privacy.astro:17` (`UPDATED`)
- Test: `src/islands/seenFlag.test.ts`, `src/scripts/delete-all.test.ts:16-31`, `src/test/privacy-page.test.ts:113-121`

**Interfaces:**
- Produces: `HIDE_FOUND_KEY = "rookdex.hide-found"`, `clearFlag(key: string): void` (never throws). `readFlag` and `writeFlag` exist already.

- [ ] **Step 1: Write the failing tests**

Add to `src/islands/seenFlag.test.ts`, changing its import line to
`import { ACTIVE_PROFILE_KEY, activeProfileStorage, clearFlag, HIDE_FOUND_KEY, readFlag, writeFlag } from "./seenFlag"`:

```ts
describe("Hide found flag (tracker search spec §3.3)", () => {
	it("writes, reads and clears one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
			removeItem: (key: string) => map.delete(key),
		})
		expect(HIDE_FOUND_KEY).toBe("rookdex.hide-found")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		writeFlag(HIDE_FOUND_KEY)
		expect(map.get(HIDE_FOUND_KEY)).toBe("1")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(true)
		clearFlag(HIDE_FOUND_KEY)
		expect(map.has(HIDE_FOUND_KEY)).toBe(false)
	})

	it("never throws when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked })
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		expect(() => clearFlag(HIDE_FOUND_KEY)).not.toThrow()
	})
})
```

In `src/scripts/delete-all.test.ts`, change the import to `import { CHECKLIST_KEY, HIDE_FOUND_KEY } from "../islands/seenFlag"`, rename the first test to `"deletes the rookdex database and every choice, and keeps the one-shot flags"`, and change its expectation to:

```ts
		expect(storage.removeItem.mock.calls).toEqual([
			["lang"],
			["rookdex.active-profile"],
			[CHECKLIST_KEY],
			[HIDE_FOUND_KEY],
		])
```

In `src/test/privacy-page.test.ts`, replace the second expected list item (line 118) with:

```ts
			'Which profile is active, the language you picked, which items you ticked on the before-launch list, whether Hide found is on in the tracker, and two notes that a message was already shown: the install prompt and the storage hint (localStorage). If you choose "update later", that is kept only until you close the tab (sessionStorage).',
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/islands/seenFlag.test.ts src/scripts/delete-all.test.ts src/test/privacy-page.test.ts`
Expected: FAIL: `clearFlag` and `HIDE_FOUND_KEY` are not exported, the delete-all call list is one short, and the privacy text differs.

- [ ] **Step 3: Write the implementation**

In `src/islands/seenFlag.ts`, after `HINT_SEEN_KEY`:

```ts
/** "Hide found" on the tracker (tracker search spec §3.3). "1" while on, absent while off. */
export const HIDE_FOUND_KEY = "rookdex.hide-found"
```

After `writeFlag`:

```ts
export function clearFlag(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// Blocked storage holds no flag to clear.
	}
}
```

In `src/scripts/delete-all.ts`, import `HIDE_FOUND_KEY` beside `CHECKLIST_KEY`, add `forget(HIDE_FOUND_KEY)` after `forget(CHECKLIST_KEY)`, and replace the doc comment's sentence that lists what goes with:

```ts
 * reports it once and keeps waiting. It never sends a second request. The language choice (`lang`),
 * the remembered profile, the before-launch list and Hide found go too, because all data means all
 * (locale spec D9, dashboard spec §5, desktop dashboard spec §5, tracker search spec §8). The
 * install and hint flags stay, so the prompt and the hint don't come back (feedback spec §7.3).
 * The service worker cache stays too, so the app still opens offline.
```

In `src/locales/en.json`, set `privacy.storedChoices` to:

```
Which profile is active, the language you picked, which items you ticked on the before-launch list, whether Hide found is on in the tracker, and two notes that a message was already shown: the install prompt and the storage hint (localStorage). If you choose \"update later\", that is kept only until you close the tab (sessionStorage).
```

In `src/locales/nb.json`, set `privacy.storedChoices` to:

```
Hvilken profil som er aktiv, språket du valgte, hvilke punkter du krysset av på listen før lansering, om Skjul funnet er på i oversikten, og to merknader om at en melding allerede er vist: installeringsforslaget og lagringstipset (localStorage). Velger du «oppdater senere», huskes det bare til du lukker fanen (sessionStorage).
```

In `src/pages/[locale]/privacy.astro:17`, run `date +"%Y-%m-%d"` and set `UPDATED` to that day: `const UPDATED = new Date("<that date>T00:00:00Z")`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/islands/seenFlag.test.ts src/scripts/delete-all.test.ts src/test/privacy-page.test.ts src/i18n`
Expected: PASS. The `src/i18n` run proves the bundles still match (no key added or lost).

- [ ] **Step 5: Lint, check escapes, commit**

```bash
npx biome check --write src/islands/seenFlag.ts src/islands/seenFlag.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/test/privacy-page.test.ts src/locales/en.json src/locales/nb.json
sed -i 's/\r$//' src/islands/seenFlag.ts src/islands/seenFlag.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/test/privacy-page.test.ts src/locales/en.json src/locales/nb.json "src/pages/[locale]/privacy.astro"
grep -n '\\u00' src/locales/nb.json src/test/privacy-page.test.ts
git add src/islands/seenFlag.ts src/islands/seenFlag.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/test/privacy-page.test.ts src/locales/en.json src/locales/nb.json "src/pages/[locale]/privacy.astro"
git commit -m "Add the Hide found flag and list it in the privacy note and Delete all"
```

---

### Task 4: The useSearch hook

**Files:**
- Create: `src/islands/tracker/useSearch.ts`
- Modify: `src/islands/tracker/hash.ts` (split out `hashItemId`)
- Test: `src/islands/tracker/useSearch.test.ts`, `src/islands/tracker/hash.test.ts`

**Interfaces:**
- Consumes: `foundIds`, `searchView`, `SearchView` (Task 1); `SEARCH_TERMS` (Task 2); `HIDE_FOUND_KEY`, `readFlag`, `writeFlag`, `clearFlag` (Task 3); `TrackerState` from `src/model/tracker.ts`.
- Produces:
  - `type SearchSource = Pick<TrackerState, "status" | "profileId" | "items" | "records" | "selected">`
  - `interface SearchChange { query?: string; selected?: string[]; hideFound?: boolean }`
  - `interface Search { query: string; hideFound: boolean; view: SearchView; setQuery(query: string): void; clearQuery(): void; toggleHideFound(): void; resnapshot(): void; viewFor(change: SearchChange): SearchView }`
  - `useSearch(source: SearchSource, arrival?: string): Search`. `arrival` is the seed id a Sources back link points at (`#item-<id>`); it is spared from the first snapshot only, so the arrival effect can focus it.
  - `hashItemId(hash: string): string | null` in `hash.ts`: the seed id in `#item-<id>`, or null. Never throws.

- [ ] **Step 0: Split the hash parser**

Add to `src/islands/tracker/hash.test.ts`, importing `hashItemId` beside `hashTarget`:

```ts
describe("hashItemId", () => {
	it("reads the seed id from an item hash and never throws", () => {
		expect(hashItemId("#item-wildlife%2Fpelican")).toBe("wildlife/pelican")
		expect(hashItemId("#item-wildlife/pelican")).toBe("wildlife/pelican")
		expect(hashItemId("#item-%")).toBeNull()
		expect(hashItemId("#top")).toBeNull()
		expect(hashItemId("")).toBeNull()
	})
})
```

Run `npx vitest run src/islands/tracker/hash.test.ts` (FAIL: not exported). Then in `src/islands/tracker/hash.ts` add the function and let `hashTarget` use it:

```ts
/** The seed id in a `#item-<id>` hash, or null. Never throws. */
export function hashItemId(hash: string): string | null {
	let id: string
	try {
		id = decodeURIComponent(hash.slice(1))
	} catch {
		return null
	}
	return id.startsWith("item-") ? id.slice("item-".length) : null
}

export function hashTarget(hash: string, doc: Document): HTMLInputElement | null {
	const id = hashItemId(hash)
	if (id === null) return null
	const el = doc.getElementById(`item-${id}`)
	return el?.tagName === "INPUT" ? (el as HTMLInputElement) : null
}
```

Keep the existing doc comment above `hashTarget`. Run the hash tests again: PASS, the old cases included.

- [ ] **Step 1: Write the failing tests**

```ts
// src/islands/tracker/useSearch.test.ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { Records } from "../../model/stats"
import { fixtures } from "../../test/tracker-fixtures"
import { HIDE_FOUND_KEY } from "../seenFlag"
import { type SearchSource, useSearch } from "./useSearch"

const PELICAN = "wildlife/pelican"
const GATOR = "wildlife/american-alligator"

function found(...ids: string[]): Records {
	return Object.fromEntries(
		ids.map((id) => [id, { item_id: id, done: true }])
	) as unknown as Records
}

const base: SearchSource = {
	status: "ready",
	profileId: "p1",
	items: fixtures,
	records: {},
	selected: [],
}

function setup(source: Partial<SearchSource> = {}) {
	return renderHook((props: SearchSource) => useSearch(props), {
		initialProps: { ...base, ...source },
	})
}

const visibleIds = (r: { current: ReturnType<typeof useSearch> }) =>
	r.current.view.visible.map((item) => item.id)

beforeEach(() => localStorage.clear())

describe("useSearch (tracker search spec §3.4)", () => {
	it("starts with an empty query and the remembered flag", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result } = setup()
		expect(result.current.query).toBe("")
		expect(result.current.hideFound).toBe(true)
	})

	it("remembers the toggle and forgets it when switched off", () => {
		const { result } = setup()
		act(() => result.current.toggleHideFound())
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBe("1")
		act(() => result.current.toggleHideFound())
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBeNull()
	})

	it("hides nothing while Hide found is off", () => {
		const { result } = setup({ records: found(PELICAN) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(result.current.view.hiddenCount).toBe(0)
	})

	it("takes the first snapshot when the tracker becomes ready", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup({ status: "loading" })
		expect(visibleIds(result)).toContain(PELICAN)
		rerender({ ...base, status: "ready", records: found(PELICAN) })
		expect(visibleIds(result)).not.toContain(PELICAN)
		expect(result.current.view.hiddenCount).toBe(1)
	})

	it("keeps a ticked item visible until the query changes", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		// A tick, an untick or a change from anywhere else: only the records move.
		rerender({ ...base, records: found(PELICAN) })
		expect(visibleIds(result)).toContain(PELICAN)
		act(() => result.current.setQuery("a"))
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("takes a new snapshot when the chips change", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		rerender({ ...base, records: found(PELICAN) })
		rerender({ ...base, records: found(PELICAN), selected: ["wildlife"] })
		expect(visibleIds(result)).toEqual([GATOR])
	})

	it("takes a new snapshot when Hide found is switched on", () => {
		const { result } = setup({ records: found(PELICAN) })
		act(() => result.current.toggleHideFound())
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("takes a new snapshot when the profile changes", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup({ records: found(PELICAN) })
		rerender({ ...base, profileId: "p2", records: found(GATOR) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(visibleIds(result)).not.toContain(GATOR)
	})

	it("takes a new snapshot on resnapshot (a confirmed import)", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		rerender({ ...base, records: found(GATOR) })
		expect(visibleIds(result)).toContain(GATOR)
		act(() => result.current.resnapshot())
		expect(visibleIds(result)).not.toContain(GATOR)
	})

	it("clears the query", () => {
		const { result } = setup()
		act(() => result.current.setQuery("peli"))
		expect(visibleIds(result)).toEqual([PELICAN])
		act(() => result.current.clearQuery())
		expect(result.current.query).toBe("")
		expect(visibleIds(result)).toHaveLength(3)
	})

	it("spares the item a Sources back link points at, in the first snapshot only", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = renderHook(
			(props: SearchSource) => useSearch(props, PELICAN),
			{ initialProps: { ...base, status: "loading" } }
		)
		rerender({ ...base, records: found(PELICAN, GATOR) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(visibleIds(result)).not.toContain(GATOR)
		act(() => result.current.setQuery("a"))
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("previews the view a change would give, with that change's snapshot", () => {
		const { result } = setup({ records: found(PELICAN), selected: ["vehicles"] })
		expect(result.current.viewFor({ hideFound: true }).hiddenCount).toBe(0)
		expect(result.current.viewFor({ hideFound: true, selected: [] }).hiddenCount).toBe(1)
		expect(result.current.viewFor({ query: "pelican" }).elsewhere).toBe(1)
		// A preview changes nothing.
		expect(result.current.hideFound).toBe(false)
		expect(result.current.query).toBe("")
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/islands/tracker/useSearch.test.ts`
Expected: FAIL, `Failed to resolve import "./useSearch"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/islands/tracker/useSearch.ts
import { useState } from "react"
import { foundIds, type SearchView, searchView } from "../../model/search"
import { SEARCH_TERMS } from "../../model/searchTerms"
import type { TrackerState } from "../../model/tracker"
import { clearFlag, HIDE_FOUND_KEY, readFlag, writeFlag } from "../seenFlag"

export type SearchSource = Pick<
	TrackerState,
	"status" | "profileId" | "items" | "records" | "selected"
>

export interface SearchChange {
	query?: string
	selected?: string[]
	hideFound?: boolean
}

export interface Search {
	query: string
	hideFound: boolean
	view: SearchView
	setQuery(query: string): void
	clearQuery(): void
	toggleHideFound(): void
	/** A new snapshot with nothing else changed: an import was confirmed into this profile. */
	resnapshot(): void
	/** The view `change` would give, with the snapshot that change takes. Changes nothing. */
	viewFor(change: SearchChange): SearchView
}

const NONE: ReadonlySet<string> = new Set()

/**
 * View state for tracker search (tracker search spec §3.4). The query is never stored. Hide found
 * hides what was found at the last snapshot, so an item ticked now stays where the finger is.
 */
export function useSearch(source: SearchSource, arrival?: string): Search {
	const [query, setQuery] = useState("")
	const [hideFound, setHideFound] = useState(() => readFlag(HIDE_FOUND_KEY))
	const [imports, setImports] = useState(0)
	const ready = source.status === "ready"

	function snapshot(on: boolean, spare?: string): ReadonlySet<string> {
		if (!on || !ready) return NONE
		const ids = foundIds(source.records)
		if (spare) ids.delete(spare)
		return ids
	}

	// Every snapshot trigger is in this key and the records are not, so a tick alone keeps the
	// snapshot it had. The first one waits for ready: ticks load after mount.
	const key = JSON.stringify([ready, source.profileId, source.selected, query, hideFound, imports])
	const [snap, setSnap] = useState(() => ({ key, ready, hidden: snapshot(hideFound, arrival) }))
	let hidden = snap.hidden
	if (snap.key !== key) {
		// The item a Sources back link points at survives the snapshot taken as the tracker becomes
		// ready, so the arrival can focus it. Any later change hides it as usual.
		hidden = snapshot(hideFound, snap.ready ? undefined : arrival)
		// Set while rendering, React's pattern for state that follows props: no effect, so no frame
		// ever shows the old snapshot with the new query.
		setSnap({ key, ready, hidden })
	}

	function viewOf(selected: string[], q: string, hide: ReadonlySet<string>): SearchView {
		return searchView({ items: source.items, selected, query: q, hidden: hide, terms: SEARCH_TERMS })
	}

	return {
		query,
		hideFound,
		view: viewOf(source.selected, query, hidden),
		setQuery,
		clearQuery: () => setQuery(""),
		toggleHideFound() {
			const next = !hideFound
			setHideFound(next)
			if (next) writeFlag(HIDE_FOUND_KEY)
			else clearFlag(HIDE_FOUND_KEY)
		},
		resnapshot: () => setImports((n) => n + 1),
		viewFor: (change) =>
			viewOf(
				change.selected ?? source.selected,
				change.query ?? query,
				snapshot(change.hideFound ?? hideFound)
			),
	}
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/islands/tracker/useSearch.test.ts src/islands/tracker/hash.test.ts`
Expected: PASS, 12 useSearch tests plus the hash tests.

- [ ] **Step 5: Lint, commit**

```bash
npx biome check --write src/islands/tracker/useSearch.ts src/islands/tracker/useSearch.test.ts src/islands/tracker/hash.ts src/islands/tracker/hash.test.ts
sed -i 's/\r$//' src/islands/tracker/useSearch.ts src/islands/tracker/useSearch.test.ts src/islands/tracker/hash.ts src/islands/tracker/hash.test.ts
git add src/islands/tracker/useSearch.ts src/islands/tracker/useSearch.test.ts src/islands/tracker/hash.ts src/islands/tracker/hash.test.ts
git commit -m "Add the useSearch hook with the Hide found snapshot"
```

---

### Task 5: The useLiveStatus hook

**Files:**
- Create: `src/islands/tracker/useLiveStatus.ts`
- Test: `src/islands/tracker/useLiveStatus.test.ts`

**Interfaces:**
- Produces:
  - `SETTLE_MS = 500`
  - `interface LiveStatus { message: string; say(text: string): void; sayLater(text: string): void; cancel(): void }`
  - `useLiveStatus(): LiveStatus`. `say` cancels anything pending and writes at once. `sayLater` replaces anything pending and writes after `SETTLE_MS`. `cancel` drops what is pending. The timer is cleared on unmount.

- [ ] **Step 1: Write the failing tests**

```ts
// src/islands/tracker/useLiveStatus.test.ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SETTLE_MS, useLiveStatus } from "./useLiveStatus"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useLiveStatus (tracker search spec §5)", () => {
	it("writes a typing result once typing has settled for 500 ms", () => {
		const { result } = renderHook(() => useLiveStatus())
		expect(SETTLE_MS).toBe(500)
		act(() => result.current.sayLater("3 results"))
		act(() => vi.advanceTimersByTime(499))
		expect(result.current.message).toBe("")
		act(() => vi.advanceTimersByTime(1))
		expect(result.current.message).toBe("3 results")
	})

	it("restarts the wait on every keystroke and keeps the last result", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("12 results"))
		act(() => vi.advanceTimersByTime(300))
		act(() => result.current.sayLater("1 result"))
		act(() => vi.advanceTimersByTime(300))
		expect(result.current.message).toBe("")
		act(() => vi.advanceTimersByTime(200))
		expect(result.current.message).toBe("1 result")
	})

	it("lets a tick cancel a pending result", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		act(() => result.current.say("Wildlife: 1 of 2"))
		act(() => vi.advanceTimersByTime(1000))
		expect(result.current.message).toBe("Wildlife: 1 of 2")
	})

	it("drops a pending result on cancel", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		act(() => result.current.cancel())
		act(() => vi.advanceTimersByTime(1000))
		expect(result.current.message).toBe("")
	})

	it("leaves no timer behind after unmount", () => {
		const { result, unmount } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		expect(vi.getTimerCount()).toBe(1)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/islands/tracker/useLiveStatus.test.ts`
Expected: FAIL, `Failed to resolve import "./useLiveStatus"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/islands/tracker/useLiveStatus.ts
import { useEffect, useRef, useState } from "react"

/** How long typing must pause before its result is announced (tracker search spec §5). */
export const SETTLE_MS = 500

export interface LiveStatus {
	message: string
	/** Writes now; anything pending is dropped. */
	say(text: string): void
	/** Writes after SETTLE_MS, replacing anything pending. */
	sayLater(text: string): void
	cancel(): void
}

/** The text of the tracker's one polite status region. The last event wins. */
export function useLiveStatus(): LiveStatus {
	const [message, setMessage] = useState("")
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	useEffect(() => () => clearTimeout(timer.current), [])

	function cancel() {
		clearTimeout(timer.current)
		timer.current = undefined
	}

	return {
		message,
		say(text) {
			cancel()
			setMessage(text)
		},
		sayLater(text) {
			cancel()
			timer.current = setTimeout(() => {
				timer.current = undefined
				setMessage(text)
			}, SETTLE_MS)
		},
		cancel,
	}
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/islands/tracker/useLiveStatus.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint, commit**

```bash
npx biome check --write src/islands/tracker/useLiveStatus.ts src/islands/tracker/useLiveStatus.test.ts
sed -i 's/\r$//' src/islands/tracker/useLiveStatus.ts src/islands/tracker/useLiveStatus.test.ts
git add src/islands/tracker/useLiveStatus.ts src/islands/tracker/useLiveStatus.test.ts
git commit -m "Add the live status hook for the tracker's one status region"
```

---

### Task 6: Copy keys, icons and the SearchBar row

**Files:**
- Modify: `src/locales/en.json`, `src/locales/nb.json` (16 keys from spec §6, placed after `tracker.dismiss`)
- Modify: `src/islands/tracker/icons.tsx` (add `EyeOffIcon`, `CloseIcon`)
- Create: `src/islands/tracker/SearchBar.tsx`
- Test: `src/islands/tracker/SearchBar.test.tsx`, `src/i18n/copy.test.ts`

**Interfaces:**
- Consumes: `Translate` from `src/i18n`.
- Produces: `SearchBar(props: { query: string; hideFound: boolean; hiddenCount: number; inputRef: RefObject<HTMLInputElement | null>; onQuery(query: string): void; onClear(): void; onToggleHideFound(): void; t: Translate })`. DOM: `div.search-row[role=search]` > `div.search-field` (`label.visually-hidden`, `input#tracker-search[type=search]`, optional `button.search-clear`) and `button.search-toggle[aria-pressed]` (`svg`, `span.search-toggle-label`, while on: `span.search-count[aria-hidden]` and a visually hidden count). Copy keys `tracker.search.*` for Task 7.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/i18n/copy.test.ts`:

```ts
describe("tracker search copy (tracker search spec §6)", () => {
	const keys = [
		"tracker.search.label",
		"tracker.search.placeholder",
		"tracker.search.clear",
		"tracker.search.hideFound",
		"tracker.search.hiddenCount",
		"tracker.search.elsewhere.one",
		"tracker.search.elsewhere.other",
		"tracker.search.showAll",
		"tracker.search.noMatch",
		"tracker.search.allFound",
		"tracker.search.results.one",
		"tracker.search.results.other",
		"tracker.search.resultsElsewhere",
		"tracker.search.hideFoundOn",
		"tracker.search.hideFoundOff",
		"tracker.search.cleared",
	]

	it.each(keys)("%s exists in en and nb", (key) => {
		expect(en).toHaveProperty([key])
		expect(nb).toHaveProperty([key])
	})

	it("quotes the query the way each language does", () => {
		expect(en["tracker.search.noMatch"]).toBe('No match for "{query}".')
		expect(nb["tracker.search.noMatch"]).toBe("Ingen treff på «{query}».")
	})
})
```

Create `src/islands/tracker/SearchBar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import { SearchBar } from "./SearchBar"

function setup(props: { query?: string; hideFound?: boolean; hiddenCount?: number } = {}) {
	const handlers = { onQuery: vi.fn(), onClear: vi.fn(), onToggleHideFound: vi.fn() }
	const inputRef = createRef<HTMLInputElement>()
	render(
		<SearchBar
			query={props.query ?? ""}
			hideFound={props.hideFound ?? false}
			hiddenCount={props.hiddenCount ?? 0}
			inputRef={inputRef}
			t={translator("en").t}
			{...handlers}
		/>
	)
	return { ...handlers, inputRef, field: screen.getByRole("searchbox", { name: "Search the tracker" }) }
}

describe("SearchBar (tracker search spec §5)", () => {
	it("is a search landmark with a labelled field", () => {
		const { field, inputRef } = setup()
		expect(screen.getByRole("search")).toContainElement(field)
		expect(field).toHaveAttribute("placeholder", "Name or type, e.g. Tulip or boat")
		expect(field).toHaveAttribute("maxlength", "100")
		expect(field).toHaveAttribute("autocomplete", "off")
		expect(field).toHaveAttribute("enterkeyhint", "search")
		expect(inputRef.current).toBe(field)
	})

	it("reports typing", () => {
		const { field, onQuery } = setup()
		fireEvent.change(field, { target: { value: "boat" } })
		expect(onQuery).toHaveBeenCalledWith("boat")
	})

	it("has no clear button while the field is empty", () => {
		setup()
		expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull()
	})

	it("clears from its button and puts focus back", () => {
		const { field, onClear } = setup({ query: "boat" })
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(onClear).toHaveBeenCalledOnce()
		expect(document.activeElement).toBe(field)
	})

	it("clears on Escape and leaves Enter alone", () => {
		const { field, onClear, onQuery } = setup({ query: "boat" })
		expect(field.closest("form")).toBeNull()
		fireEvent.keyDown(field, { key: "Enter" })
		expect(onClear).not.toHaveBeenCalled()
		// fireEvent returns false when the handler called preventDefault.
		expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(false)
		expect(onClear).toHaveBeenCalledOnce()
		expect(onQuery).not.toHaveBeenCalled()
	})

	it("ignores Escape in an empty field", () => {
		const { field, onClear } = setup()
		fireEvent.keyDown(field, { key: "Escape" })
		expect(onClear).not.toHaveBeenCalled()
	})

	it("is a pressed toggle that shows the hidden count only while on", () => {
		const { onToggleHideFound } = setup()
		const off = screen.getByRole("button", { name: "Hide found" })
		expect(off).toHaveAttribute("aria-pressed", "false")
		fireEvent.click(off)
		expect(onToggleHideFound).toHaveBeenCalledOnce()
	})

	it("names the count on the toggle while on", () => {
		setup({ hideFound: true, hiddenCount: 37 })
		const on = screen.getByRole("button", { name: "Hide found 37 hidden" })
		expect(on).toHaveAttribute("aria-pressed", "true")
		expect(on.querySelector(".search-count")).toHaveTextContent("37")
		expect(on.querySelector(".search-count")).toHaveAttribute("aria-hidden", "true")
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/i18n/copy.test.ts src/islands/tracker/SearchBar.test.tsx`
Expected: FAIL: 16 missing keys, and `Failed to resolve import "./SearchBar"`.

- [ ] **Step 3: Add the copy, the icons and the component**

Add to `src/locales/en.json` after `"tracker.dismiss"`:

```json
	"tracker.search.label": "Search the tracker",
	"tracker.search.placeholder": "Name or type, e.g. Tulip or boat",
	"tracker.search.clear": "Clear search",
	"tracker.search.hideFound": "Hide found",
	"tracker.search.hiddenCount": "{count} hidden",
	"tracker.search.elsewhere.one": "1 more in other categories",
	"tracker.search.elsewhere.other": "{count} more in other categories",
	"tracker.search.showAll": "Show all categories",
	"tracker.search.noMatch": "No match for \"{query}\".",
	"tracker.search.allFound": "Everything that matches is found. Turn off Hide found to see it.",
	"tracker.search.results.one": "1 result",
	"tracker.search.results.other": "{count} results",
	"tracker.search.resultsElsewhere": "No results in the selected categories. {count} in other categories.",
	"tracker.search.hideFoundOn": "Hide found on. {count} hidden.",
	"tracker.search.hideFoundOff": "Hide found off.",
	"tracker.search.cleared": "Search cleared",
```

Add to `src/locales/nb.json` after `"tracker.dismiss"`:

```json
	"tracker.search.label": "Søk i oversikten",
	"tracker.search.placeholder": "Navn eller type, f.eks. Tulip eller båt",
	"tracker.search.clear": "Tøm søket",
	"tracker.search.hideFound": "Skjul funnet",
	"tracker.search.hiddenCount": "{count} skjult",
	"tracker.search.elsewhere.one": "1 til i andre kategorier",
	"tracker.search.elsewhere.other": "{count} til i andre kategorier",
	"tracker.search.showAll": "Vis alle kategorier",
	"tracker.search.noMatch": "Ingen treff på «{query}».",
	"tracker.search.allFound": "Alt som passer er funnet. Slå av Skjul funnet for å se det.",
	"tracker.search.results.one": "1 treff",
	"tracker.search.results.other": "{count} treff",
	"tracker.search.resultsElsewhere": "Ingen treff i de valgte kategoriene. {count} i andre kategorier.",
	"tracker.search.hideFoundOn": "Skjul funnet på. {count} skjult.",
	"tracker.search.hideFoundOff": "Skjul funnet av.",
	"tracker.search.cleared": "Søket er tømt",
```

Add to `src/islands/tracker/icons.tsx`:

```tsx
export function EyeOffIcon() {
	return (
		<svg {...common} aria-hidden="true">
			{/* My own geometry (an eye and a slash), so no icon set's licence or notice applies. */}
			<path d="M2 12c2.5-4.5 6-7 10-7s7.5 2.5 10 7c-2.5 4.5-6 7-10 7s-7.5-2.5-10-7z" />
			<circle cx="12" cy="12" r="3" />
			<path d="M4 4l16 16" />
		</svg>
	)
}

export function CloseIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	)
}
```

Create `src/islands/tracker/SearchBar.tsx`:

```tsx
import type { KeyboardEvent, RefObject } from "react"
import type { Translate } from "../../i18n"
import { CloseIcon, EyeOffIcon } from "./icons"

interface Props {
	query: string
	hideFound: boolean
	hiddenCount: number
	inputRef: RefObject<HTMLInputElement | null>
	onQuery: (query: string) => void
	onClear: () => void
	onToggleHideFound: () => void
	t: Translate
}

/** The row above the chips (tracker search spec §3.5, §5). Holds no state of its own. */
export function SearchBar({
	query,
	hideFound,
	hiddenCount,
	inputRef,
	onQuery,
	onClear,
	onToggleHideFound,
	t,
}: Props) {
	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Escape" || query === "") return
		// Mine, not the browser's: a native clear would skip the "Search cleared" line.
		event.preventDefault()
		onClear()
	}

	function clear() {
		onClear()
		inputRef.current?.focus()
	}

	return (
		<div className="search-row" role="search">
			<div className="search-field">
				<label htmlFor="tracker-search" className="visually-hidden">
					{t("tracker.search.label")}
				</label>
				{/* No form: Enter has nothing to submit, and blurring would lose a keyboard user's place. */}
				<input
					ref={inputRef}
					id="tracker-search"
					type="search"
					value={query}
					placeholder={t("tracker.search.placeholder")}
					maxLength={100}
					autoComplete="off"
					enterKeyHint="search"
					onChange={(event) => onQuery(event.target.value)}
					onKeyDown={onKeyDown}
				/>
				{query !== "" && (
					<button type="button" className="search-clear" onClick={clear}>
						<CloseIcon />
						<span className="visually-hidden">{t("tracker.search.clear")}</span>
					</button>
				)}
			</div>
			<button
				type="button"
				className="search-toggle"
				aria-pressed={hideFound}
				onClick={onToggleHideFound}
			>
				<EyeOffIcon />
				<span className="search-toggle-label">{t("tracker.search.hideFound")}</span>
				{hideFound && (
					<>
						<span className="search-count" aria-hidden="true">
							{hiddenCount}
						</span>
						<span className="visually-hidden">
							{t("tracker.search.hiddenCount", { count: hiddenCount })}
						</span>
					</>
				)}
			</button>
		</div>
	)
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/i18n src/islands/tracker/SearchBar.test.tsx`
Expected: PASS. If the accessible name test sees `"Hide found37 hidden"` or similar, the name join differs in jsdom: keep the markup and match with `{ name: /^Hide found\s*37 hidden$/ }`.

- [ ] **Step 5: Lint, check escapes, commit**

```bash
npx biome check --write src/locales/en.json src/locales/nb.json src/islands/tracker/icons.tsx src/islands/tracker/SearchBar.tsx src/islands/tracker/SearchBar.test.tsx src/i18n/copy.test.ts
sed -i 's/\r$//' src/locales/en.json src/locales/nb.json src/islands/tracker/icons.tsx src/islands/tracker/SearchBar.tsx src/islands/tracker/SearchBar.test.tsx src/i18n/copy.test.ts
grep -n '\\u00' src/locales/nb.json src/i18n/copy.test.ts
git add src/locales/en.json src/locales/nb.json src/islands/tracker/icons.tsx src/islands/tracker/SearchBar.tsx src/islands/tracker/SearchBar.test.tsx src/i18n/copy.test.ts
git commit -m "Add the search row with its copy in both languages"
```

---

### Task 7: Wire search into the Tracker island

**Files:**
- Modify: `src/islands/Tracker.tsx`
- Test: `src/islands/Tracker.search.test.tsx` (create); existing `src/islands/Tracker*.test.tsx` must stay green.

**Interfaces:**
- Consumes: `useSearch`, `Search` (Task 4); `useLiveStatus` (Task 5); `SearchBar` (Task 6); `emptyState`, `SearchView` (Task 1); `translator(locale).plural`.
- Produces: DOM for Task 8's CSS: `.tracker` > (`.tracker-top`, `.tracker-main` > (`.search-row`, `.tracker-body` > (`nav.cat-nav`, `.tracker-results` > (list or `p.item-empty`, optional `p.search-elsewhere`))), `.stats`, status region, alert, dialogs).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/islands/Tracker.search.test.tsx
// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { HIDE_FOUND_KEY } from "./seenFlag"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

// jsdom's File may lack text(); the island only needs size + text().
if (typeof File.prototype.text !== "function") {
	File.prototype.text = function () {
		return new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = () => resolve(String(reader.result))
			reader.readAsText(this)
		})
	}
}

beforeEach(resetBrowser)

const ready = (locale: "en" | "nb" = "en") => renderReady(<Tracker locale={locale} />)
const field = () => screen.getByRole("searchbox")
const type = (value: string) => fireEvent.change(field(), { target: { value } })
const names = () => screen.queryAllByRole("checkbox").map((box) => box.getAttribute("id"))
const status = () => screen.getByRole("status")
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Tracker search (tracker search spec §4)", () => {
	it("filters on every keystroke by name and by group term", async () => {
		await ready()
		type("peli")
		expect(names()).toEqual(["item-wildlife/pelican"])
		type("dyr")
		expect(names()).toEqual(["item-wildlife/american-alligator", "item-wildlife/pelican"])
	})

	it("finds the same items with English terms on the Norwegian page", async () => {
		await ready("nb")
		type("animal")
		expect(names()).toEqual(["item-wildlife/american-alligator", "item-wildlife/pelican"])
	})

	it("keeps a ticked item visible with Hide found on until the search changes", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		expect(names()).toContain("item-wildlife/pelican")
		type("peli")
		expect(names()).toEqual([])
		expect(
			screen.getByText("Everything that matches is found. Turn off Hide found to see it.")
		).toBeInTheDocument()
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBe("1")
	})

	it("points to other categories and shows them all on request", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
		type("pelican")
		expect(names()).toEqual([])
		expect(screen.getByText("1 more in other categories")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Show all categories" }))
		expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true")
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(document.activeElement).toBe(field())
		expect(field()).toHaveValue("pelican")
		expect(status()).toHaveTextContent("1 result")
	})

	it("says when nothing matches, as text", async () => {
		await ready()
		type("<b>zzz</b>")
		expect(screen.getByText('No match for "<b>zzz</b>".')).toBeInTheDocument()
		expect(document.querySelector(".tracker b")).toBeNull()
	})

	it("hides what an import brings in when Hide found is on", async () => {
		const { container } = await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		const input = container.querySelector<HTMLInputElement>('input[type="file"]')
		const file = new File(
			[
				JSON.stringify({
					version: 1,
					exported_at: "2026-09-16T10:00:00.000Z",
					profile_name: "Dad",
					records: [
						{
							item_id: "wildlife/american-alligator",
							done: true,
							updated_at: "2026-09-16T09:00:00.000Z",
							origin: "manual",
						},
					],
				}),
			],
			"rookdex-dad.json",
			{ type: "application/json" }
		)
		if (input) fireEvent.change(input, { target: { files: [file] } })
		const dialog = await screen.findByRole("dialog", { name: "Import Dad into Player 1?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Import into Player 1" }))
		await waitFor(() =>
			expect(screen.queryByRole("checkbox", { name: "American alligator" })).toBeNull()
		)
	})
})

describe("Tracker search announcements (tracker search spec §5)", () => {
	it("announces the result once typing settles", async () => {
		await ready()
		type("peli")
		expect(status()).not.toHaveTextContent("1 result")
		await waitFor(() => expect(status()).toHaveTextContent("1 result"))
	})

	it("announces the other categories when the chips hold no match", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
		type("pelican")
		await waitFor(() =>
			expect(status()).toHaveTextContent(
				"No results in the selected categories. 1 in other categories."
			)
		)
	})

	it("announces everything found the way the screen shows it", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		type("peli")
		await waitFor(() =>
			expect(status()).toHaveTextContent(
				"Everything that matches is found. Turn off Hide found to see it."
			)
		)
	})

	it("drops a pending result when the chips change", async () => {
		await ready()
		type("peli")
		fireEvent.click(screen.getByRole("button", { name: "Vehicles" }))
		await wait(700)
		expect(status()).not.toHaveTextContent("1 result")
	})

	it("lets a tick cancel a pending result", async () => {
		await ready()
		type("alli")
		fireEvent.click(screen.getByRole("checkbox", { name: "American alligator" }))
		await waitFor(() => expect(status()).toHaveTextContent("Wildlife: 1 of 2"))
		await wait(700)
		expect(status()).toHaveTextContent("Wildlife: 1 of 2")
	})

	it("announces Hide found on with its count, and off", async () => {
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		expect(status()).toHaveTextContent("Hide found on. 1 hidden.")
		fireEvent.click(screen.getByRole("button", { name: /^Hide found/ }))
		expect(status()).toHaveTextContent("Hide found off.")
	})

	it("announces a cleared search from the button and from Escape", async () => {
		await ready()
		type("peli")
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(field()).toHaveValue("")
		expect(status()).toHaveTextContent("Search cleared")
		type("peli")
		await waitFor(() => expect(status()).toHaveTextContent("1 result"))
		fireEvent.keyDown(field(), { key: "Escape" })
		expect(field()).toHaveValue("")
		expect(status()).toHaveTextContent("Search cleared")
	})

	it("keeps one status region", async () => {
		await ready()
		expect(screen.getAllByRole("status")).toHaveLength(1)
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/islands/Tracker.search.test.tsx`
Expected: FAIL: no element with role `searchbox`.

- [ ] **Step 3: Wire the island**

In `src/islands/Tracker.tsx`:

Imports: add `import { emptyState, type SearchView } from "../model/search"`, `import { SearchBar } from "./tracker/SearchBar"`, `import { useLiveStatus } from "./tracker/useLiveStatus"`, `import { useSearch } from "./tracker/useSearch"`.

Change `const { t } = translator(locale)` to `const { t, plural } = translator(locale)`.

Add `hashItemId` to the `./tracker/hash` import. After `useShowParam(state.selected)` add:

```tsx
	// The item a Sources back link points at stays visible on arrival, even if found (Task 4).
	const [arrival] = useState(() => hashItemId(window.location.hash) ?? undefined)
	const search = useSearch(state, arrival)
	const live = useLiveStatus()
	const searchField = useRef<HTMLInputElement>(null)
```

After `dismissHint()` add these handlers:

```tsx
	// Says what the screen shows: the same three empty states as the list (spec §4).
	function resultsText(view: SearchView): string {
		const state = emptyState(view, "x")
		if (state === "elsewhere") return t("tracker.search.resultsElsewhere", { count: view.elsewhere })
		if (state === "all-found") return t("tracker.search.allFound")
		return plural("tracker.search.results", view.visible.length)
	}

	// A typing result still pending would describe the old chips.
	function selectCategories(ids: string[]) {
		live.cancel()
		tracker.selectCategories(ids)
	}

	function onQuery(query: string) {
		search.setQuery(query)
		if (query.trim() === "") live.cancel()
		else live.sayLater(resultsText(search.viewFor({ query })))
	}

	function clearSearch() {
		search.clearQuery()
		live.say(t("tracker.search.cleared"))
	}

	function toggleHideFound() {
		const on = !search.hideFound
		search.toggleHideFound()
		live.say(
			on
				? t("tracker.search.hideFoundOn", {
						count: search.viewFor({ hideFound: true }).hiddenCount,
					})
				: t("tracker.search.hideFoundOff")
		)
	}

	// The button disappears with the hint, so focus goes to the field rather than to <body>.
	function showAllCategories() {
		tracker.selectCategories([])
		searchField.current?.focus()
		live.say(resultsText(search.viewFor({ selected: [] })))
	}

	// A tick is announced as before, and it cancels a pending typing result (spec §5).
	async function toggleItem(id: string, done: boolean) {
		live.cancel()
		const before = tracker.getState().announcement
		await (done ? tracker.tick(id) : tracker.untick(id))
		const after = tracker.getState().announcement
		if (after && after !== before)
			live.say(
				t("tracker.announce", {
					category: seedLabel(t, "category", after.category),
					done: after.done,
					total: after.total,
				})
			)
	}

	async function confirmImport(target: "current" | "new") {
		await tracker.confirmImport(target)
		search.resnapshot()
	}
```

Delete the `const visible = ...` block and the `const announcement = ...` block. After `const sourcesHref = ...` add:

```tsx
	const { view } = search
	const empty = emptyState(view, search.query)
```

Replace the `<CategoryNav ... />` and `<ItemList ... />` elements with:

```tsx
			<div className="tracker-main">
				<SearchBar
					query={search.query}
					hideFound={search.hideFound}
					hiddenCount={view.hiddenCount}
					inputRef={searchField}
					onQuery={onQuery}
					onClear={clearSearch}
					onToggleHideFound={toggleHideFound}
					t={t}
				/>
				<div className="tracker-body">
					<CategoryNav
						categories={categories}
						selected={state.selected}
						onSelect={selectCategories}
						allLabel={t("tracker.all")}
						navLabel={t("tracker.categories")}
						sources={{ href: sourcesHref, label: t("tracker.sources") }}
					/>
					<div className="tracker-results">
						{empty === "none" && (
							<ItemList
								items={view.visible}
								records={state.records}
								disabled={state.status !== "ready"}
								categoryLabel={(id) => seedLabel(t, "category", id)}
								groupLabel={(id) => seedLabel(t, "group", id)}
								onToggle={toggleItem}
								sourcesHref={sourcesHref}
								t={t}
							/>
						)}
						{empty === "all-found" && <p className="item-empty">{t("tracker.search.allFound")}</p>}
						{empty === "no-match" && (
							<p className="item-empty">
								{t("tracker.search.noMatch", { query: search.query.trim() })}
							</p>
						)}
						{view.elsewhere > 0 && (
							<p className="search-elsewhere">
								{plural("tracker.search.elsewhere", view.elsewhere)}{" "}
								<button type="button" onClick={showAllCategories}>
									{t("tracker.search.showAll")}
								</button>
							</p>
						)}
					</div>
				</div>
			</div>
```

The `StatsRail` stays where it is and keeps counting every item. Change the status region's content from `{announcement}` to `{live.message}`. In `<ImportDialog>`, change `onInto` and `onCreate` to `onInto={() => confirmImport("current")}` and `onCreate={() => confirmImport("new")}`.

- [ ] **Step 4: Run the tracker tests to see them pass**

Run: `npx vitest run src/islands`
Expected: PASS for `Tracker.search.test.tsx` (14 tests) and every existing `Tracker*.test.tsx`, including the axe check in `Tracker.test.tsx`. If `toggles an item from its label` or `ticking announces` fails, the cause is `toggleItem`'s await; fix the handler, not the test.

- [ ] **Step 5: Type check, lint, commit**

```bash
npx astro check
npx biome check --write src/islands/Tracker.tsx src/islands/Tracker.search.test.tsx
sed -i 's/\r$//' src/islands/Tracker.tsx src/islands/Tracker.search.test.tsx
git add src/islands/Tracker.tsx src/islands/Tracker.search.test.tsx
git commit -m "Wire search and Hide found into the tracker"
```

`astro check` must report 0 errors (it proves every `t()` key exists in the `Key` type).

---

### Task 8: Layout, sticky row and styles

**Files:**
- Modify: `src/styles/global.css` (tracker block at about line 1283, the 768 px block at about 2496, the 1024 px block at about 2829, the shared transition list at about 595, the hover, active and focus selectors at about 642, 652, 703, 723, the pink-focus list at about 121)
- Test: `src/styles/search.test.ts` (create)

**Interfaces:**
- Consumes: the DOM from Task 7.
- Produces: `--search-row-h` (the row's height, used by `scroll-padding-top`).

- [ ] **Step 1: Write the failing test**

```ts
// src/styles/search.test.ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	""
)

/** The body of the first `@media <query> {` block, braces balanced. */
function mediaBlock(query: string): string {
	const start = css.indexOf(`@media ${query} {`)
	if (start < 0) return ""
	let depth = 0
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++
		else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1)
	}
	return ""
}

describe("search row CSS (tracker search spec §5)", () => {
	it("is sticky only where the screen is at least 500 px tall", () => {
		const tall = mediaBlock("(min-height: 500px)")
		expect(tall).toMatch(/\.search-row\s*\{[^}]*position:\s*sticky/)
		expect(tall).toMatch(/scroll-padding-top/)
		expect(css.replace(tall, "")).not.toMatch(/position:\s*sticky/)
	})

	it("sits in a flex column, so stickiness reaches the end of the list", () => {
		expect(css).toMatch(/\.tracker-main\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/)
	})

	it("hides the browser's own clear button and keeps the placeholder opaque", () => {
		expect(css).toMatch(/::-webkit-search-cancel-button\s*\{[^}]*appearance:\s*none/)
		expect(css).toMatch(/::placeholder\s*\{[^}]*color:\s*var\(--text-muted\)[^}]*opacity:\s*1/)
	})

	it("marks pressed chips and the toggle in forced colours", () => {
		const forced = [...css.matchAll(/@media \(forced-colors: active\) \{/g)].length
		expect(forced).toBeGreaterThan(0)
		expect(css).toMatch(/\.search-toggle\[aria-pressed="true"\][^{]*\{[^}]*Highlight/)
	})

	it("adds no max-width queries", () => {
		expect(css).not.toMatch(/@media[^{]*max-width[^{]*\{[^}]*search/)
	})
})
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run src/styles/search.test.ts`
Expected: FAIL on the sticky, flex, placeholder and forced-colour cases.

- [ ] **Step 3: Write the CSS**

Replace the base tracker grid (around line 1283) and the `.cat-nav` / `.item-list, .item-empty` rules (around 1318 to 1325) with:

```css
.tracker {
	display: grid;
	/* minmax(0, 1fr), not auto: the card grid's minimum must not stretch the page at 200 % text. */
	grid-template-columns: minmax(0, 1fr);
	gap: var(--space-4);
	grid-template-areas:
		"top"
		"stats"
		"main";
}

/* A flex column, not a grid: a sticky grid item never leaves its own grid area, so the search
   row could not follow the list. As a flex item it sticks to the end of this column. */
.tracker-main {
	grid-area: main;
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	min-width: 0;
}

.tracker-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: var(--space-4);
	grid-template-areas:
		"nav"
		"list";
}

.cat-nav {
	grid-area: nav;
}

.tracker-results {
	grid-area: list;
	min-width: 0;
}

/* A 100-character query with no spaces still wraps inside 320 px. */
.item-empty {
	overflow-wrap: anywhere;
}
```

Add the row after `.tracker button:disabled` (around line 1357):

```css
/* Search (tracker search spec §5). Both controls are 44 px and share one bottom edge. */
.search-row {
	--search-row-h: calc(var(--tap) + 2 * var(--space-2) + 1px);
	display: flex;
	align-items: flex-end;
	gap: var(--space-2);
	padding-block: var(--space-2);
	border-bottom: 1px solid var(--border);
	background: var(--bg);
}

.search-field {
	position: relative;
	flex: 1;
	min-width: 0;
}

.search-field input {
	width: 100%;
	height: var(--tap);
	margin: 0;
	padding-block: 0;
	padding-inline: var(--space-3) var(--tap);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
	color: var(--text);
	font: inherit;
	appearance: none;
}

/* The only visible hint once the label is hidden: body-text contrast. Firefox lowers placeholder
   opacity by default, which would drop it under 4.5:1. */
.search-field input::placeholder {
	color: var(--text-muted);
	opacity: 1;
}

/* One clear button: mine, which announces itself. */
.search-field input::-webkit-search-cancel-button {
	appearance: none;
}

.tracker .search-clear {
	position: absolute;
	inset-block: 0;
	inset-inline-end: 0;
	display: grid;
	place-items: center;
	width: var(--tap);
	padding: 0;
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	color: var(--text-muted);
}

.tracker .search-toggle {
	flex: none;
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	height: var(--tap);
	padding: 0 var(--space-3);
	border-radius: 999px;
	background: var(--bg-raised);
	color: var(--text);
	white-space: nowrap;
}

.search-count::before {
	content: "· " / "";
}

.search-elsewhere {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2) var(--space-3);
	color: var(--text-muted);
}

.search-elsewhere button {
	min-height: var(--tap);
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius);
	background: var(--bg-raised);
	color: var(--text);
}

/* Sticky only with room to spare: a landscape phone (about 360 px) or 200 % zoom would lose a
   third of the screen to the row. scroll-padding keeps a checkbox focused while tabbing backwards
   out from under it (WCAG 2.4.11). */
@media (min-height: 500px) {
	.search-row {
		position: sticky;
		top: 0;
		z-index: 7;
	}

	html:has(.search-row) {
		scroll-padding-top: calc(var(--tap) + 2 * var(--space-2) + 1px + var(--space-2));
	}
}
```

Extend the chips' pressed rule (around line 1378) to the toggle, and add the forced-colours rule after it:

```css
.chips button[aria-pressed="true"],
.tracker .search-toggle[aria-pressed="true"] {
	background: var(--accent);
	color: var(--accent-text);
	border-color: var(--accent);
}

/* Forced colours drop backgrounds, which would make pressed and unpressed look the same. */
@media (forced-colors: active) {
	.chips button[aria-pressed="true"],
	.tracker .search-toggle[aria-pressed="true"] {
		forced-color-adjust: none;
		background: Highlight;
		color: HighlightText;
		border-color: Highlight;
	}
}
```

Selector additions in the shared rules (edit each list in place, keep everything else as it is):

- Pink-focus list (around line 121): add `.tracker .search-toggle[aria-pressed="true"]:focus-visible` beside `.chips button[aria-pressed="true"]:focus-visible`.
- Transition list (around line 595): add `.search-toggle,` `.search-clear,` `.search-elsewhere button,` after `.chips a,`.
- Each of `.chips button:not([aria-pressed="true"]):hover` (around 642 and 652), `.chips button:not([aria-pressed="true"]):active` (around 703) and `.chips button:not([aria-pressed="true"]):focus-visible` (around 723): add the same selector with `.tracker .search-toggle` in place of `.chips button`, plus `.tracker .search-clear:hover` / `:active` / `:focus-visible` and `.search-elsewhere button:hover` / `:active` / `:focus-visible` in the matching list.

In the 768 px block (around line 2496), replace the `.tracker` rule with:

```css
	.tracker {
		grid-template-areas:
			"top"
			"main"
			"stats";
		align-items: start;
	}

	.tracker-body {
		grid-template-columns: 170px minmax(0, 1fr);
		grid-template-areas: "nav list";
		align-items: start;
	}
```

In the 1024 px block (around line 2829), replace the `.tracker` rule with:

```css
	/* Same geometry as before search: 170 px chips, the list up to 640 px, 180 px stats. */
	.tracker {
		grid-template-columns: minmax(0, calc(170px + var(--space-4) + 640px)) 180px;
		grid-template-areas:
			"top top"
			"main stats";
		justify-content: center;
	}

	.tracker-body {
		grid-template-columns: 170px minmax(0, 640px);
	}
```

Before editing, run `grep -n "item-list\|item-empty\|grid-area: list\|grid-area: nav" src/styles/global.css src/islands -r` and confirm only the tracker rules above use them.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/styles`
Expected: PASS, including the existing `hover.test.ts`, `links.test.ts` and `tokens.test.ts`. If `hover.test.ts` names a new selector that lacks a hover or focus partner, add the partner it asks for.

- [ ] **Step 5: Lint, commit**

```bash
npx biome check --write src/styles/global.css src/styles/search.test.ts
sed -i 's/\r$//' src/styles/global.css src/styles/search.test.ts
git add src/styles/global.css src/styles/search.test.ts
git commit -m "Lay out the sticky search row above the chips"
```

---

### Task 9: Measure, fix, and open the PR

**Files:**
- Modify (only if a measurement fails): `src/styles/global.css`, `src/islands/tracker/SearchBar.tsx`
- Create: `docs/superpowers/specs/2026-10-30-tracker-search-as-built.md` (short as-built note: rulings P1 to P7, measurements, bundle delta)

This task is the controller's: subagents have no browser. CSS fixes go to an implementer with the measured numbers.

- [ ] **Step 1: Full suite and build**

Run: `npm test`, then `npx astro check`, then `npx biome ci .` (in the LF worktree, where CRLF noise does not show), then `GITHUB_SHA=$(git rev-parse HEAD) npm run build`.
Expected: all green. Record the test count from the output.

- [ ] **Step 2: Serve the build**

If the worktree has no `.claude/launch.json`, copy the repo-root one. Start it with preview_start. After a rebuild, unregister the service worker and clear caches before measuring. The Browser pane runs with reduced motion on.

- [ ] **Step 3: Measure in one batched round (spec §9)**

At 320 x 800 and 1265 x 900, on `/en/tracker/` and `/nb/tracker/`, read with `javascript_tool`:

```js
const row = document.querySelector(".search-row")
const field = row.querySelector("input")
const toggle = row.querySelector(".search-toggle")
const r = (el) => el.getBoundingClientRect()
;({
	row: r(row).height,
	field: [r(field).height, r(field).bottom],
	toggle: [r(toggle).height, r(toggle).bottom, toggle.scrollWidth > toggle.clientWidth],
	placeholder: getComputedStyle(field, "::placeholder").color,
	fieldBg: getComputedStyle(field).backgroundColor,
	page: document.documentElement.scrollWidth <= innerWidth,
})
```

Pass: row about 61 px; field and toggle both 44 px with equal `bottom`; toggle not overflowing; no sideways scroll. Placeholder contrast from the two colours is 4.5:1 or more.

Then: scroll to the last card and read `r(row).top` (expect 0) and that the row covers the cards beneath it (`document.elementFromPoint(20, r(row).top + 10)` is inside `.search-row`). Turn Hide found on and read the toggle again (count visible, still fits). Type a 100-character word with no spaces and check `page` again. Shift+Tab backwards through three cards and check each focused checkbox's `top` is greater than `r(row).bottom`. Resize to 640 x 360 and check `getComputedStyle(row).position === "static"`. Check one clear button shows while text is in the field. Read the accessibility tree for the search landmark, the field's name, the toggle's pressed state and the one status region.

- [ ] **Step 4: Toggle text at 320 px**

If the toggle overflows or squeezes the field below about 9 rem at 320 px in either language, hide the label below 768 px. Base rule:

```css
.search-toggle-label {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.search-count::before {
	content: none;
}
```

and inside the 768 px block:

```css
	.search-toggle-label {
		position: static;
		width: auto;
		height: auto;
		overflow: visible;
		clip-path: none;
	}

	.search-count::before {
		content: "· " / "";
	}
```

The accessible name stays "Hide found 37 hidden". Re-measure once. Still wrong after that round: stop and show Malin the numbers.

- [ ] **Step 5: CLS, forced colours, bundle**

Measure load CLS on `/en/tracker/` at 320 px (expect under 0.01, as before). Emulate `forced-colors: active` if the pane offers it and check the pressed toggle and a pressed chip; otherwise list it as Malin's one check in Edge DevTools (Rendering, "Emulate CSS forced-colors") before merge. Compare the tracker chunk size with Task 1's baseline.

- [ ] **Step 6: As-built note, push, PR**

Write the as-built note (rulings P1 to P7, the measured numbers, the bundle before and after, anything still open). Commit it, push the branch, and open the PR with this body (fill in the measured numbers):

```markdown
Adds a search field and a "Hide found" toggle in one sticky row above the tracker's chips. Spec: `docs/superpowers/specs/2026-10-30-tracker-search-design.md`; plan and as-built note beside it.

## What changes
- Search matches item names and group terms in English and Norwegian on both pages ("car" and "bil" give the same list), inside the selected chips, with a "Show all categories" hint when other categories also match.
- Hide found is remembered on this device. A ticked item stays put until the search or chips change.
- One status region announces results 500 ms after typing stops; a tick always wins.
- The privacy note and Delete all now include the Hide found flag.

## Checked
- Tests: <count> green; `astro check` and `biome ci` clean.
- Measured at 320 px and 1265 px, en and nb: row <h> px, both controls 44 px on one bottom edge, sticky to the end of the list, static at 640 x 360, placeholder <ratio>:1, load CLS <cls>.
- Tracker chunk: <before> to <after> bytes.

## For you
- Forced colours: <checked in the pane | one check in Edge DevTools before merge>.
```

Bind the PR with the ccd_pr tools and report CI. Merge is Malin's.

---

## Stress test of this plan (30.10.2026)

Folded in: the Sources back link's item is spared from the first snapshot (`hashItemId`, `useSearch(source, arrival)`), so a found item you return to is still there to focus; the typing announcement mirrors the "everything found" empty state instead of saying "0 results"; a chip change drops a pending typing result; the eye-off icon is my own geometry, so no icon set's licence applies.

Considered and rejected:
- **Announce a new result count on every chip press while a query is set.** The chip's own pressed state is read on press; a second line would talk over it. Dropping the stale line is enough.
- **Keep the arrival item visible for the whole visit.** It would make Hide found feel broken after the next search. Sparing it from the first snapshot only matches the Q2 rule for a fresh tick.
- **Whole-word term matching to stop "bus" listing businesses.** Already rejected in spec §10; the plan keeps substring matching.
- **Consent for `rookdex.hide-found`.** A view setting the player turns on, stored to deliver that feature, is strictly necessary under ekomloven § 3-15; it is disclosed on the privacy page (P2).

> Stress-tested 2026-10-30 (skill 1b85fca): 4 applied, 1 adapted, 0 decided by me.
