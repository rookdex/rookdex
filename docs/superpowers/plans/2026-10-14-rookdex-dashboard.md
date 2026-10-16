# Launch-night dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home page shows the countdown before launch and a per-profile dashboard after it, with in-place ticking and Undo, a remembered active profile, a dated Latest list and a scheduled rebuild on launch night.

**Architecture:** One `Hub` island replaces `Countdown`. It owns the clock (`useHubPhase`), one status region and the Latest list, renders `CountdownView` before launch and lazy-loads `Dashboard` after it. `Dashboard` builds its own tracker over the same IndexedDB through a shared `buildTracker`, and pure functions in `src/model/dashboard.ts` compute every number. Calendar helpers live in a seed-free `src/model/days.ts` so the before-launch bundle never pulls in the seed.

**Tech Stack:** Astro 7 (static), React 19 islands, TypeScript, Zod 4 via `astro/zod`, Vitest 5 with jsdom, Testing Library, fake-indexeddb, vitest-axe, Biome, GitHub Actions, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-10-14-rookdex-dashboard-design.md`

## Global Constraints

- Branch: `feat/dashboard`, cut from `spec/dashboard` (which holds the spec and this plan). One PR carries spec, plan and code.
- No new dependencies. `Intl.RelativeTimeFormat`, `Intl.NumberFormat` and existing code only (spec §10).
- Locales are `en` and `nb`. URLs are `/en/` and `/nb/` (the spec's `/no/` is a slip; this plan fixes it in Task 9).
- Every new copy key goes into both `src/locales/en.json` and `src/locales/nb.json` with the exact text from spec §8. No `!`, no "leak"/"lekk" (copy.test.ts).
- `hub.openTracker` stays: the hub header's tap link in `src/pages/[locale]/index.astro:27` still uses it. Only `hub.launched` is removed (spec §8 said both; this plan keeps the one still in use).
- `?phase` is compared to the exact string `after` and never echoed into the page or URL (spec §11).
- localStorage key for the active profile: `rookdex.active-profile` (spec §5).
- Bars keep writing width through the CSSOM; no `style` attribute in server HTML; CSP unchanged (spec §10, §11).
- Mobile-first CSS: base styles for 320 px, `min-width` media queries only. Controls on one row share one 44 px height (`var(--tap)`).
- No em dashes in code, comments, copy, commits or the PR.
- Commits: imperative sentence case like `Raise the test timeout to 15 s`. No `Co-Authored-By` or AI attribution.
- CRLF trap: if an edited file shows as fully changed in `git diff`, run `sed -i 's/\r$//' <file>` before `git add`.
- Verify with `npm test`, `npm run check` and `npx biome ci .` (run Biome in `../rookdex-lf` for the true count; the main checkout shows CRLF noise).

## Review Focus

1. **Ticking the last unfound item of the closest category.** What's next moves to the next category, focus lands on its first row, and Undo brings the old category back with focus on the restored item. Test in Task 8.
2. **A profile with every item found.** The Closest tile reads "All found", What's next shows the all-found line with no checkboxes, and nothing crashes on `closestCategory` returning `undefined`. Tests in Tasks 7 and 8.
3. **Malformed `?phase` values** (`AFTER`, `after%20`, `after&phase=before`, empty). All ignored; only one exact `after` counts. Test in Task 6.
4. **Records for retired items or items no longer in the seed.** They never count toward Closest, What's next or "found today", as `stats.ts` promises. Tests in Task 2.
5. **After-state server HTML hydrating in another time zone.** The `launch-rebuild` runs at 23:05 UTC, which is already the next day in Oslo. The server HTML must hold no relative dates, so hydration can't mismatch. Test in Task 9.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/model/schema.ts` | modify | `added` on rumours |
| `src/seed/rumours.json` | modify | `added` dates |
| `src/model/days.ts` | create | Seed-free calendar helpers |
| `src/model/dashboard.ts` | create | `closestCategory`, `rankCategories`, `nextGroups`, `foundToday`, `latestRumours` |
| `src/pages/[locale]/news.astro` | modify | Newest first |
| `src/islands/seenFlag.ts` | modify | Active-profile key and storage wrapper |
| `src/model/tracker.ts` | modify | Remember the active profile |
| `src/scripts/delete-all.ts` | modify | Remove the new key |
| `src/islands/buildTracker.ts` | create | One way to build a tracker for both islands |
| `src/islands/useTracker.ts` | modify | Split into `useTrackerState` and `useShowParam` |
| `src/islands/Tracker.tsx` | modify | Use the shared pieces; Progress links to the hub after launch |
| `src/islands/tracker/StatsRail.tsx` | modify | Export `Bar`; optional `hubHref` |
| `src/islands/tracker/ProfileMenu.tsx` | modify | Switch mode: optional actions, `manageHref` |
| `src/model/build-now.ts` | create | `ROOKDEX_NOW` parsing |
| `src/islands/useCountdown.ts` | modify | Expose `now` |
| `src/islands/hub/useHubPhase.ts` | create | Clock plus preview override |
| `src/islands/hub/limits.ts` | create | Row counts shared by skeleton and dashboard |
| `src/islands/hub/StatPair.tsx` | create | Overall and Closest tiles |
| `src/islands/hub/StatStrip.tsx` | create | Found today or newcomer link, and Day N |
| `src/islands/hub/DashboardSkeleton.tsx` | create | Same blocks at reserved heights |
| `src/islands/hub/Dashboard.tsx` | create | Tracker state, blocks, ticking, Undo |
| `src/islands/hub/WhatsNext.tsx` | create | Three rows in up to two titled groups, slide, lock, focus |
| `src/islands/hub/UndoToast.tsx` | create | Undo with focus-aware timer |
| `src/islands/hub/CountdownView.tsx` | create | Before-launch markup moved from `Countdown.tsx` |
| `src/islands/hub/Latest.tsx` | create | Three newest rumours with relative dates |
| `src/islands/hub/Hub.tsx` | create | Phase, status region, lazy dashboard, Latest |
| `src/islands/Countdown.tsx`, `Countdown.test.tsx` | delete | Replaced by the hub |
| `src/pages/[locale]/index.astro` | modify | Mount `Hub` |
| `src/styles/global.css` | modify | Dashboard styles |
| `.github/workflows/deploy.yml` | modify | `launch-rebuild` schedule with a year gate |

---

### Task 1: Rumours get a required `added` date

**Files:**
- Modify: `src/model/schema.ts:61-67`
- Modify: `src/seed/rumours.json`
- Test: `src/model/seed.test.ts:134-148`

**Interfaces:**
- Produces: `Rumour` and `RumourInput` gain `added: string` (`YYYY-MM-DD`). Tasks 2 and 9 sort and display it.

- [ ] **Step 1: Write the failing test**

In `src/model/seed.test.ts`, give the `rumour` fixture inside `describe("validateRumours")` an `added` field and add one test after "needs one press source":

```ts
describe("validateRumours", () => {
	const rumour = {
		id: "rumours/stock-market",
		name: "Stock market",
		claim_key: "stock-market",
		summary: "A returning stock market has been reported.",
		added: "2026-09-18",
		sources: [press],
	}
	it("needs one press source", () => {
		expect(validateRumours([rumour], list).errors).toEqual([])
		expect(validateRumours([{ ...rumour, sources: [official] }], list).errors).toEqual([
			"rumours/stock-market: rumour needs a press source",
		])
	})

	it("needs an added date as YYYY-MM-DD (dashboard spec §6.3)", () => {
		const { added: _added, ...undated } = rumour
		expect(validateRumours([undated], list).errors).not.toEqual([])
		expect(validateRumours([{ ...rumour, added: "18.09.2026" }], list).errors).not.toEqual([])
		expect(validateRumours([{ ...rumour, added: "2026-02-30" }], list).errors).not.toEqual([])
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/seed.test.ts`
Expected: FAIL. "needs one press source" now reports an unrecognized key `added`, and the new test sees no error for the undated rumour.

- [ ] **Step 3: Add the field and the dates**

In `src/model/schema.ts`, `rumourInputSchema` becomes:

```ts
export const rumourInputSchema = z.strictObject({
	id: idSchema,
	name: text(TEXT.name),
	claim_key: z.string().regex(/^[a-z0-9-]{1,80}$/),
	summary: text(TEXT.summary),
	/** The day the rumour was added, `YYYY-MM-DD`. Latest and News sort by it (dashboard spec §6.3). */
	added: z.iso.date(),
	sources: z.array(sourceInputSchema).min(1),
})
```

In `src/seed/rumours.json`, add `"added": "2026-09-18"` after `"summary"` in all three entries (the date the file was first committed, `79c051c`). Example for the first:

```json
	{
		"id": "rumours/online-2027-launch",
		"name": "GTA 6 Multiplayer in 2027",
		"claim_key": "online-2027-launch",
		"summary": "Twitch CEO Dan Clancy told Bloomberg that Rockstar plans to launch GTA 6's online multiplayer mode in 2027, a year after the single player game, though Rockstar itself has not confirmed a date.",
		"added": "2026-09-18",
		"sources": [
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/model src/test`
Expected: PASS. If another test builds a rumour literal (`grep -rn "claim_key" src --include=*.ts*`), add `added: "2026-09-18"` to it.

- [ ] **Step 5: Commit**

```bash
git add src/model/schema.ts src/model/seed.test.ts src/seed/rumours.json
git commit -m "Give every rumour an added date"
```

---

### Task 2: Dashboard model and News sorted newest first

**Files:**
- Create: `src/model/days.ts`, `src/model/days.test.ts`
- Create: `src/model/dashboard.ts`, `src/model/dashboard.test.ts`
- Modify: `src/pages/[locale]/news.astro`
- Test: `src/test/news-page.test.ts`

**Interfaces:**
- Consumes: `Rumour.added` (Task 1); `countable`, `perCategory`, `Records` from `src/model/stats.ts`; `groupItems` from `src/model/seed.ts`.
- Produces (`src/model/days.ts`, no seed import):
  - `localDayKey(date: Date): string`: `YYYY-MM-DD` on the device's calendar.
  - `dayFromKey(key: string): Date`: local noon on that day.
  - `daysAgo(added: string, today: string): number`: whole days, never below 0.
- Produces (`src/model/dashboard.ts`):
  - `FIRST_GOAL = "wildlife"`
  - `closestCategory(items: SeedItem[], records: Records): string | undefined`
  - `whatsNext(items: SeedItem[], records: Records, category: string, limit: number): SeedItem[]`
  - `foundToday(items: SeedItem[], records: Records, now: Date): number`. Takes `items` as well as the spec's `(records, now)`, so retired items and records without a seed item never count, as `stats.ts` promises.
  - `latestRumours(rumours: Rumour[], limit: number): Rumour[]`

- [ ] **Step 1: Write the failing tests**

`src/model/days.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { dayFromKey, daysAgo, localDayKey } from "./days"

let previous: string | undefined
beforeAll(() => {
	previous = process.env.TZ
	process.env.TZ = "Europe/Oslo"
})
afterAll(() => {
	process.env.TZ = previous
})

describe("calendar days (dashboard spec §6.2)", () => {
	it("keys a moment by the local calendar day", () => {
		// 23:30 UTC on 19 Nov is 00:30 on 20 Nov in Oslo.
		expect(localDayKey(new Date("2026-11-19T23:30:00Z"))).toBe("2026-11-20")
		expect(localDayKey(new Date("2026-11-19T22:30:00Z"))).toBe("2026-11-19")
	})

	it("turns a key back into a moment inside that day", () => {
		expect(localDayKey(dayFromKey("2026-11-20"))).toBe("2026-11-20")
	})

	it("counts whole days and clamps the future to today", () => {
		expect(daysAgo("2026-09-18", "2026-11-22")).toBe(65)
		expect(daysAgo("2026-11-22", "2026-11-22")).toBe(0)
		expect(daysAgo("2026-11-25", "2026-11-22")).toBe(0)
	})
})
```

`src/model/dashboard.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { closestCategory, foundToday, latestRumours, whatsNext } from "./dashboard"
import type { ProgressRecord, Rumour, SeedItem } from "./schema"
import type { Records } from "./stats"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
function item(id: string, group = "g", extra: Partial<SeedItem> = {}): SeedItem {
	const [category, name] = id.split("/")
	return { id, category, group, name, status: "confirmed", sources: [src], ...extra }
}
function found(at = "2026-11-20T10:00:00.000Z"): ProgressRecord {
	return { item_id: "x/x", done: true, updated_at: at, origin: "manual" }
}
function records(entries: Record<string, string>): Records {
	return Object.fromEntries(
		Object.entries(entries).map(([id, at]) => [id, { ...found(at), item_id: id }])
	)
}

const items = [
	item("collectibles/a"),
	item("collectibles/b"),
	item("vehicles/c"),
	item("vehicles/d"),
	item("wildlife/e"),
	item("wildlife/f"),
]

describe("closestCategory", () => {
	it("starts with wildlife when nothing is found", () => {
		expect(closestCategory(items, {})).toBe("wildlife")
	})

	it("picks the highest share below 100 %", () => {
		const r = records({ "vehicles/c": "2026-11-20T10:00:00Z", "wildlife/e": "2026-11-20T10:00:00Z" })
		// Both at 50 %: the tie goes to category order (alphabetical by file name).
		expect(closestCategory(items, r)).toBe("vehicles")
	})

	it("skips a finished category and moves on", () => {
		const r = records({ "vehicles/c": "2026-11-20T10:00:00Z", "vehicles/d": "2026-11-20T10:00:00Z" })
		expect(closestCategory(items, r)).toBe("collectibles")
	})

	it("is undefined when everything is found", () => {
		const all = Object.fromEntries(items.map((i) => [i.id, "2026-11-20T10:00:00Z"]))
		expect(closestCategory(items, records(all))).toBeUndefined()
	})

	it("ignores retired items and records with no seed item", () => {
		const withRetired = [...items, item("wildlife/gone", "g", { retired: true })]
		// Only the retired item and an unknown id are ticked: still "nothing found".
		const r = records({ "wildlife/gone": "2026-11-20T10:00:00Z", "weapons/x": "2026-11-20T10:00:00Z" })
		expect(closestCategory(withRetired, r)).toBe("wildlife")
		// Retired items don't hold a category below 100 % either.
		const done = records({ "wildlife/e": "2026-11-20T10:00:00Z", "wildlife/f": "2026-11-20T10:00:00Z" })
		expect(closestCategory(withRetired, done)).toBe("collectibles")
	})
})

describe("whatsNext", () => {
	const birds = [
		item("wildlife/pelican", "birds"),
		item("wildlife/egret", "birds"),
		item("wildlife/alligator", "reptiles"),
		item("wildlife/dodo", "birds", { retired: true }),
		item("vehicles/bike", "bikes"),
	]
	it("lists unfound items of the category in tracker order, up to the limit", () => {
		expect(whatsNext(birds, {}, "wildlife", 3).map((i) => i.name)).toEqual([
			"egret",
			"pelican",
			"alligator",
		])
		expect(whatsNext(birds, {}, "wildlife", 2)).toHaveLength(2)
	})
	it("skips found and retired items", () => {
		const r = records({ "wildlife/egret": "2026-11-20T10:00:00Z" })
		expect(whatsNext(birds, r, "wildlife", 3).map((i) => i.name)).toEqual(["pelican", "alligator"])
	})
})

describe("foundToday", () => {
	let previous: string | undefined
	beforeAll(() => {
		previous = process.env.TZ
		process.env.TZ = "Europe/Oslo"
	})
	afterAll(() => {
		process.env.TZ = previous
	})

	it("counts finds on the local calendar day of now", () => {
		const r = records({
			"wildlife/e": "2026-11-19T23:30:00Z", // 00:30 on 20 Nov in Oslo: today
			"wildlife/f": "2026-11-19T22:30:00Z", // 23:30 on 19 Nov in Oslo: yesterday
		})
		expect(foundToday(items, r, new Date("2026-11-20T09:00:00Z"))).toBe(1)
	})

	it("ignores unticked records, retired items and records with no seed item", () => {
		const retired = [...items, item("wildlife/gone", "g", { retired: true })]
		const r: Records = {
			...records({ "wildlife/gone": "2026-11-20T10:00:00Z", "weapons/x": "2026-11-20T10:00:00Z" }),
			"wildlife/e": { ...found(), item_id: "wildlife/e", done: false },
		}
		expect(foundToday(retired, r, new Date("2026-11-20T12:00:00Z"))).toBe(0)
	})
})

describe("latestRumours", () => {
	function rumour(id: string, added: string): Rumour {
		return {
			id: `rumours/${id}`,
			name: id,
			claim_key: id,
			summary: "A claim.",
			added,
			sources: [{ ...src, tier: "press" }],
		}
	}
	it("puts the newest first, breaks ties by id and stops at the limit", () => {
		const list = [
			rumour("b", "2026-09-18"),
			rumour("c", "2026-10-01"),
			rumour("a", "2026-09-18"),
			rumour("d", "2026-08-01"),
		]
		expect(latestRumours(list, 3).map((r) => r.name)).toEqual(["c", "a", "b"])
	})
	it("leaves the input untouched", () => {
		const list = [rumour("b", "2026-09-18"), rumour("c", "2026-10-01")]
		latestRumours(list, 2)
		expect(list.map((r) => r.name)).toEqual(["b", "c"])
	})
})
```

In `src/test/news-page.test.ts`, import `latestRumours` and replace the "lists each rumour under an h3" test:

```ts
import { latestRumours } from "../model/dashboard"
```

```ts
	it("lists each rumour under an h3, newest first (dashboard spec §6.3)", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(rumours.length).toBeGreaterThan(0)
		const names = [...doc.querySelectorAll(".rumour-list h3")].map((h) => h.textContent)
		expect(names).toEqual(latestRumours(rumours, rumours.length).map((r) => r.name))
		const added = names.map((name) => rumours.find((r) => r.name === name)?.added ?? "")
		expect(added).toEqual([...added].sort().reverse())
	})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/model/days.test.ts src/model/dashboard.test.ts src/test/news-page.test.ts`
