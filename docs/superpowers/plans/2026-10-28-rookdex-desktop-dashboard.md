# Desktop dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the hub a full-page 12-column layout from 1024 px, rename Home to Dashboard, and add a tickable before-launch checklist on every screen size.

**Architecture:** One component tree at every width. CSS places the blocks and hides the desktop-only ones below 1024 px, and the phone-only ones from 1024 px. The grid container is the hub's own state element (`.hub-prelaunch` before launch, `section.hub-dashboard` after). `.dashboard` becomes `display: contents` from 1024 px, so blocks from `Hub` (news, link tiles) and from the lazy `Dashboard` chunk sit in one grid. News and link tiles live in `Hub` because they must render when the chunk fails (spec §7). Before-launch blocks come from build-time props and import only types from the model, so the tracker chunk still loads only after launch.

**Tech Stack:** Astro 7 (static, `client:load` island), React 19, TypeScript, Vitest + Testing Library + `vitest-axe` + fake-indexeddb, plain CSS in `src/styles/global.css`, Biome.

**Spec:** `docs/superpowers/specs/2026-10-27-rookdex-desktop-dashboard-design.md` (read it before each task; section numbers below point into it). The phone dashboard spec `docs/superpowers/specs/2026-10-14-rookdex-dashboard-design.md` still governs everything below 1024 px.

## Global Constraints

- Breakpoints: grid from `min-width: 1024px`, wide step from `min-width: 1200px`, `.wrap.wide` caps at `85rem` (1360 px) from `min-width: 1600px`. Other pages keep `72rem`. Mobile-first: only `min-width` queries.
- No layout change below 1024 px apart from the checklist (straight after the countdown, before launch only) and the tab name.
- **CSP is `style-src 'self'`** (`astro.config.mjs`). Server-rendered markup must never carry a `style` attribute. Before-launch components (server-rendered through `client:load`) set inline styles only after mount, through React (CSSOM). The lazy `Dashboard` chunk is client-only, so its inline styles are fine.
- **Split bundle:** `Hub.tsx`, `Hero.tsx`, `CategoryBars.tsx`, `NewsTile.tsx`, `LinkTiles.tsx`, `ExternalTile.tsx`, `PrelaunchChecklist.tsx`, `Chev.tsx` import from `../../model/seed`, `../../model/stats`, `../../model/dashboard` and `../../model/tracker` with `import type` only.
- No new dependencies. No charts library. No Rockstar map image, screenshot or trace.
- Every link, checkbox row and tile is at least 44 px (`var(--tap)`) tall. Controls side by side share one height and one bottom edge.
- Reserved heights are `min-height` in `rem`. Nothing that holds text gets a fixed height or `overflow: hidden`; only the art layers clip.
- No `transition` on the bars or the chart. Every `:hover` rule sits inside `@media (hover: hover)` and uses `--bg-hover` (`src/styles/hover.test.ts`). No raw hex outside `tokens.css` (`src/styles/tokens.test.ts`).
- Text on pink: `--accent` surface, `--accent-text` letters. Cyan (`--link`) is for links only.
- Copy goes into both `src/locales/en.json` and `src/locales/nb.json` (`copy.test.ts` keeps the key sets equal). No `!`, no "leak". No em dashes in copy, comments or docs.
- localStorage key: `rookdex.prelaunch-checklist`, a JSON array of ids from `edition`, `preload`, `space`, `first-hour`, `install`.
- Map link: `MAP_LINK.url` must be `https://` on `rockstargames.com` or a subdomain of it.
- Code, comments and commit messages in English, written in first person where a voice is needed. No AI attribution in commits.
- Line endings: the main checkout is CRLF-prone. Before `git add`, run `sed -i 's/\r$//' <files>` on every file you touched with an editor that may write CRLF.

**Spec gaps settled in this plan (deviations to note in the PR):**
- The News page has no Confirmed/Rumour chips today. The news tile reuses `facts.title` ("Confirmed" / "Bekreftet") and adds one key, `hub.chipRumour` ("Rumour" / "Rykte"), plus a small `.news-chip` style.
- The guide tile needs a label. New key `hub.guideLabel` ("Guide" / "Guide"). The settings tile reuses `nav.settings` as its label.
- `hub.countdownLabel` is not added: it would duplicate `hub.countdownHeading` ("Launch countdown"), which the hero reuses as its label.
- `hub.nothingYet` and `hub.nothingYetBody` are not added: the chosen before-launch grid (spec §4.1) has no Recent finds area, so nothing would show them.
- Guide titles ("Before you start", "Your first hour") come from the guides' frontmatter, so `index.astro` passes them to the hub as props.
- The hero's "17 / 43 found" is a paragraph; the three label-value pairs are the `dl` (spec §9).

## Review Focus

1. **The hub flips at midnight with focus inside the checklist.** Focus should land on the dashboard heading, not on `body`. Pinned in Task 8 (Hub test).
2. **Server HTML carries a `style` attribute** (a segment width or a bar fill rendered on the server). The CSP blocks it and the console fills with violations. Pinned in Task 8 (`renderToString` test).
3. **A tick in a second tab is lost** when the first tab writes its own tick from stale state. Read-before-write keeps both. Pinned in Task 3 (storage) and Task 7 (component).
4. **Finds by day across the 25 October daylight-saving change** skips or repeats a day if it steps by 24 hours. Pinned in Task 2.
5. **The installed app** shows the install row as ticked and disabled, and never stores that tick. Pinned in Task 7.
6. **A filled page alert covers the hero** if it shares the hero's grid row. It gets its own `alert` row (Task 10); Task 11 measures it with a forced message.

---

### Task 1: Copy keys and the Dashboard tab

**Files:**
- Modify: `src/model/tabs.ts`, `src/model/tabs.test.ts`
- Modify: `src/components/TabIcon.astro:25`
- Create: `src/components/TabBar.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json`

**Interfaces:**
- Produces: `TABS = ["dashboard", "tracker", "news", "settings"]`, `Tab` includes `"dashboard"`, `TAB_PATHS.dashboard === ""`. Every copy key listed in Step 5 exists in both bundles. Later tasks call `t()` with these keys.

- [ ] **Step 1: Write the failing tests**

In `src/model/tabs.test.ts` change the first table row:

```ts
		["", "dashboard"],
```

Create `src/components/TabBar.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import TabBar from "./TabBar.astro"

describe("TabBar (desktop dashboard spec §4.9)", () => {
	it.each([
		["en", "Dashboard"],
		["nb", "Dashbord"],
	])("names the first tab in %s", async (locale, label) => {
		const doc = await renderDoc(TabBar, { props: { locale, current: "dashboard" } })
		const first = doc.querySelector(".tabbar li:first-child a")
		expect(first?.textContent?.trim()).toBe(label)
		expect(first?.getAttribute("aria-current")).toBe("page")
		expect(first?.querySelector("svg path")).not.toBeNull()
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/model/tabs.test.ts src/components/TabBar.test.ts`
Expected: FAIL. `currentTab("")` returns `"home"`, and `nav.dashboard` is missing.

- [ ] **Step 3: Rename the tab**

`src/model/tabs.ts`:

```ts
export const TABS = ["dashboard", "tracker", "news", "settings"] as const
export type Tab = (typeof TABS)[number]

/** Route of each tab without the locale prefix, the same shape `Base.astro`'s `path` prop has. */
export const TAB_PATHS: Record<Tab, string> = {
	dashboard: "",
	tracker: "tracker",
	news: "news",
	settings: "settings",
}
```

`src/components/TabIcon.astro` line 25: `name === "home" &&` becomes `name === "dashboard" &&`. Same paths, same icon.

Also update the comment in `src/layouts/Base.astro:24` ("the 404 passes "" but is not Home") to say "Dashboard".

- [ ] **Step 4: Run `git grep -n '"home"\|nav\.home'` and fix every remaining hit in `src/`**

Expected after the fix: no hits in `src/` (docs may keep the word).

- [ ] **Step 5: Add and rename the copy keys**

In both bundles rename `nav.home` to `nav.dashboard`: `"Dashboard"` (en), `"Dashbord"` (nb). Then add these keys next to the other `hub.*` keys. Keep the files' existing key order style (grouped by prefix).

`en.json`:

```json
	"hub.foundOf": "/ {total} found",
	"hub.foundTodayLabel": "Found today",
	"hub.closestLabel": "Closest",
	"hub.categories": "Categories",
	"hub.left": "{count} left",
	"hub.toFind": "{count} to find",
	"hub.foundCount": "{done} of {total} found",
	"hub.latestFind": "Latest",
	"hub.noFindsYet": "No finds yet",
	"hub.noFindsBody": "Tick your first find in What's next and it lands here.",
	"hub.findsByDay": "Finds by day",
	"hub.findsOnDay": "{count} found on {date}",
	"hub.today": "Today",
	"hub.latestNews": "Latest news",
	"hub.chipRumour": "Rumour",
	"hub.mapLabel": "Map",
	"hub.mapTitle": "Leonida on Rockstar's site",
	"hub.mapBody": "Rockstar's official GTA VI site.",
	"hub.guideLabel": "Guide",
	"hub.guideBody": "Editions, preload, the first hour.",
	"hub.settingsTitle": "Language, updates, your data",
	"hub.settingsBody": "Install, check for updates, delete.",
	"hub.beforeLaunch": "Before launch",
	"hub.checklistDone": "{done} of {total} done",
	"hub.checklistNote": "Ticks stay on this device. The list goes away at launch, when the tracker takes over.",
	"hub.checklistNoStorage": "Your browser blocks storage here, so ticks last until you close the page.",
	"hub.check.edition": "Pick your edition",
	"hub.check.editionSub": "The guide compares them",
	"hub.check.preload": "Preload on 12 November",
	"hub.check.preloadSub": "Confirmed by Rockstar",
	"hub.check.space": "Free up console space",
	"hub.check.spaceSub": "News has the install size once Rockstar confirms it",
	"hub.check.firstHour": "Plan your first hour",
	"hub.check.firstHourSub": "The first-hour guide",
	"hub.check.install": "Install Rookdex",
	"hub.check.installSub": "Track finds offline on launch night",
	"hub.installed": "Installed",
	"hub.open": "Open",
	"hub.openPage": ": {page}",
```

`nb.json`:

```json
	"hub.foundOf": "/ {total} funnet",
	"hub.foundTodayLabel": "Funnet i dag",
	"hub.closestLabel": "Nærmest",
	"hub.categories": "Kategorier",
	"hub.left": "{count} igjen",
	"hub.toFind": "{count} å finne",
	"hub.foundCount": "{done} av {total} funnet",
	"hub.latestFind": "Sist funnet",
	"hub.noFindsYet": "Ingen funn ennå",
	"hub.noFindsBody": "Kryss av det første funnet under Neste, så havner det her.",
	"hub.findsByDay": "Funn per dag",
	"hub.findsOnDay": "{count} funnet {date}",
	"hub.today": "I dag",
	"hub.latestNews": "Siste nytt",
	"hub.chipRumour": "Rykte",
	"hub.mapLabel": "Kart",
	"hub.mapTitle": "Leonida på Rockstars nettsted",
	"hub.mapBody": "Rockstars offisielle nettsted for GTA VI.",
	"hub.guideLabel": "Guide",
	"hub.guideBody": "Utgaver, forhåndsnedlasting, den første timen.",
	"hub.settingsTitle": "Språk, oppdateringer, dataene dine",
	"hub.settingsBody": "Installer, se etter oppdateringer, slett.",
	"hub.beforeLaunch": "Før lansering",
	"hub.checklistDone": "{done} av {total} ferdig",
	"hub.checklistNote": "Avkrysningene blir på denne enheten. Listen forsvinner ved lansering, når Oversikt tar over.",
	"hub.checklistNoStorage": "Nettleseren blokkerer lagring her, så avkrysningene varer til du lukker siden.",
	"hub.check.edition": "Velg utgave",
	"hub.check.editionSub": "Guiden sammenligner dem",
	"hub.check.preload": "Forhåndslast 12. november",
	"hub.check.preloadSub": "Bekreftet av Rockstar",
	"hub.check.space": "Frigjør plass på konsollen",
	"hub.check.spaceSub": "Nyheter viser størrelsen når Rockstar bekrefter den",
	"hub.check.firstHour": "Planlegg den første timen",
	"hub.check.firstHourSub": "Guiden for den første timen",
	"hub.check.install": "Installer Rookdex",
	"hub.check.installSub": "Følg funnene uten nett på lanseringskvelden",
	"hub.installed": "Installert",
	"hub.open": "Åpne",
	"hub.openPage": ": {page}",
```

If `src/i18n/copy.test.ts` has a rule that flags a key (for example a digit rule on countdown templates), read the rule and fix the string, never the rule.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/model/tabs.test.ts src/components/TabBar.test.ts src/i18n`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
sed -i 's/\r$//' src/model/tabs.ts src/model/tabs.test.ts src/components/TabIcon.astro src/components/TabBar.test.ts src/layouts/Base.astro src/locales/en.json src/locales/nb.json
git add src/model/tabs.ts src/model/tabs.test.ts src/components/TabIcon.astro src/components/TabBar.test.ts src/layouts/Base.astro src/locales/en.json src/locales/nb.json
git commit -m "Rename the Home tab to Dashboard and add the desktop dashboard copy"
```

---

### Task 2: Model functions: latestNews, findsByDay, categoryRows

**Files:**
- Modify: `src/model/days.ts`, `src/model/days.test.ts`
- Modify: `src/model/dashboard.ts`, `src/model/dashboard.test.ts`

**Interfaces:**
- Produces (in `src/model/days.ts`): `addDays(key: string, n: number): string`.
- Produces (in `src/model/dashboard.ts`):
  - `interface NewsEntry { id: string; kind: "confirmed" | "rumour"; date: string; name: string | Fact["name"] }`
  - `latestNews(facts: Fact[], rumours: Rumour[], limit: number): NewsEntry[]`
  - `interface DayCount { day: string; count: number }`
  - `findsByDay(items: SeedItem[], records: Records, today: string, days: number): DayCount[]` (`today` is `YYYY-MM-DD`)
  - `interface CategoryRow { id: string; done: number; total: number; groups: string[] }`
  - `categoryRows(items: SeedItem[], records: Records): CategoryRow[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/model/days.test.ts` (it already stubs `TZ=Europe/Oslo` in its `beforeEach`; put the new `describe` inside the same file and reuse that setup, or add the same `beforeEach`/`afterEach` pair):

