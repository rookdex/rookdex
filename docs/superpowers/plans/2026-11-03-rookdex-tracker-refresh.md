# Tracker refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the tracker page category tiles with icons and counts, big section titles, a round check, an icon-lead card, a slim stats rail with relative times, a phone "Last found" row and the profile button in the title row, in two PRs merged by Tuesday 10.11.2026. A third PR (added 04.11) puts group chips under every pressed category.

**Architecture:** PR 1 (the look) changes markup and CSS only: `CategoryNav` buttons become tiles, `ItemList` titles get counts from a new `perGroup` in `src/model/stats.ts`, and five category icons join `icons.tsx` behind `categoryIcon(id)`. PR 2 (the structure) rebuilds `ItemRow` as the icon-lead card, slims `StatsRail`, adds a pure `relativeTime`, a `useNow` minute tick called only inside the rail and the new `LastFound` row, and portals `ProfileMenu` into a slot in the Astro page's new title row. The tracker model, storage, search and the hub do not change. PR 3 adds `groups` and `toggleGroup` to the tracker model beside `selected`, a `groups` input to `searchView` and `useSearch`, a `GroupChips` row rendered by `ItemList` under each pressed category, and `?group=` beside `?show=`.

**Tech Stack:** Astro 5 island (`client:only="react"`), React 19 (`createPortal` from `react-dom`), TypeScript, Vitest + Testing Library (jsdom) + fake-indexeddb, Biome, plain CSS in `src/styles/global.css`.

**Spec:** `docs/superpowers/specs/2026-11-03-tracker-refresh-design.md` (stress-tested 03.11.2026). Executors read both. Visual reference (gitignored, main checkout only): `.superpowers/brainstorm/1618-1793692565/content/desktop-mix.html` (S3) and `.superpowers/brainstorm/301-1793615260/content/phone-tiles.html` (P2). Never open them with a plain `cat`: S3 inlines a base64 font of about 30 KB.

## Global Constraints

- Code, identifiers, comments and commit messages in English. Comments in first person where they speak about decisions ("I measured", not "the developer measured").
- No em dashes anywhere: code, comments, copy, commits, PR text.
- Times take a colon, dates take periods in prose (`10.11.2026`). ISO dates stay in filenames and code constants.
- Mobile-first CSS: base styles target 320 px; changes only inside `min-width` queries (768 px tablet, 1024 px desktop, and the wide steps at 1600 and 1920 px from spec §14.2).
- Controls on one row share one height (44 px, `var(--tap)`) and one bottom edge. Tiles in one row share one height.
- No raw hex in `global.css` (the tokens test scans for it). Use tokens and `color-mix`.
- Bebas Neue (`var(--font-display)`) is always `font-weight: 400`. It ships one weight; a bold would be faked.
- Muted text keeps 4.5:1 on true black. Nothing is told by colour alone.
- New copy: only `tracker.lastFound` = "Last found" / "Sist funnet". `tracker.progress` stays in both bundles (the hub uses it). PR 3 adds `tracker.groupChips` = "Groups: {category}" / "Grupper: {category}" and rewords four keys, verbatim from spec §14.1's copy table.
- No new storage, network calls or third parties. Bar widths go through React's `style` prop (CSSOM), never a server `style` attribute.
- Biome is the formatter and linter: tabs, double quotes, no semicolons, line width 100. Run `npx biome check --write <files>` on touched files before each commit.
- **CRLF trap:** Edit on this Windows working copy can stage CRLF. Before each `git add`, run `sed -i 's/\r$//' <each touched file>`.
- **Escape trap:** Edit can write `æ`-style escapes into files with æ, ø or å. After editing one, check with `grep -n '\\u00' <file>` (expect no output).
- **In-place edit trap:** never run `sed -i` with a line address taken from a shell variable without checking the variable first. An empty address applies the edit to every line.
- Stage explicit paths only, never `git commit -a`.
- Commit messages: one imperative sentence, sentence case, no prefix (house style: "Add the tracker refresh design spec"). No `Co-Authored-By`, no AI attribution.
- Branches: PR 1 on `feat/tracker-refresh-look` in worktree `.claude/worktrees/tracker-refresh-look`; PR 2 on `feat/tracker-refresh-structure`, cut from `main` **after PR 1 has merged**, in worktree `.claude/worktrees/tracker-refresh-structure`; PR 3 on `feat/tracker-refresh-chips`, cut from `main` **after PR 2 has merged**, in worktree `.claude/worktrees/tracker-refresh-chips`. I may merge each PR myself once CI is green (her standing go-ahead for refresh PRs).

## Plan rulings (where this plan departs from or fills in the spec)

- **R1. Tile names break eight test queries.** Spec §4.1 makes a tile's name "Vehicles, 40 of 148", so `getByRole("button", { name: "Vehicles" })` no longer matches. §11's "existing tests pass unchanged" cannot hold for those queries; they move to `/^Vehicles,/` (Task 3). Heading queries keep their exact names.
- **R2. Stacked tiles take the approved P2 mockup's measures** (§4.1 cites it): a 24 px icon tile, 6 px gap, 8 px padding and a 12 px label. Wide tiles keep S3's 36 px icon, 10 px padding and 13 px label. At 320 px a stacked tile is about 140 px wide, so S3's measures left 86 px for "Collectibles" and "Samleobjekter", and both broke mid-word.
- **R3. Icon tiles are `var(--border)` (#262626).** The mockups' #1a1a1a is not a token, and `--bg-hover` would vanish when the hover lift paints the tile the same colour.
- **R4. `.chips` becomes `.tiles` everywhere** (CSS, the CSS test). A pressed tile is no longer a pink surface, so it leaves the "pink surfaces get a white focus ring" rule; its forced-colours `Highlight` rule stays.
- **R5. PR 1 keeps the rail and the profile button where they are today.** The tablet layout goes to one column in PR 1 (tiles above the list, §3.2), with the rail under the list until PR 2 hides it below 1024 px.
- **R6. The page caps the tracker at 1088 px, not 1120.** `.wrap` is `72rem` with 32 px padding from 1024 px, so at a 1265 px viewport the list column is 592 px. Two cards need 572 px, so §3.4 still holds. `--tracker-max-w` still gets the spec's value.
- **R7. The rail heading reads "Overall".** Spec §5.2 names `tracker.overall`, so the hub link's name changes and the two "Progress heading" tests in `Tracker.test.tsx` move to "Overall" (Task 10).
- **R8. The avatar letter is `var(--text)` on a 30 % pink tint.** Pink on that tint works out to about 3.9:1, under AA for 13 px text. `--text` gives about 11.8:1.
- **R9. The hub gets the avatar too.** `ProfileMenu` is one component; the hub's trigger keeps its accessible name "Profile: {name}" through `aria-label`, so its tests hold. Checked at 320 px in Task 13.
- **R10. Last found scrolls the card, not the checkbox.** In the PR 2 card the checkbox sits 22 px below the card's top, so a plain `focus()` scroll would tuck the card's top under the sticky search row. `jumpTo` focuses with `preventScroll` and scrolls the card to `block: "start"` with `behavior: "instant"`, which `scroll-padding-top` still clears.
- **R11. Below 1024 px the layout grid has no named areas.** Items fall in DOM order, so an absent Last found row or an empty profile fallback leaves no gap. The `grid-area` names move into the 1024 px query (Task 11).
- **R12. jsdom has no hit testing.** "A click on the card body toggles" is measured in the browser with `elementFromPoint` (Task 13); the unit test covers the label.
- **R13. The no-re-render test ticks through `visibilitychange`**, with only `Date` faked. Faking intervals stalls fake-indexeddb and Testing Library's `waitFor` (search plan P7).
- **R14. `initial()` reads the page language from `<html lang>`**, so the hub needs no new prop.
- **R15. The PR 2 check is a 24 px circle at `top: 22px; right: 16px`**, the centre of the spec's 44 px box at `top: 12px; right: 6px`. The hit area is the whole card (the label's `::after`), as today.
- **R16. `chipGroups` returns a Map,** not a plain object, so a category id such as "constructor" can never read `Object.prototype` (the trap Review Focus 2 guards for icons).
- **R17. A pressed category with a chip row always renders its title and chips,** not only while one of its chips is pressed. With spec §14.1's narrower rule, unpressing the last chip under a search with no match there would unmount the focused chip, the very loss the rule exists to prevent. The cost: a pressed category with no match shows its title and chips above the empty message. §8's "hidden categories" are the unpressed ones, and they still do not render.
- **R18. The chip row is a `<fieldset aria-label>`.** Biome's `useSemanticElements` rejects `role="group"` on a div (probed 04.11.2026). The fieldset's UA margin, padding, border and `min-inline-size: min-content` are reset.
- **R19. A chip is as wide pressed as unpressed.** The unpressed chip carries the ✓'s width (0.875em plus the 6 px gap) as extra inline padding, so a press never reflows the wrapping row under the finger.
- **R20. The model keeps `groups` in list order and drops any key no chip offers on every change** (`keepChips`), so `groupParam` only joins, `?group=` follows the list, and a chip never stays pressed under an unpressed category.
- **R21. `useShowParam` and `useGroupParam` share one `useSearchParam(name, value)`,** keyed on the serialised string, so the two mirrors cannot drift.

## Review Focus

1. **The profile menu opens off screen.** The slot sits at the right edge and `.menu` is `left: 0` with `min-width: 14rem`, so on a phone the menu would run past the right edge. `#tracker-profile .menu` anchors right (Task 12), measured at 320 px in Task 13.
2. **A category id that is also an `Object.prototype` name** ("constructor", "toString") must get the All icon, not crash on a function that is not a component. `categoryIcon` uses `Object.hasOwn` (Task 2, tested).
3. **A 40-character profile name at 320 px** must not push the title row wider than the screen or wrap it. `.profile-name` is capped and ellipsed (Task 12), measured in Task 13.
4. **Tapping a clamped description or the card's padding toggles the card, and the book and flag stay tappable.** Measured with `elementFromPoint` at 320 and 1280 px (Task 13).
5. **The hub dashboard keeps its look.** It shares `ProfileMenu` (avatar now) and the `.recent` class. New rail styles are scoped to `.stats`, and the hub is checked at 320 and 1280 px in Task 13.

**PR 3 (group chips):**

1. **Unpressing the last chip while a search matches nothing there** must not drop focus to `<body>`. R17 keeps the row; tested in Task 17.
2. **The chip under the finger moves when the ✓ appears.** R19 keeps the width; CSS-tested in Task 16 and measured by clicking in Task 18.
3. **A shared link with a stale or hostile `?group=`** (a group of an unpressed category, a group that lost every item, junk) is dropped and never echoed. Tested in Tasks 14 and 17.
4. **A long Norwegian label at 320 px with 200 % text** wraps inside its chip and never widens the page. `.chip-name` breaks and the fieldset's `min-content` width is reset; measured in Task 18.
5. **Switching profile keeps the chips,** as it keeps the tiles. Tested in Task 14.

---

## PR 1: the look

### Task 0: Worktree

- [ ] **Step 1: Create the worktree and install**

```bash
git worktree add .claude/worktrees/tracker-refresh-look -b feat/tracker-refresh-look main
cd .claude/worktrees/tracker-refresh-look && npm ci
```

- [ ] **Step 2: Confirm a green start**

Run: `npm test`
Expected: PASS, every file.

### Task 1: `perGroup` and `groupKey`

**Files:**
- Modify: `src/model/stats.ts`
- Test: `src/model/stats.test.ts`

**Interfaces:**
- Consumes: `countable`, `Count`, `Records` (same file).
- Produces:
  - `groupKey(category: string, group: string): string` returning `"<category>/<group>"`.
  - `perGroup(items: SeedItem[], records: Records): Record<string, Count>` keyed by `groupKey`, over `countable(items)`.

- [ ] **Step 1: Write the failing tests** (append to `src/model/stats.test.ts`, and add `groupKey, perGroup` to its import from `./stats`)

```ts
describe("perGroup (tracker refresh spec §4.3)", () => {
	it("counts each group inside its own category and leaves retired items out", () => {
		// The same group id in two categories: group ids repeat across categories in the seed.
		const grouped = items.map((i) => ({ ...i, group: "birds" }))
		expect(perGroup(grouped, records)).toEqual({
			"wildlife/birds": { done: 1, total: 2 },
			"vehicles/birds": { done: 0, total: 1 },
		})
	})

	it("keys groups the way the list reads them", () => {
		expect(groupKey("wildlife", "birds")).toBe("wildlife/birds")
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/model/stats.test.ts`
Expected: FAIL, `perGroup` is not exported.

- [ ] **Step 3: Implement** (append to `src/model/stats.ts`)

```ts
/** The key `perGroup` and the list share. Group ids repeat across categories, so both are in it. */
export function groupKey(category: string, group: string): string {
	return `${category}/${group}`
}

/** Per group, keyed by `groupKey`. Always over every countable item, never a filtered view. */
export function perGroup(items: SeedItem[], records: Records): Record<string, Count> {
	const counts: Record<string, Count> = {}
	for (const item of countable(items)) {
		const key = groupKey(item.category, item.group)
		const count = counts[key] ?? { done: 0, total: 0 }
		count.total += 1
		if (records[item.id]?.done) count.done += 1
		counts[key] = count
	}
	return counts
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run src/model/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npx biome check --write src/model/stats.ts src/model/stats.test.ts
sed -i 's/\r$//' src/model/stats.ts src/model/stats.test.ts
git add src/model/stats.ts src/model/stats.test.ts
git commit -m "Count tracker items per group beside the per-category counts"
```

### Task 2: Category icons

**Files:**
- Modify: `src/islands/tracker/icons.tsx`
- Test: `src/islands/tracker/icons.test.ts` (new)

**Interfaces:**
- Produces: `AllIcon`, `CollectiblesIcon`, `PlacesIcon`, `VehiclesIcon`, `WildlifeIcon` (each `() => ReactElement`), and `categoryIcon(id: string): () => ReactElement`, falling back to `AllIcon`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../../model/seed"
import { AllIcon, categoryIcon } from "./icons"

describe("categoryIcon (tracker refresh spec §4.2)", () => {
	it("gives every category in the seed an icon of its own", () => {
		const ids = categoryIds(seedItems)
		const icons = ids.map(categoryIcon)
		expect(icons).not.toContain(AllIcon)
		expect(new Set(icons).size).toBe(ids.length)
	})

	it("falls back to the All icon for an unknown id, inherited object names included", () => {
		expect(categoryIcon("boats")).toBe(AllIcon)
		expect(categoryIcon("constructor")).toBe(AllIcon)
		expect(categoryIcon("toString")).toBe(AllIcon)
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/islands/tracker/icons.test.ts`
Expected: FAIL, `AllIcon` is not exported.

- [ ] **Step 3: Implement** (in `icons.tsx`: add `import type { ReactElement } from "react"` at the top, then append)

```tsx
// Category icons (tracker refresh spec §4.2). My own geometry, drawn for the S3 mockup, so no icon
// set's licence applies.
export function AllIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<rect x="4" y="4" width="6" height="6" rx="1" />
			<rect x="14" y="4" width="6" height="6" rx="1" />
			<rect x="4" y="14" width="6" height="6" rx="1" />
			<rect x="14" y="14" width="6" height="6" rx="1" />
		</svg>
	)
}

export function CollectiblesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
		</svg>
	)
}

export function PlacesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
			<circle cx="12" cy="9.5" r="2.5" />
		</svg>
	)
}

export function VehiclesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M3 16v-3l2-5h14l2 5v3z" />
			<path d="M3 13h18" />
			<circle cx="7.5" cy="16.5" r="1.8" />
			<circle cx="16.5" cy="16.5" r="1.8" />
		</svg>
	)
}

export function WildlifeIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="7" cy="9" r="1.8" />
			<circle cx="12" cy="6.5" r="1.8" />
			<circle cx="17" cy="9" r="1.8" />
			<path d="M12 12c-3 0-5.5 3.5-5.5 5.5 0 1.5 1.5 2.5 3 2l2.5-.8 2.5.8c1.5.5 3-.5 3-2 0-2-2.5-5.5-5.5-5.5z" />
		</svg>
	)
}

const byCategory: Record<string, () => ReactElement> = {
	collectibles: CollectiblesIcon,
	places: PlacesIcon,
	vehicles: VehiclesIcon,
	wildlife: WildlifeIcon,
}

/** The icon for a category id. An id a future seed adds gets the All icon until it has its own;
 *  hasOwn keeps "constructor" and friends from returning Object's own functions. */