Expected: FAIL with "Failed to resolve import ./days" and "./dashboard".

- [ ] **Step 3: Write the implementation**

`src/model/days.ts`:

```ts
// Calendar-day helpers for the hub. No seed import: the hub's before-launch bundle uses these and
// must not pull in the tracker model (dashboard spec §10).

const DAY_MS = 86_400_000

/** `YYYY-MM-DD` of `date` on the device's own calendar. */
export function localDayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${date.getFullYear()}-${month}-${day}`
}

/** Local noon on the day `key` names: a moment safely inside that day. */
export function dayFromKey(key: string): Date {
	const [year, month, day] = key.split("-").map(Number)
	return new Date(year, month - 1, day, 12)
}

/** Whole days from `added` to `today`, both `YYYY-MM-DD`. A date in the future counts as today. */
export function daysAgo(added: string, today: string): number {
	const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${added}T00:00:00Z`)
	return Math.max(0, Math.round(ms / DAY_MS))
}
```

`src/model/dashboard.ts`:

```ts
// The dashboard's numbers (dashboard spec §6.2). Pure: no DOM, no clock; the caller passes `now`.
// Retired items and records without a seed item never count, as in stats.ts.
import { localDayKey } from "./days"
import type { Rumour, SeedItem } from "./schema"
import { groupItems } from "./seed"
import { countable, perCategory, type Records } from "./stats"

/** Where a player with nothing found starts. */
export const FIRST_GOAL = "wildlife"

/**
 * The category with the highest share found below 100 %. Ties go to category order. With nothing
 * found it is wildlife; with everything found it is undefined.
 */
export function closestCategory(items: SeedItem[], records: Records): string | undefined {
	const counts = perCategory(countable(items), records)
	if (counts.every((c) => c.done === 0)) {
		return counts.find((c) => c.category === FIRST_GOAL)?.category ?? counts[0]?.category
	}
	let best: { category: string; share: number } | undefined
	for (const c of counts) {
		if (c.done === c.total) continue
		const share = c.done / c.total
		if (!best || share > best.share) best = { category: c.category, share }
	}
	return best?.category
}

/** Unfound items of `category` in the tracker's order (group, then name), at most `limit`. */
export function whatsNext(
	items: SeedItem[],
	records: Records,
	category: string,
	limit: number
): SeedItem[] {
	const open = countable(items).filter(
		(item) => item.category === category && !records[item.id]?.done
	)
	return [...groupItems(open).values()].flat().slice(0, limit)
}

/** Finds whose tick (stored in UTC) falls on `now`'s local calendar day. */
export function foundToday(items: SeedItem[], records: Records, now: Date): number {
	const today = localDayKey(now)
	return countable(items).filter((item) => {
		const record = records[item.id]
		return record?.done === true && localDayKey(new Date(record.updated_at)) === today
	}).length
}

/** Newest `added` first, ties by id, at most `limit`. */
export function latestRumours(rumours: Rumour[], limit: number): Rumour[] {
	return [...rumours]
		.sort((a, b) => b.added.localeCompare(a.added) || a.id.localeCompare(b.id))
		.slice(0, limit)
}
```

In `src/pages/[locale]/news.astro`, sort in the frontmatter and render the sorted list:

```astro
import { latestRumours } from "../../model/dashboard"
```

```ts
const { t } = translator(locale as Locale)
// Newest first, the same order as Latest on the hub (dashboard spec §6.3).
const ordered = latestRumours(rumours, rumours.length)
```

Then replace `rumours.length === 0` with `ordered.length === 0` and `rumours.map((rumour) => {` with `ordered.map((rumour) => {`. Remove nothing else.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/model src/test/news-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model/days.ts src/model/days.test.ts src/model/dashboard.ts src/model/dashboard.test.ts "src/pages/[locale]/news.astro" src/test/news-page.test.ts
git commit -m "Add the dashboard model and sort News by date"
```

---

### Task 3: Remember the active profile

**Files:**
- Modify: `src/islands/seenFlag.ts`
- Create: `src/islands/seenFlag.test.ts`
- Modify: `src/model/tracker.ts`
- Test: `src/model/tracker.test.ts`
- Modify: `src/scripts/delete-all.ts`
- Test: `src/scripts/delete-all.test.ts`

**Interfaces:**
- Produces:
  - `ACTIVE_PROFILE_KEY = "rookdex.active-profile"` and `activeProfileStorage: ActiveProfileStore` from `src/islands/seenFlag.ts`.
  - `export interface ActiveProfileStore { read(): string | null; write(id: string): void }` from `src/model/tracker.ts`.
  - `TrackerDeps.activeProfile?: ActiveProfileStore`. Task 4 passes `activeProfileStorage` in.

- [ ] **Step 1: Write the failing tests**

`src/islands/seenFlag.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { ACTIVE_PROFILE_KEY, activeProfileStorage } from "./seenFlag"

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("activeProfileStorage (dashboard spec §5)", () => {
	it("reads and writes one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
		})
		expect(ACTIVE_PROFILE_KEY).toBe("rookdex.active-profile")
		expect(activeProfileStorage.read()).toBeNull()
		activeProfileStorage.write("p1")
		expect(map.get(ACTIVE_PROFILE_KEY)).toBe("p1")
		expect(activeProfileStorage.read()).toBe("p1")
	})

	it("reads null and writes nothing when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked })
		expect(activeProfileStorage.read()).toBeNull()
		expect(() => activeProfileStorage.write("p1")).not.toThrow()
	})
})
```

Add to the end of `src/model/tracker.test.ts`:

```ts
describe("active profile (dashboard spec §5)", () => {
	/** An in-memory stand-in for the localStorage wrapper. */
	function memory(initial: string | null = null) {
		const box = { value: initial }
		const store = {
			read: () => box.value,
			write: vi.fn((id: string) => {
				box.value = id
			}),
		}
		return { box, store }
	}
	/** One database for two trackers, as two page loads would share it. */
	function shared() {
		const factory = new IDBFactory()
		return () => openStore(factory)
	}
	/** A clock that moves a second per call, so profiles sort by creation and not by id. */
	function clock() {
		let second = 0
		return () => new Date(Date.UTC(2026, 8, 16, 10, 0, second++))
	}

	it("reopens the remembered profile", async () => {
		const open = shared()
		const { box, store } = memory()
		const first = make({ openStore: open, activeProfile: store, now: clock() }).tracker
		await first.init()
		await first.createProfile("Dad")
		const dad = first.getState().profileId
		expect(box.value).toBe(dad)

		const second = make({ openStore: open, activeProfile: store, now: clock() }).tracker
		await second.init()
		expect(second.getState().profileId).toBe(dad)
	})

	it("falls back to the first active profile when the saved id is unknown, and rewrites it", async () => {
		const { box, store } = memory("gone")
		const { tracker } = make({ activeProfile: store })
		await tracker.init()
		const first = tracker.getState().profiles[0].id
		expect(tracker.getState().profileId).toBe(first)
		expect(box.value).toBe(first)
	})

	it("falls back when the saved profile was deleted, and writes the delete fallback", async () => {
		const open = shared()
		const { box, store } = memory()
		const first = make({ openStore: open, activeProfile: store, now: clock() }).tracker
		await first.init()
		const player1 = first.getState().profileId
		await first.createProfile("Dad")
		const dad = first.getState().profileId
		await first.deleteProfile(dad)
		expect(box.value).toBe(player1)

		box.value = dad // as if another tab had saved Dad before the delete
		const second = make({ openStore: open, activeProfile: store, now: clock() }).tracker
		await second.init()
		expect(second.getState().profileId).toBe(player1)
		expect(box.value).toBe(player1)
	})

	it("is written on switch and on import into a new profile", async () => {
		const { box, store } = memory()
		const { tracker } = make({ activeProfile: store, now: clock() })
		await tracker.init()
		const player1 = tracker.getState().profileId
		await tracker.createProfile("Dad")
		await tracker.switchProfile(player1)
		expect(box.value).toBe(player1)

		const { file } = buildExport(
			{ id: "x", name: "Imported", created_at: "2026-09-16T10:00:00.000Z" },
			[],
			now()
		)
		const json = JSON.stringify(file)
		await tracker.readImport({ size: json.length, text: async () => json })
		await tracker.confirmImport("new")
		const imported = tracker.getState().profiles.find((p) => p.name === "Imported")
		expect(tracker.getState().profileId).toBe(imported?.id)
		expect(box.value).toBe(imported?.id)
	})

	it("opens the first profile, as before, when storage reads nothing and writes nowhere", async () => {
		const open = shared()
		const blocked = { read: () => null, write: () => {} }
		const first = make({ openStore: open, activeProfile: blocked, now: clock() }).tracker
		await first.init()
		const player1 = first.getState().profileId
		await first.createProfile("Dad")

		const second = make({ openStore: open, activeProfile: blocked, now: clock() }).tracker
		await second.init()
		expect(second.getState().profileId).toBe(player1)
	})
})
```

In `src/scripts/delete-all.test.ts`, the first test's expectation becomes:

```ts
		expect(storage.removeItem.mock.calls).toEqual([["lang"], ["rookdex.active-profile"]])
```

and rename that test to `"deletes the rookdex database, the language choice and the remembered profile, and keeps the one-shot flags"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/islands/seenFlag.test.ts src/model/tracker.test.ts src/scripts/delete-all.test.ts`
Expected: FAIL. `ACTIVE_PROFILE_KEY` is not exported, the tracker ignores `activeProfile`, and delete-all removes only `lang`.

- [ ] **Step 3: Write the implementation**

`src/islands/seenFlag.ts` becomes:

```ts
// The keys Rookdex keeps in localStorage. Here, not in the islands, so the Settings page's delete
// script can name them without pulling React into its bundle.
import type { ActiveProfileStore } from "../model/tracker"

export const INSTALL_SEEN_KEY = "rookdex.install-prompt-seen"
export const HINT_SEEN_KEY = "rookdex.persist-hint-seen"
/** The profile the hub and the tracker open (dashboard spec §5). Holds a random id, nothing else. */
export const ACTIVE_PROFILE_KEY = "rookdex.active-profile"

/** One-shot "already shown" flags in localStorage, tolerant of private mode and blocked storage. */
export function readFlag(key: string): boolean {
	try {
		return localStorage.getItem(key) === "1"
	} catch {
		return false
	}
}

export function writeFlag(key: string): void {
	try {
		localStorage.setItem(key, "1")
	} catch {
		// Blocked storage: the prompt or hint simply shows again next visit.
	}
}

/** The remembered profile id. Never throws: blocked storage reads as null and writes nowhere. */
export const activeProfileStorage: ActiveProfileStore = {
	read() {
		try {
			return localStorage.getItem(ACTIVE_PROFILE_KEY)
		} catch {
			return null
		}
	},
	write(id) {
		try {
			localStorage.setItem(ACTIVE_PROFILE_KEY, id)
		} catch {
			// Blocked storage: the first active profile opens next time, as before.
		}
	},
}
```

The `import type` is erased at build, so `delete-all.ts` still pulls in no tracker code.

In `src/model/tracker.ts`:

1. After the `Announcement` interface, add:

```ts
/** Where the active profile id is remembered between pages (dashboard spec §5). Must never throw. */
export interface ActiveProfileStore {
	read(): string | null
	write(id: string): void
}
```

2. In `TrackerDeps`, after `hintSeen?: boolean`, add:

```ts
	/** Remembers the active profile across pages and reloads. Leave undefined to always open the first. */
	activeProfile?: ActiveProfileStore
```

3. After `profilePatch`, add:

```ts
	/** Shows `profile` and remembers it, so the next page or reload opens the same one. */
	async function show(
		db: Store,
		profile: Profile,
		extra: Partial<TrackerState> = {}
	): Promise<void> {
		set({ ...(await profilePatch(db, profile)), ...extra })
		deps.activeProfile?.write(profile.id)
	}
```

4. In `boot()`, replace the `ensureActiveProfile` line and the final `set(...)`:

```ts
			await purgeDeleted(db, now())
			// The remembered profile when it still exists; otherwise the first active one, written back.
			const saved = deps.activeProfile?.read() ?? null
			const remembered = saved
				? (await listProfiles(db)).find((p) => p.id === saved && !p.deleted_at)
				: undefined
			const profile =
				remembered ??
				(await ensureActiveProfile(db, deps.defaultProfileName, now(), deps.newId))
```

and at the end of the `try`:

```ts
			set({ ...(await profilePatch(db, profile)), status: "ready" })
			if (profile.id !== saved) deps.activeProfile?.write(profile.id)
```

5. Route every profile change through `show`:
   - `switchProfile`: `if (profile) await show(db, profile)`
   - `createProfile`: replace `set(await profilePatch(db, profile))` with `await show(db, profile)`
   - `deleteProfile`: replace `set(await profilePatch(db, next))` with `await show(db, next)`
   - `confirmImport` with `target === "new"`: replace `set({ ...(await profilePatch(db, profile)), pendingImport: undefined })` with `await show(db, profile, { pendingImport: undefined })`

In `src/scripts/delete-all.ts`:

```ts
import { LANG_KEY } from "../i18n/locales"
import { ACTIVE_PROFILE_KEY } from "../islands/seenFlag"
import { DB_NAME } from "../model/store"

export type DeleteResult = "deleted" | "failed" | "unsupported"

/** Removes one localStorage key; blocked storage holds nothing to remove. */
function forget(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch {
		// Blocked storage holds no choice to remove.
	}
}
```

Update the doc comment's sentence about `lang` to: "The language choice (`lang`) and the remembered profile go too, because all data means all (locale spec D9, dashboard spec §5)." Then the success handler becomes:

```ts
		request.onsuccess = () => {
			forget(LANG_KEY)
			forget(ACTIVE_PROFILE_KEY)
			resolve("deleted")
		}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/islands/seenFlag.test.ts src/model src/scripts`
Expected: PASS. `src/scripts/settings.test.ts` may also assert `removeItem` calls; if it fails, add `["rookdex.active-profile"]` after `["lang"]` there.

- [ ] **Step 5: Commit**

```bash
git add src/islands/seenFlag.ts src/islands/seenFlag.test.ts src/model/tracker.ts src/model/tracker.test.ts src/scripts/delete-all.ts src/scripts/delete-all.test.ts
git commit -m "Remember the active profile across pages and reloads"
```

---

### Task 4: Shared tracker plumbing, and Progress links to the hub after launch

**Files:**
- Create: `src/islands/buildTracker.ts`
- Modify: `src/islands/useTracker.ts`
- Modify: `src/islands/Tracker.tsx`
- Modify: `src/islands/tracker/StatsRail.tsx`
- Modify: `src/test/tracker-fixtures.tsx`
- Test: `src/islands/tracker/StatsRail.test.tsx`, `src/islands/Tracker.test.tsx`, `src/islands/Tracker.profiles.test.tsx`

**Interfaces:**
- Consumes: `activeProfileStorage` (Task 3).
- Produces:
  - `buildTracker(defaultProfileName: string, selected?: string[]): Tracker` from `src/islands/buildTracker.ts`.
  - `useTrackerState(tracker: Tracker): TrackerState` and `useShowParam(selected: string[]): void` from `src/islands/useTracker.ts` (`useTracker` is gone).
  - `Bar` exported from `StatsRail.tsx`: `Bar({ id, label, count, countText }: { id: string; label: string; count: Count; countText: string })`.
  - `StatsRail` takes optional `hubHref?: string`.

- [ ] **Step 1: Write the failing tests**

In `src/test/tracker-fixtures.tsx`, `resetBrowser()` also clears localStorage, so a remembered profile from one test never leaks into the next. Add as its first line:

```ts
	localStorage.clear()
```

and extend its doc comment: "Fresh IndexedDB and localStorage, a clean tracker URL, …".

In `src/islands/tracker/StatsRail.test.tsx`, add inside `describe("StatsRail")`:

```tsx
	it("links the Progress heading to the hub when given hubHref (dashboard spec §4)", () => {
		render(
			<StatsRail
				overall={{ done: 0, total: 0 }}
				categories={[]}
				recent={[]}
				hubHref="/en/"
				t={translator("en").t}
			/>
		)
		const link = screen.getByRole("link", { name: "Progress" })
		expect(link).toHaveAttribute("href", "/en/")
		expect(screen.getByRole("heading", { name: "Progress" })).toContainElement(link)
	})

	it("keeps the Progress heading plain without hubHref", () => {
		render(
			<StatsRail overall={{ done: 0, total: 0 }} categories={[]} recent={[]} t={translator("en").t} />
		)
		expect(screen.queryByRole("link", { name: "Progress" })).toBeNull()
	})