```ts
describe("addDays", () => {
	it("steps by calendar day across the October daylight-saving change", () => {
		expect(addDays("2026-10-25", -1)).toBe("2026-10-24")
		expect(addDays("2026-10-24", 1)).toBe("2026-10-25")
		expect(addDays("2026-10-26", -1)).toBe("2026-10-25")
	})

	it("crosses month and year ends", () => {
		expect(addDays("2026-11-01", -1)).toBe("2026-10-31")
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
	})
})
```

Add `addDays` to the file's import from `./days`.

Append to `src/model/dashboard.test.ts`, and add `categoryRows, findsByDay, latestNews` to the import from `./dashboard` and `Fact` to the type import from `./schema`:

```ts
function fact(id: string, announced: string): Fact {
	return {
		id,
		claim_key: id.split("/")[1],
		name: { en: `${id} en`, nb: `${id} nb` },
		summary: { en: "s", nb: "s" },
		announced,
		sources: [src],
	}
}
function rumour(id: string, added: string): Rumour {
	return { id, name: id, claim_key: id.split("/")[1], summary: "s", added, sources: [src] }
}

describe("latestNews", () => {
	it("merges facts and rumours newest first", () => {
		const news = latestNews(
			[fact("facts/a", "2026-10-01"), fact("facts/b", "2026-10-20")],
			[rumour("rumours/c", "2026-10-10"), rumour("rumours/d", "2026-10-25")],
			5
		)
		expect(news.map((n) => n.id)).toEqual(["rumours/d", "facts/b", "rumours/c", "facts/a"])
		expect(news[1]).toEqual({
			id: "facts/b",
			kind: "confirmed",
			date: "2026-10-20",
			name: { en: "facts/b en", nb: "facts/b nb" },
		})
		expect(news[0]).toEqual({
			id: "rumours/d",
			kind: "rumour",
			date: "2026-10-25",
			name: "rumours/d",
		})
	})

	it("puts Confirmed first on the same day, then orders by id", () => {
		const news = latestNews(
			[fact("facts/z", "2026-10-20")],
			[rumour("rumours/b", "2026-10-20"), rumour("rumours/a", "2026-10-20")],
			5
		)
		expect(news.map((n) => n.id)).toEqual(["facts/z", "rumours/a", "rumours/b"])
	})

	it("returns at most limit items, and nothing from nothing", () => {
		const many = Array.from({ length: 8 }, (_, n) => rumour(`rumours/r${n}`, `2026-10-1${n}`))
		expect(latestNews([], many, 5)).toHaveLength(5)
		expect(latestNews([], [], 5)).toEqual([])
	})
})

describe("findsByDay", () => {
	beforeEach(() => {
		vi.stubEnv("TZ", "Europe/Oslo")
	})
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("returns the last `days` local days ending today, oldest first, zero days kept", () => {
		const r = records({
			"wildlife/e": "2026-11-20T10:00:00Z",
			"wildlife/f": "2026-11-22T10:00:00Z",
			"vehicles/c": "2026-11-22T11:00:00Z",
		})
		expect(findsByDay(items, r, "2026-11-22", 7)).toEqual([
			{ day: "2026-11-16", count: 0 },
			{ day: "2026-11-17", count: 0 },
			{ day: "2026-11-18", count: 0 },
			{ day: "2026-11-19", count: 0 },
			{ day: "2026-11-20", count: 1 },
			{ day: "2026-11-21", count: 0 },
			{ day: "2026-11-22", count: 2 },
		])
	})

	it("counts a tick by its local calendar day, not its UTC day", () => {
		const r = records({ "wildlife/e": "2026-11-21T23:30:00Z" }) // 00:30 on 22 Nov in Oslo
		const days = findsByDay(items, r, "2026-11-22", 2)
		expect(days).toEqual([
			{ day: "2026-11-21", count: 0 },
			{ day: "2026-11-22", count: 1 },
		])
	})

	it("skips unticked records, retired items and records with no seed item", () => {
		const withRetired = [...items, item("wildlife/old", "g", { retired: true })]
		const r: Records = {
			...records({ "wildlife/old": "2026-11-22T10:00:00Z", "ghost/x": "2026-11-22T10:00:00Z" }),
			"wildlife/e": { ...found("2026-11-22T10:00:00Z"), item_id: "wildlife/e", done: false },
		}
		expect(findsByDay(withRetired, r, "2026-11-22", 1)).toEqual([{ day: "2026-11-22", count: 0 }])
	})

	it("returns 7 distinct days across the 25 October 2026 daylight-saving change", () => {
		const days = findsByDay(items, {}, "2026-10-28", 7).map((d) => d.day)
		expect(days).toEqual([
			"2026-10-22",
			"2026-10-23",
			"2026-10-24",
			"2026-10-25",
			"2026-10-26",
			"2026-10-27",
			"2026-10-28",
		])
	})
})

describe("categoryRows", () => {
	it("gives each category its total, found count and group ids in tracker order", () => {
		const grouped = [
			item("wildlife/e", "reptiles"),
			item("wildlife/f", "birds"),
			item("wildlife/g", "reptiles"),
			item("vehicles/c", "bikes"),
			item("wildlife/old", "fish", { retired: true }),
		]
		const r = records({ "wildlife/e": "2026-11-20T10:00:00Z" })
		expect(categoryRows(grouped, r)).toEqual([
			{ id: "vehicles", done: 0, total: 1, groups: ["bikes"] },
			{ id: "wildlife", done: 1, total: 3, groups: ["birds", "reptiles"] },
		])
	})
})
```

Note: `categoryIds` decides the category order; check `src/model/seed.ts:226` and adjust the expected order in the last test only if `categoryIds` orders differently than alphabetical. Never change `categoryIds`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/model/days.test.ts src/model/dashboard.test.ts`
Expected: FAIL with "addDays is not a function" / "latestNews is not exported".

- [ ] **Step 3: Implement**

Append to `src/model/days.ts`:

```ts
/** The key `n` calendar days after `key` (negative goes back). Steps by date, never by 24 hours,
 *  so a daylight-saving change can't skip or repeat a day (desktop dashboard spec §6.2). */
export function addDays(key: string, n: number): string {
	const date = dayFromKey(key)
	date.setDate(date.getDate() + n)
	return localDayKey(date)
}
```

In `src/model/dashboard.ts` change the import line to `import { addDays, localDayKey } from "./days"` and `import { categoryIds, groupItems } from "./seed"`, then append:

```ts
/** One row of the Latest news tile (desktop dashboard spec §4.6). A fact's name is per locale. */
export interface NewsEntry {
	id: string
	kind: "confirmed" | "rumour"
	date: string
	name: string | Fact["name"]
}

/** Facts by `announced` and rumours by `added`, newest first. Same day: Confirmed first, then id. */
export function latestNews(facts: Fact[], rumours: Rumour[], limit: number): NewsEntry[] {
	const entries: NewsEntry[] = [
		...facts.map((f) => ({ id: f.id, kind: "confirmed" as const, date: f.announced, name: f.name })),
		...rumours.map((r) => ({ id: r.id, kind: "rumour" as const, date: r.added, name: r.name })),
	]
	const rank = (kind: NewsEntry["kind"]) => (kind === "confirmed" ? 0 : 1)
	return entries
		.sort(
			(a, b) =>
				b.date.localeCompare(a.date) || rank(a.kind) - rank(b.kind) || a.id.localeCompare(b.id)
		)
		.slice(0, limit)
}

/** Finds on one local calendar day. */
export interface DayCount {
	day: string
	count: number
}

/**
 * Finds per local day for the `days` days ending on `today` (`YYYY-MM-DD`), oldest first, zero
 * days kept (desktop dashboard spec §6.2). Retired items and records with no seed item never count.
 */
export function findsByDay(
	items: SeedItem[],
	records: Records,
	today: string,
	days: number
): DayCount[] {
	const counts = new Map<string, number>()
	for (let n = days - 1; n >= 0; n--) counts.set(addDays(today, -n), 0)
	for (const item of countable(items)) {
		const record = records[item.id]
		if (record?.done !== true) continue
		const day = localDayKey(new Date(record.updated_at))
		const count = counts.get(day)
		if (count !== undefined) counts.set(day, count + 1)
	}
	return [...counts].map(([day, count]) => ({ day, count }))
}

/** One category bar: its counts and its group ids in tracker order (desktop dashboard spec §6.1). */
export interface CategoryRow {
	id: string
	done: number
	total: number
	groups: string[]
}