export function categoryIcon(id: string): () => ReactElement {
	return Object.hasOwn(byCategory, id) ? byCategory[id] : AllIcon
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run src/islands/tracker/icons.test.ts`
Expected: PASS. If the first test fails on a category not in `byCategory`, the seed has gained a category: stop and ask, the spec names only four.

- [ ] **Step 5: Commit**

```bash
npx biome check --write src/islands/tracker/icons.tsx src/islands/tracker/icons.test.ts
sed -i 's/\r$//' src/islands/tracker/icons.tsx src/islands/tracker/icons.test.ts
git add src/islands/tracker/icons.tsx src/islands/tracker/icons.test.ts
git commit -m "Add an icon for each tracker category"
```

### Task 3: Category tiles

**Files:**
- Modify: `src/islands/tracker/CategoryNav.tsx`, `src/islands/Tracker.tsx`
- Test: `src/islands/tracker/CategoryNav.test.tsx` (new), `src/islands/Tracker.test.tsx`, `src/islands/Tracker.search.test.tsx`

**Interfaces:**
- Consumes: `AllIcon`, `BookIcon`, `categoryIcon` (Task 2); `Count` from `src/model/stats.ts`.
- Produces: `CategoryNav` props `categories: (Count & { id: string; label: string })[]`, new `overall: Count`, new `t: Translate`; markup `ul.tiles > li(.tile-all | .tile-sources) > button.tile` with children `.tile-icon`, `.tile-label`, `.tile-count` (aria-hidden, `<small>` for "/total"), `.tile-bar > .bar-fill` (aria-hidden). Task 5 styles these class names.

- [ ] **Step 1: Write the failing unit test** (`src/islands/tracker/CategoryNav.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { type Locale, translator } from "../../i18n"
import { CategoryNav } from "./CategoryNav"

const categories = [
	{ id: "vehicles", label: "Vehicles", done: 40, total: 148 },
	{ id: "wildlife", label: "Wildlife", done: 5, total: 24 },
]

function renderNav(selected: string[] = [], locale: Locale = "en") {
	const onSelect = vi.fn()
	const view = render(
		<CategoryNav
			categories={categories}
			overall={{ done: 45, total: 172 }}
			selected={selected}
			onSelect={onSelect}
			allLabel="All"
			navLabel="Categories"
			sources={{ href: "/en/tracker/sources/", label: "Sources" }}
			t={translator(locale).t}
		/>
	)
	return { onSelect, ...view }
}

describe("CategoryNav tiles (tracker refresh spec §4.1)", () => {
	it("names each tile with its count in words and hides the digits and the bar", () => {
		renderNav()
		expect(screen.getByRole("button", { name: "All, 45 of 172" })).toHaveAttribute(
			"aria-pressed",
			"true"
		)
		const vehicles = screen.getByRole("button", { name: "Vehicles, 40 of 148" })
		expect(vehicles).toHaveAttribute("aria-pressed", "false")
		expect(vehicles.querySelector(".tile-count")).toHaveAttribute("aria-hidden", "true")
		expect(vehicles.querySelector(".tile-count")).toHaveTextContent("40/148")
		expect(vehicles.querySelector(".tile-bar")).toHaveAttribute("aria-hidden", "true")
		expect(vehicles.querySelector(".bar-fill")).toHaveStyle({ width: "27%" })
		expect(vehicles.querySelector('[role="progressbar"]')).toBeNull()
	})

	it("says the count in the page language", () => {
		renderNav([], "nb")
		expect(screen.getByRole("button", { name: "All, 45 av 172" })).toBeInTheDocument()
	})

	it("keeps multi-select: a second category adds, a pressed one leaves, All clears", () => {
		const { onSelect } = renderNav(["vehicles"])
		fireEvent.click(screen.getByRole("button", { name: /^Wildlife,/ }))
		expect(onSelect).toHaveBeenLastCalledWith(["vehicles", "wildlife"])
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		expect(onSelect).toHaveBeenLastCalledWith([])
		fireEvent.click(screen.getByRole("button", { name: /^All,/ }))
		expect(onSelect).toHaveBeenLastCalledWith([])
	})

	it("ends with Sources as a link without aria-pressed, and has no axe violations", async () => {
		const { container } = renderNav()
		const sources = screen.getByRole("link", { name: "Sources" })
		expect(sources).toHaveAttribute("href", "/en/tracker/sources/")
		expect(sources).not.toHaveAttribute("aria-pressed")
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/islands/tracker/CategoryNav.test.tsx`
Expected: FAIL, no button named "All, 45 of 172".

- [ ] **Step 3: Implement `CategoryNav.tsx`** (replace the whole file)

```tsx
import type { ReactElement } from "react"
import type { Translate } from "../../i18n"
import type { Count } from "../../model/stats"
import { AllIcon, BookIcon, categoryIcon } from "./icons"

interface Category extends Count {
	id: string
	label: string
}

interface Props {
	categories: Category[]
	/** The whole seed, for the All tile. Counts never follow search or Hide found (spec §2). */
	overall: Count
	selected: string[]
	onSelect: (ids: string[]) => void
	allLabel: string
	navLabel: string
	sources: { href: string; label: string }
	t: Translate
}

interface TileProps {
	label: string
	count: Count
	pressed: boolean
	onClick: () => void
	Icon: () => ReactElement
	t: Translate
}

/**
 * One filter tile (tracker refresh spec §4.1). The name carries the count in words; the digits and
 * the bar repeat it for the eye, so they are hidden. No progressbar role: a button's children are
 * presentational, so the role would be lost anyway.
 */
function Tile({ label, count, pressed, onClick, Icon, t }: TileProps) {
	const percent = count.total === 0 ? 0 : Math.round((count.done / count.total) * 100)
	return (
		<button
			type="button"
			className="tile"
			aria-pressed={pressed}
			aria-label={`${label}, ${t("tracker.count", { done: count.done, total: count.total })}`}
			onClick={onClick}
		>
			<span className="tile-icon" aria-hidden="true">
				<Icon />
			</span>
			<span className="tile-label">{label}</span>
			<span className="tile-count" aria-hidden="true">
				{count.done}
				<small>/{count.total}</small>
			</span>
			<span className="tile-bar" aria-hidden="true">
				{/* React writes this through the CSSOM, which the CSP allows. */}
				<span className="bar-fill" style={{ width: `${percent}%` }} />
			</span>
		</button>
	)
}

/** Multi-select toggles with an explicit All, so a screen reader never hears "all, not pressed". */
export function CategoryNav({
	categories,
	overall,
	selected,
	onSelect,
	allLabel,
	navLabel,
	sources,
	t,
}: Props) {
	function toggle(id: string) {
		const next = new Set(selected)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		onSelect(categories.filter((c) => next.has(c.id)).map((c) => c.id))
	}

	return (
		<nav className="cat-nav" aria-label={navLabel}>
			<ul className="tiles">
				<li className="tile-all">
					<Tile
						label={allLabel}
						count={overall}
						pressed={selected.length === 0}
						onClick={() => onSelect([])}
						Icon={AllIcon}
						t={t}
					/>
				</li>
				{categories.map((c) => (
					<li key={c.id}>
						<Tile
							label={c.label}
							count={c}
							pressed={selected.includes(c.id)}
							onClick={() => toggle(c.id)}
							Icon={categoryIcon(c.id)}
							t={t}
						/>
					</li>
				))}
				{/* A link to another page, not a filter, so it has no aria-pressed. */}
				<li className="tile-sources">
					<a href={sources.href}>
						<BookIcon />
						{sources.label}
					</a>
				</li>
			</ul>
		</nav>
	)
}
```

- [ ] **Step 4: Wire `Tracker.tsx`**

Right after `const categories = ...` (before `const error = ...`), add:

```tsx
	const overall = countItems(state.items, state.records)
```

Give `<CategoryNav>` the two new props, and let `<StatsRail>` reuse `overall`:

```tsx
				<CategoryNav
					categories={categories}
					overall={overall}
					selected={state.selected}
					onSelect={selectCategories}
					allLabel={t("tracker.all")}
					navLabel={t("tracker.categories")}
					sources={{ href: sourcesHref, label: t("tracker.sources") }}
					t={t}
				/>
```

```tsx
				<StatsRail
					overall={overall}
```

- [ ] **Step 5: Move the old tile queries to the new names (R1)**

Run: `grep -n 'getByRole("button", { name: "\(All\|Vehicles\|Wildlife\)" })' src/islands/*.test.tsx`
Expected: 8 hits (Tracker.test.tsx lines 74, 75, 101, 102; Tracker.search.test.tsx lines 69, 74, 197, 229).

Replace `{ name: "All" }` with `{ name: /^All,/ }`, `{ name: "Vehicles" }` with `{ name: /^Vehicles,/ }` and `{ name: "Wildlife" }` with `{ name: /^Wildlife,/ }` in those button queries only:

```bash
sed -i -E 's/getByRole\("button", \{ name: "(All|Vehicles|Wildlife)" \}\)/getByRole("button", { name: \/^\1,\/ })/g' src/islands/Tracker.test.tsx src/islands/Tracker.search.test.tsx
```

Then rerun the grep. Expected: no output.

- [ ] **Step 6: Add the whole-count test** (in `Tracker.test.tsx`, inside `describe("Category toggles", ...)`)

```tsx
	it("keeps the whole category in a tile's count with Hide found on", async () => {
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Bike" }))
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Vehicles, 1 of 1" })).toBeInTheDocument()
		)
		expect(screen.getByRole("button", { name: "All, 1 of 3" })).toBeInTheDocument()
	})
```

- [ ] **Step 7: Run the tracker tests**

Run: `npx vitest run src/islands`
Expected: PASS, every file.

- [ ] **Step 8: Commit**

```bash
F="src/islands/tracker/CategoryNav.tsx src/islands/tracker/CategoryNav.test.tsx src/islands/Tracker.tsx src/islands/Tracker.test.tsx src/islands/Tracker.search.test.tsx"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Turn the category filters into tiles with an icon, a count and a bar"
```

### Task 4: Section and group titles with counts

**Files:**
- Modify: `src/islands/tracker/ItemList.tsx`, `src/islands/Tracker.tsx`
- Test: `src/islands/Tracker.test.tsx`

**Interfaces:**
- Consumes: `perGroup`, `groupKey`, `Count` (Task 1); `categoryIcon` (Task 2).
- Produces: `ItemList` props `categoryCounts: Record<string, Count>`, `groupCounts: Record<string, Count>`; markup `.cat-head > (.cat-icon, h2, .cat-count, .cat-rule)` and `.group-head > (h3, .group-count)`. Heading ids unchanged (`cat-<category>`, `group-<category>/<group>`).

- [ ] **Step 1: Write the failing tests** (append to `Tracker.test.tsx`)

```tsx
describe("Section and group counts (tracker refresh spec §4.3)", () => {
	const catCount = (id: string) =>
		document.querySelector(`[aria-labelledby="cat-${id}"] .cat-head .cat-count`)
	const groupCount = (id: string) =>
		document.getElementById(`group-${id}`)?.parentElement?.querySelector(".group-count")

	it("puts each count beside its heading, not inside it", async () => {
		await ready()
		expect(screen.getByRole("heading", { name: "Wildlife", level: 2 })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Birds", level: 3 })).toBeInTheDocument()
		expect(catCount("wildlife")).toHaveTextContent("0 of 2")
		expect(groupCount("wildlife/birds")).toHaveTextContent("0 of 1")
		expect(document.querySelector(".cat-rule")).toHaveAttribute("aria-hidden", "true")
	})

	it("counts the whole category and group while a search narrows the list", async () => {
		await ready()
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "peli" } })
		expect(screen.queryByRole("checkbox", { name: "American alligator" })).toBeNull()
		expect(catCount("wildlife")).toHaveTextContent("0 of 2")
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await waitFor(() => expect(catCount("wildlife")).toHaveTextContent("1 of 2"))
		expect(groupCount("wildlife/birds")).toHaveTextContent("1 of 1")
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/islands/Tracker.test.tsx`
Expected: FAIL, `catCount("wildlife")` is null.

- [ ] **Step 3: Implement `ItemList.tsx`**

Imports become:

```tsx
import type { Translate } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { categoryIds, groupItems } from "../../model/seed"
import { type Count, groupKey, type Records } from "../../model/stats"
import { BookIcon, categoryIcon, FlagIcon } from "./icons"
```

Add to `Props`:

```tsx
	/** Over every item, never the filtered view, so the numbers hold still while typing (spec §2). */
	categoryCounts: Record<string, Count>
	/** Keyed by `groupKey`, also over every item. */
	groupCounts: Record<string, Count>
```

Destructure both in `ItemList`, add `const none: Count = { done: 0, total: 0 }` at module level, and replace the `return (...)` of `ItemList` with:

```tsx
	const countText = (count: Count = none) =>
		t("tracker.count", { done: count.done, total: count.total })

	return (
		<div className="item-list">
			{categoryIds(live).map((category) => {
				const Icon = categoryIcon(category)
				return (
					<section key={category} className="item-category" aria-labelledby={`cat-${category}`}>
						{/* The count is the heading's sibling, so the heading's name is the label alone. */}
						<div className="cat-head">
							<span className="cat-icon" aria-hidden="true">
								<Icon />
							</span>
							<h2 id={`cat-${category}`}>{categoryLabel(category)}</h2>
							<span className="cat-count">{countText(categoryCounts[category])}</span>
							<span className="cat-rule" aria-hidden="true" />
						</div>
						<div className="item-groups">
							{[...groupItems(live.filter((item) => item.category === category))].map(
								([group, groupList]) => (
									<section
										key={group}
										className="item-group"
										aria-labelledby={`group-${category}/${group}`}
									>
										<div className="group-head">
											{/* A slash is valid in an HTML id and cannot appear in a slug, so no two ids collide. */}
											<h3 id={`group-${category}/${group}`}>{groupLabel(group)}</h3>
											<span className="group-count">
												{countText(groupCounts[groupKey(category, group)])}
											</span>
										</div>
										<ul>
											{groupList.map((item) => (
												<ItemRow
													key={item.id}
													item={item}
													done={records[item.id]?.done ?? false}
													disabled={disabled}
													onToggle={onToggle}
													sourcesHref={sourcesHref}
													t={t}
												/>
											))}
										</ul>
									</section>
								)
							)}
						</div>
					</section>
				)
			})}
		</div>
	)
```

- [ ] **Step 4: Wire `Tracker.tsx`**

Import `perGroup` beside the other stats imports. After `const overall = ...` add:

```tsx
	const categoryCounts = Object.fromEntries(categories.map((c) => [c.id, c]))
```

Pass to `<ItemList>`:

```tsx
							categoryCounts={categoryCounts}
							groupCounts={perGroup(state.items, state.records)}
```

- [ ] **Step 5: Run the tracker tests**

Run: `npx vitest run src/islands`
Expected: PASS, every file (the existing heading-name tests included).

- [ ] **Step 6: Commit**

```bash
F="src/islands/tracker/ItemList.tsx src/islands/Tracker.tsx src/islands/Tracker.test.tsx"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Show the found count beside every tracker category and group title"
```

### Task 5: The look in CSS

**Files:**
- Modify: `src/styles/global.css`
- Test: `src/styles/search.test.ts`, `src/styles/tracker-refresh.test.ts` (new)

**Interfaces:**
- Consumes: the class names from Tasks 3 and 4.
- Produces: `--tracker-max-w: calc(200px + 624px + 200px + 2 * 48px)`; the `.tiles` family; `.cat-head`, `.group-head`; a 24 px round check. Task 9 replaces the check's selectors.

- [ ] **Step 1: Write the failing CSS tests** (`src/styles/tracker-refresh.test.ts`)

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	""
)

/** The body of the first rule whose selector list is exactly `selector`. */
function rule(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ""
}

describe("tracker refresh look (spec §3, §4)", () => {
	it("draws counts in Bebas Neue at its one real weight", () => {
		for (const selector of [".tile-count", ".cat-head h2", ".cat-count"]) {
			expect(rule(selector), selector).toMatch(/font-family:\s*var\(--font-display\)/)
			expect(rule(selector), selector).toMatch(/font-weight:\s*400/)
		}
	})

	it("widens the desktop tracker to tiles, list and rail with 48 px columns", () => {
		expect(css).toContain("--tracker-max-w: calc(200px + 624px + 200px + 2 * 48px)")
	})

	it("spaces categories 72 px, groups 40 px and cards 12 px apart", () => {
		expect(rule(".item-list")).toMatch(/gap:\s*72px/)
		expect(rule(".item-groups")).toMatch(/gap:\s*40px/)
		expect(rule(".item-group ul")).toMatch(/gap:\s*12px/)
		expect(rule(".item-group ul")).toMatch(/minmax\(min\(280px, 100%\), 1fr\)/)
	})

	it("makes the check a 24 px circle", () => {
		expect(rule(".item-main input")).toMatch(/border-radius:\s*50%/)
		expect(rule(".item-main input")).toMatch(/width:\s*24px/)
	})

	it("breaks a tile label only inside a word that cannot fit on its own line (R2)", () => {
		expect(rule(".tile-label")).toMatch(/overflow-wrap:\s*break-word/)
		expect(rule(".tile-label")).toMatch(/hyphens:\s*auto/)
	})

	it("leaves no .chips selector behind", () => {
		expect(css).not.toMatch(/\.chips\b/)
	})
})
```

In `src/styles/search.test.ts`, the forced-colours test's two regexes start with `\.chips button`. Change both to `\.tiles button` and rename the test to `"marks pressed tiles and the toggle in forced colours, focus ring included"`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/styles`
Expected: FAIL (no `.tile-count` rule, `.chips` still present).

- [ ] **Step 3: Rename `.chips` to `.tiles`**

```bash
sed -i 's/\.chips\b/.tiles/g' src/styles/global.css
grep -n '\.chips' src/styles/global.css
```

Expected: no output. (`.source-chips` has no dot before `chips`, so it is untouched.)

- [ ] **Step 4: Take pressed tiles out of the pink-surface focus rule**

In the rule commented `/* Pink is focus everywhere except on the three pink surfaces (spec §12). */`, delete the line `.tiles button[aria-pressed="true"]:focus-visible,`. Leave the forced-colours block's copy of it alone.

- [ ] **Step 5: Replace the base tile rules**

Replace the whole span from `.tiles {` (the old `display: flex; flex-wrap: wrap` list) through the end of the non-forced `.tiles button[aria-pressed="true"], .tracker .search-toggle[aria-pressed="true"] { ... }` rule with:

```css
/* Filter tiles (tracker refresh spec §4.1). Phones: All across, the categories two by two, Sources
   across. One tile component; the arrangements are CSS only. */
.tiles {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--space-2);
}

/* Rows stretch and each button fills its item, so tiles in one row share one height. */
.tiles li {
	display: flex;
}

.tiles .tile-all,
.tiles .tile-sources {
	grid-column: 1 / -1;
}

/* Stacked (the phone grid and the tablet row): icon and label, then the count, then the bar. */
.tiles button {
	flex: 1;
	display: grid;
	grid-template-columns: 24px minmax(0, 1fr);
	grid-template-areas:
		"icon label"
		"count count"
		"bar bar";
	align-items: center;
	/* The P2 measures (R2): at 320 px they leave about 92 px for "Samleobjekter". */
	gap: 6px;
	min-height: var(--tap);
	padding: 8px;
	border-radius: var(--radius);
	background: var(--bg-raised);
	color: var(--text);
	text-align: start;
}

/* Wide (All below 1024 px, every tile from there): the count rides the label's line. */
.tiles .tile-all button {
	grid-template-columns: 36px minmax(0, 1fr) auto;
	grid-template-areas:
		"icon label count"
		"icon bar bar";
	column-gap: 10px;
	padding: 10px;
}

.tiles .tile-all .tile-label {
	font-size: 0.8125rem;
}

.tiles .tile-all :is(.tile-label, .tile-count) {
	align-self: baseline;
}

/* --border, not --bg-hover: the hover lift paints the tile --bg-hover and would swallow it. */
.tile-icon {
	grid-area: icon;
	display: grid;
	place-items: center;
	width: 24px;
	height: 24px;
	border-radius: var(--radius);
	background: var(--border);
	color: var(--text-muted);
}

.tile-icon svg {
	width: 14px;
	height: 14px;
}

.tiles .tile-all .tile-icon {
	width: 36px;
	height: 36px;
}

.tiles .tile-all .tile-icon svg {
	width: 20px;
	height: 20px;
}

/* Wraps at 200 % text; the count sits on its own grid line, so the two never overlap. break-word,
   not anywhere: a word only breaks when it cannot fit a line on its own, and hyphens marks it. */
.tile-label {
	grid-area: label;
	min-width: 0;
	font-size: 0.75rem;
	font-weight: 600;
	overflow-wrap: break-word;
	hyphens: auto;
}

/* Bebas Neue ships one weight: a bold here would be faked and smear the digits. */
.tile-count {
	grid-area: count;
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 1.625rem;
	line-height: 0.9;
	letter-spacing: 0.02em;
}

.tile-count small {
	margin-inline-start: 1px;
	font-size: 0.6em;
	color: var(--text-muted);
}

.tile-bar {
	grid-area: bar;
	display: block;
	height: 6px;
	border-radius: 3px;
	background: var(--border);
	overflow: hidden;
}

/* Pressed: a pink edge and a pink icon tile, as in S3. The label stays in its own ink. */
.tiles button[aria-pressed="true"] {
	border-color: color-mix(in srgb, var(--accent) 55%, transparent);
}

.tiles button[aria-pressed="true"] .tile-icon {
	background: color-mix(in srgb, var(--accent) 22%, transparent);
	color: var(--accent);
}

.tracker .search-toggle[aria-pressed="true"] {
	background: var(--accent);
	color: var(--accent-text);
	border-color: var(--accent);
}
```

- [ ] **Step 6: Keep pressed tiles legible in forced colours**

Inside the existing `@media (forced-colors: active) { .tiles button[aria-pressed="true"], .tracker .search-toggle[aria-pressed="true"] { ... } ... }` block, after its focus rule, add:

```css
	/* The opt-out above keeps authored colours inside the tile too, so the parts follow the
	   system's pressed ink instead. */
	.tiles button[aria-pressed="true"] :is(.tile-icon, .tile-count small) {
		background: transparent;
		color: HighlightText;
	}

	.tiles button[aria-pressed="true"] .tile-bar {
		background: transparent;
		outline: 1px solid HighlightText;
	}

	.tiles button[aria-pressed="true"] .bar-fill {
		background: HighlightText;
	}
```

- [ ] **Step 7: Replace the Sources tile rules**

Replace the two rules `.tiles a { ... }` and `.tiles a svg { ... }` (commented "The Sources chip") with:

```css
/* The Sources tile: a link, outlined in cyan. */
.tiles a {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	padding: 0 12px;
	border: 1px solid color-mix(in srgb, var(--link) 60%, transparent);
	border-radius: var(--radius);
	color: var(--link);
	font-weight: 500;
	text-decoration: none;
}

.tiles a svg {
	flex: none;
	width: 18px;
	height: 18px;
}
```

- [ ] **Step 8: Replace the titles, spacing and card grid**

Replace the three rules `.item-category > h2`, `.item-group > h3` and `.item-group ul` with:

```css
/* S3 spacing (spec §3.5): 72 px between categories, 40 px between groups, 12 px between cards.
   True black, no panels: lines and type separate the sections. */
.item-list {
	display: grid;
	gap: 72px;
}

.cat-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2) 14px;
	margin-bottom: 28px;
}

.cat-icon {
	display: grid;
	place-items: center;
	flex: none;
	width: 36px;
	height: 36px;
	border-radius: var(--radius);
	background: var(--border);
	color: var(--text-muted);
}

.cat-icon svg {
	width: 20px;
	height: 20px;
}

/* Bebas Neue has capitals only; uppercase keeps the fallback face the same shape. */
.cat-head h2 {
	margin: 0;
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 2rem;
	line-height: 1;
	letter-spacing: 0.02em;
	text-transform: uppercase;
}

.cat-count {
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 1.375rem;
	line-height: 1;
	color: var(--text-muted);
}

/* Decorative: the brand gradient, fading out at the edge. */
.cat-rule {
	flex: 1 1 2rem;
	height: 2px;
	background: linear-gradient(90deg, var(--accent), var(--accent-2) 40%, transparent);
}

.item-groups {
	display: grid;
	gap: 40px;
}

.item-group {
	padding-top: 20px;
	border-top: 1px solid var(--border);
}

.group-head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--space-1) 10px;
	margin-bottom: 14px;
}

/* A label, so it stands apart from the count by weight, size and ink. */
.group-head h3 {
	margin: 0;
	font-size: 0.875rem;
	font-weight: 700;
	color: var(--text);
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

.group-count {
	font-size: 0.8125rem;
	color: var(--text-muted);
}

.item-group ul {
	display: grid;
	/* min() keeps one column inside a 320 px screen at 200 % text (reflow). */
	grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}
```

- [ ] **Step 9: Make the check round**

In `.item-main input`: `width: 24px; height: 24px; border-radius: 50%;` (was 20, 20, 4px). In `.item-main input::before`: `width: 14px; height: 14px;` (was 12). In `.tier`: `margin-inline-start: 32px;` and in `.item-desc`: `margin: 0 0 0 32px;` (was 28 px: 24 px check plus the 8 px gap).

- [ ] **Step 10: Tablet (inside `@media (min-width: 768px)`)**

Replace the `.tracker-layout` rule there with:

```css
	/* One column (spec §3.2): the tiles across the top, then the list. The rail stays under the
	   list until PR 2 hides it below 1024 px. */
	.tracker-layout {
		grid-template-areas:
			"top"
			"nav"
			"list"
			"stats";
	}

	.tiles {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
```

Delete the 768 px block's `.tiles { flex-direction: column; }` and `.tiles button, .tiles a { width: 100%; text-align: left; border-radius: var(--radius); }` rules.

- [ ] **Step 11: Desktop (inside `@media (min-width: 1024px)`)**

Replace the `main { --tracker-max-w: ... }` and `.tracker-layout { ... }` rules there with:

```css
	/* Tiles 200 px, the list, the rail 200 px, 48 px between (spec §3.3). The cap sits on the whole
	   tracker, so the search row spans the three columns; the tracker page's h1 reads the same
	   width. .wrap caps main at 72rem, so at full width this resolves to 1088 px and the list to
	   592 px, still two 280 px cards across. */
	main {
		--tracker-max-w: calc(200px + 624px + 200px + 2 * 48px);
	}

	.tracker-layout {
		grid-template-columns: 200px minmax(0, 1fr) 200px;
		grid-template-rows: auto 1fr;
		column-gap: 48px;
		grid-template-areas:
			"top list stats"
			"nav list stats";
		align-items: start;
	}

	/* Every tile is wide here, stacked in one column. */
	.tiles {
		grid-template-columns: minmax(0, 1fr);
	}

	.tiles button {
		grid-template-columns: 36px minmax(0, 1fr) auto;
		grid-template-areas:
			"icon label count"
			"icon bar bar";
		column-gap: 10px;
		padding: 10px;
	}

	.tiles :is(.tile-label, .tile-count) {
		align-self: baseline;
	}

	.tile-label {
		font-size: 0.8125rem;
	}

	.tile-icon {
		width: 36px;
		height: 36px;
	}

	.tile-icon svg {
		width: 20px;
		height: 20px;
	}

	.cat-head h2 {
		font-size: 2.5rem;
	}
```

- [ ] **Step 12: Run every test**

Run: `npm test`
Expected: PASS, every file.

- [ ] **Step 13: Commit**

```bash
F="src/styles/global.css src/styles/search.test.ts src/styles/tracker-refresh.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Style the tracker tiles, titles, spacing and round check from the S3 mockup"
```

### Task 6: Verify and ship PR 1

**Files:** none (fixes go into the file at fault, with a commit each).

- [ ] **Step 1: Full checks**

```bash
npm test && npx biome ci . && npm run check && npm run build
```

Expected: all green. If `biome ci` reports only CRLF format noise on files this branch did not touch, that is the known local trap; CI is the judge.

- [ ] **Step 2: Serve the built site**

Add a `preview-tracker-refresh` entry to `.claude/launch.json` the same way as `preview-tracker-search` (port 8788, `-c .claude/worktrees/tracker-refresh-look/wrangler.jsonc`), then `preview_start` it and open `/en/tracker/`. Build with `GITHUB_SHA=$(git rev-parse HEAD) npm run build` first. After every rebuild: unregister the service worker and clear caches before measuring.

- [ ] **Step 3: Measure, one batched round** (at 320, 768, 1024 and 1280 px, in `en` and `nb`)

Tile rows share one height, and label and count never overlap:

```js
const rows = new Map()
for (const el of document.querySelectorAll(".tiles li > *")) {
	const r = el.getBoundingClientRect()
	const key = Math.round(r.top)
	rows.set(key, [...(rows.get(key) ?? []), Math.round(r.height)])
}
const overlaps = [...document.querySelectorAll(".tiles button")].filter((b) => {
	const l = b.querySelector(".tile-label").getBoundingClientRect()
	const c = b.querySelector(".tile-count").getBoundingClientRect()
	return !(l.right <= c.left || c.right <= l.left || l.bottom <= c.top || c.bottom <= l.top)
}).length
// A one-word label taller than one line has broken inside the word.
const midWord = [...document.querySelectorAll(".tile-label")]
	.filter((l) => !l.textContent.includes(" "))
	.filter((l) => l.getBoundingClientRect().height > parseFloat(getComputedStyle(l).lineHeight) * 1.5)
	.map((l) => l.textContent)
;({ rows: [...rows], overlaps, midWord, scrollW: document.documentElement.scrollWidth, innerW: innerWidth })
```

Expected: every row's heights are equal, each at least 44; `overlaps` 0; `midWord` empty at normal text size in `en` and `nb`; `scrollW` equals `innerW`. Repeat at 320 px with `document.documentElement.style.fontSize = "200%"`, where `midWord` may list labels (wrapping is allowed there) but `overlaps` stays 0. If `midWord` is not empty at normal size, stop and show her a 320 px screenshot of the tile row before changing the measures again (her "two rounds, then show me" rule).

Also read off: the card column count at 1024 px (1) and at a 1265 px viewport (2); the h1's left edge equals the search row's left edge from 1024 px; `document.fonts.check('26px "Bebas Neue"')` is true before reading count widths.

- [ ] **Step 4: Forced colours, keyboard, reduced motion**

Forced colours via headless Brave CDP (memory: `browser-automation` and the archived s95-s97 trap): a pressed tile shows `Highlight`, an unpressed one a visible border, the check keeps its ✓. Keyboard only: Tab reaches every tile in order, Space toggles, the focus ring is visible on pressed and unpressed tiles. No new motion.

- [ ] **Step 5: Layout shift**

Lighthouse CI runs in CI. Locally, record CLS on load at 320 and 1280 px with a slow network profile. Expected: 0 (spec §9).

- [ ] **Step 6: Screenshot and push**

Screenshot 320 and 1280 px for the PR. Then:

```bash
git push -u origin feat/tracker-refresh-look
gh pr create --title "Give the tracker category tiles, counted titles and a round check" --body-file -
```

PR body (first person, no em dashes):

```markdown
The first half of the tracker refresh (spec `docs/superpowers/specs/2026-11-03-tracker-refresh-design.md`, §4).

- The category filters are tiles now, each with an icon, a found count and a bar. All sits on its own row on phones and tablets; the four categories go two by two on phones and in one row on tablets.
- Category titles are big Bebas Neue headings with an icon, a count and a gradient line. Group titles are uppercase labels with their own count. Counts always cover the whole category or group, so they hold still while I search.
- The check is round with a ✓.
- Spacing follows the S3 mix: 72 px between categories, 40 px between groups, 12 px between cards. The desktop tracker is 200 px tiles, the list and a 200 px rail with 48 px between.

Card behaviour, the rail and profiles work as before; the structure changes come in the second PR.

Checked: tests, Biome, astro check and the build; tile rows share one height at 320, 768, 1024 and 1280 px in English and Norwegian, also at 200 % text; no sideways scroll; forced colours and keyboard only; CLS 0.
```

- [ ] **Step 7: Merge when green**

Bind the PR with the ccd_pr tools, read its CI, then merge (squash, house default) once every check is green. Check the preview URL on the phone before merging if CI posts one.

---

## PR 2: the structure

### Task 7: Pure relative time

**Files:**
- Create: `src/model/relativeTime.ts`
- Test: `src/model/relativeTime.test.ts`

Start: after PR 1 has merged, `git fetch origin`, then `git worktree add .claude/worktrees/tracker-refresh-structure -b feat/tracker-refresh-structure origin/main`, `npm ci`, and `npm test` green.

**Interfaces:**
- Consumes: `dateLocale`, `localDayKey`, `daysAgo` from `src/model/days.ts`; `Locale` from `src/i18n`.
- Produces: `relativeTime(then: string, now: Date, locale: Locale): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { dateLocale } from "./days"
import { relativeTime } from "./relativeTime"

// Local wall-clock times, so the calendar-day rules hold in whatever zone the tests run in.
const at = (day: number, hour: number, minute = 0, second = 0) =>
	new Date(2026, 10, day, hour, minute, second)

describe.each(["en", "nb"] as const)("relativeTime in %s (tracker refresh spec §5.4)", (locale) => {
	const said = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
		new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto", style: "short" }).format(
			value,
			unit
		)
	const now = at(20, 8, 0)
	const ago = (then: Date) => relativeTime(then.toISOString(), now, locale)

	it("says now under a minute, for a time in the future and for a broken timestamp", () => {
		expect(ago(at(20, 7, 59, 30))).toBe(said(0, "second"))
		expect(ago(at(20, 10, 0))).toBe(said(0, "second"))
		expect(relativeTime("not a date", now, locale)).toBe(said(0, "second"))
	})

	it("counts minutes under an hour, across midnight too", () => {
		expect(ago(at(20, 7, 55))).toBe(said(-5, "minute"))
		expect(ago(at(20, 7, 0, 1))).toBe(said(-59, "minute"))
		expect(relativeTime(at(19, 23, 50).toISOString(), at(20, 0, 10), locale)).toBe(
			said(-20, "minute")
		)
	})

	it("counts hours on the same calendar day", () => {
		expect(ago(at(20, 5, 0))).toBe(said(-3, "hour"))
	})

	it("counts calendar days before that, so late last night reads yesterday", () => {
		expect(ago(at(19, 23, 0))).toBe(said(-1, "day"))
		expect(ago(at(17, 20, 0))).toBe(said(-3, "day"))
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/model/relativeTime.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

```ts
// "2 min ago" for the rail and the Last found row (tracker refresh spec §5.4). Pure: the caller
// passes `now`, so a minute tick decides when it changes. Words come from the browser's CLDR data.
import type { Locale } from "../i18n"
import { dateLocale, daysAgo, localDayKey } from "./days"

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

export function relativeTime(then: string, now: Date, locale: Locale): string {
	const format = new Intl.RelativeTimeFormat(dateLocale(locale), {
		numeric: "auto",
		style: "short",
	})
	const at = new Date(then)
	const ms = now.getTime() - at.getTime()
	// A future time (clock skew, an import from another device) or a broken one reads "now".
	if (!(ms >= MINUTE_MS)) return format.format(0, "second")
	if (ms < HOUR_MS) return format.format(-Math.floor(ms / MINUTE_MS), "minute")
	const days = daysAgo(localDayKey(at), localDayKey(now))
	if (days === 0) return format.format(-Math.floor(ms / HOUR_MS), "hour")
	return format.format(-days, "day")
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run src/model/relativeTime.test.ts`
Expected: PASS, both locales.

- [ ] **Step 5: Commit**

```bash
F="src/model/relativeTime.ts src/model/relativeTime.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Add a relative time that counts calendar days"
```

### Task 8: `useNow` minute tick

**Files:**
- Create: `src/islands/tracker/useNow.ts`
- Test: `src/islands/tracker/useNow.test.ts`

**Interfaces:**
- Produces: `useNow(intervalMs?: number): Date` (default `60_000`). Re-renders only its caller.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNow } from "./useNow"

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date("2026-11-20T08:00:00Z"))
})

afterEach(() => {
	vi.useRealTimers()
})

describe("useNow (tracker refresh spec §5.4)", () => {
	it("ticks once a minute", () => {
		const { result } = renderHook(() => useNow())
		const first = result.current.getTime()
		act(() => vi.advanceTimersByTime(59_999))
		expect(result.current.getTime()).toBe(first)
		act(() => vi.advanceTimersByTime(1))
		expect(result.current.getTime()).toBe(first + 60_000)
	})

	it("catches up when the page is shown again, so a slept tab is never stale", () => {
		const { result } = renderHook(() => useNow())
		vi.setSystemTime(new Date("2026-11-20T09:30:00Z"))
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"))
		})
		expect(result.current.toISOString()).toBe("2026-11-20T09:30:00.000Z")
	})

	it("clears its timer and its listener on unmount", () => {
		const remove = vi.spyOn(document, "removeEventListener")
		const { unmount } = renderHook(() => useNow())
		expect(vi.getTimerCount()).toBe(1)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
		expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/islands/tracker/useNow.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

```ts
import { useEffect, useState } from "react"

/**
 * The time, refreshed every `intervalMs` and whenever the page is shown again (a background tab's
 * timers are throttled, and a sleeping device skips them). Call it in the small component that
 * shows a time, never in the island root: the tick re-renders only its caller (spec §5.4).
 */
export function useNow(intervalMs = 60_000): Date {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const tick = () => setNow(new Date())
		const timer = window.setInterval(tick, intervalMs)
		const onVisibility = () => {
			if (document.visibilityState !== "hidden") tick()
		}
		document.addEventListener("visibilitychange", onVisibility)
		return () => {
			window.clearInterval(timer)
			document.removeEventListener("visibilitychange", onVisibility)
		}
	}, [intervalMs])
	return now
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run src/islands/tracker/useNow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
F="src/islands/tracker/useNow.ts src/islands/tracker/useNow.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Add a minute tick that also catches up when the page is shown again"
```

### Task 9: The icon-lead card

**Files:**
- Modify: `src/islands/tracker/ItemList.tsx`, `src/styles/global.css`
- Test: `src/islands/Tracker.test.tsx`, `src/styles/tracker-refresh.test.ts`

**Interfaces:**
- Consumes: `categoryIcon` (Task 2).
- Produces: `ItemRow` markup `li.item(.found)? > input#item-<id>.item-check, .item-main > (.item-tile, .item-text > (label, .item-meta > (.dot[data-status], .item-tier, " · ", group))), p.item-desc?, .item-foot > (a.item-book, button.item-icon)`. Task 11's `jumpTo` relies on `.item` and the input id.

- [ ] **Step 1: Write the failing tests** (append to `Tracker.test.tsx`)

```tsx
describe("Item card (tracker refresh spec §5.1)", () => {
	const card = (name: string) =>
		screen.getByRole("checkbox", { name }).closest("li.item") as HTMLElement

	it("leads with the category icon, then the name and one meta line", async () => {
		await ready()
		const pelican = card("Pelican")
		expect(pelican.querySelector(".item-tile")).toHaveAttribute("aria-hidden", "true")
		expect(pelican.querySelector(".item-tile svg")).not.toBeNull()
		expect(pelican.querySelector(".item-meta")).toHaveTextContent("Expected, as in GTA V · Birds")
		expect(pelican.querySelector('.dot[data-status="expected"]')).not.toBeNull()
	})

	it("runs Tab as checkbox, book, flag, with the book and flag in the footer", async () => {
		await ready()
		const gator = card("American alligator")
		expect([...gator.querySelectorAll("input, a, button")].map((e) => e.tagName)).toEqual([
			"INPUT",
			"A",
			"BUTTON",
		])
		expect(gator.querySelector(".item-foot .item-book")).not.toBeNull()
	})

	it("keeps the whole description in the DOM", async () => {
		await ready()
		expect(card("American alligator").querySelector(".item-desc")).toHaveTextContent(
			"Everglades native."
		)
	})

	it("marks a found card", async () => {
		await ready()
		expect(card("Pelican")).not.toHaveClass("found")
		fireEvent.click(screen.getByText("Pelican"))
		await waitFor(() => expect(card("Pelican")).toHaveClass("found"))
	})
})
```

Append to `src/styles/tracker-refresh.test.ts`:

```ts
describe("icon-lead card (spec §5.1)", () => {
	it("clamps the description to two lines and keeps the 65ch cap off", () => {
		expect(rule(".item-desc")).toMatch(/-webkit-line-clamp:\s*2/)
		expect(rule(".item-desc")).toMatch(/max-width:\s*none/)
	})

	it("turns a found card's border and icon tile pink", () => {
		expect(rule(".item.found")).toMatch(/border-color:[^;]*var\(--accent\)/)
		expect(rule(".item.found .item-tile")).toMatch(/color:\s*var\(--accent\)/)
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/islands/Tracker.test.tsx src/styles/tracker-refresh.test.ts`
Expected: FAIL, no `.item-tile`.

- [ ] **Step 3: Implement `ItemRow`**

In `ItemList`, pass `groupName={groupLabel(group)}` to each `<ItemRow>`. Add `groupName: string` to `RowProps`, and replace `ItemRow` with:

```tsx
/**
 * The icon-lead card (tracker refresh spec §5.1). The label's ::after covers the card, so a tap
 * anywhere toggles the one real checkbox; the footer icons sit above that layer.
 */
function ItemRow({ item, done, disabled, groupName, onToggle, sourcesHref, t }: RowProps) {
	// The seed id has exactly one slash (schema), so it is unique as a DOM id as it stands.
	const inputId = `item-${item.id}`
	const Icon = categoryIcon(item.category)
	const tier =
		item.status === "confirmed"
			? t("tracker.confirmed")
			: t("tracker.expectedFrom", { precedent: item.precedent ?? "" })
	return (
		<li className={done ? "item found" : "item"}>
			{/* First in the DOM, so Tab runs checkbox, book, flag. CSS places it top right. */}
			<input
				id={inputId}
				className="item-check"
				type="checkbox"
				checked={done}
				disabled={disabled}
				onChange={(event) => onToggle(item.id, event.target.checked)}
			/>
			<div className="item-main">
				<span className="item-tile" aria-hidden="true">
					<Icon />
				</span>
				<div className="item-text">
					<label htmlFor={inputId}>{item.name}</label>
					<span className="item-meta">
						<span className="dot" data-status={item.status} />
						<span className="item-tier">{tier}</span> · {groupName}
					</span>
				</div>
			</div>
			{item.description && <p className="item-desc">{item.description}</p>}
			{/* A flex row, so December can add "Entry →" and a star without a new layout. */}
			<div className="item-foot">
				<a className="item-icon item-book has-tip tip-end" href={`${sourcesHref}#${item.id}`}>
					<BookIcon />
					<span className="visually-hidden">
						{t("tracker.sources")}: {item.name}
					</span>
					<span className="tip" aria-hidden="true">
						{t("tracker.sources")}
					</span>
				</a>
				{/* aria-disabled keeps it focusable, so its tooltip explains it. */}
				<button type="button" className="item-icon has-tip tip-end" aria-disabled="true">
					<FlagIcon />
					<span className="visually-hidden">{t("tracker.reportSoon")}</span>
					<span className="tip" aria-hidden="true">
						{t("tracker.reportSoon")}
					</span>
				</button>
			</div>
		</li>
	)
}
```

- [ ] **Step 4: Implement the card CSS**

In `global.css`, from `.item {` through `.item .item-book:focus-visible { ... }`:

- `.item`: `padding: 12px 12px 4px 14px;` (was `12px 12px 12px 16px`).
- Replace `.item-main` with:

```css
/* 40 px on the right keeps the name clear of the check. */
.item-main {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: var(--tap);
	padding-right: 40px;
}

.item-tile {
	display: grid;
	place-items: center;
	flex: none;
	width: 36px;
	height: 36px;
	border-radius: var(--radius);
	background: var(--border);
	color: var(--text-muted);
}

.item-tile svg {
	width: 20px;
	height: 20px;
}

.item-text {
	display: grid;
	gap: 2px;
	min-width: 0;
}
```

- Rename every `.item-main input` selector to `.item-check` (the base rule, `::before`, `:checked`, `:checked::before`, the forced-colours `::before` and `:focus-visible`), and add to the base `.item-check` rule:

```css
	/* The centre of a 44 px box 12 px from the top and 6 px from the right (spec §5.1). The hit
	   area is the whole card, through the label's ::after. */
	position: absolute;
	top: 22px;
	right: 16px;
```

- `.item-main label`: delete `flex: 1;`.
- Delete the three `.tier` rules and add:

```css
/* Wraps on narrow phones; never cut off. Tier words stay beside the dot, so colour is never alone. */
.item-meta {
	font-size: 0.75rem;
	color: var(--text-muted);
}

.dot {
	display: inline-block;
	width: 7px;
	height: 7px;
	margin-inline-end: 6px;
	border-radius: 50%;
	vertical-align: 1px;
}

.dot[data-status="confirmed"] {
	background: var(--tier-confirmed);
}

.dot[data-status="expected"] {
	background: var(--tier-expected);
}
```

- Replace `.item-desc` with:

```css
/* Two lines (spec §5.1); the full text stays in the DOM for screen readers. No 65ch cap: ch
   follows the font, and the swap from the fallback face would rewrap the clamp. */
.item-desc {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	max-width: none;
	margin: 0 0 0 46px;
	color: var(--text-muted);
	font-size: 0.875rem;
	line-height: 1.5;
}
```

- `.item-foot`: `margin: auto -6px 0 46px;` (keep `display: flex; justify-content: flex-end;`).
- Delete the `.item .item-book { position: absolute; top: 12px; right: 6px; }` rule.
- Add after `.item-foot`:

```css
/* Found: a pink edge and a pink icon tile beside the ✓, never colour alone (spec §5.1). */
.item.found {
	border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.item.found .item-tile {
	background: color-mix(in srgb, var(--accent) 22%, transparent);
	color: var(--accent);
}
```

Then: `grep -n '\.item-main input\|\.tier\b' src/styles/global.css`. Expected: no output.

In `src/styles/tracker-refresh.test.ts`, the PR 1 test "makes the check a 24 px circle" reads `rule(".item-main input")`; change both calls to `rule(".item-check")`.

- [ ] **Step 5: Run every test**

Run: `npm test`
Expected: PASS. The existing "renders one card per item" test still passes (its order assertion holds).

- [ ] **Step 6: Commit**

```bash
F="src/islands/tracker/ItemList.tsx src/islands/Tracker.test.tsx src/styles/global.css src/styles/tracker-refresh.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Lead each tracker card with its category icon and move the check top right"
```

### Task 10: The slim rail

**Files:**
- Modify: `src/islands/tracker/StatsRail.tsx`, `src/islands/Tracker.tsx`, `src/styles/global.css`
- Test: `src/islands/tracker/StatsRail.test.tsx` (rewrite), `src/islands/Tracker.test.tsx`

**Interfaces:**
- Consumes: `relativeTime` (Task 7), `useNow` (Task 8), `categoryIcon` (Task 2).
- Produces: `StatsRail` props `{ overall: Count; recent: RecentFind[]; hubHref?: string; locale: Locale; t: Translate }` (no `categories`). `Bar` stays exported unchanged (the hub imports it).

- [ ] **Step 1: Rewrite the failing tests** (`StatsRail.test.tsx`: replace the `describe` block; keep the imports and `gator`, add `afterEach, vi` to the vitest import and `import { relativeTime } from "../../model/relativeTime"`)

```tsx
const t = translator("en").t
const renderRail = (
	overall: { done: number; total: number },
	recent: { item: SeedItem; updated_at: string }[] = [],
	hubHref?: string
) => render(<StatsRail overall={overall} recent={recent} hubHref={hubHref} locale="en" t={t} />)

afterEach(() => {
	vi.useRealTimers()
})

describe("StatsRail (tracker refresh spec §5.2)", () => {
	it("links the Overall heading to the hub when given hubHref", () => {
		renderRail({ done: 0, total: 0 }, [], "/en/")
		const link = screen.getByRole("link", { name: "Overall" })
		expect(link).toHaveAttribute("href", "/en/")
		expect(screen.getByRole("heading", { name: "Overall", level: 2 })).toContainElement(link)
	})

	it("keeps the heading plain without hubHref", () => {
		renderRail({ done: 0, total: 0 })
		expect(screen.queryByRole("link", { name: "Overall" })).toBeNull()
	})

	it("rounds the big percentage down, so nothing reads 100 % early", () => {
		const { container } = renderRail({ done: 214, total: 215 })
		expect(container.querySelector(".stats-percent")).toHaveTextContent("99%")
		const bar = screen.getByRole("progressbar")
		expect(bar).toHaveAccessibleName("Overall")
		expect(bar).toHaveAttribute("aria-valuetext", "214 of 215")
	})

	it("reads 0 % for an empty total and draws one bar, no category bars", () => {
		const { container } = renderRail({ done: 0, total: 0 })
		expect(container.querySelector(".stats-percent")).toHaveTextContent("0%")
		expect(screen.getAllByRole("progressbar")).toHaveLength(1)
	})

	it("lists recent finds with a category icon and a relative time", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-11-20T10:05:00Z"))
		const updated = "2026-11-20T10:00:00.000Z"
		renderRail({ done: 1, total: 3 }, [{ item: gator, updated_at: updated }])
		const list = screen.getByRole("list", { name: "Recent finds" })
		expect(list).toHaveTextContent("American alligator")
		expect(list.querySelector(".find-icon svg")).not.toBeNull()
		const time = list.querySelector("time")
		expect(time).toHaveAttribute("datetime", updated)
		expect(time).toHaveTextContent(relativeTime(updated, new Date(), "en"))
	})

	it("says when nothing is ticked and has no axe violations", async () => {
		const { container } = renderRail({ done: 0, total: 0 })
		expect(screen.getByText("Nothing ticked yet.")).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

In `Tracker.test.tsx`, rename `describe("Progress heading (dashboard spec §4)", ...)` to `describe("Overall heading (dashboard spec §4, refresh spec §5.2)", ...)` and change its two `{ name: "Progress" }` to `{ name: "Overall" }` (R7).

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/islands/tracker/StatsRail.test.tsx src/islands/Tracker.test.tsx`
Expected: FAIL, no link named "Overall".

- [ ] **Step 3: Implement `StatsRail`** (keep `Bar` as it is; replace the imports, `Props` and `StatsRail`)

```tsx
import type { Locale, Translate } from "../../i18n"
import { relativeTime } from "../../model/relativeTime"
import type { Count, RecentFind } from "../../model/stats"
import { categoryIcon } from "./icons"
import { useNow } from "./useNow"

interface Props {
	overall: Count
	recent: RecentFind[]
	/** From launch on, Overall links to the hub (dashboard spec §4). */
	hubHref?: string
	locale: Locale
	t: Translate
}
```

```tsx
/** Desktop only (spec §5.2). Not a live region, so the changing times are never announced. */
export function StatsRail({ overall, recent, hubHref, locale, t }: Props) {
	const now = useNow()
	// Rounded down, so 214 of 215 reads 99 %, never 100 % before everything is found.
	const percent = overall.total === 0 ? 0 : Math.floor((overall.done / overall.total) * 100)
	const countText = t("tracker.count", { done: overall.done, total: overall.total })
	return (
		<section className="stats" aria-labelledby="stats-heading">
			<h2 id="stats-heading">
				{hubHref ? (
					<a className="go-link" href={hubHref}>
						{t("tracker.overall")}
					</a>
				) : (
					t("tracker.overall")
				)}
			</h2>
			<p className="stats-percent">
				{percent}
				<small>%</small>
			</p>
			<div
				className="bar"
				role="progressbar"
				aria-labelledby="stats-heading"
				aria-valuemin={0}
				aria-valuemax={overall.total}
				aria-valuenow={overall.done}
				aria-valuetext={countText}
			>
				{/* React writes this through the CSSOM, which the CSP allows. */}
				<span className="bar-fill" style={{ width: `${percent}%` }} />
			</div>
			<h3 id="recent-heading">{t("tracker.recent")}</h3>
			{recent.length === 0 ? (
				<p className="stats-empty">{t("tracker.noRecent")}</p>
			) : (
				<ul className="recent" aria-labelledby="recent-heading">
					{recent.map((find) => {
						const Icon = categoryIcon(find.item.category)
						return (
							<li key={find.item.id}>
								<span className="find-icon" aria-hidden="true">
									<Icon />
								</span>
								<span className="find-text">
									<span className="find-name">{find.item.name}</span>{" "}
									<time className="find-when" dateTime={find.updated_at}>
										{relativeTime(find.updated_at, now, locale)}
									</time>
								</span>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}
```

- [ ] **Step 4: Wire `Tracker.tsx`**

After `const categoryCounts = ...` add `const recent = recentFinds(state.items, state.records)`, and replace the `<StatsRail .../>` element with:

```tsx
				<StatsRail overall={overall} recent={recent} hubHref={hubHref} locale={locale} t={t} />
```

- [ ] **Step 5: CSS**

- Delete the rule `.progress:has(> .progress-label > #progress-overall) .bar { ... }` (its id is gone; `grep -rn progress-overall src` must print nothing afterwards) and the `.stats-grid` rules in the 768 px and 1024 px blocks.
- After `.stats h3 { ... }` add, all scoped to `.stats` because the hub also uses `.recent`:

```css
.stats-percent {
	margin: 0 0 var(--space-2);
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 3rem;
	line-height: 0.9;
	letter-spacing: 0.02em;
}

.stats-percent small {
	font-size: 0.5em;
	color: var(--text-muted);
}

/* The glow moves here from the old overall bar. */
.stats .bar {
	box-shadow: var(--glow);
}

.stats .recent {
	display: grid;
	gap: var(--space-2);
}

.stats .recent li {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 0.8125rem;
}

.stats .find-icon {
	display: grid;
	place-items: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--radius);
	background: color-mix(in srgb, var(--accent) 22%, transparent);
	color: var(--accent);
}

.stats .find-icon svg {
	width: 15px;
	height: 15px;
}

.stats .find-text {
	display: grid;
	min-width: 0;
	line-height: 1.25;
}

.stats .find-name {
	overflow-wrap: anywhere;
}

.stats .find-when {
	font-size: 0.75rem;
	color: var(--text-muted);
}
```

- [ ] **Step 6: Run every test**

Run: `npm test`
Expected: PASS, the hub's `Dashboard.test.tsx` included (it imports `Bar`).

- [ ] **Step 7: Commit**

```bash
F="src/islands/tracker/StatsRail.tsx src/islands/tracker/StatsRail.test.tsx src/islands/Tracker.tsx src/islands/Tracker.test.tsx src/styles/global.css"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Slim the tracker rail to a big percentage and recent finds with times"
```

### Task 11: The Last found row and the layout below 1024 px

**Files:**
- Create: `src/islands/tracker/LastFound.tsx`
- Modify: `src/islands/Tracker.tsx`, `src/locales/en.json`, `src/locales/nb.json`, `src/styles/global.css`
- Test: `src/islands/tracker/LastFound.test.tsx` (new), `src/islands/Tracker.test.tsx`, `src/islands/Tracker.tick.test.tsx` (new), `src/styles/tracker-refresh.test.ts`

**Interfaces:**
- Consumes: `relativeTime`, `useNow`, `categoryIcon`, `RecentFind`.
- Produces: `jumpable(find: RecentFind | undefined, visible: SeedItem[], ready: boolean): boolean`; `LastFound` props `{ find: RecentFind | undefined; canJump: boolean; onJump: (id: string) => void; locale: Locale; t: Translate }`, root `.last-found` (`button` or `p`).

- [ ] **Step 1: Add the copy**

In `src/locales/en.json`, after the `"tracker.noRecent"` line: `"tracker.lastFound": "Last found",`. In `src/locales/nb.json`, same place: `"tracker.lastFound": "Sist funnet",`. Then `grep -n '\\u00' src/locales/nb.json` (expect no output).

- [ ] **Step 2: Write the failing unit test** (`LastFound.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { jumpable, LastFound } from "./LastFound"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const pelican: SeedItem = {
	id: "wildlife/pelican",
	category: "wildlife",
	group: "birds",
	name: "Pelican",
	status: "expected",
	precedent: "GTA V",
	sources: [src],
}
const find = { item: pelican, updated_at: "2026-11-20T10:00:00.000Z" }
const t = translator("en").t

describe("jumpable (tracker refresh spec §5.3)", () => {
	it("is true only when the card is in the view and the tracker is ready", () => {
		expect(jumpable(find, [pelican], true)).toBe(true)
		expect(jumpable(find, [], true)).toBe(false)
		expect(jumpable(find, [pelican], false)).toBe(false)
		expect(jumpable(undefined, [pelican], true)).toBe(false)
	})
})

describe("LastFound (tracker refresh spec §5.3)", () => {
	it("renders nothing with no finds", () => {
		const { container } = render(
			<LastFound find={undefined} canJump={false} onJump={vi.fn()} locale="en" t={t} />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("is a button that names the find and jumps to it", () => {
		const onJump = vi.fn()
		render(<LastFound find={find} canJump onJump={onJump} locale="en" t={t} />)
		const row = screen.getByRole("button", { name: /^Last found Pelican/ })
		expect(row.querySelector("time")).toHaveAttribute("datetime", find.updated_at)
		expect(row.querySelector(".last-found-icon")).toHaveAttribute("aria-hidden", "true")
		fireEvent.click(row)
		expect(onJump).toHaveBeenCalledWith("wildlife/pelican")
	})

	it("is plain text when there is nothing to jump to", () => {
		const { container } = render(
			<LastFound find={find} canJump={false} onJump={vi.fn()} locale="en" t={t} />
		)
		expect(screen.queryByRole("button")).toBeNull()
		expect(container.querySelector("p.last-found")).toHaveTextContent("Pelican")
	})
})
```

- [ ] **Step 3: Run to see it fail**

Run: `npx vitest run src/islands/tracker/LastFound.test.tsx`
Expected: FAIL, the module does not exist.

- [ ] **Step 4: Implement `LastFound.tsx`**

```tsx
import type { Locale, Translate } from "../../i18n"
import { relativeTime } from "../../model/relativeTime"
import type { SeedItem } from "../../model/schema"
import type { RecentFind } from "../../model/stats"
import { categoryIcon } from "./icons"
import { useNow } from "./useNow"

/** The row can jump only when the card is in the list and its checkbox can take focus (a
 *  disabled input cannot). It never changes the user's filters to make room (spec §5.3). */
export function jumpable(
	find: RecentFind | undefined,
	visible: SeedItem[],
	ready: boolean
): boolean {
	return ready && find !== undefined && visible.some((item) => item.id === find.item.id)
}

interface Props {
	find: RecentFind | undefined
	canJump: boolean
	onJump: (id: string) => void
	locale: Locale
	t: Translate
}

/** The phone and tablet stand-in for the rail: the latest find, and a jump to its card. Not a live
 *  region, so the changing time is never announced. */
export function LastFound({ find, canJump, onJump, locale, t }: Props) {
	// Before the early return: hooks run in the same order on every render.
	const now = useNow()
	if (!find) return null
	const Icon = categoryIcon(find.item.category)
	const content = (
		<>
			<span className="last-found-icon" aria-hidden="true">
				<Icon />
			</span>
			<span className="last-found-text">
				<span className="last-found-label">{t("tracker.lastFound")}</span>{" "}
				<span className="last-found-name">{find.item.name}</span>
			</span>{" "}
			<time dateTime={find.updated_at}>{relativeTime(find.updated_at, now, locale)}</time>
		</>
	)
	return canJump ? (
		<button type="button" className="last-found" onClick={() => onJump(find.item.id)}>
			{content}
		</button>
	) : (
		<p className="last-found">{content}</p>
	)
}
```

- [ ] **Step 5: Run to see it pass**

Run: `npx vitest run src/islands/tracker/LastFound.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing island tests** (append to `Tracker.test.tsx`)

```tsx
describe("Last found row (tracker refresh spec §5.3)", () => {
	const row = () => document.querySelector(".last-found")
	const jump = () => screen.queryByRole("button", { name: /^Last found/ })
	const tickPelican = async () => {
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: /^Last found Pelican/ })
	}

	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn()
	})

	it("is absent with no finds", async () => {
		await ready()
		expect(row()).toBeNull()
	})

	it("moves focus to the card's checkbox and marks the card", async () => {
		await ready()
		await tickPelican()
		fireEvent.click(jump() as HTMLElement)
		const box = screen.getByRole("checkbox", { name: "Pelican" })
		expect(box).toHaveFocus()
		expect(box.closest(".item")).toHaveAttribute("data-arrived")
		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			block: "start",
			behavior: "instant",
		})
	})

	it("is plain text when a search hides the card", async () => {
		await ready()
		await tickPelican()
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bike" } })
		expect(jump()).toBeNull()
		expect(row()?.tagName).toBe("P")
		expect(row()).toHaveTextContent("Pelican")
	})

	it("is plain text when a category filter hides the card", async () => {
		await ready()
		await tickPelican()
		fireEvent.click(screen.getByRole("button", { name: /^Vehicles,/ }))
		expect(jump()).toBeNull()
		expect(row()?.tagName).toBe("P")
	})

	it("is plain text when Hide found hides the card", async () => {
		await ready()
		await tickPelican()
		fireEvent.click(screen.getByRole("button", { name: "Hide found" }))
		expect(jump()).toBeNull()
		expect(row()?.tagName).toBe("P")
	})
})
```

And the no-re-render test, `src/islands/Tracker.tick.test.tsx` (R13):

```tsx
// @vitest-environment jsdom
import { act, fireEvent, screen } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { relativeTime } from "../model/relativeTime"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

const renders = vi.hoisted(() => ({ list: 0 }))

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

// Counts the list's renders. The real list renders inside, unchanged.
vi.mock("./tracker/ItemList", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./tracker/ItemList")>()
	return {
		...actual,
		ItemList: (props: Parameters<typeof actual.ItemList>[0]) => {
			renders.list += 1
			return createElement(actual.ItemList, props)
		},
	}
})

beforeEach(resetBrowser)

afterEach(() => {
	vi.useRealTimers()
})

it("updates the time on a tick without re-rendering the list (tracker refresh spec §5.4)", async () => {
	// Only Date is faked: fake intervals stall fake-indexeddb and waitFor (search plan P7).
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-20T10:00:00Z"))
	await renderReady(<Tracker locale="en" />)
	fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
	const row = await screen.findByRole("button", { name: /^Last found Pelican/ })
	const time = row.querySelector("time") as HTMLTimeElement
	const before = time.textContent
	const listRenders = renders.list

	vi.setSystemTime(new Date("2026-11-20T10:05:00Z"))
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"))
	})

	expect(time.textContent).not.toBe(before)
	expect(time.textContent).toBe(relativeTime(time.getAttribute("datetime") ?? "", new Date(), "en"))
	expect(renders.list).toBe(listRenders)
})
```

- [ ] **Step 7: Run to see them fail**

Run: `npx vitest run src/islands/Tracker.test.tsx src/islands/Tracker.tick.test.tsx`
Expected: FAIL, no `.last-found`.

- [ ] **Step 8: Wire `Tracker.tsx`**

Import `{ jumpable, LastFound } from "./tracker/LastFound"`. Above `export function Tracker`, add:

```tsx
// Draws the card's ring where the browser skips :focus-visible (after a click or a page load, in
// Chromium); the mark goes when the checkbox loses focus.
function markCard(box: HTMLElement) {
	const card = box.closest(".item")
	if (!card) return
	card.setAttribute("data-arrived", "")
	box.addEventListener("blur", () => card.removeAttribute("data-arrived"), { once: true })
}
```

In the arrival effect, replace the `const card = ...` / `if (card) { ... }` lines with `markCard(box)`.

Inside `Tracker`, beside the other handlers:

```tsx
	// The Last found row (spec §5.3). The card scrolls, not the checkbox: the checkbox sits 22 px
	// below the card's top, so a focus scroll would tuck the card under the sticky search row.
	// scroll-padding-top still clears the row for scrollIntoView. Instant: a focus move, not motion.
	function jumpTo(id: string) {
		const box = document.getElementById(`item-${id}`)
		if (!(box instanceof HTMLInputElement)) return
		markCard(box)
		box.focus({ preventScroll: true, focusVisible: true })
		box.closest(".item")?.scrollIntoView({ block: "start", behavior: "instant" })
	}
```

Right after `<CategoryNav ... />`:

```tsx
				<LastFound
					find={recent[0]}
					canJump={jumpable(recent[0], view.visible, state.status === "ready")}
					onJump={jumpTo}
					locale={locale}
					t={t}
				/>
```

- [ ] **Step 9: CSS: the row and the layout (R11)**

Base styles:

- `.tracker-layout`: delete its `grid-template-areas`.
- `.tracker-top`, `.cat-nav`, `.tracker-results`, `.stats`: delete each `grid-area` declaration (they move to 1024 px).
- `.stats`: add `display: none;` (spec §3.1, §3.2: no rail below 1024 px).
- Add:

```css
/* An empty fallback: the profile button lives in the title row (spec §5.5). */
.tracker-top:empty {
	display: none;
}

/* Phones and tablets (spec §5.3). The rail shows the same from 1024 px. */
.last-found {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
	min-height: var(--tap);
	margin: 0;
	padding: var(--space-1) 10px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: none;
	color: var(--text);
	font: inherit;
	font-size: 0.75rem;
	text-align: start;
	max-width: none;
}

.last-found-icon {
	display: grid;
	place-items: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--radius);
	background: color-mix(in srgb, var(--accent) 22%, transparent);
	color: var(--accent);
}

.last-found-icon svg {
	width: 15px;
	height: 15px;
}

.last-found-text {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

/* A label beside its value: muted and lighter than the name. */
.last-found-label {
	color: var(--text-muted);
}

.last-found-name {
	font-weight: 600;
}

.last-found time {
	flex: none;
	color: var(--text-muted);
}
```

- Add `.tracker button.last-found` to the hover (`(hover: hover)`), press (`(hover: none)`) and focus-visible selector lists that hold `.tracker .search-elsewhere-btn`, and to the transition list at the top of the hover section.
- 768 px block: delete the `.tracker-layout` rule from Task 5 Step 10 (one column in DOM order needs none).
- 1024 px block: replace `.tracker-layout` with the rule below, and add the area names and visibility:

```css
	.tracker-layout {
		grid-template-columns: 200px minmax(0, 1fr) 200px;
		column-gap: 48px;
		grid-template-areas: "nav list stats";
		align-items: start;
	}

	.cat-nav {
		grid-area: nav;
	}

	.tracker-results {
		grid-area: list;
	}

	.stats {
		grid-area: stats;
		display: block;
	}

	.last-found {
		display: none;
	}
```

Append to `src/styles/tracker-refresh.test.ts`:

```ts
describe("layout without the rail below 1024 px (spec §3, §5.3)", () => {
	it("hides the rail below 1024 px and the Last found row from there", () => {
		expect(rule(".stats")).toMatch(/display:\s*none/)
		const desktop = css.slice(css.indexOf("@media (min-width: 1024px)"))
		expect(desktop).toMatch(/\.last-found\s*\{\s*display:\s*none/)
		expect(desktop).toMatch(/\.stats\s*\{[^}]*display:\s*block/)
	})
})
```

- [ ] **Step 10: Run every test**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
F="src/islands/tracker/LastFound.tsx src/islands/tracker/LastFound.test.tsx src/islands/Tracker.tsx src/islands/Tracker.test.tsx src/islands/Tracker.tick.test.tsx src/locales/en.json src/locales/nb.json src/styles/global.css src/styles/tracker-refresh.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Add a Last found row on phones and tablets that jumps to the card"
```

### Task 12: The profile button in the title row

**Files:**
- Modify: `src/pages/[locale]/tracker/index.astro`, `src/islands/tracker/ProfileMenu.tsx`, `src/islands/Tracker.tsx`, `src/styles/global.css`
- Test: `src/test/tracker-page.test.ts`, `src/islands/tracker/ProfileMenu.test.tsx`, `src/styles/tracker-refresh.test.ts`

**Interfaces:**
- Produces: `ProfileMenu` prop `slotId?: string`; exported `initial(name: string, lang?: string): string`; trigger markup `button[aria-label="Profile: {name}"] > span.avatar[aria-hidden] + span.profile-name`. Page markup `.tracker-head > h1 + div#tracker-profile`.

- [ ] **Step 1: Write the failing tests**

`src/test/tracker-page.test.ts`, inside the `describe`:

```ts
	it("reserves the profile slot after the title, in one row (tracker refresh spec §5.5)", async () => {
		const head = (await renderPage(Tracker)).querySelector(".tracker-head")
		expect(head?.firstElementChild?.tagName).toBe("H1")
		expect(head?.lastElementChild?.id).toBe("tracker-profile")
		expect(head?.lastElementChild?.childElementCount).toBe(0)
	})
```

`src/islands/tracker/ProfileMenu.test.tsx`: add `initial` to the import from `./ProfileMenu`, then:

```tsx
describe("ProfileMenu in the title row (tracker refresh spec §5.5)", () => {
	const t = translator("en").t

	it("renders into the slot when it exists, and the menu still works from there", () => {
		const slot = document.createElement("div")
		slot.id = "tracker-profile"
		document.body.append(slot)
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				slotId="tracker-profile"
				t={t}
			/>
		)
		const trigger = screen.getByRole("button", { name: "Profile: Player 1" })
		expect(slot).toContainElement(trigger)
		expect(container).not.toContainElement(trigger)
		fireEvent.click(trigger)
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
		expect(trigger).toHaveFocus()
		slot.remove()
	})

	it("renders in place when the slot is missing", () => {
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				slotId="tracker-profile"
				t={t}
			/>
		)
		expect(container).toContainElement(screen.getByRole("button", { name: "Profile: Player 1" }))
	})

	it("shows an initial avatar hidden from screen readers, then the name", () => {
		render(<ProfileMenu profiles={profiles} current={profiles[1]} onSwitch={vi.fn()} t={t} />)
		const trigger = screen.getByRole("button", { name: "Profile: Dad" })
		expect(trigger.querySelector(".avatar")).toHaveAttribute("aria-hidden", "true")
		expect(trigger.querySelector(".avatar")).toHaveTextContent("D")
		expect(trigger.querySelector(".profile-name")).toHaveTextContent("Dad")
	})
})

describe("initial (tracker refresh spec §5.5)", () => {
	it("takes the first character of the trimmed name, upper-cased", () => {
		expect(initial("  malin ", "en")).toBe("M")
		expect(initial("   ", "en")).toBe("")
	})

	it("keeps a whole emoji or a letter with its combining mark", () => {
		expect(initial("👩‍🚀 Ana", "en")).toBe("👩‍🚀")
		// A decomposed e: the letter and U+0301 are one grapheme.
		expect(initial("e\u0301mile", "en")).toBe("E\u0301")
	})

	it("upper-cases for the page's language", () => {
		expect(initial("istanbul", "tr")).toBe("İ")
	})

	it("falls back to the first code point without Intl.Segmenter", () => {
		const saved = Intl.Segmenter
		Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true })
		try {
			expect(initial("👩‍🚀 Ana", "en")).toBe("👩")
		} finally {
			Object.defineProperty(Intl, "Segmenter", { value: saved, configurable: true })
		}
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/test/tracker-page.test.ts src/islands/tracker/ProfileMenu.test.tsx`
Expected: FAIL, no `.tracker-head`, `initial` not exported.

- [ ] **Step 3: The page**

In `index.astro`, replace `<h1>{t("tracker.title")}</h1>` with:

```astro
	<div class="tracker-head">
		<h1>{t("tracker.title")}</h1>
		<div id="tracker-profile"></div>
	</div>
```

In its `<style>`, replace the `@media (min-width: 1024px) { h1 { ... } }` block (and its comment) with:

```css
	/* The title row (tracker refresh spec §5.5): the h1 left, the island portals the profile button
	   into the slot on the right. The slot is at the edge, so the button's arrival moves nothing,
	   and min-height holds its 44 px before the island mounts. */
	.tracker-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap);
		margin-bottom: var(--space-3);
	}

	.tracker-head h1 {
		min-width: 0;
		margin: 0;
	}

	/* Centred at the tracker's own cap (global.css), so the title shares the search row's left edge.
	   Here rather than a :has(.tracker) rule, which would only match after the island mounts. */
	@media (min-width: 1024px) {
		.tracker-head {
			max-width: var(--tracker-max-w);
			margin-inline: auto;
		}
	}
```

- [ ] **Step 4: `ProfileMenu`**

Imports: add `import { createPortal } from "react-dom"`. Add `slotId?: string` to `Props` with the doc comment `/** Renders into the element with this id when it exists (the tracker's title row), in place otherwise. */`, and destructure it. Above the component:

```tsx
/** The profile's first character as the eye sees it: a whole emoji or a letter with its combining
 *  mark, upper-cased for the page's language (spec §5.5). */
export function initial(name: string, lang?: string): string {
	const trimmed = name.trim()
	if (trimmed === "") return ""
	const first =
		typeof Intl.Segmenter === "function"
			? new Intl.Segmenter(lang, { granularity: "grapheme" })
					.segment(trimmed)
					[Symbol.iterator]()
					.next().value?.segment
			: undefined
	return (first ?? Array.from(trimmed)[0]).toLocaleUpperCase(lang)
}

/** The page's language; the hub renders on the server too, where there is no document. */
function pageLang(): string | undefined {
	return typeof document === "undefined" ? undefined : document.documentElement.lang || undefined
}
```

Inside the component, beside the other state:

```tsx
	// Read once: the island is client-only and the slot is server HTML, so it exists from the start.
	const [slot] = useState(() => (slotId ? document.getElementById(slotId) : null))
	const name = current?.name ?? ""
```

Replace the trigger (its children were `{t("profile.menu", { name: current?.name ?? "" })}`) with:

```tsx
			<button
				ref={trigger}
				type="button"
				aria-label={t("profile.menu", { name })}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen((value) => !value)}
			>
				{/* Its own element at a fixed size, so a picture can replace the letter later. */}
				<span className="avatar" aria-hidden="true">
					{initial(name, pageLang())}
				</span>
				<span className="profile-name">{name}</span>
			</button>
```

Turn the returned `<div className="profile-menu">...</div>` into `const menuButton = (...)` and end the component with:

```tsx
	// A portal keeps React's events and state, so the menu pattern and the dialogs are unchanged.
	return slot ? createPortal(menuButton, slot) : menuButton
```

In `Tracker.tsx`, give `<ProfileMenu>` the prop `slotId="tracker-profile"`.

- [ ] **Step 5: CSS**

After the `.profile-menu > button, .hint button { ... }` rule, add:

```css
.profile-menu > button {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	padding-inline-start: var(--space-2);
}

/* The initial is --text on the pink tint: pink on that tint is about 3.9:1, under AA. */
.avatar {
	display: grid;
	place-items: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--accent) 30%, transparent);
	color: var(--text);
	font-size: 0.8125rem;
	font-weight: 600;
	line-height: 1;
}

/* Cut on phones so the title row never wraps; the accessible name always has the whole name. */
.profile-name {
	min-width: 0;
	max-width: min(8rem, 30vw);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* The slot sits at the right edge, so the menu opens leftwards and stays on screen. */
#tracker-profile .menu {
	left: auto;
	right: 0;
}
```

In the 768 px block add `.profile-name { max-width: 20rem; }`.

Append to `src/styles/tracker-refresh.test.ts`:

```ts
describe("profile in the title row (spec §5.5)", () => {
	it("sets the initial in --text and opens the menu leftwards from the slot", () => {
		expect(rule(".avatar")).toMatch(/color:\s*var\(--text\)/)
		expect(rule("#tracker-profile .menu")).toMatch(/right:\s*0/)
	})
})
```

- [ ] **Step 6: Run every test**

Run: `npm test`
Expected: PASS, `Dashboard.test.tsx` and `Tracker.profiles.test.tsx` included (both find the trigger by "Profile: …").

- [ ] **Step 7: Commit**

```bash
F="src/pages/[locale]/tracker/index.astro src/islands/tracker/ProfileMenu.tsx src/islands/tracker/ProfileMenu.test.tsx src/islands/Tracker.tsx src/test/tracker-page.test.ts src/styles/global.css src/styles/tracker-refresh.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Move the profile button into the tracker title row with an initial avatar"
```

### Task 12b: Wide steps (spec §14.2, added 04.11.2026)

The tracker page grows to 90rem from 1600 px (3 cards across) and 120rem from 1920 px (4 cards). The hub keeps `.wrap.wide` at 85rem. Every user of `--tracker-max-w` (`.tracker`, `.tracker-head`, the page's `h1` and `.dex-browse`) is a `max-width`, so lifting the variable to `none` at the steps lets all of them fill `main` together and the title keeps the search row's left edge.

**Files:**
- Modify: `src/layouts/Base.astro` (new `trackerWide` prop)
- Modify: `src/pages/[locale]/tracker/index.astro` (pass it)
- Modify: `src/styles/global.css` (the two steps, after the `.wrap.wide` block)
- Test: `src/styles/tracker-refresh.test.ts`, `src/test/tracker-page.test.ts`

**Interfaces:**
- Consumes: `--tracker-max-w` on `main` (global.css, 1024 px query); Task 12's `.tracker-head` cap.
- Produces: `main.wrap.tracker-wide`; nothing later depends on it except the Task 13 measures and PR 3's chip rows, which sit inside the list column.

- [ ] **Step 1: Write the failing tests**

Append to `src/styles/tracker-refresh.test.ts`, inside the top-level `describe`:

```ts
	it("widens the tracker page in two steps that each add a card column (spec §14.2)", () => {
		const step = (px: number) =>
			css.match(new RegExp(`@media \\(min-width: ${px}px\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ""
		expect(step(1600)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*max-width:\s*90rem/)
		expect(step(1600)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*--tracker-max-w:\s*none/)
		expect(step(1920)).toMatch(/\.wrap\.tracker-wide\s*\{[^}]*max-width:\s*120rem/)
		// The hub keeps its own cap.
		expect(step(1600)).toMatch(/\.wrap\.wide\s*\{[^}]*max-width:\s*85rem/)
	})
```

Append to `src/test/tracker-page.test.ts`, inside `describe("Tracker page")`:

```ts
	it("gives main the tracker's wide steps, not the hub's", async () => {
		const main = (await renderPage(Tracker)).querySelector("main")
		expect(main?.classList.contains("tracker-wide")).toBe(true)
		expect(main?.classList.contains("wide")).toBe(false)
	})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/styles/tracker-refresh.test.ts src/test/tracker-page.test.ts`
Expected: FAIL on the two new tests (no `.tracker-wide` rule, no class on `main`).

- [ ] **Step 3: The prop and the page**

In `src/layouts/Base.astro`, beside the `wide` prop:

```ts
	/** The tracker's wider page: 90rem from 1600 px, 120rem from 1920 px (tracker refresh spec §14.2). */
	trackerWide?: boolean
```

Destructure it with `trackerWide = false` next to `wide = false`, and change the `main` line to:

```astro
		<main id="main" class:list={["wrap", { wide, "tracker-wide": trackerWide }]}>
```

In `src/pages/[locale]/tracker/index.astro`, add `trackerWide` to the `<Base ...>` call:

```astro
<Base locale={locale} title={t("seo.titles.tracker")} description={t("tracker.description")} path="tracker" trackerWide>
```

- [ ] **Step 4: The CSS**

In `src/styles/global.css`, replace the existing block

```css
@media (min-width: 1600px) {
	.wrap.wide {
		max-width: 85rem;
	}
}
```

with:

```css
/* Wide steps (tracker refresh spec §14.2). Each step adds a whole card column at the 280 px card
   minimum: 90rem gives the list 880 px (3 cards), 120rem gives 1360 px (4). Lifting
   --tracker-max-w lets the tracker, its title row and the Browse row fill main together. Above
   120rem the page stays centred; more than four columns is harder to scan. */
@media (min-width: 1600px) {
	.wrap.wide {
		max-width: 85rem;
	}

	.wrap.tracker-wide {
		max-width: 90rem;
		--tracker-max-w: none;
	}
}

@media (min-width: 1920px) {
	.wrap.tracker-wide {
		max-width: 120rem;
	}
}
```

`main` sets `--tracker-max-w` inside the 1024 px query, earlier in the file; `.wrap.tracker-wide` is more specific than `main`, so its `none` wins at both steps.

- [ ] **Step 5: Run every test**

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
F="src/layouts/Base.astro src/pages/[locale]/tracker/index.astro src/styles/global.css src/styles/tracker-refresh.test.ts src/test/tracker-page.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Widen the tracker page in two steps so wide screens get three and four card columns"
```

### Task 13: Verify and ship PR 2

- [ ] **Step 1: Full checks**

```bash
npm test && npx biome ci . && npm run check && npm run build
```

Expected: all green.

- [ ] **Step 2: Serve and measure, one batched round** (built site as in Task 6 Step 2, pointed at this worktree; 320, 768, 1024, 1280, 1600 and 1920 px; `en` and `nb`; tick three items first)

Card height and hit testing (Review Focus 4):

```js
const card = document.querySelector("li.item:has(.item-desc)")
const at = (el) => {
	const r = el.getBoundingClientRect()
	return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
}
;({
	height: Math.round(card.getBoundingClientRect().height),
	descHitsLabel: at(card.querySelector(".item-desc")) === card.querySelector("label"),
	bookOnTop: at(card.querySelector(".item-book")).closest("a") === card.querySelector(".item-book"),
	flagOnTop:
		at(card.querySelector(".item-foot button")).closest("button") ===
		card.querySelector(".item-foot button"),
})
```

Expected: `height` about 164 at 1280 px (spec §2); `descHitsLabel` true (the label's `::after` reports the label); both footer checks true.

Title row and menu (Review Focus 1 and 3): rename the profile to 40 characters, then at 320 px read the `.tracker-head` height (44), `scrollWidth === innerWidth`, the button's bottom edge equal to the h1 row's, and with the menu open, its `getBoundingClientRect().left >= 0` and `.right <= innerWidth`.

Last found: at 320 px tap the row; the card's top sits just under the sticky search row, the ring shows, and nothing animates under reduced motion.

Rail at 1280 px: the percentage reads `Math.floor`; times update after a minute; the rail and the list share a top edge.

Wide steps (Task 12b, spec §14.2): at 1600 and 1920 px read the card column count with `getComputedStyle(document.querySelector(".item-group ul")).gridTemplateColumns.split(" ").length` (expect 3, then 4), `document.documentElement.scrollWidth === innerWidth`, and the h1's left edge equal to `.search-row`'s. At 1599 px it is still 2. Then the parked PR 1 item: the nb desktop rail at 200 % text at 1280 and 1600 px, no horizontal overflow from `.stats` (PR 1 measured 8 to 16 px).

The hub (Review Focus 5): open `/en/` at 320 and 1280 px; the dashboard's profile button shows the avatar on one line with the day text, and Recent finds looks as on production (compare a screenshot).

- [ ] **Step 3: Forced colours, keyboard, layout shift**

As Task 6 Steps 4 and 5, plus: in forced colours a found card keeps its ✓; Tab order on the page is profile button, search field, Hide found, tiles, Last found, then the cards (checkbox, book, flag). CLS 0 at all six widths, including the profile button's arrival.

- [ ] **Step 4: Push and open**

```bash
git push -u origin feat/tracker-refresh-structure
gh pr create --title "Rebuild the tracker card, rail and title row" --body-file -
```

PR body:

```markdown
The second half of the tracker refresh (spec `docs/superpowers/specs/2026-11-03-tracker-refresh-design.md`, §5).

- Each card leads with its category icon, then the name and one meta line (tier dot, tier, group). The check sits top right, the description is clamped to two lines, and the book and flag live in the footer. A found card gets a pink edge, a pink icon tile and the ✓. A card is 164 px tall instead of 231.
- The desktop rail is a big overall percentage (rounded down, so it never says 100 % early) and Recent finds with icons and times like "2 min ago". The four category bars are gone; the tiles carry those counts now.
- Phones and tablets get a Last found row instead of the rail. It jumps to the card when the card is in the list and is plain text when search, Hide found or a filter hides it.
- The profile button sits in the title row with an initial avatar. It is portalled from the island, so the menu and dialogs work as before.

Times update once a minute and when the tab is shown again. The tick re-renders only the rail and the row, never the list.

On wide screens the tracker now grows in two steps: three cards across from 1600 px and four from 1920 px, instead of two in a narrow column. The hub keeps its own width.

Checked: tests, Biome, astro check and the build; card hit testing with elementFromPoint; a 40-character profile name and the open menu at 320 px; the hub at 320 and 1280 px; forced colours, keyboard order, reduced motion; card columns at 1600 and 1920 px; CLS 0 at 320, 768, 1024, 1280, 1600 and 1920 px.
```

- [ ] **Step 5: Merge when green, before Tuesday 10.11.2026**

Bind the PR with the ccd_pr tools, read CI, merge once green. If it is not green by 10.11, it waits until after launch week (spec §1); say so to her rather than forcing it.

---

## PR 3: group chips (spec §14.1, added 04.11.2026)

Cut from `main` **after PR 2 has merged**: these tasks edit the PR 2 versions of `Tracker.tsx` and `ItemList.tsx` (the Last found row, the icon-lead card) and the CSS hover lists PR 2 extended. Line references below are by anchor text, not number. If PR 2 is held past 10.11, PR 3 is held with it (spec §1).

The fixtures in `src/test/tracker-fixtures.ts` drive every island test here: Vehicles has one group (Bikes), so it never gets chips; Wildlife has Birds (Pelican) and Reptiles (American alligator), so it gets two.

### Task 14: The group selection in the tracker model

**Files:**
- Modify: `src/model/tracker.ts`
- Modify: `src/islands/buildTracker.ts`
- Test: `src/model/tracker.test.ts`

**Interfaces:**
- Consumes: `countable`, `groupKey` from `src/model/stats.ts` (Task 1); `categoryIds`, `groupItems` from `src/model/seed.ts`.
- Produces (all in `src/model/tracker.ts`):
  - `chipGroups(items: SeedItem[], selected: string[]): Map<string, string[]>`: per pressed category with two or more groups, its group ids in list order; categories in seed order (R16).
  - `parseGroups(search: string, chips: Map<string, string[]>): string[]`: `groupKey`s from `?group=` that a chip offers, in list order.
  - `groupParam(groups: string[]): string | null`.
  - `TrackerState.groups: string[]`, `TrackerDeps.groups?: string[]`, `Tracker.toggleGroup(key: string): void`. `selectCategories` now also drops groups (R20).
  - `buildTracker(defaultProfileName: string, selected?: string[], groups?: string[]): Tracker`.

- [ ] **Step 0: Worktree** (only once PR 2 has merged)

```bash
gh pr list --state merged --head feat/tracker-refresh-structure --json number,mergedAt
git fetch origin && git worktree add .claude/worktrees/tracker-refresh-chips -b feat/tracker-refresh-chips origin/main
```

Then in `.claude/worktrees/tracker-refresh-chips`: `npm ci`, then `npm test`. Expected: PASS, every file, and `src/islands/tracker/LastFound.tsx` exists.

- [ ] **Step 1: Write the failing tests**

In `src/model/tracker.test.ts`, change the import to:

```ts
import {
	chipGroups,
	createTracker,
	groupParam,
	parseGroups,
	parseShow,
	showParam,
	type TrackerDeps,
} from "./tracker"
```

Append:

```ts
describe("group chips (tracker refresh spec §14.1)", () => {
	const grouped: SeedItem[] = [
		{ ...item("wildlife/a", "wildlife"), group: "reptiles" },
		{ ...item("wildlife/b", "wildlife"), group: "birds" },
		{ ...item("wildlife/r", "wildlife"), group: "mammals", retired: true },
		{ ...item("vehicles/c", "vehicles"), group: "cars" },
		{ ...item("vehicles/d", "vehicles"), group: "boats" },
		{ ...item("misc/e", "misc"), group: "only" },
	]

	it("offers chips per pressed category in list order, never for one group or a retired one", () => {
		expect([...chipGroups(grouped, [])]).toEqual([])
		// Pressed out of order on purpose: the chips follow the list, not the press order.
		expect([...chipGroups(grouped, ["misc", "vehicles", "wildlife"])]).toEqual([
			["wildlife", ["birds", "reptiles"]],
			["vehicles", ["boats", "cars"]],
		])
	})

	it("parseGroups keeps offered keys in list order; groupParam serialises or drops", () => {
		const chips = chipGroups(grouped, ["wildlife"])
		// vehicles is not pressed, mammals has only a retired item, evil is not a key at all.
		expect(
			parseGroups(
				"?group=wildlife/reptiles,wildlife/birds,vehicles/cars,wildlife/mammals,evil",
				chips
			)
		).toEqual(["wildlife/birds", "wildlife/reptiles"])
		expect(parseGroups("", chips)).toEqual([])
		expect(groupParam(["wildlife/birds", "wildlife/reptiles"])).toBe(
			"wildlife/birds,wildlife/reptiles"
		)
		expect(groupParam([])).toBeNull()
	})

	it("toggleGroup presses and unpresses a chip and ignores keys no chip offers", () => {
		const { tracker } = make({ items: grouped, selected: ["wildlife"] })
		tracker.toggleGroup("wildlife/reptiles")
		tracker.toggleGroup("wildlife/birds")
		expect(tracker.getState().groups).toEqual(["wildlife/birds", "wildlife/reptiles"])
		tracker.toggleGroup("wildlife/birds")
		expect(tracker.getState().groups).toEqual(["wildlife/reptiles"])
		const before = tracker.getState()
		for (const key of ["vehicles/cars", "misc/only", "wildlife/mammals", "nope"]) {
			tracker.toggleGroup(key)
		}
		expect(tracker.getState()).toBe(before)
	})

	it("drops a category's chips when it is unpressed, so pressing it again starts with none", () => {
		const { tracker } = make({ items: grouped, selected: ["wildlife", "vehicles"] })
		tracker.toggleGroup("wildlife/birds")
		tracker.toggleGroup("vehicles/cars")
		tracker.selectCategories(["vehicles"])
		expect(tracker.getState().groups).toEqual(["vehicles/cars"])
		tracker.selectCategories(["wildlife", "vehicles"])
		expect(tracker.getState().groups).toEqual(["vehicles/cars"])
		tracker.selectCategories([])
		expect(tracker.getState().groups).toEqual([])
	})

	it("starts from the groups it is given, keeping only the ones a chip offers", () => {
		const { tracker } = make({
			items: grouped,
			selected: ["wildlife"],
			groups: ["vehicles/cars", "wildlife/birds"],
		})
		expect(tracker.getState().groups).toEqual(["wildlife/birds"])
	})

	it("keeps the chips across a profile switch", async () => {
		const { tracker } = make({ items: grouped, selected: ["wildlife"] })
		await tracker.init()
		tracker.toggleGroup("wildlife/birds")
		await tracker.createProfile("Dad")
		expect(tracker.getState().groups).toEqual(["wildlife/birds"])
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/model/tracker.test.ts`
Expected: FAIL, `chipGroups` is not exported.

- [ ] **Step 3: Implement in `src/model/tracker.ts`**

Change the two imports:

```ts
import { categoryIds, groupItems } from "./seed"
import { countable, countItems, groupKey, type Records } from "./stats"
```

In `TrackerState`, after `selected: string[]`:

```ts
	/** Pressed group chips as `groupKey`s, in list order, only under pressed categories (spec §14.1). */
	groups: string[]
```

In `TrackerDeps`, after `selected?: string[]`:

```ts
	groups?: string[]
```

In `Tracker`, after `selectCategories(ids: string[]): void`:

```ts
	toggleGroup(key: string): void
```

After `showParam`, add:

```ts
/**
 * Per pressed category, the groups its chips offer (tracker refresh spec §14.1): every group with
 * a countable item, in the list's group order. A category with one group gets no chips, because
 * one chip would filter nothing. Categories come in seed order. A Map, so a category id such as
 * "constructor" can never read Object.prototype (R16).
 */
export function chipGroups(items: SeedItem[], selected: string[]): Map<string, string[]> {
	const live = countable(items)
	const chips = new Map<string, string[]>()
	for (const category of categoryIds(live)) {
		if (!selected.includes(category)) continue
		const groups = [...groupItems(live.filter((item) => item.category === category)).keys()]
		if (groups.length > 1) chips.set(category, groups)
	}
	return chips
}

/** The keys in `keys` that a chip offers, in list order (R20). */
function keepChips(keys: Iterable<string>, chips: Map<string, string[]>): string[] {
	const wanted = new Set(keys)
	return [...chips].flatMap(([category, groups]) =>
		groups.map((group) => groupKey(category, group)).filter((key) => wanted.has(key))
	)
}

/** Group keys named in `?group=`, read after `?show=`: only chips the pressed categories offer,
 *  in list order. Anything else is dropped, so the raw value is never echoed. */
export function parseGroups(search: string, chips: Map<string, string[]>): string[] {
	const raw = new URLSearchParams(search).get("group") ?? ""
	return keepChips(
		raw.split(",").map((s) => s.trim()),
		chips
	)
}

export function groupParam(groups: string[]): string | null {
	return groups.length > 0 ? groups.join(",") : null
}
```

In `createTracker`, replace the `selected:` line of the initial state with the two lines below, and declare `selected` just above `let state`:

```ts
	const selected = (deps.selected ?? []).filter((id) => known.has(id))
```

```ts
		selected,
		groups: keepChips(deps.groups ?? [], chipGroups(deps.items, selected)),
```

Replace `selectCategories` and add `toggleGroup` after it:

```ts
		// Unpressing a category drops its chips, so pressing it again starts with none (spec §14.1).
		selectCategories(ids) {
			const selected = ids.filter((id) => known.has(id))
			set({ selected, groups: keepChips(state.groups, chipGroups(deps.items, selected)) })
		},
		toggleGroup(key) {
			const chips = chipGroups(deps.items, state.selected)
			if (keepChips([key], chips).length === 0) return
			const next = new Set(state.groups)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			set({ groups: keepChips(next, chips) })
		},
```

- [ ] **Step 4: Pass the groups through `buildTracker`**

In `src/islands/buildTracker.ts`, change the signature and add the field after `selected,`:

```ts
export function buildTracker(
	defaultProfileName: string,
	selected: string[] = [],
	groups: string[] = []
): Tracker {
```

```ts
		groups,
```

- [ ] **Step 5: Run to see them pass**

Run: `npx vitest run src/model/tracker.test.ts && npm run check`
Expected: PASS, and `astro check` reports no errors (no test builds a `TrackerState` by hand, so the new field breaks nothing).

- [ ] **Step 6: Commit**

```bash
F="src/model/tracker.ts src/model/tracker.test.ts src/islands/buildTracker.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Keep the pressed group chips in the tracker model beside the categories"
```

### Task 15: Groups in search

**Files:**
- Modify: `src/model/search.ts`
- Modify: `src/islands/tracker/useSearch.ts`
- Test: `src/model/search.test.ts`, `src/islands/tracker/useSearch.test.ts`

**Interfaces:**
- Consumes: `groupKey` (stats.ts); `TrackerState.groups` (Task 14).
- Produces: `SearchInput.groups: string[]`; `SearchSource` gains `"groups"`; `SearchChange.groups?: string[]`. Task 17's Clear filters calls `search.viewFor({ selected: [], groups: [] })`.

- [ ] **Step 1: Write the failing tests**

In `src/model/search.test.ts`, change the `view` helper to:

```ts
const view = (patch: Partial<Parameters<typeof searchView>[0]>) =>
	searchView({ items, selected: [], groups: [], query: "", hidden: none, terms, ...patch })
```

Append:

```ts
describe("searchView with group chips (tracker refresh spec §14.1)", () => {
	const both = { selected: ["vehicles", "wildlife"], groups: ["vehicles/cars"] }

	it("narrows only the category whose chips are pressed", () => {
		expect(ids(view(both).visible)).toEqual([
			"vehicles/albany-primo",
			"vehicles/ubermacht-sentinel",
			"wildlife/pelican",
			"wildlife/alligator",
		])
	})

	it("counts a match a chip hides as outside the filters", () => {
		const v = view({ ...both, query: "seashark" })
		expect(v.visible).toEqual([])
		expect(v.elsewhere).toBe(1)
	})

	it("counts hidden finds inside the pressed chips only", () => {
		const hidden = new Set(["vehicles/albany-primo", "vehicles/speedophile", "wildlife/pelican"])
		const v = view({ ...both, hidden })
		expect(ids(v.visible)).toEqual(["vehicles/ubermacht-sentinel", "wildlife/alligator"])
		// The Primo and the Pelican are inside; the Seashark sits behind an unpressed chip.
		expect(v.hiddenCount).toBe(2)
	})
})
```

In `src/islands/tracker/useSearch.test.ts`, add `groups: [],` to `base` after `selected: [],`, and append inside `describe("useSearch ...")`:

```ts
	it("takes a new snapshot when the group chips change (tracker refresh spec §14.1)", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup({ selected: ["wildlife"] })
		rerender({ ...base, selected: ["wildlife"], records: found(PELICAN) })
		expect(visibleIds(result)).toContain(PELICAN)
		rerender({
			...base,
			selected: ["wildlife"],
			groups: ["wildlife/birds"],
			records: found(PELICAN),
		})
		expect(visibleIds(result)).toEqual([])
		expect(result.current.view.hiddenCount).toBe(1)
	})

	it("previews a change of chips with viewFor", () => {
		const { result } = setup({ selected: ["wildlife"], groups: ["wildlife/birds"] })
		expect(result.current.viewFor({ query: "gator" }).elsewhere).toBe(1)
		expect(
			result.current.viewFor({ query: "gator", groups: [] }).visible.map((item) => item.id)
		).toEqual([GATOR])
	})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/model/search.test.ts src/islands/tracker/useSearch.test.ts`
Expected: FAIL on the new tests (chips ignored, so `vehicles/speedophile` is visible).

- [ ] **Step 3: Implement `src/model/search.ts`**

Change the stats import to `import { groupKey, type Records } from "./stats"`. In `SearchInput`, after `selected`:

```ts
	/** Pressed group chips as `groupKey`s. A category with none pressed shows every group. */
	groups: string[]
```

In `SearchView`, reword the two "chips" comments (they meant the category tiles): `/** Inside the pressed tiles and chips, matching, not hidden, in seed order. */`, `/** Matching and not hidden outside the filters; 0 with no query. */` and `/** Matching and hidden inside the filters. */`.

Replace the head of `searchView` and its `inside` line:

```ts
export function searchView({
	items,
	selected,
	groups,
	query,
	hidden,
	terms,
}: SearchInput): SearchView {
	const queryWords = words(query)
	const all = selected.length === 0
	const pressed = new Set(groups)
	// The categories a chip narrows: there, only the pressed groups are inside (spec §14.1).
	const narrowed = new Set(
		items
			.filter((item) => pressed.has(groupKey(item.category, item.group)))
			.map((item) => item.category)
	)
```

```ts
		const inside =
			(all || selected.includes(item.category)) &&
			(!narrowed.has(item.category) || pressed.has(groupKey(item.category, item.group)))
```

- [ ] **Step 4: Implement `src/islands/tracker/useSearch.ts`**

```ts
export type SearchSource = Pick<
	TrackerState,
	"status" | "profileId" | "items" | "records" | "selected" | "groups"
>

export interface SearchChange {
	query?: string
	selected?: string[]
	groups?: string[]
	hideFound?: boolean
}
```

Add `source.groups` to the key, after `source.selected`:

```ts
	const key = JSON.stringify([
		ready,
		source.profileId,
		source.selected,
		source.groups,
		query,
		hideFound,
		imports,
	])
```

Give `viewOf` the groups and pass them everywhere:

```ts
	function viewOf(
		selected: string[],
		groups: string[],
		q: string,
		hide: ReadonlySet<string>
	): SearchView {
		return searchView({
			items: source.items,
			selected,
			groups,
			query: q,
			hidden: hide,
			terms: SEARCH_TERMS,
		})
	}
```

```ts
		view: viewOf(source.selected, source.groups, query, hidden),
```

```ts
		viewFor: (change) =>
			viewOf(
				change.selected ?? source.selected,
				change.groups ?? source.groups,
				change.query ?? query,
				snapshot(change.hideFound ?? hideFound)
			),
```

- [ ] **Step 5: Run to see them pass**

Run: `npx vitest run src/model/search.test.ts src/islands/tracker/useSearch.test.ts && npm run check`
Expected: PASS, no type errors (`Tracker.tsx` passes the whole `TrackerState`, which now has `groups`).

- [ ] **Step 6: Commit**

```bash
F="src/model/search.ts src/model/search.test.ts src/islands/tracker/useSearch.ts src/islands/tracker/useSearch.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Let the pressed group chips narrow search, Hide found and the elsewhere count"
```

### Task 16: The chip row

**Files:**
- Create: `src/islands/tracker/GroupChips.tsx`
- Modify: `src/styles/global.css`, `src/locales/en.json`, `src/locales/nb.json`
- Test: `src/islands/tracker/GroupChips.test.tsx` (new), `src/styles/tracker-refresh.test.ts`, `src/i18n/copy.test.ts`

**Interfaces:**
- Consumes: `Count`, `groupKey` (stats.ts); `Translate`; copy `tracker.count`.
- Produces: `GroupChips` props `{ category: string; categoryLabel: string; groups: string[]; pressed: string[]; counts: Record<string, Count>; groupLabel: (id: string) => string; onToggle: (key: string) => void; t: Translate }`. Root `fieldset.group-chips` (R18), one `button` per group with `.chip-check` (pressed only), `.chip-name`, `.chip-count`. Copy key `tracker.groupChips`.

- [ ] **Step 1: Write the failing tests**

`src/islands/tracker/GroupChips.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { seedLabel, translator } from "../../i18n"
import { GroupChips } from "./GroupChips"

const { t } = translator("en")
const counts = {
	"wildlife/birds": { done: 1, total: 3 },
	"wildlife/reptiles": { done: 0, total: 2 },
}

function setup(pressed: string[] = []) {
	const onToggle = vi.fn()
	render(
		<GroupChips
			category="wildlife"
			categoryLabel="Wildlife"
			groups={["birds", "reptiles"]}
			pressed={pressed}
			counts={counts}
			groupLabel={(id) => seedLabel(t, "group", id)}
			onToggle={onToggle}
			t={t}
		/>
	)
	return onToggle
}

describe("GroupChips (tracker refresh spec §14.1)", () => {
	it("is a group named after its category, with a chip per group in list order", () => {
		setup()
		const row = screen.getByRole("group", { name: "Groups: Wildlife" })
		expect(within(row).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
			"Birds, 1 of 3",
			"Reptiles, 0 of 2",
		])
	})

	it("marks pressed chips with aria-pressed and a hidden ✓, and only those", () => {
		setup(["wildlife/birds"])
		const birds = screen.getByRole("button", { name: "Birds, 1 of 3" })
		const reptiles = screen.getByRole("button", { name: "Reptiles, 0 of 2" })
		expect(birds).toHaveAttribute("aria-pressed", "true")
		expect(reptiles).toHaveAttribute("aria-pressed", "false")
		expect(birds.querySelector(".chip-check")).toHaveAttribute("aria-hidden", "true")
		expect(birds).toHaveTextContent("✓")
		expect(reptiles).not.toHaveTextContent("✓")
	})

	it("shows the whole group's count as done/total", () => {
		setup()
		expect(screen.getByRole("button", { name: "Birds, 1 of 3" })).toHaveTextContent("Birds1/3")
	})

	it("hands the group key to onToggle", () => {
		const onToggle = setup()
		fireEvent.click(screen.getByRole("button", { name: "Reptiles, 0 of 2" }))
		expect(onToggle).toHaveBeenCalledWith("wildlife/reptiles")
	})
})
```

Append to `src/styles/tracker-refresh.test.ts` (top level, after the existing `describe`):

```ts
describe("group chips (spec §14.1)", () => {
	it("makes chips 44 px pills in a row that wraps at every width", () => {
		expect(rule(".group-chips")).toMatch(/flex-wrap:\s*wrap/)
		expect(rule(".group-chips")).toMatch(/min-inline-size:\s*0/)
		expect(rule(".group-chips button")).toMatch(/min-height:\s*var\(--tap\)/)
		expect(rule(".group-chips button")).toMatch(/border-radius:\s*999px/)
	})

	it("keeps a chip's width when the ✓ appears (R19)", () => {
		expect(rule(".group-chips button")).toMatch(/padding:\s*4px calc\(13px \+ 0\.4375em\)/)
		expect(rule('.group-chips button[aria-pressed="true"]')).toMatch(/padding-inline:\s*10px/)
		expect(rule(".group-chips .chip-check")).toMatch(/width:\s*0\.875em/)
	})

	it("gives a pressed chip the white focus ring and the forced-colours Highlight", () => {
		expect(css).toMatch(
			/\.group-chips button\[aria-pressed="true"\]:focus-visible\s*\{\s*outline-color:\s*var\(--text\)/
		)
		expect(css).toMatch(
			/\.group-chips button\[aria-pressed="true"\],\s*\.tiles button\[aria-pressed="true"\],[^{]*\{[^}]*background:\s*Highlight/
		)
	})

	it("guards every unpressed chip state with :not([aria-pressed=\"true\"])", () => {
		const states = css.match(/\.group-chips button[^,{\s]*:(hover|active|focus-visible)/g) ?? []
		const unpressed = states.filter((s) => !s.includes('button[aria-pressed="true"]:'))
		expect(unpressed.length).toBeGreaterThanOrEqual(3)
		for (const s of unpressed) expect(s).toContain(':not([aria-pressed="true"])')
	})
})
```

In `src/i18n/copy.test.ts`, append:

```ts
describe("group chips copy (tracker refresh spec §14.1)", () => {
	it("names the chip row after its category", () => {
		expect(en["tracker.groupChips"]).toBe("Groups: {category}")
		expect(nb["tracker.groupChips"]).toBe("Grupper: {category}")
	})
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/islands/tracker/GroupChips.test.tsx src/styles/tracker-refresh.test.ts src/i18n/copy.test.ts`
Expected: FAIL, no `GroupChips` module, no `.group-chips` rules, no `tracker.groupChips`.

- [ ] **Step 3: The copy**

In `src/locales/en.json`, after `"tracker.categories": "Categories",` add `"tracker.groupChips": "Groups: {category}",`. In `src/locales/nb.json`, after `"tracker.categories": "Kategorier",` add `"tracker.groupChips": "Grupper: {category}",`. Then `grep -n '\\u00' src/locales/nb.json` (expect no output).

- [ ] **Step 4: Implement `src/islands/tracker/GroupChips.tsx`**

```tsx
import type { Translate } from "../../i18n"
import { type Count, groupKey } from "../../model/stats"

const none: Count = { done: 0, total: 0 }

interface Props {
	category: string
	/** The category's label, for the row's name. */
	categoryLabel: string
	/** This category's chip groups in list order (`chipGroups`). */
	groups: string[]
	/** Every pressed chip as a `groupKey`. */
	pressed: string[]
	/** Keyed by `groupKey`, over every item, never the filtered view (spec §2 Counts). */
	counts: Record<string, Count>
	groupLabel: (id: string) => string
	onToggle: (key: string) => void
	t: Translate
}

/**
 * The chips under a pressed category's title (tracker refresh spec §14.1): multi-select toggles,
 * none pressed shows the whole category. The name carries the count in words, as a tile's does,
 * so the digits are hidden. A fieldset is the group role Biome accepts (R18).
 */
export function GroupChips({
	category,
	categoryLabel,
	groups,
	pressed,
	counts,
	groupLabel,
	onToggle,
	t,
}: Props) {
	return (
		<fieldset
			className="group-chips"
			aria-label={t("tracker.groupChips", { category: categoryLabel })}
		>
			{groups.map((group) => {
				const key = groupKey(category, group)
				const on = pressed.includes(key)
				const count = counts[key] ?? none
				const label = groupLabel(group)
				return (
					<button
						key={key}
						type="button"
						aria-pressed={on}
						aria-label={`${label}, ${t("tracker.count", { done: count.done, total: count.total })}`}
						onClick={() => onToggle(key)}
					>
						{/* Pressed is never told by colour alone. */}
						{on && (
							<span className="chip-check" aria-hidden="true">
								✓
							</span>
						)}
						<span className="chip-name">{label}</span>
						<span className="chip-count" aria-hidden="true">
							{count.done}/{count.total}
						</span>
					</button>
				)
			})}
		</fieldset>
	)
}
```

- [ ] **Step 5: The CSS**

In `src/styles/global.css`, after the `.cat-rule` block and before `.item-groups`:

```css
/* Group chips (tracker refresh spec §14.1): under a pressed category's title, wrapping onto more
   lines at every width. .cat-head's 28 px sits above; 24 px below, before the first group. The
   row is a fieldset for its group role (R18), so I reset the UA box, including the min-content
   width that would stop a long label from wrapping. */
.group-chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-2);
	min-inline-size: 0;
	margin: 0 0 24px;
	padding: 0;
	border: 0;
}

/* An unpressed chip carries the ✓'s width (0.875em plus the 6 px gap) as extra inline padding,
   so a press never changes a chip's width and the row never reflows under the finger (R19). */
.group-chips button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	max-width: 100%;
	min-height: var(--tap);
	padding: 4px calc(13px + 0.4375em);
	border: 1px solid var(--border);
	border-radius: 999px;
	background: var(--bg-raised);
	color: var(--text);
	font: inherit;
	font-size: 0.875rem;
	line-height: 1.25;
	text-align: start;
}

.group-chips .chip-check {
	flex: none;
	width: 0.875em;
	text-align: center;
}

/* A long Norwegian label wraps inside its chip instead of widening the row. */
.group-chips .chip-name {
	min-width: 0;
	overflow-wrap: break-word;
}

.group-chips .chip-count {
	flex: none;
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
}

.group-chips button[aria-pressed="true"] {
	padding-inline: 10px;
	border-color: var(--accent);
	background: var(--accent);
	color: var(--accent-text);
}

.group-chips button[aria-pressed="true"] .chip-count {
	color: inherit;
}
```

Then add the chip to the shared state lists, each as its own line (Biome keeps one selector per line):

- Transition list at the top of the hover section: `.group-chips button,` after `.tiles a,`.
- `(hover: hover)` lift list: `.group-chips button:not([aria-pressed="true"]):hover,` after `.tiles button:not([aria-pressed="true"]):hover,`.
- `(hover: hover)` "Preview" border list: `.group-chips button:not([aria-pressed="true"]):hover,` before `.tiles button:not([aria-pressed="true"]):hover,`.
- `(hover: none)` press list: `.group-chips button:not([aria-pressed="true"]):active,` after `.tiles button:not([aria-pressed="true"]):active,`.
- Focus lift list ("Focus is the hover lift plus the pink outline"): `.group-chips button:not([aria-pressed="true"]):focus-visible,` after `.tiles button:not([aria-pressed="true"]):focus-visible,`.
- Pink-surface ring list ("Pink is focus everywhere except on the three pink surfaces"): append `.group-chips button[aria-pressed="true"]:focus-visible` as the **last** selector, and change "three" to "four" in its comment.
- Forced colours, the pressed rule and its focus rule: add `.group-chips button[aria-pressed="true"],` and `.group-chips button[aria-pressed="true"]:focus-visible,` as the **first** selector of each. `src/styles/search.test.ts` matches `.tiles ...` followed by `.tracker .search-toggle ...` in those two rules, so nothing may go between them.

- [ ] **Step 6: Run to see them pass**

Run: `npx vitest run src/islands/tracker/GroupChips.test.tsx src/styles src/i18n/copy.test.ts`
Expected: PASS, including `hover.test.ts` and `search.test.ts`.

- [ ] **Step 7: Commit**

```bash
F="src/islands/tracker/GroupChips.tsx src/islands/tracker/GroupChips.test.tsx src/styles/global.css src/styles/tracker-refresh.test.ts src/locales/en.json src/locales/nb.json src/i18n/copy.test.ts"
npx biome check --write $F && sed -i 's/\r$//' $F && git add $F
git commit -m "Add the group chip row with whole-group counts and a pressed tick"
```

### Task 17: Chips in the list and the island

**Files:**
- Modify: `src/islands/tracker/ItemList.tsx`, `src/islands/Tracker.tsx`, `src/islands/useTracker.ts`, `src/locales/en.json`, `src/locales/nb.json`
- Test: `src/islands/Tracker.groups.test.tsx` (new), `src/islands/Tracker.search.test.tsx`

**Interfaces:**
- Consumes: `chipGroups`, `parseGroups`, `groupParam`, `Tracker.toggleGroup`, `TrackerState.groups` (Task 14); `SearchChange.groups` (Task 15); `GroupChips` (Task 16); PR 2's `LastFound` and `jumpable`.
- Produces: `ItemList` props gain `order: string[]`, `chips: Map<string, string[]>`, `groups: string[]`, `onToggleGroup: (key: string) => void`. `useGroupParam(groups: string[]): void` in `useTracker.ts`. `Tracker.tsx`'s `showAllCategories` becomes `clearFilters`.

- [ ] **Step 1: Write the failing island tests**

`src/islands/Tracker.groups.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

beforeEach(resetBrowser)

// Vehicles has one group (Bikes), so it never gets chips. Wildlife has Birds (Pelican) and
// Reptiles (American alligator); birds sort first, so the Pelican's card comes first.
const ready = () => renderReady(<Tracker locale="en" />)
const names = () => screen.queryAllByRole("checkbox").map((box) => box.getAttribute("id"))
const button = (name: RegExp | string) => screen.getByRole("button", { name })
const press = (name: RegExp | string) => fireEvent.click(button(name))
const chipRow = () => screen.queryByRole("group", { name: "Groups: Wildlife" })
const groupParam = () => new URLSearchParams(window.location.search).get("group")
const type = (value: string) =>
	fireEvent.change(screen.getByRole("searchbox"), { target: { value } })
const status = () => screen.getByRole("status")
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("Group chips (tracker refresh spec §14.1)", () => {
	it("shows chips under a pressed category with more than one group, never under All", async () => {
		await ready()
		expect(screen.queryByRole("group", { name: /^Groups:/ })).toBeNull()
		press(/^Wildlife,/)
		press(/^Vehicles,/)
		const row = chipRow() as HTMLElement
		expect(within(row).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
			"Birds, 0 of 1",
			"Reptiles, 0 of 1",
		])
		expect(screen.queryByRole("group", { name: "Groups: Vehicles" })).toBeNull()
	})

	it("narrows only its own category and mirrors the chips to ?group=", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(button(/^Birds,/)).toHaveAttribute("aria-pressed", "true")
		expect(groupParam()).toBe("wildlife/birds")
		press(/^Vehicles,/)
		expect(names()).toEqual(["item-vehicles/bike", "item-wildlife/pelican"])
	})

	it("drops a category's chips when it is unpressed", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		press(/^Wildlife,/)
		expect(groupParam()).toBeNull()
		press(/^Wildlife,/)
		expect(button(/^Birds,/)).toHaveAttribute("aria-pressed", "false")
		expect(names()).toEqual(["item-wildlife/pelican", "item-wildlife/american-alligator"])
	})

	it("counts whole groups on the chips while a search narrows the list", async () => {
		await ready()
		press(/^Wildlife,/)
		type("peli")
		expect(button("Reptiles, 0 of 1")).toBeInTheDocument()
	})

	it("reads ?group= on load and drops keys no chip offers", async () => {
		window.history.replaceState(
			null,
			"",
			"/en/tracker/?show=wildlife&group=wildlife/birds,vehicles/bikes,evil"
		)
		render(<Tracker locale="en" />)
		const box = await screen.findByRole("checkbox", { name: "Pelican" })
		await waitFor(() => expect(box).toBeEnabled())
		expect(names()).toEqual(["item-wildlife/pelican"])
		expect(groupParam()).toBe("wildlife/birds")
	})

	it("keeps the title and chips when a press empties the view, with focus on the chip (R17)", async () => {
		await ready()
		press(/^Wildlife,/)
		type("zzz")
		expect(chipRow()).not.toBeNull()
		expect(screen.getByText('No match for "zzz".')).toBeInTheDocument()
		const birds = button(/^Birds,/)
		birds.focus()
		fireEvent.click(birds)
		fireEvent.click(birds)
		// Unpressing the last chip under a search with no match: the row stays, the node is the same.
		expect(chipRow()).not.toBeNull()
		expect(screen.getByRole("heading", { name: "Wildlife" })).toBeInTheDocument()
		expect(birds).toHaveFocus()
	})

	it("points to a match a chip hides, and Clear filters clears tiles and chips", async () => {
		await ready()
		press(/^Wildlife,/)
		press(/^Birds,/)
		type("gator")
		expect(names()).toEqual([])
		expect(screen.getByText("1 more outside your filters")).toBeInTheDocument()
		press("Clear filters")
		expect(button(/^All,/)).toHaveAttribute("aria-pressed", "true")
		expect(groupParam()).toBeNull()
		expect(names()).toEqual(["item-wildlife/american-alligator"])
		expect(document.activeElement).toBe(screen.getByRole("searchbox"))
		expect(screen.getByRole("searchbox")).toHaveValue("gator")
		expect(status()).toHaveTextContent("1 result")
	})

	it("lets a chip toggle cancel a pending result", async () => {
		await ready()
		press(/^Wildlife,/)
		type("peli")
		press(/^Birds,/)
		await wait(700)
		expect(status()).not.toHaveTextContent("1 result")
	})

	it("shows Last found as plain text when a chip hides its card", async () => {
		await ready()
		fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: /^Last found Pelican/ })
		press(/^Wildlife,/)
		press(/^Reptiles,/)
		expect(screen.queryByRole("button", { name: /^Last found/ })).toBeNull()
		expect(document.querySelector(".last-found")?.tagName).toBe("P")
	})
})
```

In `src/islands/Tracker.search.test.tsx`, rewrite the old copy (spec §14.1):

- The test "points to other categories and shows them all on request" becomes "points to matches outside the filters and clears them on request"; its text is `"1 more outside your filters"` and its button `"Clear filters"`.
- The test "announces the other categories when the chips hold no match" becomes "announces the matches outside the filters"; its text is `"No results inside your filters. 1 outside them."`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/islands/Tracker.groups.test.tsx src/islands/Tracker.search.test.tsx`
Expected: FAIL, no chip row and the old copy.

- [ ] **Step 3: The reworded copy**

`src/locales/en.json`:

```json
	"tracker.search.elsewhere.one": "1 more outside your filters",
	"tracker.search.elsewhere.other": "{count} more outside your filters",
	"tracker.search.showAll": "Clear filters",
```

```json
	"tracker.search.resultsElsewhere": "No results inside your filters. {count} outside them.",
```

`src/locales/nb.json`:

```json
	"tracker.search.elsewhere.one": "1 til utenfor filtrene dine",
	"tracker.search.elsewhere.other": "{count} til utenfor filtrene dine",
	"tracker.search.showAll": "Fjern filtrene",
```

```json
	"tracker.search.resultsElsewhere": "Ingen treff innenfor filtrene dine. {count} utenfor.",
```

- [ ] **Step 4: `useGroupParam` in `src/islands/useTracker.ts`**

Replace `useShowParam` with a shared hook and the two callers (R21):

```ts
import { useEffect, useSyncExternalStore } from "react"
import { groupParam, showParam, type Tracker, type TrackerState } from "../model/tracker"
```

```ts
// Always re-serialised from state; the raw parameter is never echoed back. Keyed on the string,
// so a new array with the same content writes nothing.
function useSearchParam(name: string, value: string | null): void {
	useEffect(() => {
		const url = new URL(window.location.href)
		if (value) url.searchParams.set(name, value)
		else url.searchParams.delete(name)
		window.history.replaceState(null, "", url)
	}, [name, value])
}

/** Mirrors the category selection to `?show=`. Tracker page only. */
export function useShowParam(selected: string[]): void {
	useSearchParam("show", showParam(selected))
}

/** Mirrors the group chips to `?group=`, beside `?show=` (spec §14.1). Tracker page only. */
export function useGroupParam(groups: string[]): void {
	useSearchParam("group", groupParam(groups))
}
```

- [ ] **Step 5: `ItemList` renders the chips**

In `src/islands/tracker/ItemList.tsx`, add `import { GroupChips } from "./GroupChips"`, and to `Props`:

```ts
	/** Every category id in seed order, so a category with no card left keeps its place. */
	order: string[]
	/** Per pressed category, its chip groups (`chipGroups`); empty under All. */
	chips: Map<string, string[]>
	/** Pressed chips as `groupKey`s. */
	groups: string[]
	onToggleGroup: (key: string) => void
```

Destructure the four. Replace the `live` / early-return lines with:

```tsx
	const live = items.filter((item) => !item.retired)
	const withCards = new Set(categoryIds(live))
	// A category with a chip row keeps its title and chips when no card is left (R17), so a chip
	// press never unmounts the chip that has focus.
	const sections = order.filter((id) => withCards.has(id) || chips.has(id))
	if (sections.length === 0) return <p className="item-empty">{t("tracker.empty")}</p>
```

Change `{categoryIds(live).map((category) => {` to `{sections.map((category) => {`, and add `const chipRow = chips.get(category)` beside `const Icon = ...`. After the closing `</div>` of `.cat-head`:

```tsx
						{chipRow && (
							<GroupChips
								category={category}
								categoryLabel={categoryLabel(category)}
								groups={chipRow}
								pressed={groups}
								counts={groupCounts}
								groupLabel={groupLabel}
								onToggle={onToggleGroup}
								t={t}
							/>
						)}
```

Wrap the existing `<div className="item-groups">...</div>` in `{withCards.has(category) && (...)}`, so a category with no card renders only its title and chips.

- [ ] **Step 6: Wire `Tracker.tsx`**

Imports:

```ts
import { chipGroups, parseGroups, parseShow } from "../model/tracker"
```

```ts
import { useGroupParam, useShowParam, useTrackerState } from "./useTracker"
```

The tracker, reading `?group=` after `?show=`:

```tsx
	const [tracker] = useState(() => {
		const selected = parseShow(window.location.search, categoryIds(seedItems))
		return buildTracker(
			t("profile.defaultName"),
			selected,
			parseGroups(window.location.search, chipGroups(seedItems, selected))
		)
	})
	const state = useTrackerState(tracker)
	useShowParam(state.selected)
	useGroupParam(state.groups)
```

After `selectCategories`:

```tsx
	// A chip toggle cancels a pending typing result, as a tile does. The list change itself is not
	// announced: aria-pressed carries the state (spec §14.1).
	function toggleGroup(key: string) {
		live.cancel()
		tracker.toggleGroup(key)
	}
```

Replace `showAllCategories` with:

```tsx
	// Clears the tiles and the chips together (the model drops chips with their category); Hide
	// found and the query stay. The button disappears with its line, so focus goes to the field
	// rather than to <body>.
	function clearFilters() {
		tracker.selectCategories([])
		searchField.current?.focus()
		live.say(resultsText(search.viewFor({ selected: [], groups: [] }), search.query))
	}
```

In the `emptyText` comment, "the other-categories line" becomes "the outside-your-filters line". Beside `const empty = ...`, add `const chips = chipGroups(state.items, state.selected)`. Change the list's condition and props:

```tsx
					{/* A chip row keeps its category on screen when no card is left (R17). */}
					{(empty === "none" || chips.size > 0) && (
						<ItemList
```

and add, after `groupCounts={...}`:

```tsx
							order={categories.map((c) => c.id)}
							chips={chips}
							groups={state.groups}
							onToggleGroup={toggleGroup}
```

The elsewhere button's `onClick={showAllCategories}` becomes `onClick={clearFilters}`.

- [ ] **Step 7: Run every test**

Run: `npm test`
Expected: all green, including `Tracker.tick.test.tsx` (its `ItemList` mock passes props through).

- [ ] **Step 8: Commit**

```bash
F="src/islands/tracker/ItemList.tsx src/islands/Tracker.tsx src/islands/useTracker.ts src/locales/en.json src/locales/nb.json src/islands/Tracker.groups.test.tsx src/islands/Tracker.search.test.tsx"
npx biome check --write $F && sed -i 's/\r$//' $F && grep -n '\\u00' src/locales/nb.json; git add $F
git commit -m "Show group chips under pressed categories and let Clear filters reset them"
```

### Task 18: Verify and ship PR 3

- [ ] **Step 1: Full checks**

```bash
npm test && npx biome ci . && npm run check && npm run build
```

Expected: all green.

- [ ] **Step 2: Serve and measure, one batched round** (built site as in Task 6 Step 2, pointed at this worktree; 320, 768, 1024, 1280, 1600 and 1920 px; `en` and `nb`; then 320 px with 200 % text). Open `/en/tracker/?show=vehicles,wildlife&group=vehicles/cars` so Vehicles shows its full row with one chip pressed.

```js
const chips = [...document.querySelectorAll(".group-chips button")]
const box = (el) => el.getBoundingClientRect()
const lines = Object.values(Object.groupBy(chips, (c) => Math.round(box(c).top)))
const row = document.querySelector(".group-chips")
const head = row.closest(".item-category").querySelector(".cat-head")
const firstGroup = row.closest(".item-category").querySelector(".group-head")
;({
	minHeight: Math.min(...chips.map((c) => box(c).height)),
	oneHeightPerLine: lines.every((l) => new Set(l.map((c) => Math.round(box(c).height))).size === 1),
	pageOverflow: document.documentElement.scrollWidth - innerWidth,
	rowOverflow: row.scrollWidth - row.clientWidth,
	aboveRow: Math.round(box(row).top - box(head).bottom),
	belowRow: firstGroup ? Math.round(box(firstGroup).top - box(row).bottom) : null,
})
```

Expected: `minHeight` 44 or more; `oneHeightPerLine` true; both overflows 0; `aboveRow` 28; `belowRow` 24.

Equal width (R19, Review Focus PR 3 item 2): read every chip's `box(c).width`, click an unpressed chip, read again. Every width matches within 0.5 px and no chip changes line (`top` unchanged).

Long labels: on `/nb/tracker/?show=vehicles,wildlife` at 320 px with 200 % text, no chip is wider than its row and `pageOverflow` stays 0.

- [ ] **Step 3: Forced colours, keyboard, layout shift**

As Task 6 Steps 4 and 5, plus: in forced colours a pressed chip shows `Highlight` with its ✓ and an unpressed one keeps a visible border; Tab runs tiles, Last found, then the chips in order, then the cards; Space toggles a chip and focus stays on it. CLS 0 at all six widths on a load with `?show=` and `?group=`, and none on a chip press (a shift right after input is excluded, but the width check above should show none anyway).

- [ ] **Step 4: Push and open**

```bash
git push -u origin feat/tracker-refresh-chips
gh pr create --title "Add group chips under pressed tracker categories" --body-file -
```

PR body:

```markdown
Group chips for the tracker (spec `docs/superpowers/specs/2026-11-03-tracker-refresh-design.md`, §14.1).

Vehicles holds 148 items in 7 groups, so an open category still meant a long scroll. Now every pressed category shows a row of chips under its title, one per group, with the whole group's count.

- Chips are multi-select toggles like the tiles. None pressed shows the whole category; pressing Cars shows only cars there and leaves the other pressed categories alone.
- Pressed chips are pink with a ✓, so the state is never told by colour alone. A chip keeps its width when pressed, so the row never jumps under the finger.
- The selection lives in `?group=` beside `?show=`, so a shared link opens the same view. Unknown keys are dropped.
- A search match hidden by a chip counts in the line under the list, which now reads "1 more outside your filters" with a Clear filters button that resets tiles and chips together.
- Hide found, the Last found row and the announcements all respect the chips.

Checked: tests, Biome, astro check and the build; chip height, wrapping and spacing at 320, 768, 1024, 1280, 1600 and 1920 px in English and Norwegian and at 320 px with 200 % text; equal chip width pressed and unpressed; forced colours; keyboard order; CLS 0 at all six widths.
```

- [ ] **Step 5: Merge when green, before Tuesday 10.11.2026**

Bind the PR with the ccd_pr tools, read CI, merge once green. If it is not green by 10.11, it waits until after launch week (spec §1); say so to her rather than forcing it.

---

## Considered and rejected (stress test, 03.11.2026)

- **Both minute ticks run while their component is hidden.** The rail ticks below 1024 px and the Last found row from 1024 px, because each is hidden with CSS, not unmounted. A re-render a minute of five small rows costs nothing measurable, and unmounting by breakpoint would need a `matchMedia` hook.
- **`relativeTime` builds an `Intl.RelativeTimeFormat` on every call.** That is six calls a minute at most. Caching per locale adds state for no visible gain.
- **`initial()` throws on an invalid language tag.** The tag comes from my own `<html lang>`, which is only ever `en` or `nb`.
- **The tile's accessible name joins label and count with a literal ", ".** The punctuation is the same in both shipped languages; a copy key for a comma is noise.
- **Phones lose the rail's link to the hub.** The tab bar's Dashboard tab reaches the hub on every page, and the spec removes the rail below 1024 px on purpose (§3.1).
- **The Last found row turning from a button into text while focused.** Only the search field, the tiles and Hide found change what is visible, and each holds focus itself; there is no cross-tab sync that could change it under the row.

> Stress-tested 2026-11-03 (skill b9705f6): 2 applied, 1 adapted, 0 decided by me.