```

In `src/islands/Tracker.test.tsx` (it already mocks the seed and uses `renderReady`), add a describe block. Add `afterEach` to its `vitest` import and `renderReady` to its fixtures import if they are missing:

```tsx
describe("Progress heading (dashboard spec §4)", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it("is plain text before launch", async () => {
		// Only Date is faked: fake-indexeddb and Testing Library keep their real timers.
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-11-18T12:00:00Z"))
		await renderReady(<Tracker locale="en" />)
		expect(screen.queryByRole("link", { name: "Progress" })).toBeNull()
	})

	it("links to the hub from launch on", async () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-11-19T00:00:00+01:00"))
		await renderReady(<Tracker locale="en" />)
		expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("href", "/en/")
	})
})
```

In `src/islands/Tracker.profiles.test.tsx`, add inside `describe("profiles in the island")`:

```tsx
	it("reopens the profile picked last time after a reload (dashboard spec §5)", async () => {
		const first = await ready()
		openMenu()
		fireEvent.click(screen.getByRole("menuitem", { name: "New profile" }))
		const dialog = screen.getByRole("dialog", { name: "New profile" })
		fireEvent.change(within(dialog).getByLabelText("Profile name"), { target: { value: "Dad" } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
		await screen.findByRole("button", { name: "Profile: Dad" })
		first.unmount()

		await ready()
		expect(screen.getByRole("button", { name: "Profile: Dad" })).toBeInTheDocument()
	})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/islands`
Expected: FAIL. StatsRail has no `hubHref`, the tracker heading never links, and the reload test opens "Player 1".

- [ ] **Step 3: Write the implementation**

`src/islands/buildTracker.ts`:

```ts
import { seedItems } from "../model/seed"
import { openStore } from "../model/store"
import { createTracker, type Tracker } from "../model/tracker"
import { activeProfileStorage, HINT_SEEN_KEY, readFlag } from "./seenFlag"

/**
 * Both islands build their tracker here, so the hub and the tracker page open the same database,
 * the same seed and the same remembered profile in the same way (dashboard spec §3).
 */
export function buildTracker(defaultProfileName: string, selected: string[] = []): Tracker {
	return createTracker({
		openStore: () => openStore(indexedDB),
		items: seedItems,
		defaultProfileName,
		selected,
		persist:
			typeof navigator.storage?.persist === "function"
				? () => navigator.storage.persist()
				: undefined,
		installed: window.matchMedia("(display-mode: standalone)").matches,
		hintSeen: readFlag(HINT_SEEN_KEY),
		activeProfile: activeProfileStorage,
	})
}
```

`src/islands/useTracker.ts` becomes:

```ts
import { useEffect, useSyncExternalStore } from "react"
import { showParam, type Tracker, type TrackerState } from "../model/tracker"

/** Controller: subscribes to the model and boots it once. The tracker page and the hub both use it. */
export function useTrackerState(tracker: Tracker): TrackerState {
	const state = useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState)

	useEffect(() => {
		tracker.init()
	}, [tracker])

	return state
}

/** Mirrors the category selection to `?show=`. Tracker page only. */
export function useShowParam(selected: string[]): void {
	useEffect(() => {
		// Always re-serialised from state; the raw parameter is never echoed back.
		const url = new URL(window.location.href)
		const value = showParam(selected)
		if (value) url.searchParams.set("show", value)
		else url.searchParams.delete("show")
		window.history.replaceState(null, "", url)
	}, [selected])
}
```

In `src/islands/Tracker.tsx`:

1. Imports: remove `openStore`, `createTracker`, `type Tracker as TrackerModel`, `readFlag` and `useTracker`. Add:

```ts
import { hubPhase } from "../model/launch"
import { parseShow } from "../model/tracker"
import { buildTracker } from "./buildTracker"
import { HINT_SEEN_KEY, writeFlag } from "./seenFlag"
import { useShowParam, useTrackerState } from "./useTracker"
```

2. Delete the local `buildTracker` function (lines 26-39).

3. The top of the component becomes:

```tsx
export function Tracker({ locale }: Props) {
	const { t } = translator(locale)
	const [tracker] = useState(() =>
		buildTracker(
			t("profile.defaultName"),
			parseShow(window.location.search, categoryIds(seedItems))
		)
	)
	const state = useTrackerState(tracker)
	useShowParam(state.selected)
	// From launch on the hub is the dashboard, so Progress links there (dashboard spec §4).
	const [hubHref] = useState(() =>
		hubPhase(new Date()) === "after" ? `/${locale}/` : undefined
	)
```

4. Pass it on: `<StatsRail … hubHref={hubHref} t={t} />`.

In `src/islands/tracker/StatsRail.tsx`:

1. `function Bar(` becomes `export function Bar(`.
2. Add `hubHref?: string` to `Props` with the comment `/** From launch on, Progress links to the hub (dashboard spec §4). */`, and destructure it.
3. The heading becomes:

```tsx
			<h2 id="stats-heading">
				{hubHref ? <a href={hubHref}>{t("tracker.progress")}</a> : t("tracker.progress")}
			</h2>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/islands src/test`
Expected: PASS, including every existing Tracker test.

- [ ] **Step 5: Commit**

```bash
git add src/islands/buildTracker.ts src/islands/useTracker.ts src/islands/Tracker.tsx src/islands/tracker/StatsRail.tsx src/islands/tracker/StatsRail.test.tsx src/islands/Tracker.test.tsx src/islands/Tracker.profiles.test.tsx src/test/tracker-fixtures.tsx
git commit -m "Share the tracker setup and link Progress to the hub after launch"
```

---

### Task 5: ProfileMenu switch mode

**Files:**
- Modify: `src/islands/tracker/ProfileMenu.tsx`
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Test: `src/islands/tracker/ProfileMenu.test.tsx`

**Interfaces:**
- Produces: `ProfileMenu` with `onNew`, `onRename`, `onExport`, `onImport`, `onDelete`, `onDeleted` all optional, plus `manageHref?: string`. Copy key `hub.manageProfiles`.

- [ ] **Step 1: Write the failing test**

Add inside `describe("ProfileMenu")` in `src/islands/tracker/ProfileMenu.test.tsx`:

```tsx
	it("in switch mode lists only the profiles and the manage link (dashboard spec §4)", async () => {
		const onSwitch = vi.fn()
		const { container } = render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={onSwitch}
				manageHref="/en/tracker/"
				t={translator("en").t}
			/>
		)
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
			"Player 1",
			"Dad",
		])
		const manage = screen.getByRole("menuitem", { name: "Manage profiles" })
		expect(manage).toHaveAttribute("href", "/en/tracker/")
		expect(screen.getAllByRole("menuitem")).toHaveLength(1)
		// Arrow keys reach the link like any other item.
		fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" })
		expect(manage).toHaveFocus()
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		expect(onSwitch).toHaveBeenCalledWith("p2")
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(await axe(container)).toHaveNoViolations()
	})

	it("with no actions and no manage link, draws no separator", () => {
		render(
			<ProfileMenu
				profiles={profiles}
				current={profiles[0]}
				onSwitch={vi.fn()}
				t={translator("en").t}
			/>
		)
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getByRole("menu").querySelector("hr")).toBeNull()
	})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/islands/tracker/ProfileMenu.test.tsx`
Expected: FAIL. TypeScript-wise the props are required, and at runtime six action items render.

- [ ] **Step 3: Write the implementation**

Add the copy key after `"hub.openTracker"` in both bundles:

`src/locales/en.json`: `"hub.manageProfiles": "Manage profiles",`
`src/locales/nb.json`: `"hub.manageProfiles": "Administrer profiler",`

In `src/islands/tracker/ProfileMenu.tsx`, `Props` becomes:

```ts
interface Props {
	profiles: Profile[]
	current: Profile | undefined
	onSwitch: (id: string) => void
	// The actions are optional: the hub shows the menu in switch mode with none of them
	// (dashboard spec §4). Each one given becomes a menu item.
	onNew?: () => void
	onRename?: () => void
	onExport?: () => void
	onImport?: () => void
	onDelete?: () => void
	onDeleted?: () => void
	/** Adds a "Manage profiles" link under the profiles; the hub points it at the tracker. */
	manageHref?: string
	t: Translate
	/** The parent may own the trigger ref so a dialog opened from the menu can return focus to it. */
	triggerRef?: RefObject<HTMLButtonElement | null>
}
```

Destructure `manageHref` too. Replace the `actions` constant and the list tail:

```tsx
	const actions = (
		[
			[t("profile.new"), onNew],
			[t("profile.rename"), onRename],
			[t("profile.export"), onExport],
			[t("profile.import"), onImport],
			[t("profile.delete"), onDelete],
			[t("profile.deleted"), onDeleted],
		] as const
	).filter((entry): entry is readonly [string, () => void] => entry[1] !== undefined)
	const hasExtras = actions.length > 0 || manageHref !== undefined
```

```tsx
					{hasExtras && (
						<li role="none">
							<hr />
						</li>
					)}
					{actions.map(([label, action]) => (
						<li key={label} role="none">
							<button type="button" role="menuitem" onClick={() => run(action)}>
								{label}
							</button>
						</li>
					))}
					{manageHref && (
						<li role="none">
							<a role="menuitem" href={manageHref}>
								{t("hub.manageProfiles")}
							</a>
						</li>
					)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/islands src/i18n`
Expected: PASS (bundles.test.ts confirms both bundles carry the new key).

- [ ] **Step 5: Commit**

```bash
git add src/islands/tracker/ProfileMenu.tsx src/islands/tracker/ProfileMenu.test.tsx src/locales/en.json src/locales/nb.json
git commit -m "Let the profile menu run in switch mode with a manage link"
```

---

### Task 6: Build time, the clock and the preview override

**Files:**
- Create: `src/model/build-now.ts`, `src/model/build-now.test.ts`
- Modify: `src/islands/useCountdown.ts`
- Create: `src/islands/hub/useHubPhase.ts`, `src/islands/hub/useHubPhase.test.ts`

**Interfaces:**
- Produces:
  - `buildNow(raw: string | undefined, fallback?: () => Date): Date`. Throws an `Error` whose message names `ROOKDEX_NOW`.
  - `CountdownState.now: Date`: the moment the state was computed. On the first render it is the exact `initialNow` object passed in.
  - `overrideAllowed(hostname: string, dev: boolean): boolean`, `wantsAfter(search: string): boolean`, `useHubPhase(initialNow: Date, dev?: boolean): CountdownState` from `src/islands/hub/useHubPhase.ts`.

- [ ] **Step 1: Write the failing tests**

`src/model/build-now.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildNow } from "./build-now"

describe("buildNow (dashboard spec §6.4)", () => {
	it("is the build clock when ROOKDEX_NOW is unset or empty", () => {
		const clock = new Date("2026-10-14T10:00:00Z")
		expect(buildNow(undefined, () => clock)).toBe(clock)
		expect(buildNow("", () => clock)).toBe(clock)
	})

	it("uses ROOKDEX_NOW when it parses", () => {
		expect(buildNow("2026-11-20T12:00:00Z").toISOString()).toBe("2026-11-20T12:00:00.000Z")
	})

	it("fails the build, naming the variable, when it does not parse", () => {
		expect(() => buildNow("next thursday")).toThrow(/ROOKDEX_NOW/)
	})
})
```

`src/islands/hub/useHubPhase.test.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { overrideAllowed, useHubPhase, wantsAfter } from "./useHubPhase"

const built = new Date("2026-09-10T10:00:00Z")

describe("where ?phase=after may count (dashboard spec §3)", () => {
	it.each([
		["localhost", false, true],
		["127.0.0.1", false, true],
		["rookdex-preview.malin.workers.dev", false, true],
		["rookdex.app", false, false],
		["workers.dev.example.com", false, false],
		["notworkers.dev", false, false],
		["rookdex.app", true, true],
	])("%s (dev %s) allows it: %s", (host, dev, allowed) => {
		expect(overrideAllowed(host, dev)).toBe(allowed)
	})

	it.each([
		["?phase=after", true],
		["?phase=AFTER", false],
		["?phase=after%20", false],
		["?phase=after&phase=before", false],
		["?phase=after&phase=after", false],
		["?phase=", false],
		["", false],
	])("%s asks for the after state: %s", (search, wanted) => {
		expect(wantsAfter(search)).toBe(wanted)
	})
})