/** Every category in category order. The page calls it with no records for the before view. */
export function categoryRows(items: SeedItem[], records: Records): CategoryRow[] {
	const live = countable(items)
	const counts = perCategory(live, records)
	return categoryIds(live).map((id) => {
		const count = counts.find((c) => c.category === id) ?? { done: 0, total: 0 }
		const groups = [...groupItems(live.filter((item) => item.category === id)).keys()]
		return { id, done: count.done, total: count.total, groups }
	})
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/model`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
sed -i 's/\r$//' src/model/days.ts src/model/days.test.ts src/model/dashboard.ts src/model/dashboard.test.ts
git add src/model/days.ts src/model/days.test.ts src/model/dashboard.ts src/model/dashboard.test.ts
git commit -m "Add latestNews, findsByDay and categoryRows for the desktop dashboard"
```

---

### Task 3: Checklist storage, Delete all and the privacy note

**Files:**
- Modify: `src/islands/seenFlag.ts`
- Create: `src/islands/checklist.test.ts`
- Modify: `src/scripts/delete-all.ts`, `src/scripts/delete-all.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json` (`privacy.storedChoices`)
- Modify: `src/pages/[locale]/privacy.astro:17`
- Modify (only if it asserts the old sentence or date): `src/test/privacy-page.test.ts`

**Interfaces:**
- Produces (in `src/islands/seenFlag.ts`):
  - `CHECKLIST_KEY = "rookdex.prelaunch-checklist"`
  - `CHECKLIST_IDS = ["edition", "preload", "space", "first-hour", "install"] as const`
  - `type ChecklistId = (typeof CHECKLIST_IDS)[number]`
  - `readChecklist(): ChecklistId[] | null`, `null` when storage is blocked.
  - `writeChecklistItem(id: ChecklistId, ticked: boolean, current: ChecklistId[]): { list: ChecklistId[]; saved: boolean }`. `list` is the new list, in `CHECKLIST_IDS` order; `saved` is false when storage refused the write. `current` is what the island shows; it is used only when storage is blocked.

- [ ] **Step 1: Write the failing tests**

Create `src/islands/checklist.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CHECKLIST_KEY, readChecklist, writeChecklistItem } from "./seenFlag"

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe("readChecklist (desktop dashboard spec §5)", () => {
	it.each([
		["nothing stored", null],
		["garbage", "{not json"],
		["an object", '{"edition":true}'],
		["a string", '"edition"'],
		["unknown ids only", '["evil","preload-x"]'],
	])("reads %s as empty", (_name, raw) => {
		if (raw !== null) localStorage.setItem(CHECKLIST_KEY, raw)
		expect(readChecklist()).toEqual([])
	})

	it("keeps known ids and drops unknown ones and duplicates", () => {
		localStorage.setItem(CHECKLIST_KEY, '["space","evil","edition","space"]')
		expect(readChecklist()).toEqual(["edition", "space"])
	})

	it("reads blocked storage as null, so the island can say so", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError")
		})
		expect(readChecklist()).toBeNull()
	})
})

describe("writeChecklistItem", () => {
	it("round-trips a tick and an untick", () => {
		expect(writeChecklistItem("preload", true, [])).toEqual({ list: ["preload"], saved: true })
		expect(readChecklist()).toEqual(["preload"])
		expect(writeChecklistItem("preload", false, ["preload"])).toEqual({ list: [], saved: true })
		expect(readChecklist()).toEqual([])
	})

	it("reads storage again first, so a tick from another tab is kept", () => {
		localStorage.setItem(CHECKLIST_KEY, '["edition"]') // written by another tab
		expect(writeChecklistItem("space", true, []).list).toEqual(["edition", "space"])
		expect(JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "")).toEqual(["edition", "space"])
	})

	it("works from the shown list when storage is blocked, and never throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError")
		})
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError")
		})
		expect(writeChecklistItem("space", true, ["edition"])).toEqual({
			list: ["edition", "space"],
			saved: false,
		})
	})
})
```

In `src/scripts/delete-all.test.ts`, inside the existing "deletes the rookdex database, the language choice and the remembered profile…" test: set `localStorage.setItem(CHECKLIST_KEY, '["edition"]')` alongside the other keys it sets up, and assert `expect(localStorage.getItem(CHECKLIST_KEY)).toBeNull()` beside its other removal assertions. Import `CHECKLIST_KEY` from `../islands/seenFlag`. Rename the test title to "…the remembered profile and the before-launch list, and keeps the one-shot flags".

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/islands/checklist.test.ts src/scripts/delete-all.test.ts`
Expected: FAIL. `CHECKLIST_KEY` is not exported.

- [ ] **Step 3: Implement the storage**

Append to `src/islands/seenFlag.ts`:

```ts
/** The before-launch list's ticks (desktop dashboard spec §5). Up to five fixed ids, nothing else. */
export const CHECKLIST_KEY = "rookdex.prelaunch-checklist"
export const CHECKLIST_IDS = ["edition", "preload", "space", "first-hour", "install"] as const
export type ChecklistId = (typeof CHECKLIST_IDS)[number]

/** The stored ids in list order, or null when storage is blocked. Garbage reads as empty. */
export function readChecklist(): ChecklistId[] | null {
	let raw: string | null
	try {
		raw = localStorage.getItem(CHECKLIST_KEY)
	} catch {
		return null
	}
	try {
		const parsed: unknown = JSON.parse(raw ?? "[]")
		if (!Array.isArray(parsed)) return []
		return CHECKLIST_IDS.filter((id) => parsed.includes(id))
	} catch {
		return []
	}
}

/**
 * Ticks or unticks one id. Reads storage again first, so a tick made in another open tab is kept.
 * Blocked storage falls back to `current`, so ticks last until the page closes, and `saved` comes
 * back false so the island can say so. Never throws.
 */
export function writeChecklistItem(
	id: ChecklistId,
	ticked: boolean,
	current: ChecklistId[]
): { list: ChecklistId[]; saved: boolean } {
	const base = readChecklist() ?? current
	const list = CHECKLIST_IDS.filter((known) => (known === id ? ticked : base.includes(known)))
	try {
		localStorage.setItem(CHECKLIST_KEY, JSON.stringify(list))
		return { list, saved: true }
	} catch {
		return { list, saved: false }
	}
}
```

- [ ] **Step 4: Delete all removes the key**

In `src/scripts/delete-all.ts` import `CHECKLIST_KEY` beside `ACTIVE_PROFILE_KEY`, add `forget(CHECKLIST_KEY)` after `forget(ACTIVE_PROFILE_KEY)`, and extend the doc comment: "The language choice (`lang`), the remembered profile and the before-launch list go too, because all data means all (locale spec D9, dashboard spec §5, desktop dashboard spec §5)."

- [ ] **Step 5: Privacy copy and date**

Run `date +"%Y-%m-%d %A"` first and use that day.

`en.json` `privacy.storedChoices`:

```
Which profile is active, the language you picked, which items you ticked on the before-launch list, and two notes that a message was already shown: the install prompt and the storage hint (localStorage). If you choose \"update later\", that is kept only until you close the tab (sessionStorage).
```

`nb.json` `privacy.storedChoices`:

```
Hvilken profil som er aktiv, språket du valgte, hvilke punkter du krysset av på listen før lansering, og to merknader om at en melding allerede er vist: installeringsforslaget og lagringstipset (localStorage). Velger du «oppdater senere», huskes det bare til du lukker fanen (sessionStorage).
```

`src/pages/[locale]/privacy.astro:17`: `const UPDATED = new Date("<today>T00:00:00Z")` with today's date from the `date` command.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/islands/checklist.test.ts src/scripts src/test/privacy-page.test.ts src/i18n`
Expected: PASS. If `privacy-page.test.ts` pins the old date or sentence, update the pinned value to the new one.

- [ ] **Step 7: Commit**

```bash
sed -i 's/\r$//' src/islands/seenFlag.ts src/islands/checklist.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/locales/en.json src/locales/nb.json "src/pages/[locale]/privacy.astro"
git add src/islands/seenFlag.ts src/islands/checklist.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/locales/en.json src/locales/nb.json "src/pages/[locale]/privacy.astro"
git add src/test/privacy-page.test.ts 2>/dev/null; git commit -m "Store before-launch ticks, delete them with all data, and name them in the privacy note"
```

---

### Task 4: MAP_LINK config

**Files:**
- Create: `src/config/map-link.ts`, `src/config/map-link.test.ts`

**Interfaces:**
- Produces: `MAP_LINK: { url: string; label: "hub.mapLabel"; title: "hub.mapTitle"; body: "hub.mapBody" }` and `isRockstarUrl(url: string): boolean`.

- [ ] **Step 1: Write the failing test**

`src/config/map-link.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { isRockstarUrl, MAP_LINK } from "./map-link"

describe("MAP_LINK (desktop dashboard spec §4.7)", () => {
	it("ships an https link on rockstargames.com", () => {
		expect(isRockstarUrl(MAP_LINK.url)).toBe(true)
	})

	it.each([
		"http://www.rockstargames.com/VI",
		"https://rockstargames.com.evil.example/VI",
		"https://evilrockstargames.com/VI",
		"https://www.rockstargames.co/VI",
		"javascript:alert(1)",
		"not a url",
	])("rejects %s", (url) => {
		expect(isRockstarUrl(url)).toBe(false)
	})

	it("accepts the bare domain and its subdomains", () => {
		expect(isRockstarUrl("https://rockstargames.com/")).toBe(true)
		expect(isRockstarUrl("https://www.rockstargames.com/VI")).toBe(true)
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/config/map-link.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/config/map-link.ts`:

```ts
// The dashboard's map card (desktop dashboard spec §4.7). It links out to Rockstar and never shows
// their map. When Rockstar publishes an official web map, change this entry and nothing else.
export const MAP_LINK = {
	url: "https://www.rockstargames.com/VI",
	label: "hub.mapLabel",
	title: "hub.mapTitle",
	body: "hub.mapBody",
} as const

/** True only for https:// on rockstargames.com or a subdomain, so a typo or lookalike can't ship. */
export function isRockstarUrl(url: string): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return false
	}
	const host = parsed.hostname
	return (
		parsed.protocol === "https:" &&
		(host === "rockstargames.com" || host.endsWith(".rockstargames.com"))
	)
}
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/config/map-link.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
sed -i 's/\r$//' src/config/map-link.ts src/config/map-link.test.ts
git add src/config/map-link.ts src/config/map-link.test.ts
git commit -m "Add the map card's link config with an https rockstargames.com check"
```

---

### Task 5: Link tiles and the news tile

**Files:**
- Create: `src/islands/hub/Chev.tsx`
- Create: `src/islands/hub/ExternalTile.tsx`, `src/islands/hub/LinkTiles.tsx`, `src/islands/hub/NewsTile.tsx`
- Create: `src/islands/hub/LinkTiles.test.tsx`, `src/islands/hub/NewsTile.test.tsx`
- Modify: `src/styles/global.css` (tile, link-tile and news-tile styles, appended in a new "Desktop dashboard" block before the `@media (min-width: 768px)` block)

**Interfaces:**
- Consumes: copy keys from Task 1, `MAP_LINK` shape from Task 4 (the hub passes `mapLink` as a plain string).
- Produces:
  - `Chev(): JSX.Element`, an `aria-hidden` right chevron with class `row-chevron`.
  - `ExternalTile({ href, label, title, body, t })` (all strings except `t: Translate`). Throws when `href` doesn't start with `https://`.
  - `LinkTiles({ mapLink, guideHref, guideTitle, settingsHref, t })`
  - `interface NewsItem { id: string; kind: "confirmed" | "rumour"; name: string; date: string }`
  - `NewsTile({ news, today, locale, newsHref, t })`, returns `null` when `news` is empty.

- [ ] **Step 1: Write the failing tests**

`src/islands/hub/LinkTiles.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { ExternalTile } from "./ExternalTile"
import { LinkTiles } from "./LinkTiles"

const { t } = translator("en")
const tiles = () =>
	render(
		<LinkTiles
			mapLink="https://www.rockstargames.com/VI"
			guideHref="/en/guides/before-you-start/"
			guideTitle="Before you start"
			settingsHref="/en/settings/"
			t={t}
		/>
	)

describe("LinkTiles (desktop dashboard spec §4.7)", () => {
	it("renders three links, each named by its title first", () => {
		tiles()
		const links = screen.getAllByRole("link")
		expect(links).toHaveLength(3)
		expect(links[0]).toHaveAccessibleName(/^Leonida on Rockstar's site/)
		expect(links[1]).toHaveAccessibleName(/^Before you start/)
		expect(links[1]).toHaveAttribute("href", "/en/guides/before-you-start/")
		expect(links[2]).toHaveAccessibleName(/^Language, updates, your data/)
		expect(links[2]).toHaveAttribute("href", "/en/settings/")
	})

	it("has no axe violations", async () => {
		const { container } = tiles()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("ExternalTile", () => {
	it("opens in a new tab and carries the new-tab note the build check looks for", () => {
		tiles()
		const map = screen.getAllByRole("link")[0]
		expect(map).toHaveAttribute("target", "_blank")
		expect(map).toHaveAttribute("rel", "noopener noreferrer")
		const note = map.querySelector(".new-tab-note")
		expect(note).toHaveClass("visually-hidden")
		expect(note?.textContent).toBe(" (opens in a new tab)")
		expect(map).toHaveAccessibleName(/\(opens in a new tab\)$/)
	})

	it("refuses a link that isn't https", () => {
		expect(() =>
			render(<ExternalTile href="http://example.com" label="L" title="T" body="B" t={t} />)
		).toThrow(/https/)
	})
})
```

`src/islands/hub/NewsTile.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { type NewsItem, NewsTile } from "./NewsTile"

const { t } = translator("en")
const news: NewsItem[] = [
	{ id: "rumours/a", kind: "rumour", name: "Online in 2027", date: "2026-11-22" },
	{ id: "facts/b", kind: "confirmed", name: "Preload on 12 November", date: "2026-11-20" },
]
const tile = (items = news) =>
	render(<NewsTile news={items} today="2026-11-22" locale="en" newsHref="/en/news/" t={t} />)

describe("NewsTile (desktop dashboard spec §4.6)", () => {
	it("lists the items in the order given, each with its chip and a link to its News section", () => {
		tile()
		const section = screen.getByRole("region", { name: "Latest news" })
		const rows = within(section).getAllByRole("listitem")
		expect(rows.map((r) => r.querySelector(".news-chip")?.textContent)).toEqual([
			"Rumour",
			"Confirmed",
		])
		expect(within(rows[0]).getByRole("link", { name: "Online in 2027" })).toHaveAttribute(
			"href",
			"/en/news/#rumours"
		)
		expect(within(rows[1]).getByRole("link", { name: "Preload on 12 November" })).toHaveAttribute(
			"href",
			"/en/news/#confirmed"
		)
		expect(within(section).getByRole("link", { name: "All news" })).toHaveAttribute(
			"href",
			"/en/news/"
		)
	})

	it("writes relative dates after mount", () => {
		tile()
		const times = screen.getAllByRole("listitem").map((r) => r.querySelector("time")?.textContent)
		expect(times).toEqual(["today", "2 days ago"])
	})

	it("renders nothing with no items", () => {
		const { container } = tile([])
		expect(container).toBeEmptyDOMElement()
	})

	it("has no axe violations", async () => {
		const { container } = tile()
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/islands/hub/LinkTiles.test.tsx src/islands/hub/NewsTile.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/islands/hub/Chev.tsx`:

```tsx
/** The right chevron from Chevron.astro, for the islands. Decorative. */
export function Chev() {
	return (
		<svg
			className="row-chevron"
			viewBox="0 0 24 24"
			width="16"
			height="16"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m9 6 6 6-6 6" />
		</svg>
	)
}
```

`src/islands/hub/ExternalTile.tsx`:

```tsx
import type { Translate } from "../../i18n"

interface Props {
	href: string
	label: string
	title: string
	body: string
	t: Translate
}

/**
 * A tile that leaves rookdex.app (desktop dashboard spec §4.7). It emits the same hidden note and
 * `new-tab-note` marker as ExternalLink.astro, so the build's external-link check covers it. The
 * label is hidden from screen readers, so the link's name starts with its title.
 */
export function ExternalTile({ href, label, title, body, t }: Props) {
	if (!href.startsWith("https://")) {
		throw new Error(`ExternalTile needs an https:// href, got "${href}"`)
	}
	return (
		<a className="tile link-tile map-tile" href={href} target="_blank" rel="noopener noreferrer">
			<span className="tile-art" aria-hidden="true">
				<span className="art-sun" />
				<span className="art-stripes" />
				<span className="art-compass" />
			</span>
			<span className="tile-label" aria-hidden="true">
				{label}
			</span>
			<span className="tile-title">
				{title}
				<svg
					className="ext-icon"
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M7 17 17 7M9 7h8v8" />
				</svg>
			</span>
			<span className="tile-body">{body}</span>
			<span className="visually-hidden new-tab-note">{` (${t("newTab")})`}</span>
		</a>
	)
}
```

`src/islands/hub/LinkTiles.tsx`:

```tsx
import type { Translate } from "../../i18n"
import { Chev } from "./Chev"
import { ExternalTile } from "./ExternalTile"

interface Props {
	/** MAP_LINK.url, passed from the page so the config stays the one place it lives. */
	mapLink: string
	guideHref: string
	/** The guide's own title, from its frontmatter. */
	guideTitle: string
	settingsHref: string
	t: Translate
}

/** The column of three tiles: Rockstar's site, the guide, Settings (desktop dashboard spec §4.7). */
export function LinkTiles({ mapLink, guideHref, guideTitle, settingsHref, t }: Props) {
	return (
		<div className="link-tiles">
			<ExternalTile
				href={mapLink}
				label={t("hub.mapLabel")}
				title={t("hub.mapTitle")}
				body={t("hub.mapBody")}
				t={t}
			/>
			<a className="tile link-tile" href={guideHref}>
				<span className="tile-label" aria-hidden="true">
					{t("hub.guideLabel")}
				</span>
				<span className="tile-title">
					{guideTitle}
					<Chev />
				</span>
				<span className="tile-body">{t("hub.guideBody")}</span>
			</a>
			<a className="tile link-tile" href={settingsHref}>
				<span className="tile-label" aria-hidden="true">
					{t("nav.settings")}
				</span>
				<span className="tile-title">
					{t("hub.settingsTitle")}
					<Chev />
				</span>
				<span className="tile-body">{t("hub.settingsBody")}</span>
			</a>
		</div>
	)
}
```

A plain `div`, not a `nav`: three tiles are not site navigation, and a landmark here would only add noise.

`src/islands/hub/NewsTile.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import { daysAgo } from "../../model/days"

/** A news row as the page hands it to the hub, its name already in the page's language. */
export interface NewsItem {
	id: string
	kind: "confirmed" | "rumour"
	name: string
	date: string
}