describe("useHubPhase", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		window.history.replaceState(null, "", "/en/")
	})
	afterEach(() => {
		vi.useRealTimers()
		window.history.replaceState(null, "", "/")
	})

	it("starts on the build clock, then follows the device clock and flips at zero", () => {
		vi.setSystemTime(new Date("2026-11-18T22:59:59Z"))
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("before")
		act(() => {
			vi.advanceTimersByTime(2_000)
		})
		expect(result.current.phase).toBe("after")
		expect(result.current.now.toISOString()).toBe("2026-11-18T23:00:01.000Z")
	})

	it("keeps the initialNow object as now until the device clock takes over", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		const seen: Date[] = []
		renderHook(() => {
			const state = useHubPhase(built, false)
			seen.push(state.now)
			return state
		})
		expect(seen[0]).toBe(built)
		expect(seen.at(-1)).not.toBe(built)
	})

	it("honours ?phase=after on localhost before launch", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		window.history.replaceState(null, "", "/en/?phase=after")
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("after")
	})

	it("ignores any other value", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		window.history.replaceState(null, "", "/en/?phase=AFTER")
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("before")
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/model/build-now.test.ts src/islands/hub/useHubPhase.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the implementation**

`src/model/build-now.ts`:

```ts
/**
 * The hub's server-side "now" (dashboard spec §6.4): the build clock, or `ROOKDEX_NOW` when a test
 * build sets it to an ISO timestamp. Production never sets it. A value that doesn't parse fails the
 * build here, instead of shipping `Invalid Date`.
 */
export function buildNow(raw: string | undefined, fallback: () => Date = () => new Date()): Date {
	if (raw === undefined || raw === "") return fallback()
	const date = new Date(raw)
	if (Number.isNaN(date.getTime())) {
		throw new Error(`ROOKDEX_NOW must be an ISO timestamp, got "${raw}"`)
	}
	return date
}
```

In `src/islands/useCountdown.ts`, add `now` to the state:

```ts
export interface CountdownState {
	/** The moment this state was computed. The first render's is the build-time `initialNow`. */
	now: Date
	phase: HubPhase
	parts: CountdownParts
	daysToGo: number
	daysSince: number
	/** Seconds are hidden and the tick slows to once a minute. */
	reducedMotion: boolean
}

function compute(now: Date, reducedMotion: boolean): CountdownState {
	return {
		now,
		phase: hubPhase(now),
		parts: countdownParts(now),
		daysToGo: daysToGo(now),
		daysSince: daysSince(now),
		reducedMotion,
	}
}
```

`src/islands/hub/useHubPhase.ts`:

```ts
import { useEffect, useState } from "react"
import { type CountdownState, useCountdown } from "../useCountdown"

/**
 * Hosts where `?phase=after` may preview the dashboard: Workers previews, a local server and dev
 * (dashboard spec §3). Production is none of these, so nobody sees the dashboard early by accident.
 */
export function overrideAllowed(hostname: string, dev: boolean): boolean {
	return (
		dev ||
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname.endsWith(".workers.dev")
	)
}

/** Exactly one `phase` parameter, exactly `after`. Anything else is ignored without a message. */
export function wantsAfter(search: string): boolean {
	const values = new URLSearchParams(search).getAll("phase")
	return values.length === 1 && values[0] === "after"
}

/**
 * The countdown's clock plus the preview override. The first render uses the build clock and no
 * override, so it matches the server HTML; the override is read once the page has mounted.
 */
export function useHubPhase(
	initialNow: Date,
	dev: boolean = import.meta.env.DEV
): CountdownState {
	const state = useCountdown(initialNow)
	const [forced, setForced] = useState(false)

	useEffect(() => {
		setForced(
			wantsAfter(window.location.search) && overrideAllowed(window.location.hostname, dev)
		)
	}, [dev])

	return forced ? { ...state, phase: "after" } : state
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/model src/islands`
Expected: PASS, including `useCountdown.test.ts` and the existing `Countdown.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/model/build-now.ts src/model/build-now.test.ts src/islands/useCountdown.ts src/islands/hub/useHubPhase.ts src/islands/hub/useHubPhase.test.ts
git commit -m "Add the build clock variable and the hub phase hook"
```

---

### Task 7: The dashboard's read-only blocks

**Files:**
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Create: `src/islands/hub/limits.ts`
- Create: `src/islands/hub/StatPair.tsx`, `src/islands/hub/StatStrip.tsx`, `src/islands/hub/DashboardSkeleton.tsx`, `src/islands/hub/Dashboard.tsx`
- Test: `src/islands/hub/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `buildTracker` and `useTrackerState` (Task 4), `ProfileMenu` switch mode (Task 5), `Bar` (Task 4), `closestCategory`, `whatsNext`, `foundToday` (Task 2), `dayFromKey` (Task 2).
- Produces:
  - `NEXT_LIMIT = 3`, `RECENT_LIMIT = 5`, `LATEST_LIMIT = 3` from `src/islands/hub/limits.ts`.
  - `DashboardSkeleton({ categoryCount: number; t: Translate })`.
  - `interface DashboardProps { locale: Locale; today: string; daysSince: number; guideHref: string; trackerHref: string; announce: (message: string) => void }` and `Dashboard(props: DashboardProps)` from `src/islands/hub/Dashboard.tsx`.

- [ ] **Step 1: Add the copy**

Add after `"hub.manageProfiles"` in `src/locales/en.json`:

```json
	"hub.dashboardHeading": "Your progress",
	"hub.overall": "Overall",
	"hub.closest": "Closest: {category}",
	"hub.allFound": "All found",
	"hub.foundToday.one": "{count} found today",
	"hub.foundToday.other": "{count} found today",
	"hub.whatsNext": "What's next",
	"hub.everythingFound": "You've found everything tracked so far.",
	"hub.latest": "Latest",
	"hub.allNews": "All news",
	"hub.newHere": "New to GTA VI? Before you start",
	"hub.markedFound": "{item} marked as found.",
	"hub.undo": "Undo",
	"hub.undone": "{item} marked as not found.",
	"hub.switched": "Showing {name}.",
	"hub.loadFailed": "Your progress couldn't load. Reload the page to try again.",
```

and in the same place in `src/locales/nb.json`:

```json
	"hub.dashboardHeading": "Din fremgang",
	"hub.overall": "Totalt",
	"hub.closest": "Nærmest: {category}",
	"hub.allFound": "Alt funnet",
	"hub.foundToday.one": "{count} funnet i dag",
	"hub.foundToday.other": "{count} funnet i dag",
	"hub.whatsNext": "Neste",
	"hub.everythingFound": "Du har funnet alt vi følger så langt.",
	"hub.latest": "Siste nytt",
	"hub.allNews": "Alle nyheter",
	"hub.newHere": "Ny i GTA VI? Før du starter",
	"hub.markedFound": "{item} er merket som funnet.",
	"hub.undo": "Angre",
	"hub.undone": "{item} er merket som ikke funnet.",
	"hub.switched": "Viser {name}.",
	"hub.loadFailed": "Fremgangen din kunne ikke lastes. Last inn siden på nytt for å prøve igjen.",
```

Run: `npx vitest run src/i18n`
Expected: PASS.

- [ ] **Step 2: Write the failing test**

`src/islands/hub/Dashboard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { createProfile } from "../../model/profiles"
import { setDone } from "../../model/progress"
import { openStore } from "../../model/store"
import { resetBrowser } from "../../test/tracker-fixtures"
import { Dashboard, type DashboardProps } from "./Dashboard"

vi.mock("../../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../model/seed")>()
	const { fixtures } = await import("../../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

const announce = vi.fn()

beforeEach(() => {
	resetBrowser()
	announce.mockReset()
})

/** Profiles p1, p2, … in creation order; `found` maps item id to tick time, all on p1. */
async function seed(names: string[], found: Record<string, string> = {}) {
	const db = await openStore(indexedDB)
	for (const [index, name] of names.entries()) {
		await createProfile(db, name, new Date(Date.UTC(2026, 8, 1, 0, 0, index)), () => `p${index + 1}`)
	}
	for (const [id, at] of Object.entries(found)) await setDone(db, "p1", id, true, new Date(at))
	db.close()
}

function props(today = "2026-11-20"): DashboardProps {
	return {
		locale: "en",
		today,
		daysSince: 1,
		guideHref: "/en/guides/before-you-start/",
		trackerHref: "/en/tracker/",
		announce,
	}
}

async function ready(today?: string) {
	const view = render(<Dashboard {...props(today)} />)
	await screen.findByRole("button", { name: /^Profile: / })
	return view
}

/** A tile's value: the dd after its dt. */
function tile(label: string) {
	return screen.getByText(label).nextElementSibling
}

// Midday UTC, so the local day matches in any time zone the tests run in.
const NOV_20 = "2026-11-20T12:00:00Z"
const NOV_19 = "2026-11-19T12:00:00Z"

describe("Dashboard blocks (dashboard spec §4)", () => {
	it("shows the skeleton first, then the player's numbers", async () => {
		const { container } = render(<Dashboard {...props()} />)
		expect(container.querySelector(".is-skeleton")).not.toBeNull()
		expect(screen.getByText("Loading your progress…")).toBeInTheDocument()
		await screen.findByRole("button", { name: "Profile: Player 1" })
		expect(container.querySelector(".is-skeleton")).toBeNull()
	})

	it("gives a newcomer 0 %, Wildlife as the goal and the before-you-start link", async () => {
		await ready()
		expect(tile("Overall")).toHaveTextContent("0%")
		expect(tile("Closest: Wildlife")).toHaveTextContent("0%")
		expect(screen.getByRole("link", { name: "New to GTA VI? Before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
		expect(screen.getByText("Day 1 since launch")).toBeInTheDocument()
		expect(screen.getByText("Nothing ticked yet.")).toBeInTheDocument()
	})

	it("counts today's finds, fills the tiles and drops the newcomer link", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20, "vehicles/bike": NOV_19 })
		await ready("2026-11-20")
		expect(screen.getByText("1 found today")).toBeInTheDocument()
		expect(screen.queryByRole("link", { name: /New to GTA VI/ })).toBeNull()
		expect(tile("Overall")).toHaveTextContent("66%")
		// Vehicles is done, so the closest unfinished category is Wildlife at 1 of 2.
		expect(tile("Closest: Wildlife")).toHaveTextContent("50%")
		expect(screen.getAllByRole("progressbar").map((bar) => bar.getAttribute("aria-valuetext"))).toEqual([
			"1 of 1",
			"1 of 2",
		])
		expect(screen.getByRole("list", { name: "Recent finds" })).toHaveTextContent("Pelican")
	})

	it("rolls found today over when the day changes", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20 })
		const view = await ready("2026-11-20")
		expect(screen.getByText("1 found today")).toBeInTheDocument()
		view.rerender(<Dashboard {...props("2026-11-21")} />)
		expect(screen.getByText("0 found today")).toBeInTheDocument()
	})

	it("says All found once every item is found", async () => {
		await seed(["Player 1"], {
			"wildlife/pelican": NOV_20,
			"wildlife/american-alligator": NOV_20,
			"vehicles/bike": NOV_20,
		})
		await ready()
		expect(tile("All found")).toHaveTextContent("100%")
		expect(screen.queryByText(/^Closest:/)).toBeNull()
	})

	it("switches profile from the chip and announces it", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		expect(screen.getByRole("menuitem", { name: "Manage profiles" })).toHaveAttribute(
			"href",
			"/en/tracker/"
		)
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await screen.findByRole("button", { name: "Profile: Dad" })
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
	})

	it("shows the storage alert when IndexedDB will not open", async () => {
		Object.defineProperty(globalThis, "indexedDB", {
			value: {
				open() {
					throw new Error("blocked")
				},
			},
			configurable: true,
		})
		render(<Dashboard {...props()} />)
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Your browser is blocking local storage"
		)
	})

	it("has no axe violations, loading or ready", async () => {
		const { container } = render(<Dashboard {...props()} />)
		expect(await axe(container)).toHaveNoViolations()
		await screen.findByRole("button", { name: "Profile: Player 1" })
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/islands/hub/Dashboard.test.tsx`
Expected: FAIL with "Failed to resolve import ./Dashboard".

- [ ] **Step 4: Write the implementation**

`src/islands/hub/limits.ts`:

```ts
// Row counts the dashboard and its skeleton share, so both reserve the same height (spec §4).
// Its own module, so the hub can size the skeleton without loading the dashboard.
export const NEXT_LIMIT = 3
export const RECENT_LIMIT = 5
export const LATEST_LIMIT = 3
```

`src/islands/hub/StatPair.tsx`:

```tsx
import type { Locale, Translate } from "../../i18n"
import type { Count } from "../../model/stats"

interface Props {
	locale: Locale
	overall: Count
	/** The closest category's count and label; undefined once everything is found. */
	closest: (Count & { label: string }) | undefined
	t: Translate
}

/** Whole percent rounded down, so a tile never says 100 % before the last find. */
function share(count: Count): number {
	return count.total === 0 ? 0 : Math.floor((count.done * 100) / count.total) / 100
}

/** The big pair: Overall and Closest, each number with its label in text (spec §4, §9). */
export function StatPair({ locale, overall, closest, t }: Props) {
	const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 })
	return (
		<dl className="stat-pair">
			<div className="stat-tile">
				<dt>{t("hub.overall")}</dt>
				<dd>{percent.format(share(overall))}</dd>
			</div>
			<div className="stat-tile">
				<dt>{closest ? t("hub.closest", { category: closest.label }) : t("hub.allFound")}</dt>
				<dd>{percent.format(closest ? share(closest) : 1)}</dd>
			</div>
		</dl>
	)
}
```

`src/islands/hub/StatStrip.tsx`:

```tsx
import type { Translate, Translator } from "../../i18n"

interface Props {
	/** No finds at all on this profile: the first half is the before-you-start link instead. */
	newcomer: boolean
	foundToday: number
	daysSince: number
	guideHref: string
	t: Translate
	plural: Translator["plural"]
}

/** "N found today · Day N since launch". The newcomer link takes the same slot, so it never shifts. */
export function StatStrip({ newcomer, foundToday, daysSince, guideHref, t, plural }: Props) {
	return (
		<p className="stat-strip">
			<span className="stat-strip-first">
				{newcomer ? (
					<a href={guideHref}>{t("hub.newHere")}</a>
				) : (
					plural("hub.foundToday", foundToday)
				)}
			</span>
			<span aria-hidden="true">·</span>
			<span>{t("hub.daySince", { n: daysSince })}</span>
		</p>
	)
}
```

`src/islands/hub/DashboardSkeleton.tsx`:

```tsx
import type { Translate } from "../../i18n"
import { NEXT_LIMIT, RECENT_LIMIT } from "./limits"

interface Props {
	categoryCount: number
	t: Translate
}

const keys = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, n) => `${prefix}-${n}`)

/**
 * The dashboard's blocks at their fixed and reserved heights, with the real headings, so swapping
 * it for the dashboard shifts nothing (dashboard spec §4, §10). Hidden from screen readers, which
 * hear the loading line instead.
 */
export function DashboardSkeleton({ categoryCount, t }: Props) {
	return (
		<div className="dashboard is-skeleton">
			<p className="visually-hidden">{t("tracker.loading")}</p>
			<div className="dash-top" aria-hidden="true">
				<span className="skeleton skeleton-chip" />
			</div>
			<dl className="stat-pair" aria-hidden="true">
				{keys("tile", 2).map((key) => (
					<div key={key} className="stat-tile skeleton">
						<dt>&nbsp;</dt>
						<dd>&nbsp;</dd>
					</div>
				))}
			</dl>
			<p className="stat-strip" aria-hidden="true">
				<span className="stat-strip-first">&nbsp;</span>
			</p>
			<p className="tracker-alert" />
			<section className="whats-next" aria-hidden="true">
				<h2>{t("hub.whatsNext")}</h2>
				<ul className="next-list">
					{keys("row", NEXT_LIMIT).map((key) => (
						<li key={key} className="next-row skeleton" />
					))}
				</ul>
			</section>
			<section className="dash-progress" aria-hidden="true">
				<h2>{t("tracker.progress")}</h2>
				{keys("bar", categoryCount).map((key) => (
					<div key={key} className="progress">
						<div className="progress-label">
							<span>&nbsp;</span>
						</div>
						<div className="bar" />
					</div>
				))}
			</section>
			<section className="dash-recent" aria-hidden="true">
				<h2>{t("tracker.recent")}</h2>
				<ul className="recent">
					{keys("find", RECENT_LIMIT).map((key) => (
						<li key={key}>&nbsp;</li>
					))}
				</ul>
			</section>
		</div>
	)
}
```

`src/islands/hub/Dashboard.tsx` (Task 8 adds What's next and Undo between the strip and Progress):

```tsx
import { useMemo, useState } from "react"
import { type Locale, seedLabel, translator } from "../../i18n"
import { closestCategory, foundToday, whatsNext } from "../../model/dashboard"
import { dayFromKey } from "../../model/days"
import { activeProfiles } from "../../model/profiles"
import { type Count, countable, countItems, perCategory, recentFinds } from "../../model/stats"
import { buildTracker } from "../buildTracker"
import { ProfileMenu } from "../tracker/ProfileMenu"
import { Bar } from "../tracker/StatsRail"
import { useTrackerState } from "../useTracker"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { NEXT_LIMIT, RECENT_LIMIT } from "./limits"
import { StatPair } from "./StatPair"
import { StatStrip } from "./StatStrip"

export interface DashboardProps {
	locale: Locale
	/** The device's calendar day, `YYYY-MM-DD`, from the hub's clock. Rolls over at local midnight. */
	today: string
	daysSince: number
	guideHref: string
	trackerHref: string
	/** Writes one line to the hub's status region. */
	announce: (message: string) => void
}

/**
 * The hub after launch (dashboard spec §4). Loaded only in the after phase, so visitors before
 * launch never download the tracker model. Builds its own tracker over the shared IndexedDB.
 */
export function Dashboard({
	locale,
	today,
	daysSince,
	guideHref,
	trackerHref,
	announce,
}: DashboardProps) {
	const { t, plural } = translator(locale)
	const [tracker] = useState(() => buildTracker(t("profile.defaultName")))
	const state = useTrackerState(tracker)
	const { items, records } = state

	// One pass per change of data or day (spec §6.1 step 3).
	const view = useMemo(() => {
		const closest = closestCategory(items, records)
		return {
			overall: countItems(items, records),
			categories: perCategory(countable(items), records),
			closest,
			next: closest ? whatsNext(items, records, closest, NEXT_LIMIT) : [],
			foundToday: foundToday(items, records, dayFromKey(today)),
			recent: recentFinds(items, records, RECENT_LIMIT),
		}
	}, [items, records, today])

	if (state.status === "error") {
		return (
			<p className="tracker-alert" role="alert">
				{t("tracker.storageError")}
			</p>
		)
	}
	if (state.status === "loading") {
		return <DashboardSkeleton categoryCount={view.categories.length} t={t} />
	}

	const current = state.profiles.find((p) => p.id === state.profileId)
	const label = (id: string) => seedLabel(t, "category", id)
	const countText = (count: Count) => t("tracker.count", { done: count.done, total: count.total })
	const closest = view.categories.find((c) => c.category === view.closest)

	async function switchTo(id: string) {
		await tracker.switchProfile(id)
		const after = tracker.getState()
		const name = after.profiles.find((p) => p.id === id)?.name
		if (after.profileId === id && name) announce(t("hub.switched", { name }))
	}

	return (
		<div className="dashboard">
			<div className="dash-top">
				<ProfileMenu
					profiles={activeProfiles(state.profiles)}
					current={current}
					onSwitch={switchTo}
					manageHref={trackerHref}
					t={t}
				/>
			</div>
			<StatPair
				locale={locale}
				overall={view.overall}
				closest={closest ? { ...closest, label: label(closest.category) } : undefined}
				t={t}
			/>
			<StatStrip
				newcomer={view.overall.done === 0}
				foundToday={view.foundToday}
				daysSince={daysSince}
				guideHref={guideHref}
				t={t}
				plural={plural}
			/>
			<section className="dash-progress" aria-labelledby="dash-progress-heading">
				<h2 id="dash-progress-heading">{t("tracker.progress")}</h2>
				{view.categories.map((c) => (
					<Bar
						key={c.category}
						id={`dash-progress-${c.category}`}
						label={label(c.category)}
						count={c}
						countText={countText(c)}
					/>
				))}
			</section>
			<section className="dash-recent" aria-labelledby="dash-recent-heading">
				<h2 id="dash-recent-heading">{t("tracker.recent")}</h2>
				{view.recent.length === 0 ? (
					<p className="stats-empty">{t("tracker.noRecent")}</p>
				) : (
					<ul className="recent" aria-labelledby="dash-recent-heading">
						{view.recent.map((find) => (
							<li key={find.item.id}>{find.item.name}</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/islands/hub src/i18n`
Expected: PASS. If the storage-alert test hangs because `openStore` never rejects, check how `src/model/store.ts` opens the factory and make the stub's `open` return a request that fires `onerror` instead; the assertion stays the same.

- [ ] **Step 6: Commit**

```bash
git add src/locales/en.json src/locales/nb.json src/islands/hub/limits.ts src/islands/hub/StatPair.tsx src/islands/hub/StatStrip.tsx src/islands/hub/DashboardSkeleton.tsx src/islands/hub/Dashboard.tsx src/islands/hub/Dashboard.test.tsx
git commit -m "Add the dashboard's tiles, strip, progress and recent finds"
```

---

### Task 8: What's next, ticking and Undo

**Files:**
- Create: `src/islands/hub/WhatsNext.tsx`, `src/islands/hub/WhatsNext.test.tsx`
- Create: `src/islands/hub/UndoToast.tsx`, `src/islands/hub/UndoToast.test.tsx`
- Modify: `src/islands/hub/Dashboard.tsx`
- Test: `src/islands/hub/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `Dashboard` from Task 7; `tracker.tick`, `tracker.untick`, `TrackerState.error`.
- Produces:
  - `LEAVE_MS = 200`, `LOCK_MS = 400`, `nextBoxId(itemId: string): string`, `WhatsNext(props)` from `WhatsNext.tsx`. Props: `{ items: SeedItem[]; disabled: boolean; onTick: (id: string) => Promise<boolean>; t: Translate; zoneRef: RefObject<HTMLElement | null>; headingRef: RefObject<HTMLHeadingElement | null>; children?: ReactNode }`.
  - `TOAST_MS = 5_000`, `UndoToast(props)` from `UndoToast.tsx`. Props: `{ item: { id: string; name: string }; error: string; onUndo: () => void; onClose: () => void; zoneRef: RefObject<HTMLElement | null>; onEscapeFocus: () => void; t: Translate }`.

**Focus rule used here:** after a tick, focus goes to the checkbox in the row that now sits where the ticked one was (or the last row, or the heading when none is left). The spec calls it "the filled-in row"; this reading keeps a keyboard player in place to tick down the list, and matches the "item that just slid in under the finger" in spec §6.1 step 1.

- [ ] **Step 1: Write the failing unit tests**

`src/islands/hub/WhatsNext.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { LEAVE_MS, LOCK_MS, WhatsNext } from "./WhatsNext"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const item = (name: string): SeedItem => ({
	id: `wildlife/${name.toLowerCase()}`,
	category: "wildlife",
	group: "birds",
	name,
	status: "confirmed",
	sources: [src],
})
const birds = ["Avocet", "Bittern", "Crane", "Dunlin"].map(item)
const { t } = translator("en")

/** What's next over a list the test owns: a saved tick removes the item, as the model would. */
function Harness({
	initial = birds,
	save,
}: {
	initial?: SeedItem[]
	save: (id: string) => Promise<boolean>
}) {
	const [open, setOpen] = useState(initial)
	const zone = useRef<HTMLElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	return (
		<WhatsNext
			items={open.slice(0, 3)}
			disabled={false}
			t={t}
			zoneRef={zone}
			headingRef={heading}
			onTick={async (id) => {
				const saved = await save(id)
				if (saved) setOpen((list) => list.filter((i) => i.id !== id))
				return saved
			}}
		/>
	)
}

/** Runs due timers and every promise callback queued meanwhile. */
const advance = (ms: number) =>
	act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})
const box = (name: string) => screen.getByRole("checkbox", { name })
const row = (name: string) => box(name).closest("li")

function reduceMotion() {
	return vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: query.includes("reduce"),
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => false),
			}) as unknown as MediaQueryList
	)
}

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("What's next (dashboard spec §4, §6.1)", () => {
	it("slides the ticked row out and fills the list, with focus on the row in its place", async () => {
		render(<Harness save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(0)
		expect(row("Avocet")).toHaveAttribute("data-leaving")
		expect(box("Avocet")).toBeChecked()
		await advance(LEAVE_MS)
		expect(screen.queryByRole("checkbox", { name: "Avocet" })).toBeNull()
		expect(screen.getAllByRole("checkbox").map((b) => b.id)).toEqual([
			"next-wildlife/bittern",
			"next-wildlife/crane",
			"next-wildlife/dunlin",
		])
		expect(row("Dunlin")).toHaveAttribute("data-entering")
		expect(box("Bittern")).toHaveFocus()
	})

	it("ignores another tick while one is in flight and for 400 ms after it lands", async () => {
		let land: (saved: boolean) => void = () => {}
		const save = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					land = resolve
				})
		)
		render(<Harness save={save} />)
		fireEvent.click(box("Avocet"))
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(1)
		await act(async () => {
			land(true)
			await vi.advanceTimersByTimeAsync(0)
		})
		await advance(LOCK_MS - 1)
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(1)
		await advance(1)
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(2)
	})

	it("replaces the row in place without sliding under reduced motion", async () => {
		reduceMotion()
		render(<Harness save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(0)
		expect(screen.queryByRole("checkbox", { name: "Avocet" })).toBeNull()
		expect(document.querySelector("[data-leaving], [data-entering]")).toBeNull()
		expect(box("Bittern")).toHaveFocus()
	})

	it("keeps the row, unticked, when the tick fails", async () => {
		render(<Harness save={async () => false} />)
		fireEvent.click(box("Avocet"))
		await advance(LOCK_MS)
		expect(box("Avocet")).not.toBeChecked()
		expect(screen.getAllByRole("checkbox")).toHaveLength(3)
	})

	it("moves focus to the heading and says so when nothing is left", async () => {
		render(<Harness initial={[item("Avocet")]} save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(LEAVE_MS)
		expect(screen.getByRole("heading", { name: "What's next" })).toHaveFocus()
		expect(screen.getByText("You've found everything tracked so far.")).toBeInTheDocument()
	})
})
```

`src/islands/hub/UndoToast.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { TOAST_MS, UndoToast } from "./UndoToast"

const { t } = translator("en")

function Page({
	onClose = vi.fn(),
	onUndo = vi.fn(),
	onEscapeFocus = vi.fn(),
	error = "",
}: {
	onClose?: () => void
	onUndo?: () => void
	onEscapeFocus?: () => void
	error?: string
}) {
	const zone = useRef<HTMLElement>(null)
	return (
		<main>
			<section ref={zone} aria-label="What's next">
				<button type="button">Row</button>
				<UndoToast
					item={{ id: "wildlife/pelican", name: "Pelican" }}
					error={error}
					onUndo={onUndo}
					onClose={onClose}
					zoneRef={zone}
					onEscapeFocus={onEscapeFocus}
					t={t}
				/>
			</section>
			<button type="button">Elsewhere</button>
		</main>
	)
}

const focus = (name: string) => act(() => screen.getByRole("button", { name }).focus())
const wait = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms)
	})

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Undo toast (dashboard spec §4, §9)", () => {
	it("waits while focus is in What's next, then closes 5 s after focus leaves", () => {
		const onClose = vi.fn()
		render(<Page onClose={onClose} />)
		focus("Row")
		wait(60_000)
		focus("Undo")
		wait(60_000)
		expect(onClose).not.toHaveBeenCalled()
		focus("Elsewhere")
		wait(TOAST_MS - 1)
		expect(onClose).not.toHaveBeenCalled()
		wait(1)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it("waits while the pointer is over it", () => {
		const onClose = vi.fn()
		render(<Page onClose={onClose} />)
		focus("Elsewhere")
		const toast = screen.getByRole("button", { name: "Undo" }).parentElement as HTMLElement
		fireEvent.pointerEnter(toast)
		wait(60_000)
		expect(onClose).not.toHaveBeenCalled()
		fireEvent.pointerLeave(toast)
		wait(TOAST_MS)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it("closes on Escape inside What's next, and hands focus back from the Undo button", () => {
		const onClose = vi.fn()
		const onEscapeFocus = vi.fn()
		render(<Page onClose={onClose} onEscapeFocus={onEscapeFocus} />)
		focus("Elsewhere")
		fireEvent.keyDown(screen.getByRole("button", { name: "Elsewhere" }), { key: "Escape" })
		expect(onClose).not.toHaveBeenCalled()
		focus("Row")
		fireEvent.keyDown(screen.getByRole("button", { name: "Row" }), { key: "Escape" })
		expect(onClose).toHaveBeenCalledTimes(1)
		expect(onEscapeFocus).not.toHaveBeenCalled()
		focus("Undo")
		fireEvent.keyDown(screen.getByRole("button", { name: "Undo" }), { key: "Escape" })
		expect(onClose).toHaveBeenCalledTimes(2)
		expect(onEscapeFocus).toHaveBeenCalledTimes(1)
	})

	it("runs Undo, shows a failed Undo as an alert, and keeps the page clear of it", async () => {
		const onUndo = vi.fn()
		const { unmount } = render(<Page onUndo={onUndo} error="Saving failed." />)
		expect(screen.getByText("Pelican marked as found.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Undo" })).toHaveAccessibleDescription(
			"Pelican marked as found."
		)
		fireEvent.click(screen.getByRole("button", { name: "Undo" }))
		expect(onUndo).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("alert")).toHaveTextContent("Saving failed.")
		const root = document.documentElement.style
		expect(root.getPropertyValue("--toast-h")).toBe("calc(0px + var(--space-2))")
		unmount()
		expect(root.getPropertyValue("--toast-h")).toBe("")
	})

	it("has no axe violations", async () => {
		const { container } = render(<Page />)
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/islands/hub/WhatsNext.test.tsx src/islands/hub/UndoToast.test.tsx`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the components**

`src/islands/hub/WhatsNext.tsx`:

```tsx
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react"
import type { Translate } from "../../i18n"
import type { SeedItem } from "../../model/schema"

/** How long the ticked row takes to slide out (spec §6.1 step 4). */
export const LEAVE_MS = 200
/** Ticks are ignored while one is in flight and this long after it lands (spec §6.1 step 1). */
export const LOCK_MS = 400

export const nextBoxId = (itemId: string) => `next-${itemId}`

interface Props {
	/** Up to three unfound items of the closest category, fresh from the model. */
	items: SeedItem[]
	disabled: boolean
	/** Resolves true when the tick was saved. */
	onTick: (id: string) => Promise<boolean>
	t: Translate
	/** The section; the Undo toast inside it pauses while focus is in here. */
	zoneRef: RefObject<HTMLElement | null>
	headingRef: RefObject<HTMLHeadingElement | null>
	/** The Undo toast, straight after the list, so Tab from the last row reaches it. */
	children?: ReactNode
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function WhatsNext({ items, disabled, onTick, t, zoneRef, headingRef, children }: Props) {
	// While a tick is saving and sliding out, the rows on screen stay as they were.
	const [held, setHeld] = useState<SeedItem[] | null>(null)
	const [pending, setPending] = useState<string | null>(null)
	const [leaving, setLeaving] = useState<string | null>(null)
	const [entering, setEntering] = useState<string | null>(null)
	const busy = useRef(false)
	const focusAt = useRef<number | null>(null)
	const shown = useRef(items.map((item) => item.id))
	const rows = held ?? items

	async function tick(id: string, index: number) {
		if (busy.current) return
		busy.current = true
		setHeld(items)
		setPending(id)
		const saved = await onTick(id)
		setPending(null)
		if (!saved) {
			setHeld(null)
			busy.current = false
			return
		}
		const still = reducedMotion()
		if (!still) {
			setLeaving(id)
			await wait(LEAVE_MS)
			setLeaving(null)
		}
		focusAt.current = index
		setHeld(null)
		await wait(still ? LOCK_MS : LOCK_MS - LEAVE_MS)
		busy.current = false
	}

	// The one row that filled the gap slides in. A profile switch replaces every row: no slide.
	useEffect(() => {
		if (held) return
		const ids = items.map((item) => item.id)
		const fresh = ids.filter((id) => !shown.current.includes(id))
		shown.current = ids
		if (fresh.length === 1 && !reducedMotion()) setEntering(fresh[0])
	}, [items, held])

	// After a tick: the row now in the ticked one's place, else the last row, else the heading.
	useEffect(() => {
		if (held || focusAt.current === null) return
		const index = focusAt.current
		focusAt.current = null
		const boxes = zoneRef.current?.querySelectorAll<HTMLInputElement>(".next-list input")
		const target = boxes?.[Math.min(index, boxes.length - 1)]
		if (target) target.focus()
		else headingRef.current?.focus()
	}, [held, zoneRef, headingRef])

	return (
		<section className="whats-next" aria-labelledby="next-heading" ref={zoneRef}>
			<h2 id="next-heading" ref={headingRef} tabIndex={-1}>
				{t("hub.whatsNext")}
			</h2>
			{rows.length === 0 ? (
				<p className="next-done">{t("hub.everythingFound")}</p>
			) : (
				<ul className="next-list" aria-labelledby="next-heading">
					{rows.map((item, index) => (
						<li
							key={item.id}
							className="next-row"
							data-leaving={item.id === leaving || undefined}
							data-entering={item.id === entering || undefined}
							onAnimationEnd={() => setEntering(null)}
						>
							<input
								id={nextBoxId(item.id)}
								type="checkbox"
								checked={item.id === pending || item.id === leaving}
								disabled={disabled}
								onChange={() => tick(item.id, index)}
							/>
							<label htmlFor={nextBoxId(item.id)}>{item.name}</label>
						</li>
					))}
				</ul>
			)}
			{children}
		</section>
	)
}
```

`src/islands/hub/UndoToast.tsx`:

```tsx
import { type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import type { Translate } from "../../i18n"

/** How long the toast stays once the player has moved on (dashboard spec §4). */
export const TOAST_MS = 5_000

interface Props {
	item: { id: string; name: string }
	/** A failed Undo, shown inside the toast. */
	error: string
	onUndo: () => void
	onClose: () => void
	/** What's next, which holds the toast. While focus is in it, the timer waits. */
	zoneRef: RefObject<HTMLElement | null>
	/** Where focus goes when Escape closes the toast from its own Undo button. */
	onEscapeFocus: () => void
	t: Translate
}

/**
 * Undo for the last tick. The 5 s timer runs only while focus is outside What's next and the
 * pointer is off the toast, so a keyboard or screen-reader player always reaches Undo (WCAG
 * 2.2.1). The parent mounts one per tick, keyed, so every toast starts fresh.
 */
export function UndoToast({ item, error, onUndo, onClose, zoneRef, onEscapeFocus, t }: Props) {
	const box = useRef<HTMLDivElement>(null)
	const textId = useId()
	const [focusInside, setFocusInside] = useState(false)
	const [pointerInside, setPointerInside] = useState(false)

	useEffect(() => {
		const inside = (target: EventTarget | null) =>
			target instanceof Node && (zoneRef.current?.contains(target) ?? false)
		const onIn = (event: FocusEvent) => setFocusInside(inside(event.target))
		const onOut = (event: FocusEvent) => setFocusInside(inside(event.relatedTarget))
		setFocusInside(inside(document.activeElement))
		document.addEventListener("focusin", onIn)
		document.addEventListener("focusout", onOut)
		return () => {
			document.removeEventListener("focusin", onIn)
			document.removeEventListener("focusout", onOut)
		}
	}, [zoneRef])

	useEffect(() => {
		if (focusInside || pointerInside) return
		const id = window.setTimeout(onClose, TOAST_MS)
		return () => window.clearTimeout(id)
	}, [focusInside, pointerInside, onClose])

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return
			const active = document.activeElement
			if (!active || !zoneRef.current?.contains(active)) return
			const fromUndo = box.current?.contains(active) ?? false
			onClose()
			if (fromUndo) onEscapeFocus()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [zoneRef, onClose, onEscapeFocus])

	// While open, the page scrolls the focused element clear of the toast (WCAG 2.4.12).
	useLayoutEffect(() => {
		const root = document.documentElement
		root.style.setProperty("--toast-h", `calc(${box.current?.offsetHeight ?? 0}px + var(--space-2))`)
		return () => root.style.removeProperty("--toast-h")
	}, [error])

	return (
		<div
			ref={box}
			className="undo-toast"
			onPointerEnter={() => setPointerInside(true)}
			onPointerLeave={() => setPointerInside(false)}
		>
			<p id={textId}>{t("hub.markedFound", { item: item.name })}</p>
			{error && (
				<p className="tracker-alert" role="alert">
					{error}
				</p>
			)}
			{/* Tabbing straight to Undo says what it undoes, not just "Undo, button". */}
			<button type="button" onClick={onUndo} aria-describedby={textId}>
				{t("hub.undo")}
			</button>
		</div>
	)
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run src/islands/hub/WhatsNext.test.tsx src/islands/hub/UndoToast.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing Dashboard tests**

Add to the imports of `src/islands/hub/Dashboard.test.tsx`:

```tsx
import { IDBObjectStore } from "fake-indexeddb"
import { afterEach } from "vitest"
import { within } from "@testing-library/react"
import { DB_NAME } from "../../model/store"
```

(merge them into the existing import lines), add `afterEach(() => { vi.restoreAllMocks() })` after the `beforeEach`, then add:

```tsx
describe("ticking on the hub (dashboard spec §6.1, §7)", () => {
	const next = () => screen.getByRole("region", { name: "What's next" })

	it("ticks from What's next, announces it, and Undo puts it back with focus on it", async () => {
		await ready()
		// Tracker order: the birds group before reptiles.
		expect(within(next()).getAllByRole("checkbox").map((b) => b.getAttribute("id"))).toEqual([
			"next-wildlife/pelican",
			"next-wildlife/american-alligator",
		])
		fireEvent.click(within(next()).getByRole("checkbox", { name: "American alligator" }))
		const undo = await screen.findByRole("button", { name: "Undo" })
		expect(announce).toHaveBeenCalledWith("American alligator marked as found.")
		await waitFor(() =>
			expect(within(next()).queryByRole("checkbox", { name: "American alligator" })).toBeNull()
		)
		await waitFor(() => expect(within(next()).getByRole("checkbox", { name: "Pelican" })).toHaveFocus())
		fireEvent.click(undo)
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "American alligator" })).toHaveFocus()
		)
		expect(announce).toHaveBeenCalledWith("American alligator marked as not found.")
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("moves on when the closest category is done, and Undo brings it back", async () => {
		await seed(["Player 1"], { "wildlife/pelican": NOV_20 })
		await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "American alligator" }))
		const bike = await within(next()).findByRole("checkbox", { name: "Bike" })
		await waitFor(() => expect(bike).toHaveFocus())
		expect(screen.getByText("Closest: Vehicles")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Undo" }))
		await waitFor(() =>
			expect(within(next()).getByRole("checkbox", { name: "American alligator" })).toHaveFocus()
		)
		expect(screen.getByText("Closest: Wildlife")).toBeInTheDocument()
	})

	it("shows the all-found line and no checkboxes when everything is found", async () => {
		await seed(["Player 1"], {
			"wildlife/pelican": NOV_20,
			"wildlife/american-alligator": NOV_20,
			"vehicles/bike": NOV_20,
		})
		await ready()
		expect(within(next()).getByText("You've found everything tracked so far.")).toBeInTheDocument()
		expect(within(next()).queryByRole("checkbox")).toBeNull()
	})

	it("closes the toast when the profile changes", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: "Undo" })
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("never opens a toast for a tick that lands after a profile switch", async () => {
		await seed(["Player 1", "Dad"])
		await ready()
		// The switch starts while the tick is still saving.
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		fireEvent.click(screen.getByRole("button", { name: "Profile: Player 1" }))
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Dad" }))
		await waitFor(() => expect(announce).toHaveBeenCalledWith("Showing Dad."))
		await new Promise((resolve) => setTimeout(resolve, 50))
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
	})

	it("keeps the row and opens no toast when a tick fails", async () => {
		await ready()
		vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
			throw new DOMException("Quota", "QuotaExceededError")
		})
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		expect(await screen.findByText("Saving failed. Your browser may be blocking storage.")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
		expect(within(next()).getByRole("checkbox", { name: "Pelican" })).not.toBeChecked()
	})

	it("leaves the item ticked and shows the error in the toast when Undo fails", async () => {
		await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		const undo = await screen.findByRole("button", { name: "Undo" })
		vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
			throw new DOMException("Quota", "QuotaExceededError")
		})
		fireEvent.click(undo)
		const toast = undo.parentElement as HTMLElement
		expect(await within(toast).findByRole("alert")).toHaveTextContent("Saving failed.")
		expect(within(next()).queryByRole("checkbox", { name: "Pelican" })).toBeNull()
	})

	it("disables ticking when another tab changes the data", async () => {
		await ready()
		indexedDB.deleteDatabase(DB_NAME)
		expect(
			await screen.findByText("Your data changed in another tab. Reload to continue.")
		).toBeInTheDocument()
		expect(within(next()).getByRole("checkbox", { name: "Pelican" })).toBeDisabled()
	})

	it("has no axe violations with the toast open", async () => {
		const { container } = await ready()
		fireEvent.click(within(next()).getByRole("checkbox", { name: "Pelican" }))
		await screen.findByRole("button", { name: "Undo" })
		expect(await axe(container)).toHaveNoViolations()
	})
})
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/islands/hub/Dashboard.test.tsx`
Expected: FAIL. There is no "What's next" region yet.

- [ ] **Step 7: Wire What's next and Undo into the dashboard**

In `src/islands/hub/Dashboard.tsx`:

1. Imports: `useMemo, useState` becomes `useCallback, useEffect, useMemo, useRef, useState`, and add:

```tsx
import { UndoToast } from "./UndoToast"
import { nextBoxId, WhatsNext } from "./WhatsNext"
```

2. Directly after `const { items, records } = state`, add:

```tsx
	const zone = useRef<HTMLElement>(null)
	const nextHeading = useRef<HTMLHeadingElement>(null)
	// One toast per tick; `key` remounts it so every toast starts with a fresh timer. It carries
	// the profile it was ticked on, so Undo can never act on another profile (spec §6.1 step 6).
	const [toast, setToast] = useState<{
		key: number
		id: string
		name: string
		profileId: string
	} | null>(null)
	const [focusId, setFocusId] = useState<string | null>(null)
	const closeToast = useCallback(() => setToast(null), [])
	const focusInNext = useCallback(() => {
		const boxes = zone.current?.querySelectorAll<HTMLInputElement>(".next-list input")
		const last = boxes?.[boxes.length - 1]
		if (last) last.focus()
		else nextHeading.current?.focus()
	}, [])

	// After Undo: the restored item's checkbox (spec §9), else the heading. Never body.
	useEffect(() => {
		if (!focusId) return
		setFocusId(null)
		const restored = document.getElementById(nextBoxId(focusId))
		if (restored) restored.focus()
		else nextHeading.current?.focus()
	}, [focusId])