interface Props {
	news: NewsItem[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	newsHref: string
	t: Translate
}

/**
 * The newest Confirmed facts and rumours, mixed (desktop dashboard spec §4.6). Relative dates are
 * written after mount for the same reason as in Latest.tsx: the server builds on another clock.
 */
export function NewsTile({ news, today, locale, newsHref, t }: Props) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])
	if (news.length === 0) return null

	return (
		<section className="tile news-tile" aria-labelledby="news-tile-heading">
			<div className="tile-head">
				<h2 id="news-tile-heading">{t("hub.latestNews")}</h2>
				<a className="go-link" href={newsHref}>
					{t("hub.allNews")}
				</a>
			</div>
			<ul className="news-tile-list">
				{news.map((entry) => (
					<li key={entry.id}>
						<span className={`news-chip is-${entry.kind}`}>
							{t(entry.kind === "confirmed" ? "facts.title" : "hub.chipRumour")}
						</span>
						{/* News has no anchor per item, so a row goes to its section (news.astro ids). */}
						<a href={`${newsHref}#${entry.kind === "confirmed" ? "confirmed" : "rumours"}`}>
							{entry.name}
						</a>
						<time dateTime={entry.date}>
							{mounted ? relative.format(-daysAgo(entry.date, today), "day") : ""}
						</time>
					</li>
				))}
			</ul>
		</section>
	)
}
```

- [ ] **Step 4: Add the tile styles**

Append to `src/styles/global.css`, right before the first `@media (min-width: 768px)` block, a new section. These are base styles; Task 10 places and shows the tiles from 1024 px.

```css
/* Desktop dashboard tiles (desktop dashboard spec §4). Hidden below 1024 px by Task 10's rules. */

.tile {
	position: relative;
	display: grid;
	align-content: start;
	gap: var(--space-2);
	padding: var(--space-4);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
}

.tile-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-3);
	min-height: var(--tap);
}

.tile-head h2,
.tile-label {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-muted);
}

.link-tiles {
	display: grid;
	gap: var(--space-3);
	align-content: start;
}

.link-tile {
	min-height: 6.5rem;
	color: var(--text);
	text-decoration: none;
	isolation: isolate;
}

.link-tile .tile-title {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	font-family: var(--font-heading);
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--text);
}

.link-tile .tile-title svg {
	flex: none;
	color: var(--link);
}

.link-tile .tile-body {
	font-size: 0.875rem;
	color: var(--text-muted);
}

/* Our own art, never Rockstar's: behind the text, clipped to its own layer. */
.tile-art {
	position: absolute;
	inset: 0;
	z-index: -1;
	overflow: hidden;
	border-radius: inherit;
	opacity: 0.5;
	pointer-events: none;
}

.art-sun {
	position: absolute;
	right: -1.5rem;
	bottom: -1.5rem;
	width: 6rem;
	height: 6rem;
	border-radius: 50%;
	background: var(--gradient);
}

.art-stripes {
	position: absolute;
	right: -1.5rem;
	bottom: 0;
	width: 6rem;
	height: 2.25rem;
	background: repeating-linear-gradient(
		to bottom,
		var(--bg-raised) 0 0.25rem,
		transparent 0.25rem 0.5rem
	);
}

.art-compass {
	position: absolute;
	right: 0.75rem;
	top: 0.75rem;
	width: 1.5rem;
	height: 1.5rem;
	border: 1px solid var(--text-muted);
	border-radius: 50%;
}

@media (hover: hover) {
	.link-tile:hover {
		background: var(--bg-hover);
	}
}

.news-tile-list {
	display: grid;
	gap: var(--space-1);
	margin: 0;
	padding: 0;
	list-style: none;
}

.news-tile-list li {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
}

.news-tile-list a {
	display: flex;
	align-items: center;
	min-height: var(--tap);
}

.news-tile-list time {
	font-size: 0.8125rem;
	color: var(--text-muted);
	white-space: nowrap;
}

.news-chip {
	padding: 0.125rem var(--space-2);
	border: 1px solid var(--border);
	border-radius: 999px;
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--text-muted);
}

.news-chip.is-confirmed {
	border-color: var(--accent);
	background: var(--accent);
	color: var(--accent-text);
}
```

Check the token names you use exist in `src/styles/tokens.css` (`--font-heading`, `--bg-hover`, `--link`, `--gradient`). If `.tile-head h2` conflicts with the `.dashboard h2` rule at line ~933, make the tile rule win by specificity, never with `!important`.

- [ ] **Step 5: Run the tests and the CSS rules**

Run: `npx vitest run src/islands/hub/LinkTiles.test.tsx src/islands/hub/NewsTile.test.tsx src/styles`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
sed -i 's/\r$//' src/islands/hub/Chev.tsx src/islands/hub/ExternalTile.tsx src/islands/hub/LinkTiles.tsx src/islands/hub/NewsTile.tsx src/islands/hub/LinkTiles.test.tsx src/islands/hub/NewsTile.test.tsx src/styles/global.css
git add src/islands/hub/Chev.tsx src/islands/hub/ExternalTile.tsx src/islands/hub/LinkTiles.tsx src/islands/hub/NewsTile.tsx src/islands/hub/LinkTiles.test.tsx src/islands/hub/NewsTile.test.tsx src/styles/global.css
git commit -m "Add the dashboard's link tiles, Rockstar site card and news tile"
```

---

### Task 6: Hero, segmented bar and category bars

**Files:**
- Create: `src/islands/hub/Hero.tsx`, `src/islands/hub/Hero.test.tsx`
- Create: `src/islands/hub/CategoryBars.tsx`, `src/islands/hub/CategoryBars.test.tsx`
- Modify: `src/islands/hub/StatPair.tsx` (export `share`)
- Modify: `src/styles/global.css` (hero, segment and ledger styles, in the Task 5 block)

**Interfaces:**
- Consumes: `CategoryRow` (type only) from `src/model/dashboard.ts`, `Count` (type only) from `src/model/stats.ts`, `Chev` from Task 5.
- Produces:
  - `export function share(count: Count): number` in `StatPair.tsx` (unchanged body).
  - `HeroArt()`: the decorative sun and stripes layer.
  - `SegmentBar({ rows }: { rows: CategoryRow[] })`: renders segments only after mount (CSP, see Global Constraints).
  - `Hero({ locale, overall, foundToday, closestLabel, rows, t })`: the after-launch hero. `closestLabel?: string` (undefined renders "–").
  - `CategoryBars({ rows, phase, closest, trackerHref, t })`: `phase: "before" | "after"`, `closest?: string`.

- [ ] **Step 1: Write the failing tests**

`src/islands/hub/Hero.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { Hero, SegmentBar } from "./Hero"

const { t } = translator("en")
const rows: CategoryRow[] = [
	{ id: "collectibles", done: 2, total: 5, groups: ["a"] },
	{ id: "wildlife", done: 15, total: 38, groups: ["b"] },
]
const value = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling

describe("Hero (desktop dashboard spec §4.2)", () => {
	it("shows the big count, the total and the three pairs as text", () => {
		render(
			<Hero
				locale="en"
				overall={{ done: 17, total: 43 }}
				foundToday={3}
				closestLabel="Wildlife"
				rows={rows}
				t={t}
			/>
		)
		expect(screen.getByText("17")).toHaveClass("hero-big")
		expect(screen.getByText("/ 43 found")).toBeInTheDocument()
		expect(value("Overall")).toHaveTextContent("39%")
		expect(value("Found today")).toHaveTextContent("3")
		expect(value("Closest")).toHaveTextContent("Wildlife")
	})

	it("shows a dash for Closest with nothing found", () => {
		render(
			<Hero locale="en" overall={{ done: 0, total: 43 }} foundToday={0} rows={rows} t={t} />
		)
		expect(value("Closest")).toHaveTextContent("–")
	})

	it("has no axe violations", async () => {
		const { container } = render(
			<Hero locale="en" overall={{ done: 0, total: 43 }} foundToday={0} rows={rows} t={t} />
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("SegmentBar", () => {
	it("renders no segment, and so no style attribute, on the server", () => {
		const html = renderToString(<SegmentBar rows={rows} />)
		expect(html).not.toContain("style=")
		expect(html).toContain('aria-hidden="true"')
	})

	it("sizes one segment per category by its total after mount", () => {
		const { container } = render(<SegmentBar rows={rows} />)
		const parts = container.querySelectorAll<HTMLElement>(".seg-part")
		expect(parts).toHaveLength(2)
		expect(parts[1].style.flexGrow).toBe("38")
		expect(parts[1].querySelector<HTMLElement>(".seg-fill")?.style.width).toBe("39%")
	})
})
```

`src/islands/hub/CategoryBars.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { CategoryBars } from "./CategoryBars"

const { t } = translator("en")
const rows: CategoryRow[] = [
	{ id: "vehicles", done: 8, total: 8, groups: ["bikes", "cars"] },
	{ id: "wildlife", done: 9, total: 23, groups: ["reptiles", "birds"] },
]
const bars = (phase: "before" | "after", closest?: string, list = rows) =>
	render(
		<CategoryBars
			rows={list}
			phase={phase}
			closest={closest}
			trackerHref="/en/tracker/"
			t={t}
		/>
	)

describe("CategoryBars (desktop dashboard spec §4.3)", () => {
	it("links each row to the tracker filtered to its category", () => {
		bars("after", "wildlife")
		const links = screen.getAllByRole("link")
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"/en/tracker/?show=vehicles",
			"/en/tracker/?show=wildlife",
		])
	})

	it("names each row with its heading, groups, what is left and the hidden count", () => {
		bars("after", "wildlife")
		const wildlife = screen.getAllByRole("link")[1]
		expect(within(wildlife).getByRole("heading", { level: 3 })).toHaveTextContent(/^Wildlife/)
		expect(wildlife).toHaveTextContent("14 left")
		expect(wildlife.querySelector(".visually-hidden")).toHaveTextContent("9 of 23 found")
		expect(wildlife.querySelector(".ledger-frac")).toHaveAttribute("aria-hidden", "true")
		expect(wildlife.querySelector(".ledger-groups")?.textContent).toMatch(/ · /)
	})

	it("says All found at 100 % and tags only the closest category, after launch", () => {
		bars("after", "wildlife")
		const [vehicles, wildlife] = screen.getAllByRole("link")
		expect(vehicles).toHaveTextContent("All found")
		expect(vehicles.querySelector(".tag")).toBeNull()
		expect(within(wildlife).getByText("Closest")).toHaveClass("tag")
	})

	it("says 'N to find' before launch, with no tag and no style attribute on the server", () => {
		const zero = rows.map((r) => ({ ...r, done: 0 }))
		bars("before", "wildlife", zero)
		expect(screen.getAllByRole("link")[0]).toHaveTextContent("8 to find")
		expect(document.querySelector(".tag")).toBeNull()
		const html = renderToString(
			<CategoryBars rows={zero} phase="before" trackerHref="/en/tracker/" t={t} />
		)
		expect(html).not.toContain("style=")
	})

	it("has a Categories heading and no axe violations", async () => {
		const { container } = bars("after", "wildlife")
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/islands/hub/Hero.test.tsx src/islands/hub/CategoryBars.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

In `src/islands/hub/StatPair.tsx`, change `function share(` to `export function share(`.

`src/islands/hub/Hero.tsx`:

```tsx
import { useEffect, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import type { Count } from "../../model/stats"
import { share } from "./StatPair"

/** Our own sun and stripes in the hero's corner. Clips itself; the tile never clips its text. */
export function HeroArt() {
	return (
		<span className="hero-art" aria-hidden="true">
			<span className="art-sun" />
			<span className="art-stripes" />
		</span>
	)
}

/**
 * One segment per category, sized by its total, filled by its share found. Decorative: the bars
 * below carry the same numbers. Segments render only after mount, because the CSP blocks the
 * style attributes a server render would emit, and new elements inside the fixed-height strip
 * shift nothing.
 */
export function SegmentBar({ rows }: { rows: CategoryRow[] }) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	return (
		<span className="seg" aria-hidden="true">
			{mounted &&
				rows.map((row) => (
					<span key={row.id} className="seg-part" style={{ flexGrow: row.total }}>
						<span
							className="seg-fill"
							style={{ width: `${Math.round(share(row) * 100)}%` }}
						/>
					</span>
				))}
		</span>
	)
}

interface Props {
	locale: Locale
	overall: Count
	foundToday: number
	/** The closest category's label; undefined with nothing found or everything found. */
	closestLabel?: string
	rows: CategoryRow[]
	t: Translate
}

/** The after-launch hero (desktop dashboard spec §4.2). The profile chip is placed over it by CSS. */
export function Hero({ locale, overall, foundToday, closestLabel, rows, t }: Props) {
	const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 })
	return (
		<div className="tile hero hero-after">
			<HeroArt />
			{/* The hidden h2 above says the same, so the visible label stays out of the reading order. */}
			<p className="tile-label" aria-hidden="true">
				{t("hub.dashboardHeading")}
			</p>
			<div className="hero-body">
				<p className="hero-count">
					<span className="hero-big">{overall.done}</span>{" "}
					<span className="hero-of">{t("hub.foundOf", { total: overall.total })}</span>
				</p>
				<dl className="hero-meta">
					<div>
						<dt>{t("hub.overall")}</dt>
						<dd>{percent.format(share(overall))}</dd>
					</div>
					<div>
						<dt>{t("hub.foundTodayLabel")}</dt>
						<dd>{foundToday}</dd>
					</div>
					<div>
						<dt>{t("hub.closestLabel")}</dt>
						<dd>{closestLabel ?? "–"}</dd>
					</div>
				</dl>
			</div>
			<SegmentBar rows={rows} />
		</div>
	)
}
```

`src/islands/hub/CategoryBars.tsx`:

```tsx
import { seedLabel, type Translate } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { Chev } from "./Chev"

interface Props {
	rows: CategoryRow[]
	phase: "before" | "after"
	/** Gets the Closest tag after launch. The dashboard passes it only once something is found. */
	closest?: string
	trackerHref: string
	t: Translate
}

/**
 * One row-as-bar per category (desktop dashboard spec §4.3). The fill sits behind the text. Before
 * launch every fill is 0 and the row emits no style attribute, because this renders on the server.
 */
export function CategoryBars({ rows, phase, closest, trackerHref, t }: Props) {
	return (
		<section className="cat-bars" aria-labelledby="cat-bars-heading">
			<div className="deco">
				<h2 id="cat-bars-heading">{t("hub.categories")}</h2>
			</div>
			<ul className="ledger">
				{rows.map((row) => {
					const left = row.total - row.done
					const status =
						phase === "before"
							? t("hub.toFind", { count: row.total })
							: left === 0
								? t("hub.allFound")
								: t("hub.left", { count: left })
					const tagged = phase === "after" && row.id === closest && left > 0
					const percent = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100)
					return (
						<li key={row.id}>
							<a className="ledger-row" href={`${trackerHref}?show=${row.id}`}>
								<span
									className="ledger-fill"
									aria-hidden="true"
									style={percent > 0 ? { width: `${percent}%` } : undefined}
								/>
								<span className="ledger-name">
									<h3>
										{seedLabel(t, "category", row.id)}
										{tagged && <span className="tag">{t("hub.closestLabel")}</span>}
									</h3>
									<span className="ledger-groups">
										{row.groups.map((g) => seedLabel(t, "group", g)).join(" · ")}
									</span>
								</span>
								<span className="ledger-left">{status}</span>
								<span className="ledger-frac" aria-hidden="true">
									{row.done}
									<em> / {row.total}</em>
								</span>
								<span className="visually-hidden">
									{t("hub.foundCount", { done: row.done, total: row.total })}
								</span>
								<Chev />
							</a>
						</li>
					)
				})}
			</ul>
		</section>
	)
}
```

The tag is inside the `h3`, so the heading reads "Wildlife Closest". That is fine; the test matches `/^Wildlife/`.

- [ ] **Step 4: Add the styles**

Append to the Task 5 block in `src/styles/global.css`:

```css
.hero {
	min-height: 18.75rem;
	isolation: isolate;
}

.hero-art {
	position: absolute;
	inset: 0;
	z-index: -1;
	overflow: hidden;
	border-radius: inherit;
	pointer-events: none;
}

.hero-art .art-sun {
	right: -2rem;
	top: -2rem;
	bottom: auto;
	width: 11rem;
	height: 11rem;
	opacity: 0.35;
}

.hero-art .art-stripes {
	right: -2rem;
	top: 4.5rem;
	bottom: auto;
	width: 11rem;
	height: 4.5rem;
}

.hero-count {
	display: flex;
	align-items: baseline;
	gap: var(--space-2);
	margin: 0;
}

.hero-big {
	font-family: var(--font-display);
	font-size: 6rem;
	line-height: 1;
	color: var(--text);
	text-shadow: var(--glow);
}

.hero-of {
	font-family: var(--font-display);
	font-size: 1.75rem;
	color: var(--text-muted);
}

.hero-meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-2) var(--space-5);
	margin: var(--space-2) 0 0;
}

.hero-meta dt {
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-muted);
}

.hero-meta dd {
	margin: 0;
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--text);
}

.seg {
	display: flex;
	gap: 2px;
	height: 0.5rem;
	margin-top: auto;
	border-radius: 999px;
	background: var(--border);
	overflow: hidden;
}

.seg-part {
	flex: 0 1 0;
	min-width: 0;
	background: var(--bg-hover);
}

.seg-fill {
	display: block;
	height: 100%;
	background: var(--gradient);
	box-shadow: var(--glow);
}

.cat-bars .deco {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin-bottom: var(--space-3);
}

.cat-bars .deco::before,
.cat-bars .deco::after {
	content: "";
	flex: 1;
	height: 0;
	border-top: 3px double var(--border);
}

.cat-bars .deco h2 {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-muted);
}

.ledger {
	display: grid;
	gap: var(--space-2) var(--space-3);
	margin: 0;
	padding: 0;
	list-style: none;
}

.ledger-row {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto auto;
	align-items: center;
	gap: var(--space-3);
	min-height: 4.5rem;
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
	color: var(--text);
	text-decoration: none;
	isolation: isolate;
}

.ledger-fill {
	position: absolute;
	inset: 0 auto 0 0;
	z-index: -1;
	width: 0;
	border-radius: inherit;
	background: linear-gradient(
		90deg,
		color-mix(in srgb, var(--accent) 22%, transparent),
		color-mix(in srgb, var(--accent-2) 16%, transparent)
	);
}

.ledger-name {
	display: grid;
	min-width: 0;
}

.ledger-name h3 {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin: 0;
	font-size: 1rem;
}