```

These hooks sit above the early `return`s, like `useMemo`.

3. After the `countText` and `closest` constants, add:

```tsx
	const error = state.error ? t(`tracker.errors.${state.error}`) : ""
	const nameOf = (id: string) => items.find((item) => item.id === id)?.name ?? id

	async function tick(id: string): Promise<boolean> {
		const profileId = tracker.getState().profileId
		await tracker.tick(id)
		const landed = tracker.getState()
		if (landed.error) {
			setToast(null)
			return false
		}
		// A profile switch landed while this tick was saving. The model filed the tick under the
		// old profile, so there is nothing on screen to undo or announce.
		if (landed.profileId !== profileId) return false
		const name = nameOf(id)
		setToast((old) => ({ key: (old?.key ?? 0) + 1, id, name, profileId }))
		announce(t("hub.markedFound", { item: name }))
		return true
	}

	async function undo() {
		if (!toast) return
		if (toast.profileId !== tracker.getState().profileId) {
			closeToast()
			return
		}
		const { id, name } = toast
		await tracker.untick(id)
		// A failed Undo keeps the toast open with the error, and the item stays ticked (spec §7).
		if (tracker.getState().error) return
		setToast(null)
		announce(t("hub.undone", { item: name }))
		setFocusId(id)
	}
```

4. In `switchTo`, close the toast before and after the switch, so a tick that lands in between can't leave one open:

```tsx
	async function switchTo(id: string) {
		closeToast()
		await tracker.switchProfile(id)
		closeToast()
```

5. Between `<StatStrip … />` and the Progress section, add:

```tsx
			{/* An open toast shows its own error, so the page alert stays empty meanwhile. */}
			<p className="tracker-alert" role="alert">
				{toast ? "" : error}
			</p>
			<WhatsNext
				items={view.next}
				disabled={state.error === "closed"}
				onTick={tick}
				t={t}
				zoneRef={zone}
				headingRef={nextHeading}
			>
				{toast && toast.profileId === state.profileId && (
					<UndoToast
						key={toast.key}
						item={toast}
						error={error}
						onUndo={undo}
						onClose={closeToast}
						zoneRef={zone}
						onEscapeFocus={focusInNext}
						t={t}
					/>
				)}
			</WhatsNext>
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/islands/hub`
Expected: PASS. If the two failing-write tests never see an error, `store.put` writes through a different method; spy on the method `src/model/progress.ts` `setDone` actually calls on the object store and keep the assertions.

- [ ] **Step 9: Commit**

```bash
git add src/islands/hub/WhatsNext.tsx src/islands/hub/WhatsNext.test.tsx src/islands/hub/UndoToast.tsx src/islands/hub/UndoToast.test.tsx src/islands/hub/Dashboard.tsx src/islands/hub/Dashboard.test.tsx
git commit -m "Tick from What's next with an Undo toast"
```

---

### Task 9: The Hub island replaces Countdown

**Files:**
- Create: `src/islands/hub/CountdownView.tsx`, `src/islands/hub/Latest.tsx`, `src/islands/hub/Hub.tsx`, `src/islands/hub/Hub.test.tsx`
- Delete: `src/islands/Countdown.tsx`, `src/islands/Countdown.test.tsx`
- Modify: `src/pages/[locale]/index.astro`
- Modify: `src/locales/en.json`, `src/locales/nb.json` (remove `hub.launched`)
- Modify: `docs/superpowers/specs/2026-10-14-rookdex-dashboard-design.md` (two slips)

**Interfaces:**
- Consumes: `useHubPhase` and `CountdownState.now` (Task 6), `DashboardProps` and `DashboardSkeleton` (Task 7), `localDayKey` and `daysAgo` (Task 2), `latestRumours` (Task 2), `buildNow` (Task 6), `LATEST_LIMIT` (Task 7).
- Produces:
  - `CountdownView({ locale: Locale; state: CountdownState; guideHref: string })`.
  - `interface LatestItem { id: string; name: string; added: string }` and `Latest({ latest, today, locale, newsHref, t })`.
  - `ANNOUNCE_GAP_MS = 100` and `Hub(props)` with props `{ locale; initialNow: string; guideHref; trackerHref; newsHref; latest: LatestItem[]; categoryCount: number; loadDashboard?: () => Promise<{ Dashboard: ComponentType<DashboardProps> }> }`.

- [ ] **Step 1: Write the failing test**

`src/islands/hub/Hub.test.tsx` (the before-launch tests are ported from `Countdown.test.tsx`; the days line is no longer live):

```tsx
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { Hub } from "./Hub"
import type { LatestItem } from "./Latest"

const before = "2026-09-10T10:00:00Z" // 70 days to go
const after = "2026-11-22T10:00:00Z" // day 3
const latest: LatestItem[] = [
	{ id: "rumours/online", name: "Online in 2027", added: "2026-11-22" },
	{ id: "rumours/pc", name: "PC timing", added: "2026-09-18" },
]

function StubDashboard() {
	return <p>Dashboard loaded</p>
}
const loaded = () => Promise.resolve({ Dashboard: StubDashboard })

function props(overrides: Partial<ComponentProps<typeof Hub>> = {}): ComponentProps<typeof Hub> {
	return {
		locale: "en",
		initialNow: before,
		guideHref: "/en/guides/before-you-start/",
		trackerHref: "/en/tracker/",
		newsHref: "/en/news/",
		latest,
		categoryCount: 4,
		loadDashboard: loaded,
		...overrides,
	}
}
const hub = (overrides?: Partial<ComponentProps<typeof Hub>>) => render(<Hub {...props(overrides)} />)
const advance = (ms: number) =>
	act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})

/** getByText cannot see the whole sentence once the number is in its own span. */
function daysLine(): HTMLElement {
	const el = document.querySelector<HTMLElement>(".days")
	if (!el) throw new Error("no .days element")
	return el
}

beforeEach(() => {
	vi.useFakeTimers()
	window.history.replaceState(null, "", "/en/")
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Hub before launch", () => {
	it("renders the countdown, with the digits silent and the days line not live", () => {
		vi.setSystemTime(new Date(before))
		hub()
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
		expect(screen.getByTestId("countdown-digits")).toHaveAttribute("aria-live", "off")
		expect(daysLine()).not.toHaveAttribute("aria-live")
		expect(daysLine()).toHaveTextContent("70 days to go")
		expect(daysLine().querySelector(".days-number")).toHaveTextContent("70")
		expect(screen.getByRole("link", { name: "Read this before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
		// The status region exists from the start and says nothing on load.
		expect(screen.getByRole("status")).toBeEmptyDOMElement()
	})

	it("says 1 day the evening before", () => {
		const eve = "2026-11-18T20:00:00Z"
		vi.setSystemTime(new Date(eve))
		hub({ initialNow: eve })
		expect(daysLine()).toHaveTextContent("1 day to go")
	})

	it("uses Norwegian strings", () => {
		vi.setSystemTime(new Date(before))
		hub({ locale: "nb" })
		expect(daysLine()).toHaveTextContent("70 dager igjen")
	})

	it("states the price from the price model, formatted for the language", () => {
		vi.setSystemTime(new Date(before))
		hub()
		// textContent, not getByText: Testing Library folds the no-break space into a plain one.
		expect(document.querySelector(".hub-state")?.textContent).toContain(
			"The standard digital edition is NOK 949."
		)
	})

	it("hides the seconds under reduced motion", () => {
		vi.setSystemTime(new Date(before))
		const original = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			...original(query),
			matches: query.includes("reduce"),
		}))
		hub()
		expect(screen.queryByText("seconds")).not.toBeInTheDocument()
		expect(screen.getByText("minutes")).toBeInTheDocument()
		window.matchMedia = original
	})

	it("honours ?phase=after on localhost and ignores ?phase=AFTER", async () => {
		vi.setSystemTime(new Date(before))
		window.history.replaceState(null, "", "/en/?phase=after")
		const { unmount } = hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Your progress" })).toBeInTheDocument()
		unmount()
		window.history.replaceState(null, "", "/en/?phase=AFTER")
		hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(before))
		const { container } = hub()
		// axe-core schedules its own work with setTimeout, so it never resolves under fake timers.
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Hub after launch", () => {
	it("loads the dashboard and shows Latest with relative dates", async () => {
		vi.setSystemTime(new Date(after))
		hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Your progress" })).toBeInTheDocument()
		expect(screen.getByText("Dashboard loaded")).toBeInTheDocument()
		expect(screen.queryByTestId("countdown-digits")).toBeNull()
		expect(screen.getByRole("heading", { name: "Latest" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "All news" })).toHaveAttribute("href", "/en/news/")
		const dates = [...document.querySelectorAll(".latest time")].map((el) => el.textContent)
		expect(dates).toEqual(["today", "65 days ago"])
	})

	it("writes Norwegian relative dates", async () => {
		vi.setSystemTime(new Date(after))
		hub({ locale: "nb", newsHref: "/nb/news/" })
		await advance(0)
		const dates = [...document.querySelectorAll(".latest time")].map((el) => el.textContent)
		expect(dates).toEqual(["i dag", "for 65 dager siden"])
	})

	it("shows the skeleton while the dashboard loads", async () => {
		vi.setSystemTime(new Date(after))
		const { container } = hub({ loadDashboard: () => new Promise(() => {}) })
		await advance(0)
		expect(container.querySelector(".is-skeleton")).not.toBeNull()
	})

	it("shows the load alert when the chunk fails, and Latest still renders", async () => {
		vi.setSystemTime(new Date(after))
		hub({ loadDashboard: () => Promise.reject(new Error("chunk")) })
		await advance(0)
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Your progress couldn't load. Reload the page to try again."
		)
		expect(screen.getByRole("heading", { name: "Latest" })).toBeInTheDocument()
	})

	it("hides Latest when there are no rumours", async () => {
		vi.setSystemTime(new Date(after))
		hub({ latest: [] })
		await advance(0)
		expect(screen.queryByRole("heading", { name: "Latest" })).toBeNull()
	})

	it("writes no relative date into the server HTML, so hydration never mismatches", () => {
		const html = renderToString(<Hub {...props({ initialNow: after })} />)
		expect(html).toContain("Online in 2027")
		expect(html).toContain('<time datetime="2026-09-18"></time>')
		expect(html).toContain("is-skeleton")
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(after))
		const { container } = hub()
		await advance(0)
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Hub at the flip (dashboard spec §3, §6.4)", () => {
	const eve = "2026-11-18T22:59:59Z"

	it("keeps one status region across the flip and announces the new day line", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const region = screen.getByRole("status")
		await advance(2_000)
		expect(screen.getByRole("status")).toBe(region)
		expect(region).toHaveTextContent("Day 0 since launch")
	})

	it("moves focus to the dashboard heading when focus was inside the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		act(() => screen.getByRole("link", { name: "Read this before you start" }).focus())
		await advance(2_000)
		expect(screen.getByRole("heading", { name: "Your progress" })).toHaveFocus()
	})

	it("leaves focus alone when it was outside the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const outside = document.createElement("button")
		outside.textContent = "Outside"
		document.body.append(outside)
		act(() => outside.focus())
		await advance(2_000)
		expect(outside).toHaveFocus()
		outside.remove()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/islands/hub/Hub.test.tsx`
Expected: FAIL with "Failed to resolve import ./Hub".

- [ ] **Step 3: Write the components**

`src/islands/hub/CountdownView.tsx`:

```tsx
import { type Locale, translator } from "../../i18n"
import { prices } from "../../model/prices"
import type { CountdownState } from "../useCountdown"

interface Props {
	locale: Locale
	state: CountdownState
	guideHref: string
}

/**
 * The sentence with its number in its own span, so CSS can give the number the display face
 * while the words stay in Inter (spec §7). The sentence comes filled from the translator, and the
 * number is found in it, so the translation stays in charge of word order ("70 days to go").
 * Countdown templates carry no other digits (copy.test.ts).
 */
function DaysLine({ text, n }: { text: string; n: number }) {
	const digits = String(n)
	const at = text.indexOf(digits)
	if (at === -1) return <>{text}</>
	return (
		<>
			{text.slice(0, at)}
			<span className="days-number">{digits}</span>
			{text.slice(at + digits.length)}
		</>
	)
}

/**
 * The hub before launch, moved from Countdown.tsx. The days line is no longer live: the hub's one
 * status region announces it (dashboard spec §3).
 */
export function CountdownView({ locale, state, guideHref }: Props) {
	const { t, plural, money } = translator(locale)
	const units: [number, string][] = [
		[state.parts.days, t("hub.days")],
		[state.parts.hours, t("hub.hours")],
		[state.parts.minutes, t("hub.minutes")],
	]
	if (!state.reducedMotion) units.push([state.parts.seconds, t("hub.seconds")])

	return (
		<section className="hub-state" aria-labelledby="hub-heading">
			<h2 id="hub-heading">{t("hub.countdownHeading")}</h2>
			<p className="days">
				<DaysLine text={plural("hub.daysToGo", state.daysToGo)} n={state.daysToGo} />
			</p>
			<div className="countdown" aria-live="off" data-testid="countdown-digits">
				{units.map(([value, label]) => (
					<div className="unit" key={label}>
						<span className="value">{String(value).padStart(2, "0")}</span>
						<span className="label">{label}</span>
					</div>
				))}
			</div>
			<p>{t("hub.preload")}</p>
			<h2>{t("hub.buyHeading")}</h2>
			<p>{t("hub.buyBody", { standard: money(prices.standard) })}</p>
			<p>
				<a href={guideHref}>{t("hub.beforeYouStart")}</a>
			</p>
		</section>
	)
}
```

`src/islands/hub/Latest.tsx`:

```tsx
import { useEffect, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import { daysAgo } from "../../model/days"

/** A rumour as the page hands it to the hub: built in, never fetched (dashboard spec §6.3). */
export interface LatestItem {
	id: string
	name: string
	added: string
}

interface Props {
	latest: LatestItem[]
	/** The device's calendar day, `YYYY-MM-DD`. */
	today: string
	locale: Locale
	newsHref: string
	t: Translate
}

/**
 * The three newest rumours. Relative dates are written only after mount: the server HTML is built
 * on another clock and in another time zone, so a date there could disagree with the first client
 * render. The empty `<time>` keeps its line, so filling it in shifts nothing.
 */
export function Latest({ latest, today, locale, newsHref, t }: Props) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

	return (
		<section className="latest" aria-labelledby="latest-heading">
			<h2 id="latest-heading">{t("hub.latest")}</h2>
			<ul className="latest-list">
				{latest.map((rumour) => (
					<li key={rumour.id}>
						<span>{rumour.name}</span>
						<time dateTime={rumour.added}>
							{mounted ? relative.format(-daysAgo(rumour.added, today), "day") : ""}
						</time>
					</li>
				))}
			</ul>
			<a href={newsHref}>{t("hub.allNews")}</a>
		</section>
	)
}
```

`src/islands/hub/Hub.tsx`:

```tsx
import { type ComponentType, useCallback, useEffect, useRef, useState } from "react"
import { type Locale, translator } from "../../i18n"
import { localDayKey } from "../../model/days"
import { CountdownView } from "./CountdownView"
import type { DashboardProps } from "./Dashboard"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { Latest, type LatestItem } from "./Latest"
import { useHubPhase } from "./useHubPhase"

type DashboardModule = { Dashboard: ComponentType<DashboardProps> }

/** The pause between clearing the status region and writing to it, so every line is heard. */
export const ANNOUNCE_GAP_MS = 100

// A dynamic import, so visitors before launch never download the tracker model (spec §3, §10).
const loadDefault = (): Promise<DashboardModule> => import("./Dashboard")

interface Props {
	locale: Locale
	/** Build time as an ISO timestamp, or ROOKDEX_NOW; see useCountdown. */
	initialNow: string
	guideHref: string
	trackerHref: string
	newsHref: string
	/** The newest rumours, built into the page. */
	latest: LatestItem[]
	/** How many progress bars the skeleton reserves. */
	categoryCount: number
	/** Test seam for the dashboard chunk. The page never passes it. */
	loadDashboard?: () => Promise<DashboardModule>
}

/**
 * The home page's live part (dashboard spec §3): the countdown before launch, the dashboard after.
 * Owns the clock, Latest, and the one status region, which sits outside both views so the flip
 * at midnight never wipes it.
 */
export function Hub({
	locale,
	initialNow,
	guideHref,
	trackerHref,
	newsHref,
	latest,
	categoryCount,
	loadDashboard = loadDefault,
}: Props) {
	const { t, plural } = translator(locale)
	const [start] = useState(() => new Date(initialNow))
	const state = useHubPhase(start)
	const after = state.phase === "after"
	const today = localDayKey(state.now)

	const [message, setMessage] = useState("")
	const gap = useRef<number | undefined>(undefined)
	const announce = useCallback((text: string) => {
		window.clearTimeout(gap.current)
		setMessage("")
		gap.current = window.setTimeout(() => setMessage(text), ANNOUNCE_GAP_MS)
	}, [])
	useEffect(() => () => window.clearTimeout(gap.current), [])

	// The days line is news only when it changes on the device clock: not on load, and not when
	// the first tick swaps the build clock for the device clock.
	const daysText = after
		? t("hub.daySince", { n: state.daysSince })
		: plural("hub.daysToGo", state.daysToGo)
	const synced = state.now !== start
	const heard = useRef<string | null>(null)
	useEffect(() => {
		if (!synced) return
		if (heard.current === null || heard.current === daysText) {
			heard.current = daysText
			return
		}
		heard.current = daysText
		announce(daysText)
	}, [synced, daysText, announce])

	const [Loaded, setLoaded] = useState<ComponentType<DashboardProps> | null>(null)
	const [failed, setFailed] = useState(false)
	useEffect(() => {
		if (!after || Loaded) return
		let live = true
		loadDashboard().then(
			(module) => {
				if (live) setLoaded(() => module.Dashboard)
			},
			() => {
				if (live) setFailed(true)
			}
		)
		return () => {
			live = false
		}
	}, [after, Loaded, loadDashboard])

	// If focus was in the hub when it flips at midnight, it lands on the dashboard heading instead
	// of falling to body (spec §6.4). Focus that moved elsewhere on purpose is left alone.
	const root = useRef<HTMLDivElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	const hadFocus = useRef(false)
	useEffect(() => {
		const el = root.current
		if (!el) return
		const onIn = () => {
			hadFocus.current = true
		}
		const onOut = (event: FocusEvent) => {
			const next = event.relatedTarget
			if (next instanceof Node && !el.contains(next)) hadFocus.current = false
		}
		el.addEventListener("focusin", onIn)
		el.addEventListener("focusout", onOut)
		return () => {
			el.removeEventListener("focusin", onIn)
			el.removeEventListener("focusout", onOut)
		}
	}, [])
	const wasAfter = useRef(after)
	useEffect(() => {
		if (after && !wasAfter.current && hadFocus.current) {
			const active = document.activeElement
			if (!active || active === document.body || root.current?.contains(active)) {
				heading.current?.focus()
			}
		}
		wasAfter.current = after
	}, [after])

	return (
		<div className="hub-live" ref={root}>
			{after ? (
				<section
					className="hub-state hub-dashboard"
					aria-labelledby="dashboard-heading"
					aria-busy={!Loaded && !failed}
				>
					<h2 id="dashboard-heading" className="visually-hidden" ref={heading} tabIndex={-1}>
						{t("hub.dashboardHeading")}
					</h2>
					{failed ? (
						<p className="tracker-alert" role="alert">
							{t("hub.loadFailed")}
						</p>
					) : Loaded ? (
						<Loaded
							locale={locale}
							today={today}
							daysSince={state.daysSince}
							guideHref={guideHref}
							trackerHref={trackerHref}
							announce={announce}
						/>
					) : (
						<DashboardSkeleton categoryCount={categoryCount} t={t} />
					)}
					{latest.length > 0 && (
						<Latest latest={latest} today={today} locale={locale} newsHref={newsHref} t={t} />
					)}
				</section>
			) : (
				<CountdownView locale={locale} state={state} guideHref={guideHref} />
			)}
			<p className="visually-hidden" role="status">
				{message}
			</p>
		</div>
	)
}
```

- [ ] **Step 4: Mount the hub on the page and remove Countdown**

`src/pages/[locale]/index.astro` frontmatter imports become:

```astro
import { getRelativeLocaleUrl } from "astro:i18n"
import Mark from "../../components/Mark.astro"
import { isLocale, type Locale, locales, translator } from "../../i18n"
import { Hub } from "../../islands/hub/Hub"
import { LATEST_LIMIT } from "../../islands/hub/limits"
import { InstallPrompt } from "../../islands/InstallPrompt"
import Base from "../../layouts/Base.astro"
import { buildNow } from "../../model/build-now"
import { latestRumours } from "../../model/dashboard"
import { categoryIds, rumours, seedItems } from "../../model/seed"
import { countable } from "../../model/stats"
```

After `const { t } = translator(locale as Locale)`, add:

```ts
// Read at build time only; production never sets ROOKDEX_NOW (dashboard spec §6.4, §11).
const initialNow = buildNow(process.env.ROOKDEX_NOW).toISOString()
const latest = latestRumours(rumours, LATEST_LIMIT).map(({ id, name, added }) => ({ id, name, added }))
const categoryCount = categoryIds(countable(seedItems)).length
```

and the island becomes:

```astro
			<Hub
				client:load
				locale={locale}
				initialNow={initialNow}
				guideHref={getRelativeLocaleUrl(locale, "guides/before-you-start")}
				trackerHref={getRelativeLocaleUrl(locale, "tracker")}
				newsHref={getRelativeLocaleUrl(locale, "news")}
				latest={latest}
				categoryCount={categoryCount}
			/>
```

Then:

```bash
git rm src/islands/Countdown.tsx src/islands/Countdown.test.tsx
```

Remove the `"hub.launched"` line from `src/locales/en.json` and `src/locales/nb.json`. Keep `"hub.openTracker"`: the header link at `index.astro:27` uses it.

Fix the spec's slips, so it matches what ships:
- §3, the "**`CountdownView`**" sentence ending "The after branch of `Countdown` (`hub.launched`, `hub.openTracker`) goes away", change to "The after branch of `Countdown` (`hub.launched`) goes away; `hub.openTracker` stays for the header link."
- §8 first paragraph: "`hub.launched` and `hub.openTracker` are removed." becomes "`hub.launched` is removed; `hub.openTracker` stays because the hub header's tap link uses it."
- §1 Non-goals "at `/en/` and `/no/`" becomes "at `/en/` and `/nb/`".
- §13 "open `/en/?phase=after` and `/no/?phase=after`" becomes "`/nb/?phase=after`".

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/islands src/i18n`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors. If `process` is unknown in the Astro frontmatter, add `/// <reference types="node" />` as the first frontmatter line.

Run: `ROOKDEX_NOW=nonsense npm run build`
Expected: the build fails with `ROOKDEX_NOW must be an ISO timestamp, got "nonsense"`.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A src/islands/hub src/islands/Countdown.tsx src/islands/Countdown.test.tsx "src/pages/[locale]/index.astro" src/locales/en.json src/locales/nb.json docs/superpowers/specs/2026-10-14-rookdex-dashboard-design.md
git commit -m "Replace the countdown island with the hub"
```

---

### Task 10: Dashboard styles and the layout check

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: the class names from Tasks 7 to 9: `.hub-live`, `.hub-dashboard`, `.dashboard`, `.is-skeleton`, `.skeleton`, `.skeleton-chip`, `.dash-top`, `.stat-pair`, `.stat-tile`, `.stat-strip`, `.stat-strip-first`, `.whats-next`, `.next-list`, `.next-row` (`data-leaving`, `data-entering`), `.next-done`, `.undo-toast`, `.dash-progress`, `.dash-recent`, `.latest`, `.latest-list`, and the `--toast-h` property.

- [ ] **Step 1: Let the scroll padding clear the toast**

In `src/styles/global.css` line 24, the `html` rule's `scroll-padding-bottom` becomes:

```css
	scroll-padding-bottom: calc(
		var(--tabbar-h) + env(safe-area-inset-bottom) + var(--notice-h, 0px) + var(--toast-h, 0px)
	);
```

- [ ] **Step 2: Add the dashboard block**

Insert after the `.unit .value` rule (end of the `/* Hub */` section, around line 830):

```css
/* Hub after launch (dashboard spec §4). Every block has a fixed or reserved height, and the
   skeleton uses the same classes, so swapping one for the other shifts nothing (spec §10). */

.hub-live {
	display: contents;
}

.dashboard {
	display: grid;
	gap: var(--space-4);
	margin-bottom: var(--space-4);
}

.dash-top {
	display: flex;
	min-height: var(--tap);
}

.dashboard h2 {
	margin: 0 0 var(--space-2);
	font-size: 1rem;
}

.stat-pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--space-2);
	margin: 0;
}