.ledger-groups {
	overflow: hidden;
	font-size: 0.8125rem;
	color: var(--text-muted);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ledger-left {
	font-size: 0.875rem;
	color: var(--text-muted);
	white-space: nowrap;
}

.ledger-frac {
	font-family: var(--font-display);
	font-size: 1.75rem;
	line-height: 1;
	white-space: nowrap;
}

.ledger-frac em {
	font-style: normal;
	font-size: 1.125rem;
	color: var(--text-muted);
}

.ledger-row .row-chevron {
	color: var(--link);
}

.tag {
	padding: 0 var(--space-2);
	border: 1px solid var(--accent);
	border-radius: 999px;
	background: var(--accent);
	color: var(--accent-text);
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

@media (hover: hover) {
	.ledger-row:hover {
		background: var(--bg-hover);
	}
}
```

`.ledger-groups` uses `overflow: hidden` for the ellipsis. That is the one allowed text clip: the full list is in the link's text for screen readers, and the line has no fixed height. Note it in a comment above the rule.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/islands/hub src/styles`
Expected: PASS (the StatPair export breaks nothing).

- [ ] **Step 6: Commit**

```bash
sed -i 's/\r$//' src/islands/hub/Hero.tsx src/islands/hub/Hero.test.tsx src/islands/hub/CategoryBars.tsx src/islands/hub/CategoryBars.test.tsx src/islands/hub/StatPair.tsx src/styles/global.css
git add src/islands/hub/Hero.tsx src/islands/hub/Hero.test.tsx src/islands/hub/CategoryBars.tsx src/islands/hub/CategoryBars.test.tsx src/islands/hub/StatPair.tsx src/styles/global.css
git commit -m "Add the dashboard hero, segmented bar and category bars"
```

---

### Task 7: Before-launch checklist

**Files:**
- Create: `src/islands/hub/PrelaunchChecklist.tsx`, `src/islands/hub/PrelaunchChecklist.test.tsx`
- Modify: `src/styles/global.css` (checklist styles, in the Task 5 block)

**Interfaces:**
- Consumes: `CHECKLIST_IDS`, `ChecklistId`, `readChecklist`, `writeChecklistItem` from `../seenFlag` (Task 3); `isStandalone` from `../../scripts/standalone`; `Chev` (Task 5).
- Produces: `interface ChecklistLink { href: string; page: string }` and `PrelaunchChecklist({ links, t }: { links: Record<ChecklistId, ChecklistLink>; t: Translate })`.

- [ ] **Step 1: Write the failing test**

`src/islands/hub/PrelaunchChecklist.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { CHECKLIST_KEY, type ChecklistId } from "../seenFlag"
import { type ChecklistLink, PrelaunchChecklist } from "./PrelaunchChecklist"

const { t } = translator("en")
const links: Record<ChecklistId, ChecklistLink> = {
	edition: { href: "/en/guides/before-you-start/", page: "Before you start" },
	preload: { href: "/en/news/", page: "News" },
	space: { href: "/en/news/", page: "News" },
	"first-hour": { href: "/en/guides/first-hour/", page: "Your first hour" },
	install: { href: "/en/settings/", page: "Settings" },
}
const list = () => render(<PrelaunchChecklist links={links} t={t} />)
const box = (name: string) => screen.getByRole("checkbox", { name: new RegExp(`^${name}`) })
const stored = () => JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]")

function standalone(on: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({ matches: on && query === "(display-mode: standalone)", media: query }) as MediaQueryList
	)
}

beforeEach(() => {
	localStorage.clear()
	standalone(false)
})
afterEach(() => vi.restoreAllMocks())

describe("PrelaunchChecklist (desktop dashboard spec §4.8)", () => {
	it("renders five unticked rows on the server", () => {
		const html = renderToString(<PrelaunchChecklist links={links} t={t} />)
		expect(html.match(/type="checkbox"/g)).toHaveLength(5)
		expect(html).not.toContain("checked")
		expect(html).toContain("0 of 5 done")
	})

	it("ticks, counts and stores; restores the ticks on the next visit", () => {
		const first = list()
		fireEvent.click(box("Pick your edition"))
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
		expect(stored()).toEqual(["edition"])
		first.unmount()

		list()
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
	})

	it("keeps an id another tab added when it writes", () => {
		list()
		localStorage.setItem(CHECKLIST_KEY, '["space"]') // another tab, after this one loaded
		fireEvent.click(box("Pick your edition"))
		expect(stored()).toEqual(["edition", "space"])
		expect(box("Free up console space")).toBeChecked()
	})

	it("shows what another tab stored without a click here", () => {
		list()
		localStorage.setItem(CHECKLIST_KEY, '["space"]')
		fireEvent(window, new StorageEvent("storage", { key: CHECKLIST_KEY }))
		expect(box("Free up console space")).toBeChecked()
		localStorage.removeItem(CHECKLIST_KEY) // Delete all in Settings, in another tab
		fireEvent(window, new StorageEvent("storage", { key: CHECKLIST_KEY }))
		expect(box("Free up console space")).not.toBeChecked()
	})

	it("says so when storage is blocked, and still ticks for this visit", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError")
		})
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError")
		})
		list()
		expect(screen.getByText(/blocks storage here/)).toBeInTheDocument()
		expect(screen.queryByText(/Ticks stay on this device/)).toBeNull()
		fireEvent.click(box("Pick your edition"))
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
	})

	it("puts each Open link outside the label, named after its page", () => {
		list()
		const open = screen.getByRole("link", { name: "Open: Before you start" })
		expect(open).toHaveAttribute("href", "/en/guides/before-you-start/")
		expect(open.closest("label")).toBeNull()
		expect(screen.getAllByRole("link")).toHaveLength(5)
	})

	it("shows the install row ticked and disabled in the installed app, and never stores it", () => {
		standalone(true)
		list()
		const install = box("Install Rookdex")
		expect(install).toBeChecked()
		expect(install).toBeDisabled()
		const row = install.closest("li") as HTMLElement
		expect(within(row).getByText("Installed")).toBeInTheDocument()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
		expect(localStorage.getItem(CHECKLIST_KEY)).toBeNull()
	})

	it("has a labelled list, the device note and no axe violations", async () => {
		const { container } = list()
		expect(screen.getByRole("list", { name: "Before launch" })).toBeInTheDocument()
		expect(screen.getByText(/Ticks stay on this device/)).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/islands/hub/PrelaunchChecklist.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/islands/hub/PrelaunchChecklist.tsx`:

```tsx
import { useEffect, useState } from "react"
import type { Translate } from "../../i18n"
import { isStandalone } from "../../scripts/standalone"
import {
	CHECKLIST_IDS,
	CHECKLIST_KEY,
	type ChecklistId,
	readChecklist,
	writeChecklistItem,
} from "../seenFlag"
import { Chev } from "./Chev"

/** Where a row's Open link goes, and the page name its hidden text reads out. */
export interface ChecklistLink {
	href: string
	page: string
}

interface Props {
	links: Record<ChecklistId, ChecklistLink>
	t: Translate
}

// Copy keys use camelCase; the stored ids keep the spec's kebab-case.
const COPY: Record<ChecklistId, string> = {
	edition: "edition",
	preload: "preload",
	space: "space",
	"first-hour": "firstHour",
	install: "install",
}

/**
 * The tickable list before launch (desktop dashboard spec §4.8, §5). The server renders every box
 * unticked; saved ticks arrive after hydration. Ticked and unticked rows share one height, so that
 * shifts nothing. The checkbox's own state is the audible result, so the count is plain text.
 */
export function PrelaunchChecklist({ links, t }: Props) {
	const [ticked, setTicked] = useState<ChecklistId[]>([])
	const [installed, setInstalled] = useState(false)
	const [blocked, setBlocked] = useState(false)
	useEffect(() => {
		const load = () => {
			const saved = readChecklist()
			setBlocked(saved === null)
			if (saved) setTicked(saved)
		}
		load()
		setInstalled(isStandalone(window))
		// Another tab ticked something, or Delete all ran in Settings: show what is stored now.
		const onStorage = (event: StorageEvent) => {
			if (event.key === CHECKLIST_KEY || event.key === null) load()
		}
		window.addEventListener("storage", onStorage)
		return () => window.removeEventListener("storage", onStorage)
	}, [])

	// Outside the state updater, which React may run twice: the write is a side effect.
	const toggle = (id: ChecklistId, on: boolean) => {
		const { list, saved } = writeChecklistItem(id, on, ticked)
		setTicked(list)
		setBlocked(!saved)
	}

	const isDone = (id: ChecklistId) => (id === "install" && installed) || ticked.includes(id)
	const done = CHECKLIST_IDS.filter(isDone).length

	return (
		<section className="tile checklist" aria-labelledby="checklist-heading">
			<div className="tile-head">
				<h2 id="checklist-heading">{t("hub.beforeLaunch")}</h2>
				<p className="checklist-count">
					{t("hub.checklistDone", { done, total: CHECKLIST_IDS.length })}
				</p>
			</div>
			<ul className="check-list" aria-labelledby="checklist-heading">
				{CHECKLIST_IDS.map((id) => {
					const key = COPY[id]
					const locked = id === "install" && installed
					return (
						<li key={id} className="check-row">
							<label className="check-label">
								<input
									type="checkbox"
									checked={isDone(id)}
									disabled={locked}
									onChange={(event) => toggle(id, event.target.checked)}
								/>
								<span className="check-text">
									<span className="check-item">{t(`hub.check.${key}`)}</span>
									<small>{locked ? t("hub.installed") : t(`hub.check.${key}Sub`)}</small>
								</span>
							</label>
							<a className="check-open" href={links[id].href}>
								{t("hub.open")}
								<span className="visually-hidden">{t("hub.openPage", { page: links[id].page })}</span>
								<Chev />
							</a>
						</li>
					)
				})}
			</ul>
			<p className="checklist-note">
				{t(blocked ? "hub.checklistNoStorage" : "hub.checklistNote")}
			</p>
		</section>
	)
}
```

- [ ] **Step 4: Add the styles**

Append to the Task 5 block in `src/styles/global.css`:

```css
.checklist-count,
.checklist-note {
	margin: 0;
	font-size: 0.8125rem;
	color: var(--text-muted);
}

.check-list {
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
}

.check-row {
	display: flex;
	align-items: stretch;
	gap: var(--space-2);
	border-top: 1px solid var(--border);
}

.check-label {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--space-3);
	min-height: var(--tap);
	padding-block: var(--space-2);
	cursor: pointer;
}

.check-label input {
	flex: none;
	width: 1.25rem;
	height: 1.25rem;
	margin: 0;
	accent-color: var(--accent);
}

.check-text {
	display: grid;
	min-width: 0;
}

.check-text small {
	font-size: 0.8125rem;
	color: var(--text-muted);
}

/* Struck through and muted, same size and weight, so ticking never changes the row's height. */
.check-label input:checked + .check-text .check-item {
	color: var(--text-muted);
	text-decoration: line-through;
}

.check-open {
	display: inline-flex;
	flex: none;
	align-items: center;
	gap: var(--space-1);
	min-height: var(--tap);
	padding-inline: var(--space-2);
}

@media (hover: hover) {
	.check-label:hover {
		background: var(--bg-hover);
	}
}
```

Below 1024 px the checklist sits in the phone stack, so `.checklist` must look right at 320 px too (Task 11 measures it).

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/islands/hub/PrelaunchChecklist.test.tsx src/styles`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
sed -i 's/\r$//' src/islands/hub/PrelaunchChecklist.tsx src/islands/hub/PrelaunchChecklist.test.tsx src/styles/global.css
git add src/islands/hub/PrelaunchChecklist.tsx src/islands/hub/PrelaunchChecklist.test.tsx src/styles/global.css
git commit -m "Add the tickable before-launch checklist"
```

---

### Task 8: Wire the before view: Hub props, the page and the wide wrap

**Files:**
- Modify: `src/islands/hub/Hub.tsx`, `src/islands/hub/Hub.test.tsx`
- Modify: `src/islands/hub/CountdownView.tsx` (wrap the buying block)
- Modify: `src/pages/[locale]/index.astro`
- Modify: `src/layouts/Base.astro` (optional `wide` prop)
- Create: `src/islands/hub/split.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 to 7.
- Produces: new `Hub` props (`categoryCount` is replaced by `categories`, whose length the skeleton reads):

```ts
categories: CategoryRow[]       // done 0, from categoryRows(countable seed, {})
news: NewsItem[]
mapLink: string
settingsHref: string
firstHourHref: string
guideTitle: string
firstHourTitle: string
```

  `Base` gets `wide?: boolean`, which adds the `wide` class to `main.wrap`.

- [ ] **Step 1: Write the failing tests**

`src/islands/hub/split.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The before view must not pull in the tracker model (dashboard spec §10, desktop spec §3).
const BEFORE_VIEW = [
	"Hub.tsx",
	"Hero.tsx",
	"CategoryBars.tsx",
	"NewsTile.tsx",
	"LinkTiles.tsx",
	"ExternalTile.tsx",
	"PrelaunchChecklist.tsx",
	"Chev.tsx",
	"StatPair.tsx",
	"CountdownView.tsx",
]
const HEAVY = /from "\.\.\/\.\.\/model\/(seed|stats|dashboard|tracker)"/

/** Lines that pull the tracker model in at runtime. A multi-line import counts by its `from` line. */
function runtimeModelImports(source: string): string[] {
	return source
		.split("\n")
		.filter((line) => HEAVY.test(line) && !/^import type /.test(line))
}

describe("before-view imports", () => {
	it("catches a runtime import, so the guard can go red", () => {
		expect(runtimeModelImports('import { seedItems } from "../../model/seed"')).toHaveLength(1)
		expect(runtimeModelImports('import { type Count } from "../../model/stats"')).toHaveLength(1)
		expect(runtimeModelImports('} from "../../model/dashboard"')).toHaveLength(1)
		expect(runtimeModelImports('import type { Count } from "../../model/stats"')).toEqual([])
	})

	it.each(BEFORE_VIEW)("%s imports the tracker model as types only", (file) => {
		const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8")
		expect(runtimeModelImports(source)).toEqual([])
	})
})
```

In `src/islands/hub/Hub.test.tsx`:

1. Replace `categoryCount: 4,` in `props()` with the new props and add the fixtures above `props()`:

```tsx
const categories: CategoryRow[] = [
	{ id: "vehicles", done: 0, total: 8, groups: ["bikes"] },
	{ id: "wildlife", done: 0, total: 23, groups: ["reptiles"] },
]
const news: NewsItem[] = [
	{ id: "facts/preload", kind: "confirmed", name: "Preload on 12 November", date: "2026-09-01" },
]
```

```tsx
		categories,
		news,
		mapLink: "https://www.rockstargames.com/VI",
		settingsHref: "/en/settings/",
		firstHourHref: "/en/guides/first-hour/",
		guideTitle: "Before you start",
		firstHourTitle: "Your first hour",
```

   Add `import type { CategoryRow } from "../../model/dashboard"` and `import type { NewsItem } from "./NewsTile"`.

2. Add these tests in a new `describe("desktop dashboard before launch (desktop spec §4)")` block:

```tsx
	it("renders the checklist, the bars, the news and the tiles before launch", () => {
		hub()
		expect(screen.getByRole("list", { name: "Before launch" })).toBeInTheDocument()
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Vehicles/ })).toHaveTextContent("8 to find")
		expect(screen.getByRole("region", { name: "Latest news" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Leonida on Rockstar's site/ })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Open: Your first hour" })).toHaveAttribute(
			"href",
			"/en/guides/first-hour/"
		)
	})

	it("emits no style attribute in the server HTML, before or after launch", () => {
		expect(renderToString(<Hub {...props()} />)).not.toContain("style=")
		expect(renderToString(<Hub {...props({ initialNow: after })} />)).not.toContain("style=")
	})

	it("hides news and keeps the tiles when there is no news", () => {
		hub({ news: [] })
		expect(screen.queryByRole("region", { name: "Latest news" })).toBeNull()
		expect(screen.getByRole("link", { name: /^Before you start/ })).toBeInTheDocument()
	})

	it("renders the news tile and the link tiles after launch too, even if the chunk fails", async () => {
		hub({ initialNow: after, loadDashboard: () => Promise.reject(new Error("offline")) })
		await advance(0)
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "Latest news" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Leonida on Rockstar's site/ })).toBeInTheDocument()
	})

	it("moves focus to the dashboard heading when the hub flips with focus in the checklist", async () => {
		// One second before launch, in the device's own clock.
		hub({ initialNow: "2026-11-18T22:59:59Z" })
		const box = screen.getByRole("checkbox", { name: /^Pick your edition/ })
		box.focus()
		expect(document.activeElement).toBe(box)
		await advance(2_000)
		expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your progress" }))
	})
```

   Check the existing flip test in this file (search for `dashboard-heading` or "flips") and copy its exact clock setup if it differs from the two lines above; the launch moment is `LAUNCH_AT` (`2026-11-18T23:00:00Z`). `renderToString` is already imported.

   If the existing axe test renders the before view, it now also covers the checklist, bars and tiles; leave it as it is.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/islands/hub/Hub.test.tsx src/islands/hub/split.test.ts`
Expected: FAIL. The new props don't exist and the before view has no checklist. `split.test.ts` may already pass; that is fine, it guards later edits.

- [ ] **Step 3: Wrap the buying block in CountdownView**

In `src/islands/hub/CountdownView.tsx`, wrap the last three children (`<h2>{t("hub.buyHeading")}</h2>`, the buy body `<p>`, and the before-you-start `<p>`) in `<div className="countdown-more">…</div>`. Nothing else changes; Task 10 hides it from 1024 px, where the checklist and the guide tile cover it.

- [ ] **Step 4: Rebuild Hub**

In `src/islands/hub/Hub.tsx`:

1. Imports to add:

```tsx
import { LAUNCH_AT } from "../../model/launch"
import type { CategoryRow } from "../../model/dashboard"
import { CategoryBars } from "./CategoryBars"
import { HeroArt, SegmentBar } from "./Hero"
import { LinkTiles } from "./LinkTiles"
import { type NewsItem, NewsTile } from "./NewsTile"
import { type ChecklistLink, PrelaunchChecklist } from "./PrelaunchChecklist"
import type { ChecklistId } from "../seenFlag"
```

   Biome sorts imports; run `npx biome check --write src/islands/hub/Hub.tsx` after editing.

2. In `Props`, replace `categoryCount: number` and its comment with:

```ts
	/** Every category at 0 found, from the seed at build time (desktop spec §6.1). */
	categories: CategoryRow[]
	/** The newest facts and rumours, mixed, names in the page's language. */
	news: NewsItem[]
	/** MAP_LINK.url. */
	mapLink: string
	settingsHref: string
	firstHourHref: string
	/** Guide titles from their frontmatter, for the tiles and the checklist's hidden link names. */
	guideTitle: string
	firstHourTitle: string
```

   and destructure them in the function signature.

3. After `const today = localDayKey(state.now)` add:

```tsx
	const checklistLinks: Record<ChecklistId, ChecklistLink> = {
		edition: { href: guideHref, page: guideTitle },
		preload: { href: newsHref, page: t("nav.news") },
		space: { href: newsHref, page: t("nav.news") },
		"first-hour": { href: firstHourHref, page: firstHourTitle },
		install: { href: settingsHref, page: t("nav.settings") },
	}
	// The launch date only, never a time: Rockstar hasn't confirmed the unlock time (#73).
	const launchDate = new Intl.DateTimeFormat(locale, {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "Europe/Oslo",
	}).format(LAUNCH_AT)
	const newsTile = <NewsTile news={news} today={today} locale={locale} newsHref={newsHref} t={t} />
	const tiles = (
		<LinkTiles
			mapLink={mapLink}
			guideHref={guideHref}
			guideTitle={guideTitle}
			settingsHref={settingsHref}
			t={t}
		/>
	)
```

4. In the after branch: change `<DashboardSkeleton categoryCount={categoryCount} t={t} />` to `<DashboardSkeleton categoryCount={categories.length} t={t} />`, and add `{newsTile}{tiles}` right after the `Latest` block, inside the section.

5. Replace the before branch `<CountdownView locale={locale} state={state} guideHref={guideHref} />` with:

```tsx
				<div className="hub-prelaunch">
					<div className="tile hero hero-before">
						<HeroArt />
						<CountdownView locale={locale} state={state} guideHref={guideHref} />
						<p className="hero-date">{launchDate}</p>
						<SegmentBar rows={categories} />
					</div>
					<PrelaunchChecklist links={checklistLinks} t={t} />
					<CategoryBars rows={categories} phase="before" trackerHref={trackerHref} t={t} />
					{newsTile}
					{tiles}
				</div>
```

   The existing focus logic watches the whole `.hub-live` root, so focus in the checklist already counts as focus in the hub. No new focus code.

- [ ] **Step 5: The page and the wide wrap**

`src/layouts/Base.astro`: add to `Props`

```ts
	/** The hub's wider page: caps at 85rem from 1600 px instead of 72rem (desktop spec §3). */
	wide?: boolean
```

destructure `wide = false`, and change `<main id="main" class="wrap">` to `<main id="main" class:list={["wrap", { wide }]}>`.

`src/pages/[locale]/index.astro`:

```astro
---
import { getCollection } from "astro:content"
import { MAP_LINK } from "../../config/map-link"
import { defaultLocale } from "../../i18n"
import { NEWS_LIMIT } from "../../islands/hub/limits"
import { categoryRows, latestNews } from "../../model/dashboard"
import { resolveGuide } from "../../model/guides"
import { facts } from "../../model/seed"
// …existing imports stay…

const guides = await getCollection("guides")
const guideTitle = (slug: string) => {
	const found = resolveGuide(guides, locale, slug, defaultLocale)
	if (!found) throw new Error(`Missing guide: ${slug}`)
	return found.entry.data.title
}
const categories = categoryRows(countable(seedItems), {})
const news = latestNews(facts, rumours, NEWS_LIMIT).map(({ id, kind, date, name }) => ({
	id,
	kind,
	date,
	name: typeof name === "string" ? name : name[locale as Locale],
}))
---
```

Remove the now unused `categoryCount` and `categoryIds` import. Pass the new props to `Hub` and `wide` to `Base`:

```astro
<Base locale={locale} title={t("seo.titles.home")} description={t("seo.homeDescription")} path="" wide>
	…
			<Hub
				client:load
				…existing props without categoryCount…
				categories={categories}
				news={news}
				mapLink={MAP_LINK.url}
				settingsHref={getRelativeLocaleUrl(locale, "settings")}
				firstHourHref={getRelativeLocaleUrl(locale, "guides/first-hour")}
				guideTitle={guideTitle("before-you-start")}
				firstHourTitle={guideTitle("first-hour")}
			/>
```

Add to `src/islands/hub/limits.ts`:

```ts
export const NEWS_LIMIT = 5
export const FINDS_DAYS = 7
```

Merge the `defaultLocale` import into the existing `../../i18n` import line.

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run src/islands src/test src/layouts`
Expected: PASS.
Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
sed -i 's/\r$//' src/islands/hub/Hub.tsx src/islands/hub/Hub.test.tsx src/islands/hub/CountdownView.tsx src/islands/hub/limits.ts src/islands/hub/split.test.ts "src/pages/[locale]/index.astro" src/layouts/Base.astro
git add src/islands/hub/Hub.tsx src/islands/hub/Hub.test.tsx src/islands/hub/CountdownView.tsx src/islands/hub/limits.ts src/islands/hub/split.test.ts "src/pages/[locale]/index.astro" src/layouts/Base.astro
git commit -m "Wire the before-launch checklist, bars, news and tiles into the hub"
```

---

### Task 9: Wire the after view: Dashboard, Recent finds, finds by day, skeleton

**Files:**
- Create: `src/islands/hub/FindsByDay.tsx`, `src/islands/hub/FindsByDay.test.tsx`
- Create: `src/islands/hub/RecentFinds.tsx`
- Modify: `src/islands/hub/Dashboard.tsx`, `src/islands/hub/Dashboard.test.tsx`
- Modify: `src/islands/hub/DashboardSkeleton.tsx`
- Modify: `src/styles/global.css` (recent rows, chart; in the Task 5 block)

**Interfaces:**
- Consumes: `findsByDay`, `categoryRows`, `DayCount` (Task 2), `Hero`, `CategoryBars` (Task 6), `daysSinceText` from `./StatStrip`, `FINDS_DAYS` (Task 8).
- Produces:
  - `hasChart(days: DayCount[]): boolean` (at least 2 days with finds) and `FindsByDay({ days, locale, t })`, which returns `null` unless `hasChart(days)`.
  - `RecentFinds({ recent, days, today, locale, t })`, the whole `.dash-recent` section.

- [ ] **Step 1: Write the failing tests**

`src/islands/hub/FindsByDay.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { FindsByDay, hasChart } from "./FindsByDay"

const { t } = translator("en")
const week = (counts: number[]): DayCount[] =>
	counts.map((count, n) => ({ day: `2026-11-${String(20 + n).padStart(2, "0")}`, count }))

describe("FindsByDay (desktop dashboard spec §4.5)", () => {
	it("hides with one day of finds and shows with two", () => {
		expect(hasChart(week([0, 0, 0, 0, 0, 0, 4]))).toBe(false)
		expect(hasChart(week([0, 0, 1, 0, 0, 0, 4]))).toBe(true)
		const { container } = render(
			<FindsByDay days={week([0, 0, 0, 0, 0, 0, 4])} locale="en" t={t} />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("is an ordered list of 7 days, today last, each with a hidden sentence", () => {
		render(<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />)
		const list = screen.getByRole("list", { name: "Finds by day" })
		expect(list.tagName).toBe("OL")
		const days = within(list).getAllByRole("listitem")
		expect(days).toHaveLength(7)
		expect(days[6]).toHaveTextContent("Today")
		expect(days[6].querySelector(".visually-hidden")).toHaveTextContent("4 found on 26 November")
		expect(days[2].querySelector(".visually-hidden")).toHaveTextContent("1 found on 22 November")
	})

	it("sizes each bar by its share of the busiest day", () => {
		const { container } = render(
			<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />
		)
		const bars = container.querySelectorAll<HTMLElement>(".fbd-bar")
		expect(bars[6].style.height).toBe("100%")
		expect(bars[2].style.height).toBe("25%")
		expect(bars[0].style.height).toBe("0%")
	})

	it("has no axe violations", async () => {
		const { container } = render(
			<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

In `src/islands/hub/Dashboard.test.tsx` add a `describe("desktop blocks (desktop spec §3)")`:

```tsx
	it("renders What's next and the profile chip once", async () => {
		await seed(["Player 1"])
		await ready()
		expect(screen.getAllByRole("heading", { name: "What's next" })).toHaveLength(1)
		expect(screen.getAllByRole("button", { name: /^Profile: / })).toHaveLength(1)
	})

	it("shows the hero, the category bars and the day line next to the chip", async () => {
		await seed(["Player 1"], { "wildlife/american-alligator": "2026-11-20T10:00:00Z" })
		await ready()
		expect(document.querySelector(".hero-big")).toHaveTextContent("1")
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Wildlife/ })).toHaveAttribute(
			"href",
			"/en/tracker/?show=wildlife"
		)
		expect(document.querySelector(".dash-top .dash-day")).toHaveTextContent("Day 1 since launch")
	})

	it("tags no category and shows a dash for Closest with nothing found", async () => {
		await seed(["Player 1"])
		await ready()
		expect(document.querySelector(".tag")).toBeNull()
		const closest = screen.getByText("Closest", { selector: "dt" }).nextElementSibling
		expect(closest).toHaveTextContent("–")
	})

	it("gives Recent finds a Latest highlight with its day and category", async () => {
		await seed(["Player 1"], { "wildlife/american-alligator": "2026-11-20T10:00:00Z" })
		await ready()
		const first = document.querySelector(".dash-recent .recent li")
		expect(first?.querySelector(".recent-label")).toHaveTextContent("Latest")
		expect(first?.querySelector(".recent-when")).toHaveTextContent("today")
		expect(first?.querySelector(".recent-meta")).toHaveTextContent(/Wildlife · /)
	})

	it("shows the chart only with finds on 2 days", async () => {
		await seed(["Player 1"], {
			"wildlife/american-alligator": "2026-11-19T10:00:00Z",
			"wildlife/pelican": "2026-11-20T10:00:00Z",
		})
		await ready()
		expect(screen.getByRole("list", { name: "Finds by day" })).toBeInTheDocument()
		expect(document.querySelector(".dash-recent")).toHaveClass("has-chart")
	})
```

`ready()` uses `today = "2026-11-20"` by default. Group labels in the fixture (`reptiles`) must exist as `group.*` keys or `seedLabel` falls back to the id; the regex `Wildlife · ` covers both.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/islands/hub/FindsByDay.test.tsx src/islands/hub/Dashboard.test.tsx`
Expected: FAIL, module not found and missing blocks.

- [ ] **Step 3: Implement FindsByDay and RecentFinds**

`src/islands/hub/FindsByDay.tsx`:

```tsx
import type { Locale, Translate } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { dayFromKey } from "../../model/days"

/** A chart with one bar says nothing: show it once 2 days have finds (desktop spec §2). */
export function hasChart(days: DayCount[]): boolean {
	return days.filter((d) => d.count > 0).length >= 2
}

interface Props {
	days: DayCount[]
	locale: Locale
	t: Translate
}

/**
 * The last 7 local days as plain HTML bars (desktop spec §4.5). Client-only (inside the dashboard
 * chunk), so inline heights are fine under the CSP. The bars and digits are hidden from screen
 * readers; each day's hidden sentence carries the number.
 */
export function FindsByDay({ days, locale, t }: Props) {
	if (!hasChart(days)) return null
	const max = Math.max(...days.map((d) => d.count))
	const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
	const long = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" })
	const last = days.length - 1
	return (
		<div className="finds-by-day">
			<p className="tile-label" id="fbd-label">
				{t("hub.findsByDay")}
			</p>
			<ol className="fbd-list" aria-labelledby="fbd-label">
				{days.map((d, n) => {
					const date = dayFromKey(d.day)
					return (
						<li key={d.day} className={n === last ? "is-today" : undefined}>
							<span className="fbd-count" aria-hidden="true">
								{d.count}
							</span>
							<span className="fbd-track" aria-hidden="true">
								<span className="fbd-bar" style={{ height: `${(d.count / max) * 100}%` }} />
							</span>
							<span className="fbd-day" aria-hidden="true">
								{n === last ? t("hub.today") : short.format(date)}
							</span>
							<span className="visually-hidden">
								{t("hub.findsOnDay", { count: d.count, date: long.format(date) })}
							</span>
						</li>
					)
				})}
			</ol>
		</div>
	)
}
```

`src/islands/hub/RecentFinds.tsx`:

```tsx
import { useMemo } from "react"
import { type Locale, seedLabel, type Translate } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { daysAgo, localDayKey } from "../../model/days"
import type { RecentFind } from "../../model/stats"
import { FindsByDay, hasChart } from "./FindsByDay"

interface Props {
	recent: RecentFind[]
	days: DayCount[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	t: Translate
}

/**
 * Recent finds at every width (desktop spec §4.5). Phones show names only, as before: the day,
 * category line and Latest label are hidden below 1024 px. From 1024 px the first row is the
 * Latest highlight, and CSS limits the rows under it (4, or 2 when the chart shows).
 */
export function RecentFinds({ recent, days, today, locale, t }: Props) {
	const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale])
	const chart = hasChart(days)
	return (
		<section
			className={chart ? "dash-recent has-chart" : "dash-recent"}
			aria-labelledby="dash-recent-heading"
		>
			<h2 id="dash-recent-heading">{t("tracker.recent")}</h2>
			{recent.length === 0 ? (
				<>
					<p className="stats-empty">{t("tracker.noRecent")}</p>
					<div className="recent-empty">
						<p className="recent-empty-title">{t("hub.noFindsYet")}</p>
						<p>{t("hub.noFindsBody")}</p>
					</div>
				</>
			) : (
				<ul className="recent" aria-labelledby="dash-recent-heading">
					{recent.map((find, n) => (
						<li key={find.item.id}>
							{n === 0 && <span className="recent-label">{t("hub.latestFind")}</span>}
							<time className="recent-when" dateTime={find.updated_at}>
								{relative.format(-daysAgo(localDayKey(new Date(find.updated_at)), today), "day")}
							</time>
							<span className="recent-name">{find.item.name}</span>
							<span className="recent-meta">
								{seedLabel(t, "category", find.item.category)} ·{" "}
								{seedLabel(t, "group", find.item.group)}
							</span>
						</li>
					))}
				</ul>
			)}
			<FindsByDay days={days} locale={locale} t={t} />
		</section>
	)
}
```

- [ ] **Step 4: Rewire Dashboard**

In `src/islands/hub/Dashboard.tsx`:

1. Imports: add `categoryRows, findsByDay` to the `../../model/dashboard` import; add `import { CategoryBars } from "./CategoryBars"`, `import { Hero } from "./Hero"`, `import { RecentFinds } from "./RecentFinds"`, `import { daysSinceText, StatStrip } from "./StatStrip"` (replacing the `StatStrip` import), and `FINDS_DAYS` to the `./limits` import.

2. In the `view` memo add:

```ts
			rows: categoryRows(items, records),
			days: findsByDay(items, records, today, FINDS_DAYS),
```

3. Replace the `dash-top` div with:

```tsx
			<div className="dash-top">
				<span className="dash-day">{daysSinceText(t, daysSince)}</span>
				<ProfileMenu
					profiles={activeProfiles(state.profiles)}
					current={current}
					onSwitch={switchTo}
					manageHref={trackerHref}
					t={t}
				/>
			</div>
			<Hero
				locale={locale}
				overall={view.overall}
				foundToday={view.foundToday}
				closestLabel={closest && view.overall.done > 0 ? label(closest.category) : undefined}
				rows={view.rows}
				t={t}
			/>
```

4. After the `dash-progress` section add:

```tsx
			<CategoryBars
				rows={view.rows}
				phase="after"
				closest={view.overall.done > 0 ? view.closest : undefined}
				trackerHref={trackerHref}
				t={t}
			/>
```

5. Replace the whole `dash-recent` section with:

```tsx
			<RecentFinds recent={view.recent} days={view.days} today={today} locale={locale} t={t} />
```

   `.dash-day` duplicates the phone `StatStrip`'s day text. Task 10 hides `.dash-day` below 1024 px and `StatStrip` from 1024 px, so each width shows it once. Both stay in the accessibility tree only at the width where they are visible (`display: none`).

- [ ] **Step 5: Skeleton gets the desktop areas**

In `src/islands/hub/DashboardSkeleton.tsx`, inside the root div:

- In `dash-top`, before the chip: `<span className="dash-day">&nbsp;</span>`.
- After `dash-top`: `<div className="tile hero hero-after skeleton" aria-hidden="true" />`.
- After the `dash-progress` section:

```tsx
			<section className="cat-bars" aria-hidden="true">
				<div className="deco">
					<h2>{t("hub.categories")}</h2>
				</div>
				<ul className="ledger">
					{keys("cat", categoryCount).map((key) => (
						<li key={key}>
							<span className="ledger-row skeleton" />
						</li>
					))}
				</ul>
			</section>
```

Keep the existing `dash-recent` skeleton.

- [ ] **Step 6: Styles for recent rows and the chart**

Append to the Task 5 block:

```css
/* Phones keep names only (phone dashboard spec); the extras show from 1024 px (Task 10). */
.recent-label,
.recent-when,
.recent-meta,
.recent-empty,
.finds-by-day,
.dash-day {
	display: none;
}

.fbd-list {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: var(--space-2);
	margin: 0;
	padding: 0;
	list-style: none;
}

.fbd-list li {
	display: grid;
	justify-items: center;
	gap: var(--space-1);
	font-size: 0.75rem;
	color: var(--text-muted);
}

.fbd-track {
	display: flex;
	align-items: flex-end;
	width: 100%;
	height: 4rem;
}

.fbd-bar {
	width: 100%;
	min-height: 2px;
	border-radius: 2px 2px 0 0;
	background: var(--gradient);
}

.fbd-list .is-today {
	color: var(--text);
	font-weight: 600;
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/islands src/styles`
Expected: PASS. The existing Dashboard tests that read `.recent li` text may now see extra spans; if one asserts an exact `textContent`, change it to look at `.recent-name`.

- [ ] **Step 8: Commit**

```bash
sed -i 's/\r$//' src/islands/hub/FindsByDay.tsx src/islands/hub/FindsByDay.test.tsx src/islands/hub/RecentFinds.tsx src/islands/hub/Dashboard.tsx src/islands/hub/Dashboard.test.tsx src/islands/hub/DashboardSkeleton.tsx src/styles/global.css
git add src/islands/hub/FindsByDay.tsx src/islands/hub/FindsByDay.test.tsx src/islands/hub/RecentFinds.tsx src/islands/hub/Dashboard.tsx src/islands/hub/Dashboard.test.tsx src/islands/hub/DashboardSkeleton.tsx src/styles/global.css
git commit -m "Add the hero, category bars, Recent finds highlight and finds by day to the dashboard"
```

---

### Task 10: The grid: placement, show and hide, tagline, toast, wide wrap

**Files:**
- Modify: `src/styles/global.css`
- Modify (only if it pins the 1024 hub layout): `src/styles/links.test.ts`