/* Number on top, label under it. The dt stays first in the DOM, so it is read first. */
.stat-tile {
	display: flex;
	flex-direction: column-reverse;
	justify-content: flex-end;
	gap: var(--space-1);
	min-height: 8rem;
	padding: var(--space-3);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.stat-tile dt {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--text-muted);
	overflow-wrap: anywhere;
}

.stat-tile dd {
	margin: 0;
	font-family: var(--font-display);
	font-size: 3rem;
	line-height: 1;
	color: var(--text);
	font-variant-numeric: tabular-nums;
}

/* Two lines of the first half fit in the tap height, so the newcomer link and the count swap
   without a shift. */
.stat-strip {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	margin: 0;
	max-width: none;
	font-size: 0.875rem;
	color: var(--text-muted);
}

.stat-strip > span {
	flex: none;
}

.stat-strip > .stat-strip-first {
	flex: 0 1 auto;
	min-width: 0;
}

.next-list,
.next-done {
	min-height: calc(3 * var(--tap) + 2 * var(--space-1));
	margin: 0;
}

.next-list {
	display: grid;
	align-content: start;
	gap: var(--space-1);
	padding: 0;
	list-style: none;
	overflow: hidden;
}

.next-row {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	padding: 0 var(--space-3);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
}

.next-row input {
	flex: none;
	width: 1.25rem;
	height: 1.25rem;
	margin: 0;
	accent-color: var(--accent);
}

/* The label fills the row, so the whole 44 px row is the target. */
.next-row label {
	display: flex;
	align-items: center;
	align-self: stretch;
	flex: 1;
	min-width: 0;
	padding: var(--space-1) 0;
	overflow-wrap: anywhere;
	cursor: pointer;
}

.next-row[data-leaving] {
	animation: next-out 200ms ease-in forwards;
}

.next-row[data-entering] {
	animation: next-in 200ms ease-out;
}

@keyframes next-out {
	to {
		opacity: 0;
		transform: translateX(100%);
	}
}

@keyframes next-in {
	from {
		opacity: 0;
		transform: translateY(0.5rem);
	}
}

@media (prefers-reduced-motion: reduce) {
	.next-row[data-leaving],
	.next-row[data-entering] {
		animation: none;
	}
}

.undo-toast {
	position: fixed;
	left: var(--space-3);
	right: var(--space-3);
	bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--notice-h, 0px) + var(--space-2));
	z-index: 4;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2) var(--space-3);
	padding: 8px 8px 8px var(--space-3);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
	box-shadow: 0 8px 24px color-mix(in srgb, var(--bg) 60%, transparent);
	animation: notice-in 160ms ease-out;
}

.undo-toast p {
	margin: 0;
	max-width: none;
}

.undo-toast .tracker-alert {
	flex-basis: 100%;
}

.dash-progress .progress:last-child {
	margin-bottom: 0;
}

.dash-recent .recent,
.dash-recent .stats-empty {
	min-height: calc(5 * 1.75rem);
}

.dash-recent .recent li {
	min-height: 1.75rem;
	overflow-wrap: anywhere;
}

.latest-list {
	display: grid;
	gap: var(--space-2);
	margin: 0 0 var(--space-1);
	padding: 0;
	list-style: none;
}

.latest-list li {
	display: grid;
	overflow-wrap: anywhere;
}

.latest-list time {
	display: block;
	min-height: 1.3rem;
	font-size: 0.875rem;
	color: var(--text-muted);
}

.is-skeleton .skeleton {
	background: var(--border);
	opacity: 0.5;
}