**Interfaces:**
- Consumes: the class names from Tasks 5 to 9: `.hub-prelaunch`, `.hub-dashboard`, `.dashboard`, `.dash-top`, `.dash-day`, `.hero`, `.hero-before`, `.hero-after`, `.hero-date`, `.countdown-more`, `.checklist`, `.cat-bars`, `.whats-next`, `.dash-recent`, `.news-tile`, `.link-tiles`, `.stat-pair`, `.stat-strip`, `.dash-progress`, `.latest`, `.tracker-alert`, `.recent-*`, `.finds-by-day`, `.undo-toast`, `.wrap.wide`, `.hub-intro`, `.lockup`, `.tap-links`.
- Produces: the layout in spec §4.1. No markup changes.

This task is CSS only. Vitest can't see layout, so the check is Task 11's measurement. Keep every rule mobile-first.

- [ ] **Step 1: Base rules below 1024 px**

Add to the Task 5 block (outside any media query):

```css
/* Below 1024 px the desktop-only blocks stay out of the phone layout (desktop spec §1). */
.hub-prelaunch {
	display: grid;
	gap: var(--space-4);
}

.hub-prelaunch .cat-bars,
.hub-prelaunch .news-tile,
.hub-prelaunch .link-tiles,
.hub-dashboard .hero,
.hub-dashboard .cat-bars,
.hub-dashboard .news-tile,
.hub-dashboard .link-tiles,
.hero-art,
.hero-date,
.hero .seg {
	display: none;
}

/* The before-launch hero is a plain wrapper on phones: the countdown keeps its own tile. */
.hero-before {
	display: contents;
}
```

`display: contents` on a `div` with no role is safe for accessibility. Never put it on the `section` elements.

- [ ] **Step 2: The 1024 px grid**

Inside the existing `@media (min-width: 1024px)` block, replace the `.hub { grid-template-columns: 1fr 1fr; align-items: start; }` rule with the block below, and change the `.update-notice, .undo-toast` rule so only `.update-notice` keeps `left: auto; width: 22rem`.

```css
	.hub {
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-3);
	}

	/* The h1 stays for search engines and screen readers; the header shows the wordmark. */
	.hub-intro .lockup {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	.hub-intro .tagline {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--text-muted);
	}

	.hub-intro .tap-links {
		display: none;
	}

	.hub-prelaunch,
	.hub-dashboard {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: var(--space-3);
		padding: 0;
		border: 0;
		background: none;
	}

	.hub-dashboard .dashboard {
		display: contents;
	}

	/* The page alert gets its own first row, so a message pushes the grid down, as on phones, instead
	   of covering the hero. The grid is pulled up by one gap, so the empty row costs nothing. Child
	   combinators keep the Undo toast's own alert out of this. */
	.hub-dashboard {
		margin-block-start: calc(var(--space-3) * -1);
	}

	.hub-dashboard > .tracker-alert,
	.hub-dashboard > .dashboard > .tracker-alert {
		grid-area: alert;
	}

	/* Phone blocks give way to their desktop versions. */
	.hub-dashboard .stat-pair,
	.hub-dashboard .stat-strip,
	.hub-dashboard .dash-progress,
	.hub-dashboard .latest,
	.hub-dashboard .stats-empty,
	.hero-before .countdown-more {
		display: none;
	}

	.hub-prelaunch .cat-bars,
	.hub-prelaunch .news-tile,
	.hub-dashboard .cat-bars,
	.hub-dashboard .news-tile {
		display: block;
	}

	.hub-prelaunch .link-tiles,
	.hub-dashboard .link-tiles,
	.hub-dashboard .hero,
	.hero-before,
	.recent-empty,
	.finds-by-day {
		display: grid;
	}

	.hero-art,
	.recent-label,
	.recent-when,
	.recent-meta,
	.dash-day {
		display: block;
	}

	.hero .seg {
		display: flex;
	}

	.hero-date {
		display: block;
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	/* The countdown sits inside the hero tile: no second border, its h2 styled as the tile label. */
	.hero-before > .hub-state {
		padding: 0;
		border: 0;
		background: none;
	}

	.hero-before > .hub-state > h2 {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.hero-before .days-number {
		font-size: 7rem;
	}

	.hero-before .countdown .unit:first-child {
		display: none;
	}

	/* The chip sits in the hero's top-right corner, with the day line beside it. */
	.hub-dashboard .dash-top {
		grid-area: hero;
		z-index: 1;
		align-self: start;
		justify-self: end;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) 0 0;
	}

	.dash-day {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	/* Areas, 1024 to 1199 px (desktop spec §4.1). */
	.hub-dashboard {
		grid-template-areas:
			"alert alert alert alert alert alert alert alert alert alert alert alert"
			"hero hero hero hero hero hero hero hero hero hero hero hero"
			"next next next next next next recent recent recent recent recent recent"
			"bars bars bars bars bars bars bars bars bars bars bars bars"
			"news news news news news news tiles tiles tiles tiles tiles tiles";
	}

	.hub-prelaunch {
		grid-template-areas:
			"hero hero hero hero hero hero hero hero hero hero hero hero"
			"checklist checklist checklist checklist checklist checklist checklist checklist checklist checklist checklist checklist"
			"bars bars bars bars bars bars bars bars bars bars bars bars"
			"news news news news news news tiles tiles tiles tiles tiles tiles";
	}

	.hub-dashboard .hero,
	.hero-before {
		grid-area: hero;
	}

	.hub-dashboard .whats-next {
		grid-area: next;
	}

	.hub-dashboard .dash-recent {
		grid-area: recent;
	}

	.cat-bars {
		grid-area: bars;
	}

	.news-tile {
		grid-area: news;
	}

	.link-tiles {
		grid-area: tiles;
	}

	.checklist {
		grid-area: checklist;
	}

	/* No news at all: the tiles take its columns (desktop spec §7). */
	.hub-prelaunch:not(:has(.news-tile)) .link-tiles,
	.hub-dashboard:not(:has(.news-tile)) .link-tiles {
		grid-column: 1 / -1;
	}

	/* Recent finds: the first row is the Latest highlight, then up to 4 rows, or 2 with the chart. */
	.dash-recent .recent li:first-child {
		display: grid;
		gap: var(--space-1);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border);
	}

	.dash-recent .recent li:first-child .recent-name {
		font-family: var(--font-display);
		font-size: 2.25rem;
		line-height: 1.05;
	}

	.dash-recent.has-chart .recent li:nth-child(n + 4) {
		display: none;
	}

	.recent-label,
	.recent-when,
	.recent-meta {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.recent-empty-title {
		font-weight: 600;
		color: var(--text);
	}

	/* Desktop has no bottom tab bar: the toast sits at the bottom centre. */
	.undo-toast {
		left: 50%;
		right: auto;
		width: 22rem;
		bottom: calc(var(--notice-h, 0px) + var(--space-3));
		transform: translateX(-50%);
	}
```

`@keyframes notice-in` animates `opacity` only (checked 2026-10-28), so the centring `translateX(-50%)` holds during the animation. If someone later adds `transform` to it, centre with `left: 0; right: 0; margin-inline: auto;` instead.

The `dash-top` and `hero` share one grid area. The hero's own `.tile-label` stays on the left, and the chip and day line sit on the right of the same top row. The hero's top padding must leave room for the chip's 44 px height, so add `.hub-dashboard .hero { padding-top: calc(var(--space-3) + var(--tap)); }` if the label and the big number collide with the chip at 1024 px (measure in Task 11).

- [ ] **Step 3: The 1200 px step and the 1600 px cap**

Add new blocks after the 1024 block:

```css
@media (min-width: 1200px) {
	.hub-dashboard {
		grid-template-areas:
			"alert alert alert alert alert alert alert alert alert alert alert alert"
			"hero hero hero hero hero hero hero hero next next next next"
			"bars bars bars bars bars bars bars bars bars bars bars bars"
			"recent recent recent recent news news news news news tiles tiles tiles";
	}

	.hub-prelaunch {
		grid-template-areas:
			"hero hero hero hero hero hero hero checklist checklist checklist checklist checklist"
			"bars bars bars bars bars bars bars bars bars bars bars bars"
			"news news news news news news news news tiles tiles tiles tiles";
	}

	.ledger {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	/* One reserved height for the bottom row, so the chart showing or not shifts nothing. Text
	   at 200 % grows the row instead of being clipped. */
	.hub-dashboard .dash-recent,
	.hub-dashboard .news-tile,
	.hub-dashboard .link-tiles {
		min-height: 24rem;
	}
}

@media (min-width: 1600px) {
	.wrap.wide {
		max-width: 85rem;
	}
}
```

`24rem` is a starting value. Task 11 measures the tallest of the three at 1265 px with 6 finds and the chart, and sets the reserve to that height rounded up to the next `0.5rem`.

- [ ] **Step 4: The tile look for the after-launch blocks**

From 1024 px, `whats-next` and `dash-recent` become tiles too. Inside the 1024 block add:

```css
	.hub-dashboard .whats-next,
	.hub-dashboard .dash-recent {
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
	}
```

Read the existing `.whats-next` rules (around line 1003) first: if it already draws a border or background, change only what differs.

- [ ] **Step 5: Run the CSS tests and lint**

Run: `npx vitest run src/styles`
Expected: PASS.
Run: `npx biome ci src/styles/global.css`
Expected: no errors. If `noDescendingSpecificity` fires on a new selector, wrap the earlier selector in `:where()` rather than reordering unrelated rules.

- [ ] **Step 6: Commit**

```bash
sed -i 's/\r$//' src/styles/global.css
git add src/styles/global.css
git commit -m "Lay out the hub as a 12-column grid from 1024 px"
```

---

### Task 11: Measure, fix, and open the PR

**Files:**
- Modify: `src/styles/global.css` (fixes from the measurements only)
- Modify: `docs/superpowers/specs/2026-10-27-rookdex-desktop-dashboard-design.md` (a short "As built" note listing the spec gaps settled in this plan)

**Interfaces:** none new.

This is the spec's §13 manual pass. Use the Browser pane (`.claude/launch.json` has the preview configs). Two rounds at most: one batched measurement, one confirmation. If something still looks off after the second round, stop and show me.

- [ ] **Step 1: Full test run and builds**

Run: `npm test`
Expected: all green.
Run: `npx astro check && npx biome ci .` in `../rookdex-lf` (the LF worktree; check out this branch there first with `git -C ../rookdex-lf checkout --detach <branch>`), because the main checkout shows CRLF noise.
Expected: 0 errors.

- [ ] **Step 2: Build both states**

Before launch: `npm run build`, then `npm run preview`. Read the "Ready on" line for the port.
After launch: `ROOKDEX_NOW=2026-11-22T10:00:00Z npm run build` in a second run, then preview again. After every rebuild, unregister the service worker and clear caches in the pane before measuring.

- [ ] **Step 3: Measure (one batched round)**

At 1024, 1265, 1440 and 1640 px, `en` and `nb`:
- Before launch, and after launch with 0 finds, 1 find, and 6 or more finds over 3 days (tick them in the tracker, using back-dated ticks through the IndexedDB devtools or the import file in `src/test/` if one exists).
- Read with JavaScript in the pane: `document.documentElement.scrollWidth <= innerWidth` (no overflow); every `.tile, .ledger-row, .check-row, .hero` has `scrollHeight <= clientHeight + 1` or no fixed height; every `a, input, button` in the hub is at least 44 px tall; controls on one row share `getBoundingClientRect().bottom`.
- A `PerformanceObserver({ type: "layout-shift", buffered: true })` reports a total of 0 for each load.
- Contrast: text over `.ledger-fill` at 100 % fill is at least 7:1; the struck-through checklist item at least 4.5:1; the `.tag` uses `--accent-text` on `--accent`.
- Edge cases: a 3-digit found count in the hero (temporarily set `overall.done` through React devtools or a test build), and the longest `nb` category as Closest at 1024 px.
- Overlays: the `.dash-top` chip and day line never intersect the hero's `.tile-label` or `.hero-count`, and `.hero-date` never intersects the countdown's `h2` or `.days` (compare `getBoundingClientRect()` of each pair), at every width and at 200 % text.
- Alert row: after launch, note the hero's `top`, then write text into the page alert from the console (`document.querySelector(".dashboard > .tracker-alert").textContent = "Test"`). The alert's `bottom` sits above the hero's `top`, and nothing overlaps. With the alert empty again, the hero's `top` is back to the noted value.
- Chrome font size at 200 % at 1265 px: nothing clipped.
- 320 px `nb` before launch: the checklist sits straight after the countdown, no overflow, rows at least 44 px.
- Below 1024 px after launch: the phone dashboard looks exactly as on `main` (compare one screenshot each at 390 px).

- [ ] **Step 4: Fix and confirm (second round)**

Fix only what the measurements found, in `global.css`. Re-measure the failing cases once. Set the bottom-row reserve from Task 10 Step 3 to the measured height.

- [ ] **Step 5: Keyboard and NVDA walk**

Tab through the hub at 1265 px. Checklist ticks are heard once each, the "Open" links read "Open: Before you start" and so on, category links read name, groups, what is left and the count, tick and Undo work in What's next with a bottom-row link focused while the toast is open, and the Rockstar card ends with "opens in a new tab". Write down anything off; fix it if it is CSS, otherwise show me.

- [ ] **Step 6: As-built note and commit**

Run `date +"%Y-%m-%d %A"`. Add a short "As built (<date>)" section at the end of the spec listing the six settled gaps from this plan's Global Constraints. Commit the CSS fixes and the spec note:

```bash
sed -i 's/\r$//' src/styles/global.css docs/superpowers/specs/2026-10-27-rookdex-desktop-dashboard-design.md
git add src/styles/global.css docs/superpowers/specs/2026-10-27-rookdex-desktop-dashboard-design.md
git commit -m "Fix desktop dashboard spacing from the measurement pass and note the as-built gaps"
```

- [ ] **Step 7: Push and open the PR**

Push the branch and open a PR titled "Desktop dashboard and before-launch checklist". Body: what changed (grid from 1024, Dashboard tab, checklist, Rockstar site card), the six settled spec gaps, the measured numbers (CLS per width and state, the bottom-row reserve), screenshots at 1265 px before and after launch and at 320 px before launch, and the manual NVDA notes. No AI attribution.

> Stress-tested 2026-10-28 (skill 1b85fca): 6 applied, 1 adapted, 0 decided by me.