.skeleton-chip {
	display: block;
	width: 10rem;
	height: var(--tap);
	border-radius: var(--radius);
}
```

Then give the Undo button the update notice's button look: run `grep -n "update-notice .actions button" src/styles/global.css` and add `.undo-toast button` to the selector list of every rule it finds, for example `.update-notice .actions button,\n.undo-toast button {`.

The "Manage profiles" item is the menu's first `<a>`: run `grep -n "\.menu button\|\.menu \[role" src/styles/global.css` and add the matching `.menu a` selector to every rule it finds, so the link has the same 44 px height, padding and focus style as its sibling buttons.

- [ ] **Step 3: Lint and test**

Run: `npx biome ci src/styles/global.css` and `npm test`
Expected: no errors; all tests pass.

- [ ] **Step 4: Measure the layout in the browser pane (spec §13)**

1. Build the after state: `ROOKDEX_NOW=2026-11-22T10:00:00Z npm run build`.
2. `preview_start` with name `preview` (wrangler on port 8787).
3. On `http://localhost:8787/nb/tracker/`, make three profiles: one with 0 finds, one with 1 find, one with 6 or more.
4. For each of `/en/?phase=after` and `/nb/?phase=after`, at `resize_window` 320 x 800 and at preset `desktop`, and for each of the three profiles (switch in the chip, then reload): run this in `javascript_tool` 2 s after load, all in one batch:

```js
await new Promise((resolve) => {
	const shifts = []
	const observer = new PerformanceObserver((list) => shifts.push(...list.getEntries()))
	observer.observe({ type: "layout-shift", buffered: true })
	setTimeout(() => {
		observer.disconnect()
		resolve({
			cls: shifts.filter((e) => !e.hadRecentInput).reduce((sum, e) => sum + e.value, 0),
			overflow: document.documentElement.scrollWidth > window.innerWidth,
			tiles: [...document.querySelectorAll(".stat-tile")].map((el) => el.getBoundingClientRect().height),
			strip: document.querySelector(".stat-strip")?.getBoundingClientRect().height,
		})
	}, 500)
})
```

   Target: `cls` 0, `overflow` false, both tiles the same height, strip 44. If a tile grows past `8rem` because the `nb` label wraps to three lines, raise `.stat-tile` `min-height` to the measured height and re-measure once.
5. At 320 px on `/nb/?phase=after`: tick a What's next row, then check the toast clears the focused checkbox:

```js
const toast = document.querySelector(".undo-toast").getBoundingClientRect()
const focused = document.activeElement.getBoundingClientRect()
;({ clear: focused.bottom <= toast.top, toastTop: toast.top, focusedBottom: focused.bottom })
```

   Target: `clear` true. Tab to Undo and confirm the same. While a What's next checkbox has keyboard focus, zoom on its row: the focus ring is whole, not clipped by the list's `overflow: hidden`. Open the profile chip: "Manage profiles" is as tall as the profile items.
6. Bundle split (spec §10): the hub's island chunk must not statically import the seed.

```bash
hub=$(grep -o 'component-url="[^"]*"' dist/en/index.html | grep -i hub | head -1 | sed 's/component-url="//; s/"$//')
echo "hub chunk: $hub"
grep -l "american-alligator" dist/_astro/*.js
grep -o 'from"\./[^"]*"' "dist$hub"
grep -o 'import("\./[^"]*")' "dist$hub"
```

   Expected: none of the files from the second command appears in the third command's static imports. The `Dashboard` chunk appears only in the fourth (dynamic) list.
7. Two rounds at most: measure, fix, confirm. Then take one screenshot of `/nb/?phase=after` at 320 px with the 6-find profile and show it to Malin.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "Style the dashboard with reserved heights"
```

---

### Task 10b: What's next fills from the next-closest category

Added 2026-10-15 after the Task 10 browser pass (spec amendment of the same date: §2, §4, §6.1, §6.2, §8, §9, §13, §14). With 1 item left in the closest category, What's next showed 1 row in space for 3. Now the next-closest category fills the rest, and each category's rows sit under a titled group.

**Files:**
- Modify: `src/model/dashboard.ts`, `src/model/dashboard.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Modify: `src/islands/hub/WhatsNext.tsx`, `src/islands/hub/WhatsNext.test.tsx`
- Modify: `src/islands/hub/Dashboard.tsx`, `src/islands/hub/Dashboard.test.tsx`
- Modify: `src/islands/hub/DashboardSkeleton.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `rankCategories(items, records): string[]`, `nextGroups(items, records, limit): NextGroup[]`, `NextGroup`, `NEXT_GROUPS = 2` in `src/model/dashboard.ts`. `whatsNext` is removed (its only callers are `Dashboard.tsx` and its tests).
- Produces: `WhatsNext` takes `groups: ShownGroup[]` (`{ category, title, items }`) instead of `items`.
- Consumes: `perCategory`, `countable` from `stats.ts`; `groupItems` from `seed.ts`; `seedLabel` and `translator` from `i18n`.

- [ ] **Step 1: Model tests first**

In `src/model/dashboard.test.ts`, import `nextGroups` and `rankCategories` instead of `whatsNext`, and replace the `describe("whatsNext", ...)` block with:

```ts
describe("rankCategories", () => {
	it("puts wildlife first, then category order, when nothing is found", () => {
		expect(rankCategories(items, {})).toEqual(["wildlife", "collectibles", "vehicles"])
	})
	it("ranks by share found, ties in category order, and drops finished categories", () => {
		const r = records({
			"collectibles/a": "2026-11-20T10:00:00Z",
			"collectibles/b": "2026-11-20T10:00:00Z",
			"vehicles/c": "2026-11-20T10:00:00Z",
		})
		expect(rankCategories(items, r)).toEqual(["vehicles", "wildlife"])
	})
	it("agrees with closestCategory on its first entry", () => {
		const cases: Records[] = [
			{},
			records({ "vehicles/c": "2026-11-20T10:00:00Z" }),
			records({ "collectibles/a": "2026-11-20T10:00:00Z", "wildlife/e": "2026-11-20T10:00:00Z" }),
		]
		for (const r of cases) expect(rankCategories(items, r)[0]).toBe(closestCategory(items, r))
	})
})

describe("nextGroups", () => {
	const birds = [
		item("wildlife/pelican", "birds"),
		item("wildlife/egret", "birds"),
		item("wildlife/alligator", "reptiles"),
		item("wildlife/dodo", "birds", { retired: true }),
		item("vehicles/bike", "bikes"),
	]
	const names = (groups: ReturnType<typeof nextGroups>) =>
		groups.map((g) => [g.category, g.left, g.items.map((i) => i.name)])

	it("lists unfound items of the closest category in tracker order, up to the limit", () => {
		expect(names(nextGroups(birds, {}, 3))).toEqual([
			["wildlife", 3, ["egret", "pelican", "alligator"]],
		])
	})
	it("counts every unfound item in left, not only the ones shown", () => {
		expect(names(nextGroups(birds, {}, 2))).toEqual([["wildlife", 3, ["egret", "pelican"]]])
	})
	it("skips found and retired items and fills from the next-closest category", () => {
		const r = records({ "wildlife/egret": "2026-11-20T10:00:00Z" })
		expect(names(nextGroups(birds, r, 3))).toEqual([
			["wildlife", 2, ["pelican", "alligator"]],
			["vehicles", 1, ["bike"]],
		])
	})
	it("fills from the next category when the closest has one left", () => {
		const r = records({ "collectibles/a": "2026-11-20T10:00:00Z" })
		expect(names(nextGroups(items, r, 3))).toEqual([
			["collectibles", 1, ["b"]],
			["vehicles", 2, ["c", "d"]],
		])
	})
	it("draws from at most two categories, even with room left", () => {
		const r = records({
			"collectibles/a": "2026-11-20T10:00:00Z",
			"vehicles/c": "2026-11-20T10:00:00Z",
		})
		expect(names(nextGroups(items, r, 3))).toEqual([
			["collectibles", 1, ["b"]],
			["vehicles", 1, ["d"]],
		])
	})
	it("is empty when everything is found", () => {
		const all = Object.fromEntries(items.map((i) => [i.id, "2026-11-20T10:00:00Z"]))
		expect(nextGroups(items, records(all), 3)).toEqual([])
	})
})
```

Run: `npx vitest run src/model/dashboard.test.ts`
Expected: FAIL (`nextGroups` and `rankCategories` are not exported).

- [ ] **Step 2: The model**

In `src/model/dashboard.ts`, replace `closestCategory` and `whatsNext` with:

```ts
/** How many categories What's next draws from (dashboard spec §4). */
export const NEXT_GROUPS = 2

/** One category's rows in What's next. */
export interface NextGroup {
	category: string
	/** Every unfound item of the category, not only the ones shown. */
	left: number
	items: SeedItem[]
}

/**
 * Categories below 100 %, highest share found first, ties in category order. With nothing found,
 * wildlife comes first and the rest follow in category order.
 */
export function rankCategories(items: SeedItem[], records: Records): string[] {
	const counts = perCategory(countable(items), records)
	if (counts.every((c) => c.done === 0)) {
		const first = counts.find((c) => c.category === FIRST_GOAL) ?? counts[0]
		return first ? [first, ...counts.filter((c) => c !== first)].map((c) => c.category) : []
	}
	// sort is stable, so equal shares keep category order.
	return counts
		.filter((c) => c.done < c.total)
		.sort((a, b) => b.done / b.total - a.done / a.total)
		.map((c) => c.category)
}

/**
 * The category with the highest share found below 100 %. Ties go to category order. With nothing
 * found it is wildlife; with everything found it is undefined.
 */
export function closestCategory(items: SeedItem[], records: Records): string | undefined {
	return rankCategories(items, records)[0]
}

/** Unfound items of `category` in the tracker's order (group, then name). */
function openItems(items: SeedItem[], records: Records, category: string): SeedItem[] {
	const open = countable(items).filter(
		(item) => item.category === category && !records[item.id]?.done
	)
	return [...groupItems(open).values()].flat()
}

/**
 * What's next: up to `limit` unfound items, from the closest category first, then the next-closest,
 * from at most NEXT_GROUPS categories. Empty when everything is found.
 */
export function nextGroups(items: SeedItem[], records: Records, limit: number): NextGroup[] {
	const groups: NextGroup[] = []
	let room = limit
	for (const category of rankCategories(items, records)) {
		if (room <= 0 || groups.length === NEXT_GROUPS) break
		const open = openItems(items, records, category)
		groups.push({ category, left: open.length, items: open.slice(0, room) })
		room -= open.length
	}
	return groups
}
```

Run: `npx vitest run src/model/dashboard.test.ts`
Expected: PASS, including the existing `closestCategory` tests unchanged.

- [ ] **Step 3: Copy**

Add after `hub.whatsNext` in both locale files, text exactly as spec §8:

- `src/locales/en.json`: `"hub.nextGroup": "{category} · {count} left"`, `"hub.nextGroupThen": "Then: {category} · {count} left"`
- `src/locales/nb.json`: `"hub.nextGroup": "{category} · {count} igjen"`, `"hub.nextGroupThen": "Deretter: {category} · {count} igjen"`

The `·` is U+00B7 with a normal space on each side, as in the strip.

- [ ] **Step 4: WhatsNext renders groups**

In `src/islands/hub/WhatsNext.tsx`:

- Export `interface ShownGroup { category: string; title: string; items: SeedItem[] }`. The `items` prop becomes `groups: ShownGroup[]` (doc comment: up to three unfound items in at most two titled groups, fresh from the model).
- `held` holds `ShownGroup[] | null`; `const shown = held ?? groups` and `const rows = shown.flatMap((g) => g.items)`. Everything that used the flat list (the `shown` ref of ids, the entering effect, `tick`'s `setHeld`) uses `rows` and `groups`. `tick` still receives the row's index in the flat list, so focus after a tick lands on the row now in the ticked one's place across groups.
- Rendering: when `rows.length === 0`, the existing `next-done` paragraph. Otherwise:

```tsx
<div className="next-groups">
	{shown.map((group) => (
		<Fragment key={group.category}>
			<h3 id={`next-group-${group.category}`} className="next-group">
				{group.title}
			</h3>
			<ul className="next-list" aria-labelledby={`next-group-${group.category}`}>
				{group.items.map((item) => /* the existing <li>, with its flat index */)}
			</ul>
		</Fragment>
	))}
</div>
```

Compute each row's flat index from the groups before it (a running offset), not with `indexOf`. The focus effect's `.next-list input` query already spans both lists; keep it. The `{children}` slot (the Undo toast) stays straight after the groups, so Tab from the last row reaches Undo.

- [ ] **Step 5: Dashboard builds the groups**

In `src/islands/hub/Dashboard.tsx`:

- Import `nextGroups` instead of `whatsNext`. In the `useMemo`, `next: nextGroups(items, records, NEXT_LIMIT)`. `closest` stays from `closestCategory` (the tile).
- Before the JSX:

```ts
const groups = view.next.map((g, index) => ({
	category: g.category,
	items: g.items,
	title: t(index === 0 ? "hub.nextGroup" : "hub.nextGroupThen", {
		category: label(g.category),
		count: g.left,
	}),
}))
```

- Pass `groups={groups}` to `WhatsNext`.

- [ ] **Step 6: Reserved height and styles**

In `src/islands/hub/DashboardSkeleton.tsx`, wrap the skeleton's `next-list` in `<div className="next-groups">` so it reserves the same height as the loaded block. No title placeholders: the wrapper's `min-height` does the reserving.

In `src/styles/global.css`, the reserved height moves from the list to the wrapper. Replace the `.next-list, .next-done` rule and drop nothing else:

```css
/* What's next reserves 3 rows and 2 group titles, loaded or not (dashboard spec §4). */
.whats-next {
	--next-title-h: 2rem;
}

.next-groups,
.next-done {
	min-height: calc(3 * var(--tap) + 2 * var(--space-1) + 2 * var(--next-title-h));
	margin: 0;
}

.next-list {
	margin: 0;
}

/* 1.25rem line + space-2 above + space-1 below = --next-title-h. A label, set apart from the rows. */
.next-group {
	margin: 0;
	padding: var(--space-2) 0 var(--space-1);
	font-size: 0.875rem;
	font-weight: 600;
	line-height: 1.25rem;
	color: var(--text-muted);
	overflow-wrap: anywhere;
}
```

Keep the existing `.next-list` grid, gap, padding, list-style and overflow rules as they are.

- [ ] **Step 7: Component tests**

`src/islands/hub/WhatsNext.test.tsx`: the `Harness` takes `initial` as a list of categories with their items (`{ category: string; items: SeedItem[] }[]`, default one wildlife group of the four birds). It removes a saved item from its category, drops empty categories, and builds `groups` the way the model does: fill to 3 rows from at most 2 categories, titles `"<category> · <left> left"` for the first and `"Then: <category> · <left> left"` for the second. The five existing tests keep their assertions. Add:

1. **"titles each group and labels its list by the title"**: wildlife `[Avocet]`, vehicles `[Bike, Car, Van]` (a second `item` helper or a category argument). Expect headings `wildlife · 1 left` and `Then: vehicles · 3 left` at level 3, `getByRole("list", { name: "wildlife · 1 left" })` holds Avocet, and the vehicles list holds Bike and Car.
2. **"moves to the next group when its last item is ticked"**: same groups. Tick Avocet, `advance(LEAVE_MS)`. Expect one level-3 heading `vehicles · 3 left`, checkboxes Bike, Car, Van in that order, Van's row `data-entering`, and focus on Bike.

`src/islands/hub/Dashboard.test.tsx`: update the tests whose What's next rows change now that the next category fills in. In "moves on when the closest category is done, and Undo brings it back", assert before the tick that the headings read `Wildlife · 1 left` and `Then: Vehicles · 1 left`; after the tick `Vehicles · 1 left` alone with focus on Bike; after Undo both titles again with focus on American alligator.

Run: `npx vitest run src/model/dashboard.test.ts src/islands/hub`
Expected: PASS.

- [ ] **Step 8: Full checks and commit**

Run: `npm test`, `npm run check`, then `npx biome check --write` on the changed files.
Expected: all green.

```bash
git add src/model/dashboard.ts src/model/dashboard.test.ts src/locales/en.json src/locales/nb.json src/islands/hub/WhatsNext.tsx src/islands/hub/WhatsNext.test.tsx src/islands/hub/Dashboard.tsx src/islands/hub/Dashboard.test.tsx src/islands/hub/DashboardSkeleton.tsx src/styles/global.css
git commit -m "Fill What's next from the next-closest category"
```

- [ ] **Step 9: Layout check (controller, browser pane)**

Build with `ROOKDEX_NOW=2026-11-22T12:00:00Z`, serve with `wrangler dev`, unregister the service worker and clear caches. At 320 px and desktop, `en` and `nb`, with profiles of 0 finds, 1 item left in the closest category, and the two-categories-one-left-each case: What's next height equals the skeleton's (CLS 0 with a `PerformanceObserver`), titles stand apart from the rows, nothing overflows, Tab from the last row reaches Undo, and the toast doesn't cover the focused row. If `Deretter: Samleobjekter · N igjen` wraps at 320 px and pushes the block past its reservation, findings go back to the implementer.

---

### Task 11: launch-rebuild

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: a `schedule` trigger at `5 23 18 11 *` and a `gate` job whose `go` output stops a scheduled run in any year but 2026.

- [ ] **Step 1: Add the schedule and the gate**

In `.github/workflows/deploy.yml`, the `on:` block becomes:

```yaml
on:
  push:
    branches: [main]
    paths-ignore: ["docs/**", "README.md"]
  workflow_dispatch:
  # launch-rebuild (dashboard spec §12): 23:05 UTC on 18 Nov is 00:05 CET on 19 Nov. The hub's
  # server HTML is built with the build time, so this rebuild is what makes it the dashboard.
  schedule:
    - cron: "5 23 18 11 *"
```

Add a first job, and make `test` depend on it:

```yaml
jobs:
  # Scheduled runs go ahead only in 2026, so the launch rebuild doesn't fire again next year.
  gate:
    runs-on: ubuntu-latest
    outputs:
      go: ${{ steps.year.outputs.go }}
    steps:
      - id: year
        env:
          EVENT: ${{ github.event_name }}
        run: |
          if [ "$EVENT" != "schedule" ] || [ "$(date -u +%Y)" = "2026" ]; then
            echo "go=true" >> "$GITHUB_OUTPUT"
          else
            echo "go=false" >> "$GITHUB_OUTPUT"
          fi

  test:
    needs: gate
    if: needs.gate.outputs.go == 'true'
    runs-on: ubuntu-latest
```

The scheduled run is the first time the suite ever runs with the real clock past launch. A test that quietly assumes "before launch" would fail it and block the one deploy that must happen. The commit on `main` already passed on its push, so on a schedule the tests still run and report, but don't block. The `deploy` job's header becomes:

```yaml
  deploy:
    needs: [gate, test]
    # workflow_dispatch can target any branch; only main may reach production (SEO spec §4.6).
    # On the launch schedule a failed test is reported but doesn't stop the rebuild: the same
    # commit already passed on its push (dashboard spec §12).
    if: >-
      !cancelled() && github.ref == 'refs/heads/main' && needs.gate.outputs.go == 'true' &&
      (needs.test.result == 'success' || github.event_name == 'schedule')
    runs-on: ubuntu-latest
```

Everything below `runs-on` stays as it is.

- [ ] **Step 2: Validate the workflow**

Run: `npx biome ci .github` (Biome skips YAML; this only confirms nothing else broke), then
`gh workflow view deploy.yml` after pushing the branch.
Expected: the workflow parses (no "invalid workflow file" annotation on the branch's push).

- [ ] **Step 3: Dry run on the branch**

After pushing the branch:

```bash
gh workflow run deploy.yml --ref feat/dashboard
```

Expected: `gate` and `test` run green; `deploy` is skipped because the ref is not `main`. Read the run with `gh run list --workflow deploy.yml --limit 1`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Rebuild the hub at launch with a scheduled deploy"
```

---

### Task 12: Final verification and the PR

- [ ] **Step 1: Full checks**

```bash
npm test
npm run check
npm run build
```

Then in the LF worktree: `git -C ../rookdex-lf fetch && git -C ../rookdex-lf checkout --detach origin/feat/dashboard` (after pushing), and `npx biome ci .` there.
Expected: all green; Biome reports 0 errors.

- [ ] **Step 2: Preview checks**

On the PR's `workers.dev` preview: open `/en/?phase=after` and `/nb/?phase=after` and confirm the dashboard shows; open `/en/` without the parameter and confirm the countdown shows.

- [ ] **Step 3: Malin's manual passes (spec §13), before merge**

- Keyboard and NVDA walk on `/en/?phase=after`: tick, Tab to Undo, Undo, Escape, switch profile. Each is heard once.
- The layout screenshot from Task 10.

- [ ] **Step 4: Open the PR**

```bash
gh pr create --base main --head feat/dashboard --title "Launch-night dashboard" --body-file -
```

with this body:

```markdown
The home page now shows the countdown before launch and a dashboard after it.

- One `Hub` island owns the clock, the status region and Latest; the dashboard loads only after launch.
- What's next ticks in place, with a 5 s Undo that waits while focus is in the list.
- The active profile is remembered across pages and reloads; Delete all removes it.
- Rumours have an `added` date; News and Latest sort by it.
- `?phase=after` previews the dashboard on workers.dev and localhost only. `ROOKDEX_NOW` builds the after state for testing.
- `deploy.yml` rebuilds at 00:05 CET on 19 Nov, gated to 2026.

Spec: `docs/superpowers/specs/2026-10-14-rookdex-dashboard-design.md`
Plan: `docs/superpowers/plans/2026-10-14-rookdex-dashboard.md`

Checked: tests, type check, Biome, CLS 0 at 320 px and desktop in both languages, keyboard and NVDA walk.
```

- [ ] **Step 5: After merge, before 1 November**

With Malin's OK, run the production dry run from spec §12: `gh workflow run deploy.yml --ref main`, then confirm it went green. On the morning of 19 Nov: check the Actions tab and the hub's page source; if the scheduled rebuild is missing, start `deploy.yml` by hand.

---

## Considered and rejected (plan stress test)

- **Memoising `Dashboard` against the hub's one-second tick.** The hub re-renders it every second, but the numbers sit behind one `useMemo` and the tree is small. `memo` would add typing friction on the lazy import for no felt gain.
- **Visible focus after the midnight flip.** Focus lands on the visually hidden "Your progress" heading (spec §6.4), so a sighted keyboard player sees no ring until the next Tab. Better than `body`, and it happens once in the app's life.
- **Undo clicked during the 200 ms slide.** The restored item's checkbox and the row index point to the same place once the slide ends, so focus still lands right.
- **A profile switch inside the 200 ms slide.** Focus could move from the menu trigger to a row of the new profile. Opening the menu and picking a profile in 200 ms isn't a real path.
- **Testing the workflow's 2027 branch.** The year gate is four lines of shell with no test harness; the 2026 path is proven by the dispatch dry run, and a 2027 misfire only redeploys `main`.
- **Installed apps keep the "before" HTML longer than the spec says.** `precache.mjs` leaves `.build-stamp` out of the version hash, so the launch rebuild alone doesn't update the service worker; the next real deploy does. The client flips by clock either way, so the cost stays one layout shift per load, as spec §14 accepts.
- **The Progress link on the tracker page across launch midnight.** It is decided on mount, so a tracker tab left open over midnight shows plain text until reload.

> Stress-tested 2026-10-14 (skill 1b85fca): 5 applied, 1 adapted, 0 decided by me.
