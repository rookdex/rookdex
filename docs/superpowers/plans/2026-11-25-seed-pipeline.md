# Seed pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the seed on the game's structure (folder per category, file per group, every rule checked at build) and move today's 216 items in with their ids unchanged.

**Architecture:** A pure `buildSeed()` in `src/model/seedBuild.ts` reads `src/seed/categories.json`, the group files under `src/seed/categories/<category>/<group>.json` and `src/seed/shipped-ids.txt`, and returns the items in display order plus every error. `seed.ts` calls it at module load through `import.meta.glob`, so the build, Vitest and the island all see the same result and a bad seed still fails the build. Consumers keep reading `SeedItem` with `category` and `group` filled in, so the tracker, Dex, Sources page and dashboard need only label and id changes.

**Tech Stack:** Astro 7, React 19 islands, TypeScript 6, Zod 4 via `astro/zod`, Vitest 5, Biome 2.

**Spec:** `docs/superpowers/specs/2026-11-25-category-model-design.md`

## Delivery change from the spec

Spec §11.1 ships the foundation as one PR. I split it into four, because six subsystems in one diff are too much for one review and one bad piece would block the rest:

1. **Seed pipeline (this plan):** §3 levels and files, §5 build checks (not the chunks), §6 ids, §8 extras in the schema and build, §9 source rule, the Animals and Collections renames with 301s, aliases in search.
2. **Data delivery:** §5 inlined index, per-category chunks, the service worker copy, no Zod in the browser. Index snapshot test.
3. **Sets and Dex extras:** §3 `details` sets, hash and search opening closed sets, §8.8 tips, locations and specs on the Dex card, `lang="en"` on seed text.
4. **Navigation:** §7 folding grid, chips B, the Playwright smoke test.

The 100 % view PR (§11.2) stays as the spec has it and also owns the checklist build checks (missing `from` ref, item in two lines).

Spec §5 puts every id check in the build. Spec §6 checks 2 and 3 (no line on main is dropped, a new id starts with its category) run in CI instead (Task 5), because they need main's copy of `shipped-ids.txt`. The build has only the branch's copy.

## Global Constraints

- **No user data is affected.** No IndexedDB version bump, no export version change. Every shipped id stays exactly as it is (spec §1, §6).
- **Ids:** item ids stay on `idSchema` (one slash, 80 characters max) because `progressRecordSchema` checks stored ticks against it.
- **No new dependencies.** Zod comes from `astro/zod`.
- **Seed text is English only.** Plain text fields allow no URLs and no markup (`text()`).
- **Header sources:** the status rule runs on the union of an item's own sources and its group header's (spec §9 as written). That is her decision of 25.11. The no-whole-list rule in spec §9 stays a review-time rule for content PRs: the build cannot see where a list came from.
- **Copy:** US spelling, no em dashes, times with a colon, dates with periods. In Norwegian the person is «bruker».
- **Work in `../rookdex-lf`** (LF checkout) on branch `feat/seed-pipeline`, cut from `main` after #150 merges. `npm run lint` is `biome ci .` and must run there; the main checkout shows CRLF noise.
- **Commits:** stage named paths only, never `git commit -a`. No `Co-Authored-By` or AI lines.
- **Tests:** `src/test/setup.ts` pins `TZ=Europe/Oslo`. Run one file with `npx vitest run <path>`.
- **Merge:** only `ward / gate` is required, so auto-merge would land before Lighthouse. She merges by hand once every check is done.

## Review Focus

1. **The first CI run has no list on main.** `git show origin/main:src/seed/shipped-ids.txt` fails on this PR, because the file is new. The shipped-ids job must pass then and enforce from the next PR on, without failing open: it writes an empty list only when the branch itself adds the file, and any other failure to read main fails the job. Pinned in Task 5 (`ciShippedErrors` with empty main text returns no errors, and the job's read step).
2. **Old links and saved views name `wildlife` or `collectibles`.** `?show=wildlife,collectibles` must open Animals and Collections. `?group=wildlife/birds` (a group key is `category/group`, `groupKey` in `stats.ts`) must be dropped so the view falls back to the whole category, while `?group=animals/birds` still presses the Birds chip. Pinned in Task 6 (`parseShow` and `parseGroups` tests).
3. **`shipped-ids.txt` checked out with CRLF.** Git on Windows can write `\r\n`. `parseShipped` must read the same ids either way. Pinned in Task 3.
4. **Names that start with digits or marks.** "'70 Vapid Ganado", "’70 Vapid Ganado" (curly apostrophe) and "1955 Vapid Stanier" sort under V, "Hoop 10" comes after "Hoop 9", but "300R" stays under 3. Pinned in Task 3 (`sortKey` tests).
5. **`/no/dex/wildlife/` takes two hops** (`/no/*` then the rename) unless it has its own line. Old Norwegian links must reach `/nb/dex/animals/` in one 301. Pinned in Task 6 (redirect test).

---

## File map

| File | Responsibility |
|---|---|
| `src/model/normalize.ts` (new) | `normalize()` moved out of `search.ts`, so `seedBuild.ts` can use it without an import cycle |
| `src/model/tiers.ts` (new) | Allowlist matching, tiers and the status rules, moved out of `seed.ts` plus the §9 rule |
| `src/model/schema.ts` | Group file, categories file, game source, extras schemas, and the `SeedItem` output type |
| `src/model/seedBuild.ts` (new) | `buildSeed()`, `sortKey()`, `parseShipped()`, `shippedIdErrors()`, `ciShippedErrors()`, `SPEC_KEYS` |
| `src/model/seed.ts` | Glob the folders, call `buildSeed`, keep rumours and facts, export `seedItems` |
| `src/test/seed-fixture.ts` (new) | The valid fixture input that `seedBuild.test.ts` mutates per case |
| `src/model/shippedIds.ci.test.ts` (new) | CI-only check against main's list |
| `src/seed/categories.json`, `src/seed/categories/**`, `src/seed/shipped-ids.txt` (new) | The moved seed |
| `src/seed/{vehicles,wildlife,collectibles,places}.json` (deleted) | Replaced by the folders |
| `src/components/SourceList.astro` | Renders a `game` source as "In-game Progress menu" |
| `src/model/stats.ts`, `src/model/tracker.ts`, `src/model/dashboard.ts`, `src/islands/Tracker.tsx`, `src/islands/hub/Dashboard.tsx` | `listed()` for chips and tiles, `countable()` for totals |
| `src/locales/{en,nb}.json`, `src/model/searchTerms.ts`, `src/islands/tracker/icons.tsx`, `src/model/dashboard.ts`, `src/model/tracker.ts`, `src/model/seo.ts`, `public/_redirects` | Renames |
| `src/model/search.ts`, `src/model/dex.ts` | Aliases in search |
| `.github/workflows/ci.yml` | `shipped-ids` job |

---

### Task 1: Leaf modules for text folding and source tiers, plus the §9 rule

**Files:**
- Create: `src/model/normalize.ts`, `src/model/tiers.ts`, `src/model/tiers.test.ts`
- Modify: `src/model/search.ts` (top), `src/model/seed.ts` (lines 1-109), `src/model/seed.test.ts` (lines 83, 106, 124), `src/test/dex-page.test.ts` (line 77), `src/test/sources-page.test.ts` (lines 42, 73)

**Interfaces:**
- Produces: `normalize(text: string): string` in `normalize.ts`. In `tiers.ts`: `matchesPrefix`, `resolveTier`, `isVideo`, `TierResult` (moved unchanged), `isGameSource(source): source is GameSource`, `attachTiers(id, sources: SourceInput[], list)`, `tierItemSources(id, sources: ItemSourceInput[], list): { sources: ItemSource[]; errors: string[] }`, `officialErrors(id, sources: Source[]): string[]`, `pressEntry(url: string, list): string | undefined`, `confirmedItemErrors(id, sources: ItemSource[], list): string[]`, `tierErrors(item: SeedItem, list): string[]`.
- Consumes: `GameSource`, `ItemSource`, `ItemSourceInput` from Task 2. **Do Task 2 Step 3 (the schema types) first if you run tasks out of order**; in order, Task 1 declares those three types in `schema.ts` itself (Step 3 below) and Task 2 adds the Zod schemas behind them.

- [ ] **Step 1: Write the failing tests**

Create `src/model/tiers.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { Allowlist, ItemSource, SeedItem } from "./schema"
import { confirmedItemErrors, officialErrors, pressEntry, tierErrors, tierItemSources } from "./tiers"

const list: Allowlist = {
	official: ["rockstargames.com", "youtube.com/@RockstarGames/"],
	press: ["ign.com", "gamesradar.com"],
	blocklist: ["leaksite.example"],
}
const official = { url: "https://www.rockstargames.com/VI", title: "GTA VI site", tier: "official" as const }
const trailer = { url: "https://www.youtube.com/@RockstarGames/videos", title: "Trailer 1", tier: "official" as const }
const ign = { url: "https://www.ign.com/gta-6/1", title: "IGN guide", tier: "press" as const }
const ignBare = { url: "https://ign.com/gta-6/3", title: "IGN", tier: "press" as const }
const ignNordic = { url: "https://nordic.ign.com/gta-6/2", title: "IGN Nordic", tier: "press" as const }
const radar = { url: "https://www.gamesradar.com/gta-6/1", title: "GamesRadar guide", tier: "press" as const }
const game = { kind: "game" as const, screen: ["Progress", "Vehicles", "Cars"] }

function item(sources: ItemSource[], overrides: Partial<SeedItem> = {}): SeedItem {
	return { id: "vehicles/a", category: "vehicles", group: "cars", name: "A", status: "confirmed", sources, ...overrides }
}

describe("officialErrors (facts and the old item rule)", () => {
	it("needs an official source, and a video alone needs press too", () => {
		expect(officialErrors("x/a", [official])).toEqual([])
		expect(officialErrors("x/a", [ign])).toEqual(["x/a: confirmed needs an official source"])
		expect(officialErrors("x/a", [trailer])).toHaveLength(1)
		expect(officialErrors("x/a", [trailer, ign])).toEqual([])
	})
})

describe("pressEntry", () => {
	it("names the first press entry that covers the url, subdomains included", () => {
		expect(pressEntry(ign.url, list)).toBe("ign.com")
		expect(pressEntry(ignNordic.url, list)).toBe("ign.com")
		expect(pressEntry(radar.url, list)).toBe("gamesradar.com")
		expect(pressEntry(official.url, list)).toBeUndefined()
	})
})

describe("confirmedItemErrors (category model spec §9)", () => {
	const pairError = /vehicles\/a: confirmed needs an official source, a game screen or two press sources/
	it("accepts a game screen on its own", () => {
		expect(confirmedItemErrors("vehicles/a", [game], list)).toEqual([])
	})
	it("accepts two press sources on different allowlist entries", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, radar], list)).toEqual([])
	})
	it("rejects two press sources under one allowlist entry, even on different hosts", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, ignNordic], list).join()).toMatch(pairError)
	})
	it("rejects www.ign.com and ign.com as one entry", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, ignBare], list).join()).toMatch(pairError)
	})
	it("keeps the official rule for items that already ship", () => {
		expect(confirmedItemErrors("vehicles/a", [official], list)).toEqual([])
		expect(confirmedItemErrors("vehicles/a", [trailer, ign], list)).toEqual([])
		expect(confirmedItemErrors("vehicles/a", [trailer], list).join()).toMatch(/video-only/)
	})
})

describe("tierErrors", () => {
	it("expected needs a precedent", () => {
		expect(tierErrors(item([ign], { status: "expected" }), list)).toEqual(["vehicles/a: expected needs a precedent"])
		expect(tierErrors(item([ign], { status: "expected", precedent: "GTA V" }), list)).toEqual([])
	})
})

describe("tierItemSources", () => {
	it("passes a game source through and tiers url sources", () => {
		const result = tierItemSources(
			"vehicles/a",
			[game, { url: "https://www.ign.com/x", title: "IGN" }],
			list
		)
		expect(result.errors).toEqual([])
		expect(result.sources).toEqual([game, { url: "https://www.ign.com/x", title: "IGN", tier: "press" }])
	})
	it("reports blocked and unlisted hosts", () => {
		const result = tierItemSources(
			"vehicles/a",
			[{ url: "https://leaksite.example/x", title: "Leak" }, { url: "https://example.com/x", title: "Other" }],
			list
		)
		expect(result.errors).toEqual([
			"vehicles/a: source https://leaksite.example/x is blocked",
			"vehicles/a: source https://example.com/x is unlisted",
		])
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/model/tiers.test.ts`
Expected: FAIL, "Failed to resolve import ./tiers".

- [ ] **Step 3: Add the three source types to `schema.ts`**

Add after the `sourceSchema` line in `src/model/schema.ts` (Task 2 replaces the hand-written `GameSource` with the inferred one):

```ts
/** Category model spec §8.7: a reading off a game screen. It has no URL. The screen is its menu
 *  path, one entry per level (["Progress", "Vehicles", "Cars"]): `text()` forbids `>`. */
export const gameSourceSchema = z.strictObject({
	kind: z.literal("game"),
	screen: z.array(text(TEXT.name)).min(1).max(4),
})
export const itemSourceInputSchema = z.union([sourceInputSchema, gameSourceSchema])
```

and next to the other exported types:

```ts
export type GameSource = z.infer<typeof gameSourceSchema>
export type ItemSourceInput = z.infer<typeof itemSourceInputSchema>
export type ItemSource = Source | GameSource
```

Change `SeedItem` so its `sources` may hold a game source. Replace `export type SeedItem = z.infer<typeof seedItemSchema>` with:

```ts
export type SeedItem = Omit<z.infer<typeof seedItemSchema>, "sources"> & { sources: ItemSource[] }
```

(Task 2 replaces this line again with the full output type.)

- [ ] **Step 4: Create `normalize.ts` and point `search.ts` at it**

`src/model/normalize.ts`:

```ts
// Text folding shared by search and the seed build. A leaf module, so seedBuild.ts can use it
// without importing search.ts, which imports stats.ts, which imports seed.ts.

/** NFD with combining marks removed, lowercase, trimmed, inner whitespace collapsed. ø and æ
 *  are letters, not accents, so they stay. */
export function normalize(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")
}
```

In `src/model/search.ts`, delete the `normalize` function and its comment, and add at the top:

```ts
import { normalize } from "./normalize"

export { normalize }
```

- [ ] **Step 5: Create `tiers.ts`**

Move `VIDEO_HOSTS`, `matchesPrefix` (with its doc comment), `TierResult`, `resolveTier`, `isVideo` and `attachTiers` out of `seed.ts` verbatim, export `attachTiers`, rename `confirmedErrors` to `officialErrors` and export it, then add the new functions. The file:

```ts
// Source tiers and the status rules (spec §4, category model spec §9). A leaf below seed.ts and
// seedBuild.ts, so neither imports the other.
import { normalizeHost } from "./outlet"
import type {
	Allowlist,
	GameSource,
	ItemSource,
	ItemSourceInput,
	SeedItem,
	Source,
	SourceInput,
	Tier,
} from "./schema"

const VIDEO_HOSTS = ["youtube.com", "youtu.be"]

// matchesPrefix, TierResult, resolveTier and isVideo: moved verbatim from seed.ts.

export function isGameSource(source: ItemSource | ItemSourceInput): source is GameSource {
	return "kind" in source
}

// attachTiers: moved verbatim from seed.ts, now exported.

/** As attachTiers, for item sources: a game screen has no URL and passes through. */
export function tierItemSources(
	id: string,
	sources: ItemSourceInput[],
	list: Allowlist
): { sources: ItemSource[]; errors: string[] } {
	const errors: string[] = []
	const tiered: ItemSource[] = []
	for (const source of sources) {
		if (isGameSource(source)) {
			tiered.push(source)
			continue
		}
		const result = attachTiers(id, [source], list)
		errors.push(...result.errors)
		tiered.push(...result.sources)
	}
	return { sources: tiered, errors }
}

/** Spec §4: confirmed needs an official source, and an official video alone needs press too.
 *  Facts keep this rule as it is. */
export function officialErrors(id: string, sources: Source[]): string[] {
	const official = sources.filter((s) => s.tier === "official")
	if (official.length === 0) return [`${id}: confirmed needs an official source`]
	if (official.every((s) => isVideo(s.url)) && !sources.some((s) => s.tier === "press"))
		return [`${id}: video-only official source needs a press source naming the item`]
	return []
}

/** The first press entry on the allowlist that covers `url`. Two press sources are independent
 *  when their entries differ, so ign.com and nordic.ign.com count as one outlet (spec §9). */
export function pressEntry(url: string, list: Allowlist): string | undefined {
	const parsed = new URL(url)
	return list.press.find((prefix) => matchesPrefix(parsed, prefix))
}

/** Category model spec §9: a game screen, the official rule above, or two press sources on
 *  different allowlist entries. */
export function confirmedItemErrors(id: string, sources: ItemSource[], list: Allowlist): string[] {
	if (sources.some(isGameSource)) return []
	const urls = sources.filter((s): s is Source => !isGameSource(s))
	const official = officialErrors(id, urls)
	if (official.length === 0) return []
	const entries = new Set(
		urls.filter((s) => s.tier === "press").flatMap((s) => pressEntry(s.url, list) ?? [])
	)
	if (entries.size >= 2) return []
	return urls.some((s) => s.tier === "official")
		? official
		: [`${id}: confirmed needs an official source, a game screen or two press sources on different allowlist entries`]
}

/** What each status needs from its sources. */
export function tierErrors(item: SeedItem, list: Allowlist): string[] {
	if (item.status === "confirmed") return confirmedItemErrors(item.id, item.sources, list)
	return item.precedent ? [] : [`${item.id}: expected needs a precedent`]
}
```

In `seed.ts`, delete the moved code, import what it still uses and re-export the rest so existing imports keep working:

```ts
import { attachTiers, officialErrors, tierErrors } from "./tiers"

export { isVideo, matchesPrefix, resolveTier, type TierResult, tierErrors } from "./tiers"
```

`validateFacts` calls `officialErrors` where it called `confirmedErrors`. `validateRumours` and `validateSeedFile` keep calling `attachTiers`, and `validateSeedFile` now passes its `list` to `tierErrors(item, list)`.

- [ ] **Step 6: Update the tests that read item sources**

`item.sources` is now `ItemSource[]`, so a test that reads `.tier`, `.url` or `.title` on it must narrow with `isGameSource` (import it from `tiers.ts`) or typecheck fails:

- `src/model/seed.test.ts` line 124: `expect(items[0].sources.flatMap((s) => (isGameSource(s) ? [] : [s.tier]))).toEqual(["official"])`.
- `src/test/dex-page.test.ts` line 77 and `src/test/sources-page.test.ts` line 42: `item.sources.flatMap((s) => (isGameSource(s) ? [] : [s.url]))` in place of `item.sources.map((s) => s.url)`.
- `src/test/sources-page.test.ts` line 73: the same with `s.title`.

Two `seed.test.ts` lines change with the new rule:

- Line 83: a press-only confirmed item now gets the longer message. Expect `["wildlife/american-alligator: confirmed needs an official source, a game screen or two press sources on different allowlist entries"]`.
- Line 106: `tierErrors(ok.items[0], list)`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/model/tiers.test.ts src/model/seed.test.ts src/model/search.test.ts src/test/dex-page.test.ts src/test/sources-page.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck and commit**

Run: `npm run typecheck`
Expected: 0 errors. `SourceList.astro` may now report `url` missing on `GameSource`; if so, do Task 2 Step 6 (the SourceList change) in this commit.

```bash
git add src/model/normalize.ts src/model/tiers.ts src/model/tiers.test.ts src/model/search.ts src/model/seed.ts src/model/seed.test.ts src/model/schema.ts src/test/dex-page.test.ts src/test/sources-page.test.ts
git commit -m "Move source tiers into their own module and accept game screens and press pairs"
```

---

### Task 2: Schemas for group files, categories and item extras

**Files:**
- Modify: `src/model/schema.ts`, `src/model/schema.test.ts`, `src/model/stats.ts`, `src/model/stats.test.ts`, `src/model/tracker.ts`, `src/model/tracker.test.ts`, `src/model/dashboard.ts`, `src/islands/Tracker.tsx`, `src/islands/hub/Dashboard.tsx`, `src/components/SourceList.astro`, `src/locales/en.json`, `src/locales/nb.json`
- Create: `src/components/SourceList.test.ts`

**Interfaces:**
- Produces: `slugSchema`, `SPOILERS`, `PLATFORMS`, `specValueSchema`, `itemInputSchema`, `groupFileSchema`, `categoriesFileSchema`; types `ItemInput`, `GroupFile`, `Spoiler`, `Tip`, `ItemLocation`, `SeedItem` (output: input fields plus `category`, `group`, tiered `sources`, `tips`, `locations`, optional `uncounted: true`). `listed(items)` in `stats.ts`.
- Removes: `seedItemSchema`. `seedItemInputSchema` and `SeedItemInput` (with the unused `location` field) stay, because `validateSeedFile` still parses the old files with them. Task 6 deletes them together with `validateSeedFile`.

- [ ] **Step 1: Write the failing tests**

Add these blocks to `src/model/schema.test.ts`, after the `describe("seedItemInputSchema", ...)` block (that block stays until Task 6 deletes the schema):

```ts
describe("itemInputSchema", () => {
	const item = {
		id: "animals/pelican",
		name: "Pelican",
		status: "confirmed",
		sources: [{ url: "https://www.rockstargames.com/VI", title: "GTA VI site" }],
	}
	it("accepts a minimal item and an item with no sources (the header may carry them)", () => {
		expect(itemInputSchema.safeParse(item).success).toBe(true)
		expect(itemInputSchema.safeParse({ ...item, sources: [] }).success).toBe(true)
	})
	it("rejects bad ids, unknown fields, category and group fields", () => {
		expect(itemInputSchema.safeParse({ ...item, id: "Animals/Pelican" }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, id: "animals/a/b" }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, id: `animals/${"a".repeat(80)}` }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, extra: 1 }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, category: "animals" }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, location: { x: 1, y: 2, region: "a" } }).success).toBe(false)
	})
	it("caps the name at 80 and the description at 300", () => {
		expect(itemInputSchema.safeParse({ ...item, name: "x".repeat(81) }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, description: "x".repeat(301) }).success).toBe(false)
	})
	it("takes a game source, but never one with a url", () => {
		const game = { kind: "game", screen: ["Progress", "Animals", "Birds"] }
		expect(itemInputSchema.safeParse({ ...item, sources: [game] }).success).toBe(true)
		expect(
			itemInputSchema.safeParse({ ...item, sources: [{ ...game, url: "https://www.rockstargames.com/VI" }] })
				.success
		).toBe(false)
	})
	it("caps the extras: 5 aliases, 3 tips with a source each, 10 locations", () => {
		const source = item.sources[0]
		expect(itemInputSchema.safeParse({ ...item, aliases: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, tips: [{ text: "Look up.", sources: [] }] }).success).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, tips: [{ text: "x".repeat(301), sources: [source] }] }).success
		).toBe(false)
		const spot = { area: "Ocean Beach piers", kind: "find" }
		expect(itemInputSchema.safeParse({ ...item, locations: [spot] }).success).toBe(true)
		expect(itemInputSchema.safeParse({ ...item, locations: Array(11).fill(spot) }).success).toBe(false)
		expect(itemInputSchema.safeParse({ ...item, locations: [{ ...spot, kind: "steal" }] }).success).toBe(false)
		expect(
			itemInputSchema.safeParse({ ...item, locations: [{ ...spot, area: "x".repeat(121) }] }).success
		).toBe(false)
	})
})

describe("specValueSchema", () => {
	it("takes a bar from 1 to 10 or plain text from the screen", () => {
		expect(specValueSchema.safeParse(7).success).toBe(true)
		expect(specValueSchema.safeParse("Classic").success).toBe(true)
		expect(specValueSchema.safeParse(0).success).toBe(false)
		expect(specValueSchema.safeParse(11).success).toBe(false)
		expect(specValueSchema.safeParse(6.5).success).toBe(false)
		expect(specValueSchema.safeParse("<b>Classic</b>").success).toBe(false)
	})
})

describe("groupFileSchema", () => {
	const file = { group: "birds", order: 1, sort: "name", items: [] }
	it("accepts a bare header and one with total, sets, counts and sources", () => {
		expect(groupFileSchema.safeParse(file).success).toBe(true)
		expect(
			groupFileSchema.safeParse({
				...file,
				total: 60,
				counts: false,
				sets: [{ id: "shorebirds", total: 4 }],
				sources: [{ kind: "game", screen: ["Progress", "Animals", "Birds"] }],
			}).success
		).toBe(true)
	})
	it("rejects an unknown sort, a zero total and unknown fields", () => {
		expect(groupFileSchema.safeParse({ ...file, sort: "date" }).success).toBe(false)
		expect(groupFileSchema.safeParse({ ...file, total: 0 }).success).toBe(false)
		expect(groupFileSchema.safeParse({ ...file, category: "animals" }).success).toBe(false)
	})
})

describe("categoriesFileSchema", () => {
	it("takes an ordered list where only story may be a spoiler", () => {
		expect(
			categoriesFileSchema.safeParse({ categories: [{ id: "vehicles" }, { id: "story", spoiler: "story" }] })
				.success
		).toBe(true)
		expect(categoriesFileSchema.safeParse({ categories: [{ id: "story", spoiler: "gate" }] }).success).toBe(false)
		expect(categoriesFileSchema.safeParse({ categories: [] }).success).toBe(false)
	})
})
```

Add `categoriesFileSchema`, `groupFileSchema`, `itemInputSchema` and `specValueSchema` to the import at the top of the test file, next to `seedItemInputSchema`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/model/schema.test.ts`
Expected: FAIL, the new exports do not exist.

- [ ] **Step 3: Write the schemas**

In `src/model/schema.ts`:

1. Extend `TEXT` with `tip: 300` and `area: 120`.
2. Export the slug: `export const SLUG = /^[a-z][a-z0-9-]{0,39}$/` and `export const slugSchema = z.string().regex(SLUG)`.
3. Delete `seedItemSchema`. Keep `seedItemInputSchema` and `SeedItemInput` as they are: `validateSeedFile` parses the old files with them until Task 6. Add, after `itemSourceInputSchema`:

```ts
export const SPOILERS = ["story", "gate"] as const
export const PLATFORMS = ["ps5", "xbox", "pc"] as const

/** Spec §8.2: one or two sentences in my own words, never pasted guide text. */
const tipSchema = z.strictObject({
	text: text(TEXT.tip),
	spoiler: z.enum(SPOILERS).optional(),
	sources: z.array(itemSourceInputSchema).min(1),
})

/** Spec §8.3: words plus a link to a guide page. No x/y until the map spec. */
const locationSchema = z.strictObject({
	area: text(TEXT.area),
	kind: z.enum(["find", "spawn", "buy", "unlock"]),
	link: sourceInputSchema.optional(),
})

/** Spec §8.7: a bar read off the screen as 1 to 10, or exact text from the screen. Which keys a
 *  group takes is checked in seedBuild.ts (SPEC_KEYS). */
export const specValueSchema = z.union([z.int().min(1).max(10), text(TEXT.name)])

/** One item as authored in a group file. The folder and file give its category and group. */
export const itemInputSchema = z.strictObject({
	id: idSchema,
	set: slugSchema.optional(),
	name: text(TEXT.name),
	status: z.enum(["confirmed", "expected"]),
	precedent: text(TEXT.name).optional(),
	description: text(TEXT.description).optional(),
	/** May be empty only when the group header has sources (seedBuild checks it). */
	sources: z.array(itemSourceInputSchema),
	retired: z.boolean().optional(),
	/** Retired ids this item is the same thing as, so a twin name is allowed (spec §6). */
	replaces: z.array(idSchema).min(1).optional(),
	/** Old or common names. Search matches them; they are never shown (spec §8.1). */
	aliases: z.array(text(TEXT.name)).min(1).max(5).optional(),
	tips: z.array(tipSchema).min(1).max(3).optional(),
	locations: z.array(locationSchema).min(1).max(10).optional(),
	spoiler: z.enum(SPOILERS).optional(),
	edition: z.enum(["ultimate", "plus"]).optional(),
	mode: z.enum(["story", "online"]).optional(),
	platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
	specs: z.record(z.string().regex(/^[a-z][a-zA-Z]{0,39}$/), specValueSchema).optional(),
})

/** `src/seed/categories/<category>/<group>.json` (spec §3). */
export const groupFileSchema = z.strictObject({
	group: slugSchema,
	/** Position among the category's groups: the game's tab order. */
	order: z.int().min(1),
	/** The game's count. Absent while it is unsettled (spec §2) and for my own groups. */
	total: z.int().min(1).optional(),
	sort: z.enum(["name", "file"]),
	/** false: listed but never counted. Absent means true. */
	counts: z.boolean().optional(),
	spoiler: z.enum(SPOILERS).optional(),
	sets: z.array(z.strictObject({ id: slugSchema, total: z.int().min(1).optional() })).optional(),
	sources: z.array(itemSourceInputSchema).optional(),
	items: z.array(itemInputSchema),
})

/** `src/seed/categories.json`: category order, and which one is a spoiler. */
export const categoriesFileSchema = z.strictObject({
	categories: z
		.array(z.strictObject({ id: slugSchema, spoiler: z.literal("story").optional() }))
		.min(1),
})
```

4. Replace the `SeedItem` type and add the others:

```ts
export type Spoiler = (typeof SPOILERS)[number]
export type ItemInput = z.infer<typeof itemInputSchema>
export type GroupFile = z.infer<typeof groupFileSchema>
export interface Tip {
	text: string
	spoiler?: Spoiler
	sources: ItemSource[]
}
export interface ItemLocation {
	area: string
	kind: "find" | "spawn" | "buy" | "unlock"
	link?: Source
}
/** An item after the build: category and group from its file, sources tiered and joined with the
 *  header's, `uncounted` when its group has `counts: false` or it is edition-only. */
export type SeedItem = Omit<ItemInput, "sources" | "tips" | "locations"> & {
	category: string
	group: string
	sources: ItemSource[]
	tips?: Tip[]
	locations?: ItemLocation[]
	uncounted?: true
}
```

`ItemInput` has no `category` or `group`, so `Omit` plus the intersection gives the fields every consumer reads today.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/model/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Count `uncounted` in `countable()`, list it with `listed()`**

In `src/model/stats.ts` line 19, `countable` drops uncounted items, and a new `listed` keeps them:

```ts
/** What the list shows: everything but retired items. Chips and tiles read it, so a
 *  `counts: false` group still gets its chip and its category still gets a tile. */
export function listed(items: SeedItem[]): SeedItem[] {
	return items.filter((item) => !item.retired)
}

/** What counts toward a total: not retired, not in a `counts: false` group, not edition-only. */
export function countable(items: SeedItem[]): SeedItem[] {
	return items.filter((item) => !item.retired && !item.uncounted)
}
```

Totals stay on `countable` (`countItems`, `perGroup`, `recentFinds` and `perCategory`, which counts through `countItems`). Which chips, tiles and bars exist moves to `listed`:

- `src/model/tracker.ts` `chipGroups`: `const live = listed(items)`, and its doc comment says "every group with a listed item". Import `listed` from `./stats`; `countable` stays imported if the file still uses it.
- `src/islands/Tracker.tsx` line 348: `perCategory(listed(state.items), state.records)`. Swap `countable` for `listed` in the import if nothing else uses it.
- `src/islands/hub/Dashboard.tsx` line 89: `categories: perCategory(listed(items), records)`, same import swap.
- `src/model/dashboard.ts` `categoryRows`: `const live = listed(items)`, so a category bar lists every group. Its totals still come from `perCategory`.

A category whose only groups are `counts: false` now gets a tile with a total of 0. `CategoryNav.tsx` and `StatPair.tsx` already turn a 0 total into 0 %.

Add to `src/model/stats.test.ts` (import `countable` and `listed`):

```ts
it("countable leaves out retired and uncounted items, listed keeps the uncounted ones", () => {
	const base = { category: "animals", group: "birds", status: "confirmed" as const, sources: [src] }
	const items = [
		{ ...base, id: "animals/a", name: "A" },
		{ ...base, id: "animals/b", name: "B", retired: true },
		{ ...base, id: "animals/c", name: "C", uncounted: true as const },
	]
	expect(countable(items).map((i) => i.id)).toEqual(["animals/a"])
	expect(listed(items).map((i) => i.id)).toEqual(["animals/a", "animals/c"])
	expect(countItems(items, {})).toEqual({ done: 0, total: 1 })
})
```

Add to `src/model/tracker.test.ts` (import `countItems` from `./stats`):

```ts
it("chipGroups gives a counts: false group its chip, and the group adds 0 to the total", () => {
	const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
	const base = { category: "animals", status: "confirmed" as const, sources: [src] }
	const items = [
		{ ...base, id: "animals/a", group: "birds", name: "A" },
		{ ...base, id: "animals/b", group: "mammals", name: "B", uncounted: true as const },
	]
	expect(chipGroups(items, ["animals"]).get("animals")).toEqual(["birds", "mammals"])
	expect(countItems(items, {}).total).toBe(1)
})
```

Also in `src/model/search.ts`, the loop skips retired items (`if (item.retired) continue`). Leave it: an uncounted item is still listed and searchable.

- [ ] **Step 6: Render a game source in `SourceList.astro`**

Add `"sources.game": "In-game Progress menu"` to `en.json` and `"sources.game": "Progress-menyen i spillet"` to `nb.json`, next to `sources.back`.

In `src/components/SourceList.astro`, change the `Source` import to `ItemSource`, type `sources: ItemSource[]`, import `translator` from `../i18n`, add `const t = translator(locale)` and render the screen's parts with a `›` between them. The `›` sits in its own `aria-hidden` span, so a screen reader hears "Progress Vehicles Cars" and never the mark:

```astro
{
	sources.map((source) =>
		"kind" in source ? (
			<li>
				<span class="game-source">{t("sources.game")}</span>
				<span class="outlet">
					{lang ? (
						<span lang={lang}>
							{source.screen.map((part, index) => (index === 0 ? part : <Fragment> <span aria-hidden="true">›</span> {part}</Fragment>))}
						</span>
					) : (
						source.screen.map((part, index) => (index === 0 ? part : <Fragment> <span aria-hidden="true">›</span> {part}</Fragment>))
					)}
				</span>
			</li>
		) : (
			<li>
				{/* existing ExternalLink + outlet markup, unchanged */}
			</li>
		)
	)
}
```

Add to its `<style>`, after the `li :global(a)` rule:

```css
/* The game screen's title line: the same height and ink as a link title above an outlet. */
.game-source {
	display: block;
	padding-block: calc((var(--tap) - 1lh) / 2);
	color: var(--text);
}
```

Create `src/components/SourceList.test.ts`, on the `renderDoc` helper from `src/test/render.ts` that `Sources.test.ts` uses:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import SourceList from "./SourceList.astro"

describe("SourceList", () => {
	it("shows a game screen as the in-game menu, its parts split by a hidden ›, and no link", async () => {
		const doc = await renderDoc(SourceList, {
			props: { locale: "en", sources: [{ kind: "game", screen: ["Progress", "Vehicles", "Cars"] }] },
		})
		expect(doc.querySelector(".game-source")?.textContent).toBe("In-game Progress menu")
		const screen = doc.querySelector(".outlet")
		expect(screen?.textContent?.replace(/\s+/g, " ").trim()).toBe("Progress › Vehicles › Cars")
		const marks = [...(screen?.querySelectorAll('span[aria-hidden="true"]') ?? [])]
		expect(marks.map((m) => m.textContent)).toEqual(["›", "›"])
		expect(doc.querySelector("a")).toBeNull()
	})
})
```

- [ ] **Step 7: Run, typecheck, commit**

Run: `npx vitest run src/model src/components && npm run typecheck`
Expected: PASS and 0 errors. `seed.ts` compiles unchanged: `validateSeedFile` still parses with `seedItemInputSchema`, which Task 6 deletes.

```bash
git add src/model/schema.ts src/model/schema.test.ts src/model/stats.ts src/model/stats.test.ts src/model/tracker.ts src/model/tracker.test.ts src/model/dashboard.ts src/islands/Tracker.tsx src/islands/hub/Dashboard.tsx src/components/SourceList.astro src/components/SourceList.test.ts src/locales/en.json src/locales/nb.json
git commit -m "Add the group file, categories and item extras schemas"
```

---

### Task 3: `buildSeed()`: layout, order, sort, sets, totals and shipped ids

**Files:**
- Create: `src/model/seedBuild.ts`, `src/model/seedBuild.test.ts`, `src/test/seed-fixture.ts`

**Interfaces:**
- Consumes: Task 1 `tierItemSources`, `tierErrors`; Task 2 schemas and types.
- Produces:

```ts
export interface SeedInput {
	categories: unknown // categories.json, parsed
	groups: Record<string, unknown> // "<category>/<group>.json" to parsed JSON
	shipped: string // shipped-ids.txt as text
	allowlist: Allowlist
}
export interface SeedCategory { id: string; spoiler?: "story" }
export interface SeedGroup {
	category: string
	id: string
	order: number
	total?: number
	sets: { id: string; total?: number }[]
	counts: boolean
	spoiler?: Spoiler
}
export interface SeedResult { categories: SeedCategory[]; groups: SeedGroup[]; items: SeedItem[]; errors: string[] }
export function buildSeed(input: SeedInput): SeedResult
export function sortKey(name: string): string
export function parseShipped(text: string): { ids: string[]; errors: string[] }
```

PR 2 builds the inlined index from `SeedResult.groups`; keep its shape.

- [ ] **Step 1: Write the fixture**

`src/test/seed-fixture.ts`:

```ts
// The valid seed every seedBuild case starts from (category model spec §10). A case changes one
// thing and expects one error, so each check is proven to fire on its own.
import type { Allowlist } from "../model/schema"

export const fixtureAllowlist: Allowlist = {
	official: ["rockstargames.com"],
	press: ["ign.com", "gamesradar.com"],
	blocklist: ["leaksite.example"],
}
export const official = { url: "https://www.rockstargames.com/VI", title: "GTA VI site" }
export const ign = { url: "https://www.ign.com/gta-6/1", title: "IGN guide" }
export const ignNordic = { url: "https://nordic.ign.com/gta-6/2", title: "IGN Nordic" }
export const radar = { url: "https://www.gamesradar.com/gta-6/1", title: "GamesRadar guide" }
export const game = { kind: "game", screen: ["Progress", "Vehicles", "Cars"] }

export type ItemJson = Record<string, unknown>
export interface GroupJson {
	group: string
	order: number
	total?: number
	sort: string
	counts?: boolean
	spoiler?: string
	sets?: { id: string; total?: number }[]
	sources?: unknown[]
	items: ItemJson[]
}
export interface FixtureInput {
	categories: { categories: { id: string; spoiler?: string }[] }
	groups: Record<string, GroupJson>
	shipped: string
	allowlist: Allowlist
}

/** Two categories with files, Story listed without one, a set, a retired item at the total, a
 *  file-sorted group whose items take the header's sources, and an uncounted group. */
export function validInput(): FixtureInput {
	const groups: Record<string, GroupJson> = {
		"vehicles/cars.json": {
			group: "cars",
			order: 1,
			total: 3,
			sort: "name",
			sets: [{ id: "coupes", total: 2 }],
			items: [
				{ id: "vehicles/zeta", set: "coupes", name: "Zeta", status: "confirmed", sources: [official] },
				{
					id: "vehicles/alpha",
					set: "coupes",
					name: "'70 Alpha",
					status: "confirmed",
					sources: [game],
					specs: { style: "Classic", era: "1970s" },
				},
				{ id: "vehicles/hoop-10", name: "Hoop 10", status: "confirmed", sources: [ign, radar] },
				{ id: "vehicles/hoop-9", name: "Hoop 9", status: "confirmed", sources: [official], retired: true },
			],
		},
		"vehicles/bikes.json": {
			group: "bikes",
			order: 2,
			sort: "file",
			sources: [official],
			items: [
				{ id: "vehicles/second", name: "Second", status: "confirmed", sources: [] },
				{ id: "vehicles/first", name: "First", status: "confirmed", sources: [] },
			],
		},
		"animals/birds.json": {
			group: "birds",
			order: 1,
			total: 5,
			sort: "name",
			items: [
				{
					id: "animals/pelican",
					name: "Pelican",
					status: "expected",
					precedent: "GTA V",
					sources: [ign],
					tips: [{ text: "Look along the piers at dawn.", sources: [ign] }],
					locations: [{ area: "Ocean Beach piers", kind: "find", link: radar }],
				},
				{
					id: "animals/heron",
					name: "Heron",
					status: "confirmed",
					sources: [official],
					edition: "ultimate",
					aliases: ["Great blue heron"],
				},
			],
		},
		"animals/mammals.json": {
			group: "mammals",
			order: 2,
			sort: "name",
			counts: false,
			items: [{ id: "animals/cougar", name: "Cougar", status: "confirmed", sources: [official] }],
		},
	}
	const ids = Object.values(groups).flatMap((g) => g.items.map((i) => String(i.id)))
	return {
		categories: { categories: [{ id: "vehicles" }, { id: "animals" }, { id: "story", spoiler: "story" }] },
		groups,
		shipped: `# shipped ids\n${ids.join("\n")}\n`,
		allowlist: fixtureAllowlist,
	}
}
```

- [ ] **Step 2: Write the failing tests**

`src/model/seedBuild.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { type FixtureInput, ign, ignNordic, validInput } from "../test/seed-fixture"
import { buildSeed, parseShipped, sortKey } from "./seedBuild"

function errorsAfter(change: (input: FixtureInput) => void): string {
	const input = validInput()
	change(input)
	return buildSeed(input).errors.join("\n")
}
const cars = (input: FixtureInput) => input.groups["vehicles/cars.json"]
const bikes = (input: FixtureInput) => input.groups["vehicles/bikes.json"]
const birds = (input: FixtureInput) => input.groups["animals/birds.json"]
const pelican = (input: FixtureInput) => birds(input).items[0]

describe("buildSeed on the valid fixture", () => {
	const result = buildSeed(validInput())

	it("has no errors", () => {
		expect(result.errors).toEqual([])
	})
	it("orders categories by categories.json and skips one with no files", () => {
		expect(result.categories.map((c) => c.id)).toEqual(["vehicles", "animals"])
	})
	it("orders groups by their header and items by the group's sort", () => {
		expect(result.items.map((i) => i.id)).toEqual([
			"vehicles/alpha",
			"vehicles/hoop-9",
			"vehicles/hoop-10",
			"vehicles/zeta",
			"vehicles/second",
			"vehicles/first",
			"animals/heron",
			"animals/pelican",
			"animals/cougar",
		])
	})
	it("fills category and group from the path", () => {
		const cougar = result.items.find((i) => i.id === "animals/cougar")
		expect(cougar).toMatchObject({ category: "animals", group: "mammals" })
	})
	it("gives an item with no sources the header's, tiered", () => {
		const first = result.items.find((i) => i.id === "vehicles/first")
		expect(first?.sources).toEqual([{ url: "https://www.rockstargames.com/VI", title: "GTA VI site", tier: "official" }])
	})
	it("marks counts: false groups and edition items uncounted", () => {
		const flagged = result.items.filter((i) => i.uncounted).map((i) => i.id)
		expect(flagged).toEqual(["animals/heron", "animals/cougar"])
	})
	it("tiers tip sources and location links", () => {
		const pelican = result.items.find((i) => i.id === "animals/pelican")
		expect(pelican?.tips?.[0].sources[0]).toMatchObject({ tier: "press" })
		expect(pelican?.locations?.[0].link).toMatchObject({ tier: "press" })
	})
	it("returns the group headers in order", () => {
		expect(result.groups.map((g) => `${g.category}/${g.id}`)).toEqual([
			"vehicles/cars",
			"vehicles/bikes",
			"animals/birds",
			"animals/mammals",
		])
		expect(result.groups[0]).toMatchObject({ total: 3, counts: true, sets: [{ id: "coupes", total: 2 }] })
		expect(result.groups[3]).toMatchObject({ counts: false })
	})
})

describe("buildSeed rejects", () => {
	it.each([
		["a duplicate id", (i: FixtureInput) => (bikes(i).items[0].id = "vehicles/zeta"), /duplicate id vehicles\/zeta/],
		["an unknown set", (i: FixtureInput) => (cars(i).items[0].set = "sedans"), /vehicles\/zeta: unknown set sedans/],
		["a group listed above its total", (i: FixtureInput) => (cars(i).total = 2), /vehicles\/cars: listed 3 above total 2/],
		[
			"a set listed above its total",
			(i: FixtureInput) => {
				const [coupes] = cars(i).sets ?? []
				coupes.total = 1
			},
			/vehicles\/cars set coupes: listed 2 above total 1/,
		],
		[
			"a shipped id missing from the seed",
			(i: FixtureInput) => (i.shipped += "vehicles/gone\n"),
			/vehicles\/gone: shipped id is missing from the seed/,
		],
		[
			"a seed id that is not in shipped-ids.txt",
			(i: FixtureInput) => (i.shipped = i.shipped.replace("vehicles/zeta\n", "")),
			/vehicles\/zeta: not in shipped-ids\.txt/,
		],
		[
			"an invalid line in shipped-ids.txt",
			(i: FixtureInput) => (i.shipped += "Not An Id\n"),
			/shipped-ids\.txt: "Not An Id" is not an id/,
		],
		[
			"an id over 80 characters",
			(i: FixtureInput) => (cars(i).items[0].id = `vehicles/${"a".repeat(80)}`),
			/vehicles\/cars\.json items\.0\.id/,
		],
		[
			"two press sources under one allowlist entry",
			(i: FixtureInput) => (cars(i).items[2].sources = [ign, ignNordic]),
			/vehicles\/hoop-10: confirmed needs an official source, a game screen or two press sources/,
		],
		[
			"a tip source on an unlisted host",
			(i: FixtureInput) =>
				(pelican(i).tips = [{ text: "Look up.", sources: [{ url: "https://example.com/t", title: "T" }] }]),
			/animals\/pelican tip 1: source https:\/\/example\.com\/t is unlisted/,
		],
		[
			"a location link on an unlisted host",
			(i: FixtureInput) =>
				(pelican(i).locations = [
					{ area: "Piers", kind: "find", link: { url: "https://example.com/p", title: "Map" } },
				]),
			/animals\/pelican: location link https:\/\/example\.com\/p is unlisted/,
		],
		[
			"a category listed twice in categories.json",
			(i: FixtureInput) => i.categories.categories.push({ id: "vehicles" }),
			/categories\.json: vehicles is listed twice/,
		],
		[
			"an item with no sources under a header with none",
			(i: FixtureInput) => (cars(i).items[0].sources = []),
			/vehicles\/zeta: no sources, and the group header has none/,
		],
		[
			"a folder that is not in categories.json",
			(i: FixtureInput) =>
				(i.groups["weapons/guns.json"] = { group: "guns", order: 1, sort: "name", items: [] }),
			/weapons\/guns\.json: weapons is not in categories\.json/,
		],
		[
			"a file whose group field differs from its name",
			(i: FixtureInput) => (bikes(i).group = "motorbikes"),
			/vehicles\/bikes\.json: group must be bikes/,
		],
		[
			"two groups with one order",
			(i: FixtureInput) => (bikes(i).order = 1),
			/vehicles: groups bikes and cars share order 1/,
		],
		[
			"a file outside <category>/<group>.json",
			(i: FixtureInput) =>
				(i.groups["vehicles/extra/cars.json"] = { group: "cars", order: 9, sort: "name", items: [] }),
			/vehicles\/extra\/cars\.json: a group file sits at <category>\/<group>\.json/,
		],
	])("%s", (_name, change, error) => {
		expect(errorsAfter(change)).toMatch(error)
	})
})

describe("sortKey (spec §3)", () => {
	it("drops a leading model year and punctuation, keeps other digits", () => {
		expect(sortKey("'70 Vapid Ganado")).toBe("Vapid Ganado")
		expect(sortKey("’70 Vapid Ganado")).toBe("Vapid Ganado")
		expect(sortKey("1955 Vapid Stanier")).toBe("Vapid Stanier")
		expect(sortKey("“Quoted” Name")).toBe("Quoted” Name")
		expect(sortKey("300R")).toBe("300R")
	})
})

describe("parseShipped", () => {
	it("reads LF and CRLF the same and skips comments and blank lines", () => {
		const lf = parseShipped("# list\nanimals/a\n\nanimals/b\n")
		const crlf = parseShipped("# list\r\nanimals/a\r\n\r\nanimals/b\r\n")
		expect(lf).toEqual({ ids: ["animals/a", "animals/b"], errors: [] })
		expect(crlf).toEqual(lf)
	})
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/model/seedBuild.test.ts`
Expected: FAIL, "Failed to resolve import ./seedBuild".

- [ ] **Step 4: Write `seedBuild.ts`**

```ts
// The seed pipeline (category model spec §3, §5, §6, §8). Pure: it gets the parsed files and
// returns the items in display order plus every error, so Vitest runs it on fixtures and seed.ts
// runs it on the shipped files. The build fails on any error.
import type { z } from "astro/zod"
import {
	type Allowlist,
	categoriesFileSchema,
	type GroupFile,
	groupFileSchema,
	idSchema,
	type ItemInput,
	type ItemLocation,
	type ItemSource,
	type SeedItem,
	type Spoiler,
	type Tip,
} from "./schema"
import { resolveTier, tierErrors, tierItemSources } from "./tiers"

export interface SeedInput {
	/** categories.json, parsed. */
	categories: unknown
	/** "<category>/<group>.json" to that file's parsed JSON. */
	groups: Record<string, unknown>
	/** shipped-ids.txt as text. */
	shipped: string
	allowlist: Allowlist
}
export interface SeedCategory {
	id: string
	spoiler?: "story"
}
export interface SeedGroup {
	category: string
	id: string
	order: number
	total?: number
	sets: { id: string; total?: number }[]
	counts: boolean
	spoiler?: Spoiler
}
export interface SeedResult {
	categories: SeedCategory[]
	groups: SeedGroup[]
	items: SeedItem[]
	errors: string[]
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

/** Spec §3: a leading model year ("1955 ", "'70 " or "’70 ") and leading punctuation are
 *  ignored, so "'70 Vapid Ganado" and "1955 Vapid Stanier" sort under V. The collator compares
 *  numbers by value. */
export function sortKey(name: string): string {
	return name
		.replace(/^(19|20)\d{2}\s+/, "")
		.replace(/^['’]\d{2}\s+/, "")
		.replace(/^[^\p{L}\p{N}]+/u, "")
}

function byName(a: SeedItem, b: SeedItem): number {
	return collator.compare(sortKey(a.name), sortKey(b.name))
}

export function parseShipped(text: string): { ids: string[]; errors: string[] } {
	const ids: string[] = []
	const errors: string[] = []
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim()
		if (line === "" || line.startsWith("#")) continue
		if (idSchema.safeParse(line).success) ids.push(line)
		else errors.push(`shipped-ids.txt: "${line}" is not an id`)
	}
	return { ids, errors }
}

function issues(prefix: string, error: z.ZodError): string[] {
	return error.issues.map((issue) => `${prefix} ${issue.path.map(String).join(".")}: ${issue.message}`)
}

/** Ids straight off the raw JSON, so a duplicate is caught even when one copy fails validation. */
function rawIds(data: unknown): string[] {
	const items = data && typeof data === "object" ? (data as { items?: unknown }).items : undefined
	if (!Array.isArray(items)) return []
	return items
		.map((entry) => (entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined))
		.filter((id): id is string => typeof id === "string")
}

function duplicates(values: string[]): string[] {
	const seen = new Set<string>()
	const twice = new Set<string>()
	for (const value of values) {
		if (seen.has(value)) twice.add(value)
		seen.add(value)
	}
	return [...twice]
}

function sourceKey(source: ItemSource): string {
	return "kind" in source ? `game:${source.screen.join("/")}` : source.url
}

/** The item's own sources first, then the header's it does not already cite. */
function joinSources(own: ItemSource[], header: ItemSource[]): ItemSource[] {
	const seen = new Set(own.map(sourceKey))
	return [...own, ...header.filter((s) => !seen.has(sourceKey(s)))]
}

function buildItem(
	category: string,
	group: string,
	input: ItemInput,
	header: ItemSource[],
	setIds: Set<string>,
	counts: boolean,
	list: Allowlist
): { item?: SeedItem; errors: string[] } {
	const { id } = input
	const errors: string[] = []
	if (input.set !== undefined && !setIds.has(input.set)) errors.push(`${id}: unknown set ${input.set}`)
	const own = tierItemSources(id, input.sources, list)
	errors.push(...own.errors)
	if (input.sources.length === 0 && header.length === 0)
		errors.push(`${id}: no sources, and the group header has none`)
	errors.push(...extrasErrors(category, group, input))
	const tips: Tip[] | undefined = input.tips?.map((tip, index) => {
		const tiered = tierItemSources(`${id} tip ${index + 1}`, tip.sources, list)
		errors.push(...tiered.errors)
		return { ...tip, sources: tiered.sources }
	})
	const locations: ItemLocation[] | undefined = input.locations?.map((location) => {
		if (!location.link) return { area: location.area, kind: location.kind }
		const tier = resolveTier(location.link.url, list)
		if (tier === "blocked" || tier === "unlisted") {
			errors.push(`${id}: location link ${location.link.url} is ${tier}`)
			return { area: location.area, kind: location.kind }
		}
		return { ...location, link: { ...location.link, tier } }
	})
	if (errors.length > 0) return { errors }
	// Built from the rest, so the untiered sources, tips and locations never reach a SeedItem.
	const { sources: _sources, tips: _tips, locations: _locations, ...rest } = input
	const item: SeedItem = {
		...rest,
		category,
		group,
		sources: joinSources(own.sources, header),
		...(tips ? { tips } : {}),
		...(locations ? { locations } : {}),
		...(!counts || input.edition ? { uncounted: true as const } : {}),
	}
	const ruleErrors = tierErrors(item, list)
	return ruleErrors.length > 0 ? { errors: ruleErrors } : { item, errors: [] }
}

/** Task 4 fills this in; until then nothing is checked here. */
function extrasErrors(_category: string, _group: string, _input: ItemInput): string[] {
	return []
}

function totalErrors(where: string, file: GroupFile, items: SeedItem[]): string[] {
	const errors: string[] = []
	const listed = items.filter((item) => !item.retired && !item.uncounted)
	if (file.total !== undefined && listed.length > file.total)
		errors.push(`${where}: listed ${listed.length} above total ${file.total}`)
	for (const set of file.sets ?? []) {
		const count = listed.filter((item) => item.set === set.id).length
		if (set.total !== undefined && count > set.total)
			errors.push(`${where} set ${set.id}: listed ${count} above total ${set.total}`)
	}
	return errors
}

function buildGroup(
	category: string,
	file: GroupFile,
	list: Allowlist
): { group: SeedGroup; items: SeedItem[]; errors: string[] } {
	const where = `${category}/${file.group}`
	const errors: string[] = []
	const header = tierItemSources(where, file.sources ?? [], list)
	errors.push(...header.errors)
	const sets = file.sets ?? []
	errors.push(...duplicates(sets.map((s) => s.id)).map((id) => `${where}: set ${id} is listed twice`))
	const setIds = new Set(sets.map((s) => s.id))
	const counts = file.counts !== false
	const built: SeedItem[] = []
	for (const input of file.items) {
		const result = buildItem(category, file.group, input, header.sources, setIds, counts, list)
		errors.push(...result.errors)
		if (result.item) built.push(result.item)
	}
	const items = file.sort === "name" ? [...built].sort(byName) : built
	errors.push(...totalErrors(where, file, items))
	const group: SeedGroup = { category, id: file.group, order: file.order, sets, counts }
	if (file.total !== undefined) group.total = file.total
	if (file.spoiler !== undefined) group.spoiler = file.spoiler
	return { group, items, errors }
}

function shippedErrors(shipped: string[], seedIds: string[]): string[] {
	const inSeed = new Set(seedIds)
	const inFile = new Set(shipped)
	return [
		...shipped
			.filter((id) => !inSeed.has(id))
			.map((id) => `${id}: shipped id is missing from the seed; retire it instead (spec §6)`),
		...[...inSeed].filter((id) => !inFile.has(id)).map((id) => `${id}: not in shipped-ids.txt; add its line`),
	]
}

/** Task 4 fills this in: twin names and alias collisions within a category. */
function nameErrors(_category: string, _items: SeedItem[]): string[] {
	return []
}

export function buildSeed(input: SeedInput): SeedResult {
	const parsed = categoriesFileSchema.safeParse(input.categories)
	if (!parsed.success)
		return { categories: [], groups: [], items: [], errors: issues("categories.json", parsed.error) }
	const errors: string[] = []
	const categoryList = parsed.data.categories.map((c) => c.id)
	errors.push(...duplicates(categoryList).map((id) => `categories.json: ${id} is listed twice`))
	const known = new Set(categoryList)
	const files = new Map<string, GroupFile[]>()
	const allIds: string[] = []
	for (const [path, data] of Object.entries(input.groups).sort(([a], [b]) => a.localeCompare(b))) {
		allIds.push(...rawIds(data))
		const parts = path.replace(/\.json$/, "").split("/")
		const [category = "", name = ""] = parts
		if (parts.length !== 2) {
			errors.push(`${path}: a group file sits at <category>/<group>.json`)
			continue
		}
		if (!known.has(category)) {
			errors.push(`${path}: ${category} is not in categories.json`)
			continue
		}
		const file = groupFileSchema.safeParse(data)
		if (!file.success) {
			errors.push(...issues(path, file.error))
			continue
		}
		if (file.data.group !== name) {
			errors.push(`${path}: group must be ${name}`)
			continue
		}
		files.set(category, [...(files.get(category) ?? []), file.data])
	}
	const categories: SeedCategory[] = []
	const groups: SeedGroup[] = []
	const items: SeedItem[] = []
	for (const category of parsed.data.categories) {
		// A second line for the same id is already an error above; build the category once.
		if (categories.some((c) => c.id === category.id)) continue
		const list = [...(files.get(category.id) ?? [])].sort((a, b) => a.order - b.order)
		if (list.length === 0) continue
		for (let i = 1; i < list.length; i++) {
			if (list[i].order === list[i - 1].order)
				errors.push(
					`${category.id}: groups ${list[i - 1].group} and ${list[i].group} share order ${list[i].order}`
				)
		}
		categories.push(category)
		const own: SeedItem[] = []
		for (const file of list) {
			const built = buildGroup(category.id, file, input.allowlist)
			errors.push(...built.errors)
			groups.push(built.group)
			own.push(...built.items)
		}
		errors.push(...nameErrors(category.id, own))
		items.push(...own)
	}
	errors.push(...duplicates(allIds).map((id) => `duplicate id ${id}`))
	const shipped = parseShipped(input.shipped)
	errors.push(...shipped.errors, ...shippedErrors(shipped.ids, allIds))
	return { categories, groups, items, errors }
}
```

Paths are read in sorted order, so `vehicles/bikes.json` comes before `vehicles/cars.json`, and the stable sort by `order` keeps that pair as "bikes and cars". That is why the test expects that wording.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/model/seedBuild.test.ts && npm run typecheck`
Expected: PASS and 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/model/seedBuild.ts src/model/seedBuild.test.ts src/test/seed-fixture.ts
git commit -m "Add the seed build: folders, order, sort, sets, totals and shipped ids"
```

---

### Task 4: `buildSeed()`: extras rules, twins and aliases

**Files:**
- Modify: `src/model/seedBuild.ts` (`extrasErrors`, `nameErrors`, the story category check, add `SPEC_KEYS`), `src/model/seedBuild.test.ts`

**Interfaces:**
- Consumes: `normalize` from `normalize.ts`, `PLATFORMS` from `schema.ts`.
- Produces: `SPEC_KEYS` (exported, read by the Dex card in PR 3).

- [ ] **Step 1: Write the failing tests**

Add these rows to the `it.each` table in `seedBuild.test.ts`, and the helper above it (`birds` and `pelican` are there since Task 3):

```ts
function addStandout(input: FixtureInput, specs: Record<string, unknown>) {
	input.groups["vehicles/standout.json"] = {
		group: "standout",
		order: 3,
		sort: "name",
		items: [{ id: "vehicles/blazing", name: "Blazing", status: "confirmed", sources: [game], specs }],
	}
	input.shipped += "vehicles/blazing\n"
}
```

(import `game` and `radar` from the fixture too.) Rows:

```ts
[
	"a new item with a retired item's name",
	(i: FixtureInput) => {
		cars(i).items.push({ id: "vehicles/hoop-nine", name: "Hoop 9", status: "confirmed", sources: [ign, radar] })
		i.shipped += "vehicles/hoop-nine\n"
	},
	/vehicles\/hoop-nine: same name as retired vehicles\/hoop-9; add replaces/,
],
[
	"an alias that is another item's name",
	(i: FixtureInput) => (birds(i).items[1].aliases = ["Pelican"]),
	/animals\/heron: alias Pelican is already a name or alias in animals/,
],
[
	"a tip without a source",
	(i: FixtureInput) => (pelican(i).tips = [{ text: "Look up.", sources: [] }]),
	/animals\/birds\.json items\.0\.tips\.0\.sources/,
],
[
	"a game source with a url",
	(i: FixtureInput) => (cars(i).items[1].sources = [{ ...game, url: "https://www.rockstargames.com/VI" }]),
	/vehicles\/cars\.json items\.1\.sources\.0/,
],
[
	"markup in a specs value",
	(i: FixtureInput) => (cars(i).items[1].specs = { style: "<b>Classic</b>" }),
	/vehicles\/cars\.json items\.1\.specs\.style/,
],
[
	"an unknown spec key",
	(i: FixtureInput) => (cars(i).items[1].specs = { style: "Classic", paint: "Red" }),
	/vehicles\/alpha: unknown spec key paint for vehicles\/cars/,
],
[
	"specs on a group that takes none",
	(i: FixtureInput) => (pelican(i).specs = { speed: 5 }),
	/animals\/pelican: animals\/birds takes no specs/,
],
["a bar outside 1 to 10", (i: FixtureInput) => addStandout(i, { rating: "A", speed: 11 }), /vehicles\/standout\.json items\.0\.specs\.speed/],
["text where a bar belongs", (i: FixtureInput) => addStandout(i, { speed: "fast" }), /vehicles\/blazing: spec speed must be a 1 to 10 bar/],
["a number where text belongs", (i: FixtureInput) => addStandout(i, { rating: 7 }), /vehicles\/blazing: spec rating must be text from the screen/],
[
	"an online item",
	(i: FixtureInput) => (pelican(i).mode = "online"),
	/animals\/pelican: online and platform-limited items wait for the Settings preference/,
],
[
	"a platform-limited item",
	(i: FixtureInput) => (pelican(i).platforms = ["pc"]),
	/animals\/pelican: online and platform-limited items wait for the Settings preference/,
],
[
	"a story spoiler item",
	(i: FixtureInput) => (pelican(i).spoiler = "story"),
	/animals\/pelican: story spoilers wait for the Hide spoilers switch/,
],
[
	"a story spoiler group",
	(i: FixtureInput) => (birds(i).spoiler = "story"),
	/animals\/birds: story spoilers wait for the Hide spoilers switch/,
],
[
	"a group file in a story category",
	(i: FixtureInput) => (i.groups["story/chapters.json"] = { group: "chapters", order: 1, sort: "file", items: [] }),
	/story\/chapters\.json: story content waits for the Hide spoilers switch/,
],
```

And these passing cases in a new block. The header case passes since Task 3; it pins her decision of 25.11 (Global Constraints, header sources):

```ts
describe("buildSeed accepts", () => {
	it("a header with two press sources on different entries over an item with no sources", () => {
		expect(errorsAfter((i) => (bikes(i).sources = [ign, radar]))).toBe("")
	})
	it("a twin name when the new item replaces the retired one", () => {
		expect(
			errorsAfter((i) => {
				cars(i).total = 4
				cars(i).items.push({
					id: "vehicles/hoop-nine",
					name: "Hoop 9",
					status: "confirmed",
					sources: [ign, radar],
					replaces: ["vehicles/hoop-9"],
				})
				i.shipped += "vehicles/hoop-nine\n"
			})
		).toBe("")
	})
	it("an alias equal to a retired name when the item replaces it", () => {
		expect(
			errorsAfter((i) => {
				cars(i).items[0].aliases = ["Hoop 9"]
				cars(i).items[0].replaces = ["vehicles/hoop-9"]
			})
		).toBe("")
	})
	it("every platform listed, story mode and a gate spoiler", () => {
		expect(
			errorsAfter((i) => {
				pelican(i).platforms = ["ps5", "xbox", "pc"]
				pelican(i).mode = "story"
				pelican(i).spoiler = "gate"
			})
		).toBe("")
	})
	it("Standout specs with every key", () => {
		expect(
			errorsAfter((i) =>
				addStandout(i, { rating: "A", speed: 7, acceleration: 6, asphaltHandling: 5, offRoadHandling: 4, strength: 3 })
			)
		).toBe("")
	})
})
```

- [ ] **Step 2: Run the tests to verify the new rows fail**

Run: `npx vitest run src/model/seedBuild.test.ts`
Expected: FAIL on the twin, alias, spec-key, no-specs, bar and text kind, online, platform, story and story category rows. The schema rows (tip without a source, game source with a url, markup, bar outside 1 to 10) and the header accepts-case already pass. The tip-host and location-link rows moved to Task 3, which implements them in `buildItem`.

- [ ] **Step 3: Implement the rules**

In `seedBuild.ts`, add `import { normalize } from "./normalize"` and `PLATFORMS` to the `./schema` import. Then add above `buildItem`:

```ts
type SpecKind = "text" | "bar"
const BASE_VEHICLE = { style: "text", era: "text", modShop: "text" } as const
const STANDOUT = {
	rating: "text",
	speed: "bar",
	acceleration: "bar",
	asphaltHandling: "bar",
	offRoadHandling: "bar",
	strength: "bar",
} as const
const WEAPON = { damage: "bar", accuracy: "bar", handling: "bar", range: "bar" } as const

/** Spec §8.7: the spec keys each group's Progress screen shows. Any other key fails the build. */
export const SPEC_KEYS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, SpecKind>>>>>> = {
	vehicles: {
		cars: BASE_VEHICLE,
		bikes: BASE_VEHICLE,
		watercraft: BASE_VEHICLE,
		aircraft: BASE_VEHICLE,
		service: BASE_VEHICLE,
		standout: STANDOUT,
	},
	weapons: { guns: WEAPON, melee: WEAPON, explosives: WEAPON, variants: WEAPON },
}

function specErrors(id: string, category: string, group: string, specs: Record<string, string | number>): string[] {
	const byGroup = Object.hasOwn(SPEC_KEYS, category) ? SPEC_KEYS[category] : undefined
	const allowed = byGroup && Object.hasOwn(byGroup, group) ? byGroup[group] : undefined
	if (!allowed) return [`${id}: ${category}/${group} takes no specs`]
	return Object.entries(specs).flatMap(([key, value]) => {
		if (!Object.hasOwn(allowed, key)) return [`${id}: unknown spec key ${key} for ${category}/${group}`]
		if (allowed[key] === "bar" && typeof value !== "number") return [`${id}: spec ${key} must be a 1 to 10 bar`]
		if (allowed[key] === "text" && typeof value !== "string")
			return [`${id}: spec ${key} must be text from the screen`]
		return []
	})
}
```

Replace the `extrasErrors` stub:

```ts
/** Spec §8.4, §8.6, §8.7: what the schema cannot see on its own. */
function extrasErrors(category: string, group: string, input: ItemInput): string[] {
	const { id } = input
	const errors: string[] = []
	if (input.spoiler === "story") errors.push(`${id}: story spoilers wait for the Hide spoilers switch (spec §8.4)`)
	const limited = input.platforms !== undefined && new Set(input.platforms).size < PLATFORMS.length
	if (input.mode === "online" || limited)
		errors.push(`${id}: online and platform-limited items wait for the Settings preference (spec §8.6)`)
	if (input.specs) errors.push(...specErrors(id, category, group, input.specs))
	return errors
}
```

In `buildGroup`, after the header sources, add:

```ts
if (file.spoiler === "story") errors.push(`${where}: story spoilers wait for the Hide spoilers switch (spec §8.4)`)
```

In `buildSeed`, a category marked `spoiler: "story"` in `categories.json` may not have a group file yet. Next to `known`:

```ts
const story = new Set(parsed.data.categories.filter((c) => c.spoiler === "story").map((c) => c.id))
```

and in the path loop, right after the `known` check:

```ts
if (story.has(category)) {
	errors.push(`${path}: story content waits for the Hide spoilers switch (spec §8.4)`)
	continue
}
```

Replace the `nameErrors` stub:

```ts
/** Spec §6 and §8.1, within one category: a live item may not take a retired item's name unless
 *  it replaces it, and an alias may not be another live item's name or alias. */
function nameErrors(category: string, items: SeedItem[]): string[] {
	const errors: string[] = []
	const retired = new Map<string, string>()
	for (const item of items) if (item.retired) retired.set(normalize(item.name), item.id)
	const live = items.filter((item) => !item.retired)
	const owner = new Map<string, string>()
	for (const item of live) owner.set(normalize(item.name), item.id)
	for (const item of live) {
		for (const name of [item.name, ...(item.aliases ?? [])]) {
			const twin = retired.get(normalize(name))
			if (twin && !(item.replaces ?? []).includes(twin))
				errors.push(`${item.id}: same name as retired ${twin}; add replaces`)
		}
		for (const alias of item.aliases ?? []) {
			const key = normalize(alias)
			const other = owner.get(key)
			if (other && other !== item.id) errors.push(`${item.id}: alias ${alias} is already a name or alias in ${category}`)
			else owner.set(key, item.id)
		}
	}
	return errors
}
```

Drop the leading underscores from the parameters now that they are used.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/model/seedBuild.test.ts && npm run typecheck`
Expected: PASS and 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/model/seedBuild.ts src/model/seedBuild.test.ts
git commit -m "Check item extras, twin names and aliases at build"
```

---

### Task 5: Shipped ids against main in CI

**Files:**
- Modify: `src/model/seedBuild.ts`, `src/model/seedBuild.test.ts`, `.github/workflows/ci.yml`
- Create: `src/model/shippedIds.ci.test.ts`

**Interfaces:**
- Produces: `shippedIdErrors(main: string[], head: string[], seed: { id: string; category: string }[]): string[]` and `ciShippedErrors(mainText: string, headText: string, seed: { id: string; category: string }[]): string[]`.

- [ ] **Step 1: Write the failing tests**

Add to `seedBuild.test.ts` (import the two functions):

```ts
describe("shippedIdErrors (spec §6 checks 2 and 3)", () => {
	const seed = [
		{ id: "wildlife/pelican", category: "animals" },
		{ id: "animals/heron", category: "animals" },
	]
	it("passes when main's ids stay and new ids start with their category", () => {
		expect(shippedIdErrors(["wildlife/pelican"], ["wildlife/pelican", "animals/heron"], seed)).toEqual([])
	})
	it("fails when the list drops a line that is on main", () => {
		expect(shippedIdErrors(["wildlife/pelican", "wildlife/gone"], ["wildlife/pelican", "animals/heron"], seed)).toEqual([
			"shipped-ids.txt drops wildlife/gone, which is on main",
		])
	})
	it("fails when a new id starts with another category", () => {
		const added = [...seed, { id: "wildlife/heron2", category: "animals" }]
		expect(shippedIdErrors(["wildlife/pelican"], ["wildlife/pelican", "animals/heron", "wildlife/heron2"], added)).toEqual([
			"wildlife/heron2: a new id must start with animals/",
		])
	})
})

describe("ciShippedErrors", () => {
	it("passes while main has no list yet (the PR that adds it)", () => {
		expect(ciShippedErrors("", "wildlife/pelican\n", [{ id: "wildlife/pelican", category: "animals" }])).toEqual([])
	})
	it("checks once main has a list", () => {
		expect(ciShippedErrors("# ids\nanimals/a\n", "", [])).toEqual(["shipped-ids.txt drops animals/a, which is on main"])
	})
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/model/seedBuild.test.ts`
Expected: FAIL, the functions do not exist.

- [ ] **Step 3: Implement**

Add to `seedBuild.ts`:

```ts
/** Spec §6 checks 2 and 3, which need main's list, so CI runs them (shippedIds.ci.test.ts). */
export function shippedIdErrors(
	main: string[],
	head: string[],
	seed: { id: string; category: string }[]
): string[] {
	const onMain = new Set(main)
	const atHead = new Set(head)
	return [
		...main.filter((id) => !atHead.has(id)).map((id) => `shipped-ids.txt drops ${id}, which is on main`),
		...seed
			.filter((item) => !onMain.has(item.id) && !item.id.startsWith(`${item.category}/`))
			.map((item) => `${item.id}: a new id must start with ${item.category}/`),
	]
}

/** Empty main text means main has no list yet: the PR that adds the file passes. */
export function ciShippedErrors(
	mainText: string,
	headText: string,
	seed: { id: string; category: string }[]
): string[] {
	if (mainText.trim() === "") return []
	return shippedIdErrors(parseShipped(mainText).ids, parseShipped(headText).ids, seed)
}
```

`src/model/shippedIds.ci.test.ts`:

```ts
// Runs only in the CI job that sets MAIN_SHIPPED_IDS (ci.yml, shipped-ids). Locally it is skipped.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import headText from "../seed/shipped-ids.txt?raw"
import { seedItems } from "./seed"
import { ciShippedErrors } from "./seedBuild"

const mainPath = process.env.MAIN_SHIPPED_IDS

describe.skipIf(!mainPath)("shipped ids against main", () => {
	it("drops no id that is on main, and every new id starts with its category", () => {
		const mainText = readFileSync(mainPath ?? "", "utf8")
		expect(ciShippedErrors(mainText, headText, seedItems)).toEqual([])
	})
})
```

Until Task 6 creates `src/seed/shipped-ids.txt`, create it empty so the `?raw` import resolves: `printf '' > src/seed/shipped-ids.txt`. Task 6 overwrites it.

- [ ] **Step 4: Add the CI job**

Append to `jobs:` in `.github/workflows/ci.yml`:

```yaml
  shipped-ids:
    # Category model spec §6: an id on main is never dropped from shipped-ids.txt, and a new id
    # starts with its folder's category. A required check from the PR after the one that adds it.
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Read main's list
        # Never fails open. An empty list ("no list yet") only when this branch adds the file;
        # a missing origin/main or any other read error fails the job.
        run: |
          git rev-parse --verify origin/main
          if git diff --diff-filter=A --name-only origin/main...HEAD | grep -qx src/seed/shipped-ids.txt; then
            : > "$RUNNER_TEMP/main-ids.txt"
          else
            git show origin/main:src/seed/shipped-ids.txt > "$RUNNER_TEMP/main-ids.txt"
          fi
      - name: Check
        env:
          MAIN_SHIPPED_IDS: ${{ runner.temp }}/main-ids.txt
        run: npx vitest run src/model/shippedIds.ci.test.ts
```

- [ ] **Step 5: Run locally both ways**

Run: `npx vitest run src/model/seedBuild.test.ts src/model/shippedIds.ci.test.ts`
Expected: PASS, the CI file reports 1 skipped.

Run (Git Bash): `git show origin/main:src/seed/shipped-ids.txt > "$TEMP/main-ids.txt" 2>/dev/null || : > "$TEMP/main-ids.txt"; MAIN_SHIPPED_IDS="$TEMP/main-ids.txt" npx vitest run src/model/shippedIds.ci.test.ts`
Expected: PASS (main has no list yet, so the check passes by design).

- [ ] **Step 6: Commit**

```bash
git add src/model/seedBuild.ts src/model/seedBuild.test.ts src/model/shippedIds.ci.test.ts src/seed/shipped-ids.txt .github/workflows/ci.yml
git commit -m "Check shipped ids against main in CI"
```

---

### Task 6: Move the seed and rename Wildlife and Collectibles

Players see this task: the tiles read Vehicles, Animals, Collections, Activities, Places, in the game's order. Ticks stay, because every id stays.

**Files:**
- Create: `.superpowers/scripts/move-seed.mjs` (not committed; `.superpowers/` is gitignored), `src/seed/categories.json`, `src/seed/categories/**` (18 files), `src/seed/shipped-ids.txt`
- Delete: `src/seed/vehicles.json`, `src/seed/wildlife.json`, `src/seed/collectibles.json`, `src/seed/places.json`
- Modify: `src/model/seed.ts`, `src/model/seed.test.ts`, `src/model/schema.ts`, `src/model/schema.test.ts`, `allowlist.json`, `src/locales/en.json`, `src/locales/nb.json`, `src/model/searchTerms.ts`, `src/model/search.test.ts`, `src/islands/tracker/icons.tsx`, `src/model/dashboard.ts:9,24,41`, `src/model/tracker.ts:115-119`, `src/model/tracker.test.ts`, `src/model/seo.ts:31`, `public/_redirects`, `src/test/redirects.test.ts`, `docs/domain-stories/README.md:21`

**Interfaces:**
- Consumes: `buildSeed` (Tasks 3 to 5).
- Produces: `seedItems` in display order; `categoryIds()` unchanged; `groupItems()` keeps seed order instead of sorting; `CATEGORY_ALIASES` in `tracker.ts`.

- [ ] **Step 1: Write the move script**

`.superpowers/scripts/move-seed.mjs`:

```js
// One-off (category model spec §3): moves the four pre-launch seed files into
// src/seed/categories/<category>/<group>.json. Ids never change (spec §6).
// Run from the repo root: node .superpowers/scripts/move-seed.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

// Old file and group to the new category and group.
const ROUTES = {
	"vehicles:cars": "vehicles/cars",
	"vehicles:motorcycles": "vehicles/bikes",
	"vehicles:boats": "vehicles/watercraft",
	"vehicles:aircraft": "vehicles/aircraft",
	"vehicles:service": "vehicles/service",
	"vehicles:emergency": "vehicles/service",
	"vehicles:commercial": "vehicles/service",
	"wildlife:mammals": "animals/mammals",
	"wildlife:reptiles": "animals/reptiles-amphibians",
	"wildlife:birds": "animals/birds",
	"wildlife:marine": "animals/aquatic",
	"collectibles:hidden-items": "collections/exploration",
	"collectibles:vehicles": "collections/exploration",
	"collectibles:stunts": "activities/stunts",
	"collectibles:challenges": "activities/racing",
	"places:regions": "places/regions",
	"places:cities": "places/cities",
	"places:neighborhoods": "places/neighborhoods",
	"places:keys": "places/keys",
	"places:landmarks": "places/landmarks",
	"places:businesses": "places/businesses",
}
// Single items that leave their old group (spec §2).
const MOVED = {
	"places/mount-kalaga-national-park": "places/regions",
	"collectibles/base-jumps": "activities/stunts",
}
// Order = the game's tab order; total = the game's counter from her 23.11 photos.
const HEADERS = {
	"vehicles/cars": { order: 1, total: 157 },
	"vehicles/bikes": { order: 2, total: 29 },
	"vehicles/watercraft": { order: 3, total: 28 },
	"vehicles/aircraft": { order: 4, total: 16 },
	"vehicles/service": { order: 5, total: 47 },
	"animals/mammals": { order: 3, total: 18 },
	"animals/reptiles-amphibians": { order: 5, total: 6 },
	"animals/birds": { order: 6, total: 60 },
	"animals/aquatic": { order: 7, total: 18 },
	"collections/exploration": { order: 4 },
	"activities/racing": { order: 2 },
	"activities/stunts": { order: 6 },
	"places/regions": { order: 1 },
	"places/cities": { order: 2 },
	"places/neighborhoods": { order: 3 },
	"places/keys": { order: 4 },
	"places/landmarks": { order: 5 },
	"places/businesses": { order: 6 },
}

const out = new Map()
const ids = []
for (const file of ["vehicles", "wildlife", "collectibles", "places"]) {
	const items = JSON.parse(readFileSync(`src/seed/${file}.json`, "utf8"))
	for (const { category: _category, group, ...item } of items) {
		const target = MOVED[item.id] ?? ROUTES[`${file}:${group}`]
		if (!target) throw new Error(`no route for ${item.id} (${file}:${group})`)
		out.set(target, [...(out.get(target) ?? []), item])
		ids.push(item.id)
	}
}
for (const [target, items] of out) {
	const header = HEADERS[target]
	if (!header) throw new Error(`no header for ${target}`)
	const [category, group] = target.split("/")
	mkdirSync(`src/seed/categories/${category}`, { recursive: true })
	const data = { group, order: header.order, ...(header.total ? { total: header.total } : {}), sort: "name", items }
	writeFileSync(`src/seed/categories/${target}.json`, `${JSON.stringify(data, null, "\t")}\n`)
}
const unused = Object.keys(HEADERS).filter((key) => !out.has(key))
if (unused.length > 0) throw new Error(`headers with no items: ${unused.join(", ")}`)
writeFileSync(
	"src/seed/shipped-ids.txt",
	`# Every item id that has shipped. Never remove or change a line (category model spec §6).\n${ids.sort().join("\n")}\n`
)
console.log(`${ids.length} items moved into ${out.size} group files`)
```

- [ ] **Step 2: Run it and check the counts**

Run: `node .superpowers/scripts/move-seed.mjs && npx biome format --write src/seed/categories`
Expected: `216 items moved into 18 group files`.

Run: `grep -c "/" src/seed/shipped-ids.txt`
Expected: `216`.

- [ ] **Step 3: Write `categories.json`**

`src/seed/categories.json`:

```json
{
	"categories": [
		{ "id": "vehicles" },
		{ "id": "weapons" },
		{ "id": "animals" },
		{ "id": "equipment" },
		{ "id": "collections" },
		{ "id": "activities" },
		{ "id": "contacts" },
		{ "id": "gangs" },
		{ "id": "robberies" },
		{ "id": "challenges" },
		{ "id": "places" },
		{ "id": "story", "spoiler": "story" }
	]
}
```

Categories with no folder are skipped, so this PR shows five.

- [ ] **Step 4: Point `seed.ts` at the folders**

Replace the bottom of `src/model/seed.ts` (from `function categoryOf` to the end) and delete `validateSeedFile`, `loadAll`, `categoryOf` and the old `idsIn`:

```ts
/** Ids in a raw rumours or facts file, for the cross-file duplicate check. */
function idsIn(data: unknown): string[] {
	if (!Array.isArray(data)) return []
	return data
		.map((entry) => (entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined))
		.filter((id): id is string => typeof id === "string")
}

/** Category ids in seed order (categories.json). */
export function categoryIds(items: SeedItem[]): string[] {
	return [...new Set(items.map((i) => i.category))]
}

/** Items by group in seed order: groups by their header's `order`, items by the group's `sort`.
 *  seedBuild sorts once, so every page and the tracker list items the same way. */
export function groupItems(items: SeedItem[]): Map<string, SeedItem[]> {
	const groups = new Map<string, SeedItem[]>()
	for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item])
	return groups
}

// Every JSON file at any depth, so a misplaced one reaches buildSeed's path check instead of
// being skipped without a word.
const groupFiles = import.meta.glob<{ default: unknown }>("../seed/categories/**/*.json", { eager: true })
const built = buildSeed({
	categories: categoriesJson,
	groups: Object.fromEntries(
		Object.entries(groupFiles).map(([path, mod]) => [path.replace("../seed/categories/", ""), mod.default])
	),
	shipped: shippedIds,
	allowlist,
})
const news = { rumours: validateRumours(rumoursJson, allowlist), facts: validateFacts(factsJson, allowlist) }
const crossIds = [...new Set(built.items.map((i) => i.id)), ...idsIn(rumoursJson), ...idsIn(factsJson)]
const seen = new Set<string>()
const crossErrors: string[] = []
for (const id of crossIds) {
	if (seen.has(id)) crossErrors.push(`duplicate id ${id}`)
	seen.add(id)
}
const errors = [...built.errors, ...news.rumours.errors, ...news.facts.errors, ...crossErrors]
if (errors.length > 0) throw new Error(`Seed invalid:\n${errors.join("\n")}`)

export const seedItems: SeedItem[] = built.items
export const rumours: Rumour[] = news.rumours.rumours
export const facts: Fact[] = news.facts.facts
```

Imports at the top: add `categoriesJson from "../seed/categories.json"`, `factsJson from "../seed/facts.json"`, `rumoursJson from "../seed/rumours.json"`, `shippedIds from "../seed/shipped-ids.txt?raw"` and `{ buildSeed } from "./seedBuild"`; drop the now-unused schema imports. Update the file's top comment: "Seed loading. The item rules live in seedBuild.ts, the source rules in tiers.ts."

With `validateSeedFile` gone, nothing reads the old item schema. In `src/model/schema.ts`, delete `seedItemInputSchema` (with its `location` field) and `SeedItemInput`. In `src/model/schema.test.ts`, delete the `describe("seedItemInputSchema", ...)` block and drop `seedItemInputSchema` from the import.

Then delete the old files:

```bash
git rm src/seed/vehicles.json src/seed/wildlife.json src/seed/collectibles.json src/seed/places.json
```

- [ ] **Step 5: Add the §9 press hosts**

In `allowlist.json`, append to `press`: `"powerpyx.com"`, `"pushsquare.com"`, `"videogameschronicle.com"`, `"kotaku.com"`, `"blog.playstation.com"`, `"news.xbox.com"`, `"redbull.com"`.

`allowlist.json` is shared, so the seven hosts also count as press for rumours and facts. That is intended: they are press outlets wherever they are cited.

- [ ] **Step 6: Labels, Dex copy and search terms**

In both locale files, replace the `category.*` and `group.*` block with these keys (en / nb). Category: `vehicles` Vehicles / Kjøretøy, `animals` Animals / Dyr, `collections` Collections / Samlinger, `activities` Activities / Aktiviteter, `places` Places / Steder. Group: `cars` Cars / Biler, `bikes` Bikes / Motorsykler og sykler, `watercraft` Watercraft / Båter, `aircraft` Aircraft / Fly og helikoptre, `service` Service / Tjenestekjøretøy, `mammals` Mammals / Pattedyr, `reptiles-amphibians` Reptiles & Amphibians / Krypdyr og amfibier, `birds` Birds / Fugler, `aquatic` Aquatic / Vanndyr, `exploration` Exploration / Utforsking, `racing` Racing / Løp, `stunts` Stunts / Stunt, `regions` Regions / Regioner, `cities` Cities / Byer, `neighborhoods` Neighborhoods / Bydeler, `keys` Keys / Øyer, `landmarks` Landmarks / Landemerker, `businesses` Businesses / Bedrifter.

The English labels are the game's tab names. The Norwegian ones are my picks; she checks them in the PR.

Dex and SEO keys: rename every `*.wildlife*` key to `*.animals*` and every `*.collectibles*` key to `*.collections*` (`seo.titles.dex.*`, `dex.lede.*.one/other`, `dex.description.*.one/other`), keeping their values. Add Activities:

| Key | en | nb |
|---|---|---|
| `seo.titles.dex.activities` | GTA 6 activities: races and stunts so far · Rookdex | GTA 6 aktiviteter: løp og stunt så langt · Rookdex |
| `dex.lede.activities.one` | {count} activity so far: {confirmed} confirmed, {expected} expected. | {count} aktivitet så langt: {confirmed} bekreftet, {expected} forventet. |
| `dex.lede.activities.other` | {count} activities so far: {confirmed} confirmed, {expected} expected. | {count} aktiviteter så langt: {confirmed} bekreftet, {expected} forventet. |
| `dex.description.activities.one` | The {count} GTA 6 activity in the Dex so far, with its status and a link to the source behind it. | Foreløpig {count} aktivitet i GTA 6 i Dex-en, med status og lenke til kilden bak den. |
| `dex.description.activities.other` | All {count} GTA 6 activities in the Dex so far, from races to stunts, each with its status and a link to the source behind it. | Alle {count} aktivitetene i GTA 6 i Dex-en så langt, fra løp til stunt, hver med status og lenke til kilden bak den. |

Replace `SEARCH_TERMS` in `src/model/searchTerms.ts`:

```ts
export const SEARCH_TERMS: SearchTerms = {
	cars: ["car", "cars", "bil", "biler"],
	bikes: [
		"bike",
		"bikes",
		"motorcycle",
		"motorcycles",
		"motorbike",
		"bicycle",
		"motorsykkel",
		"motorsykler",
		"motorsykler og sykler",
		"sykkel",
		"sykler",
		"mc",
	],
	watercraft: ["watercraft", "boat", "boats", "båt", "båter"],
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
	service: [
		"service",
		"emergency",
		"police",
		"ambulance",
		"truck",
		"van",
		"bus",
		"services",
		"tjeneste",
		"tjenester",
		"tjenestekjøretøy",
		"utrykning",
		"politi",
		"ambulanse",
		"lastebil",
		"varebil",
		"buss",
		"commercial",
		"nyttekjøretøy",
		"garage",
		"verksted",
		"shop",
	],
	mammals: ["mammal", "mammals", "animal", "animals", "pattedyr", "dyr"],
	"reptiles-amphibians": [
		"reptiles & amphibians",
		"reptile",
		"reptiles",
		"amphibian",
		"amphibians",
		"animal",
		"krypdyr og amfibier",
		"krypdyr",
		"amfibie",
		"dyr",
	],
	birds: ["bird", "birds", "animal", "animals", "fugl", "fugler", "dyr"],
	aquatic: ["aquatic", "fish", "sea", "marine life", "animal", "vanndyr", "fisk", "sjødyr", "hav", "dyr"],
	exploration: [
		"exploration",
		"hidden",
		"collectible",
		"collectibles",
		"utforsking",
		"skjult",
		"samleobjekt",
		"hidden item",
		"hidden items",
		"skjult gjenstand",
		"skjulte gjenstander",
	],
	racing: [
		"racing",
		"race",
		"races",
		"time trial",
		"løp",
		"billøp",
		"tidsløp",
		"challenge",
		"challenges",
		"utfordring",
		"utfordringer",
	],
	stunts: ["stunt", "stunts", "jump", "base jump", "hopp"],
	cities: ["city", "cities", "by", "byer"],
	keys: ["keys", "island", "islands", "øy", "øyer"],
	regions: ["region", "regions", "regioner"],
	landmarks: ["landmark", "landmarks", "landemerke", "landemerker"],
	businesses: ["business", "businesses", "shop", "store", "bedrift", "bedrifter", "butikk"],
	neighborhoods: ["neighborhood", "neighborhoods", "district", "bydel", "bydeler"],
}
```

`missingTerms` checks that each entry holds both labels after `normalize`, so "Reptiles & Amphibians" needs the `"reptiles & amphibians"` entry above. The old groups' words move with their items: the `challenges` words to `racing`, the `hidden-items` words to `exploration`. Changed at review (25.11): the `commercial` and `emergency` words did not go to `service`, because a group word matches every item in the group and "police" then found Pay 'n' Spray. A merged group keeps only words true of all its items; item names carry the rest.

Add to `src/model/search.test.ts` (import `SEARCH_TERMS` from `./searchTerms`), on the file's `view` helper:

```ts
it("finds a former commercial vehicle by the old group's Norwegian word", () => {
	const mule = { id: "vehicles/mule", category: "vehicles", group: "service", name: "Mule", status: "confirmed" as const, sources: [src] }
	const result = view({ items: [mule], query: "nyttekjøretøy", terms: SEARCH_TERMS })
	expect(result.visible.map((i) => i.id)).toEqual(["vehicles/mule"])
})
```

- [ ] **Step 7: Icons, first goal, old names in links**

`src/islands/tracker/icons.tsx`: rename `WildlifeIcon` to `AnimalsIcon` and `CollectiblesIcon` to `CollectionsIcon`, add an Activities icon in the same stroke style (my own geometry, a checkered flag):

```tsx
export function ActivitiesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M5 21V4" />
			<path d="M5 4h13l-2.5 4L18 12H5" />
			<path d="M9 4v8M13 4v8M5 8h13" />
		</svg>
	)
}

const byCategory: Record<string, () => ReactElement> = {
	activities: ActivitiesIcon,
	animals: AnimalsIcon,
	collections: CollectionsIcon,
	places: PlacesIcon,
	vehicles: VehiclesIcon,
}
```

Update `icons.test.tsx` for the new keys.

`src/model/dashboard.ts`: `export const FIRST_GOAL = "animals"`, and "wildlife" becomes "animals" in the two comments (lines 24 and 41). In `dashboard.test.ts`, the cases about the first goal use fixture items in a `wildlife` category; change those fixtures' category (and id prefix) to `animals` so the tests still prove "animals comes first".

`src/model/tracker.ts`, above `parseShow`:

```ts
/** Spec §6: category ids renamed after launch. Old links and saved views still open the new one. */
export const CATEGORY_ALIASES: Readonly<Record<string, string>> = { wildlife: "animals", collectibles: "collections" }

export function parseShow(search: string, known: string[]): string[] {
	const raw = new URLSearchParams(search).get("show") ?? ""
	const wanted = new Set(
		raw.split(",").map((s) => {
			const id = s.trim()
			return Object.hasOwn(CATEGORY_ALIASES, id) ? CATEGORY_ALIASES[id] : id
		})
	)
	return known.filter((id) => wanted.has(id))
}
```

Tests in `src/model/tracker.test.ts` (Review Focus 2):

```ts
it("parseShow reads the old wildlife and collectibles ids as the new ones", () => {
	expect(parseShow("?show=wildlife,collectibles", ["vehicles", "animals", "collections"])).toEqual([
		"animals",
		"collections",
	])
})

it("parseGroups drops an old group key, so the view falls back to the whole category", () => {
	const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
	const base = { category: "animals", status: "confirmed" as const, sources: [src] }
	const items = [
		{ ...base, id: "wildlife/cougar", group: "mammals", name: "Cougar" },
		{ ...base, id: "wildlife/pelican", group: "birds", name: "Pelican" },
	]
	// A group key is `${category}/${group}` (groupKey in stats.ts), so an old link says wildlife/birds.
	const search = "?show=wildlife&group=wildlife/birds"
	const selected = parseShow(search, ["vehicles", "animals"])
	expect(selected).toEqual(["animals"])
	const chips = chipGroups(items, selected)
	expect(parseGroups(search, chips)).toEqual([])
	expect(parseGroups("?show=animals&group=animals/birds", chips)).toEqual(["animals/birds"])
})
```

`src/model/seo.ts:31`: the message becomes `"rename the category folder in src/seed/categories/"`.

- [ ] **Step 8: Redirects**

`public/_redirects`, the new lines before `/no /nb/ 301` so the Norwegian ones win over `/no/*`:

```
/no/tracker/rumours/ /nb/news/ 301
/en/tracker/rumours/ /en/news/ 301
/no/dex/wildlife/ /nb/dex/animals/ 301
/no/dex/collectibles/ /nb/dex/collections/ 301
/en/dex/wildlife/ /en/dex/animals/ 301
/nb/dex/wildlife/ /nb/dex/animals/ 301
/en/dex/collectibles/ /en/dex/collections/ 301
/nb/dex/collectibles/ /nb/dex/collections/ 301
/no /nb/ 301
/no/* /nb/:splat 301
```

Update the expected list in `src/test/redirects.test.ts` to exactly these lines, rename its first `it` to "sends every old URL to its new home in one 301, the specific rules before /no/*", and add the spec reference: `describe("_redirects (locale spec §6.2, category model spec §6)", ...)`.

- [ ] **Step 9: Rewrite `seed.test.ts`**

Delete the `tier rules` tests that call `validateSeedFile`, and the `validateSeedFile` and `loadAll` blocks; their cases live in `tiers.test.ts` and `seedBuild.test.ts` now. Keep `matchesPrefix`, `resolveTier`, `validateRumours`, `validateFacts` and the `shipped seed` block. Add to `shipped seed`:

```ts
it("follows categories.json and keeps every shipped id", () => {
	expect(categoryIds(seedItems)).toEqual(["vehicles", "animals", "collections", "activities", "places"])
	expect(seedItems).toHaveLength(216)
	expect(seedItems.find((i) => i.id === "wildlife/pelican")).toMatchObject({ category: "animals", group: "birds" })
	expect(seedItems.find((i) => i.id === "collectibles/stunt-jumps")).toMatchObject({ category: "activities", group: "stunts" })
})

it("sorts '70 Vapid Ganado under V, not at the top", () => {
	const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })
	const names = seedItems.filter((i) => i.group === "cars").map((i) => i.name)
	const ganado = names.indexOf("'70 Vapid Ganado")
	expect(ganado).toBeGreaterThan(0)
	expect(collator.compare(sortKey(names[ganado - 1]), "Vapid Ganado")).toBeLessThan(0)
})
```

The 216 holds for this PR only; the first content PR changes it, and should change this line to the new count with the reason in its commit.

Fix the imports at the top of the file for the removed exports, and import `sortKey` from `./seedBuild`.

- [ ] **Step 10: Run the whole suite and fix what the order change breaks**

Run: `npm test`
Expected: failures only where a test leaned on the old alphabetical order of categories or groups, or on the old category ids in the real seed. Fix each one in the test: order the fixture array the way the seed now orders items (categories.json order, then group `order`, then name), or name the new category id. Do not change production code to get the old order back. Then run `npm test` again.
Expected: PASS.

- [ ] **Step 11: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: 0 errors, Biome clean, build passes. The build would throw "Seed invalid" on any rule break.

- [ ] **Step 12: Prove a misplaced file fails the build**

The `**` glob must hand a stray file to the path check, not skip it. In Git Bash:

```bash
mkdir -p src/seed/categories/vehicles/extra
printf '{"group":"cars","order":9,"sort":"name","items":[]}\n' > src/seed/categories/vehicles/extra/cars.json
printf '{"group":"stray","order":9,"sort":"name","items":[]}\n' > src/seed/categories/stray.json
npm run build
rm -r src/seed/categories/vehicles/extra src/seed/categories/stray.json
```

Expected: the build fails with "Seed invalid", listing `vehicles/extra/cars.json: a group file sits at <category>/<group>.json` and `stray.json: a group file sits at <category>/<group>.json`. Then `git status` shows neither file.

- [ ] **Step 13: Docs line**

`docs/domain-stories/README.md` line 21: `src/seed/*.json` becomes `src/seed/categories/<category>/<group>.json`, `src/seed/{rumours,facts}.json`.

- [ ] **Step 14: Commit**

```bash
git add src/seed/categories.json src/seed/categories src/seed/shipped-ids.txt src/model/seed.ts src/model/seed.test.ts src/model/schema.ts src/model/schema.test.ts allowlist.json src/locales/en.json src/locales/nb.json src/model/searchTerms.ts src/model/search.test.ts src/islands/tracker/icons.tsx src/islands/tracker/icons.test.tsx src/model/dashboard.ts src/model/dashboard.test.ts src/model/tracker.ts src/model/tracker.test.ts src/model/seo.ts public/_redirects src/test/redirects.test.ts docs/domain-stories/README.md
git commit -m "Move the seed into category folders and rename Wildlife and Collectibles"
```

Also stage every test file Step 10 changed, by name. `git status` lists them.

---

### Task 7: Aliases in search, and the old names from #149

**Files:**
- Modify: `src/model/search.ts:96`, `src/model/dex.ts:88`, `src/model/search.test.ts`, `src/model/dex.test.ts`, `src/seed/categories/vehicles/cars.json`, `src/seed/categories/vehicles/service.json`, `src/seed/categories/vehicles/bikes.json` (whichever files hold the four items)

- [ ] **Step 1: Write the failing tests**

In `src/model/search.test.ts`, using the file's existing item helper and `searchView` input pattern:

```ts
it("matches an alias, which is never shown", () => {
	const item = {
		id: "vehicles/pegassi-zorrusso",
		category: "vehicles",
		group: "cars",
		name: "Granforma Zorrusso",
		status: "confirmed" as const,
		sources: [src],
		aliases: ["Pegassi Zorrusso"],
	}
	const view = searchView({ items: [item], selected: [], groups: [], query: "pegassi", hidden: new Set(), terms: {} })
	expect(view.visible.map((i) => i.name)).toEqual(["Granforma Zorrusso"])
})
```

(Use the `src` source constant the file already has, or define `const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }`.)

In `src/model/dex.test.ts`, next to the existing `dexSearchRows` tests:

```ts
it("puts aliases in the search text", () => {
	const rows = dexSearchRows(t, (c) => `/en/dex/${c}/`, [{ ...anItem, aliases: ["Pegassi Zorrusso"] }], {})
	expect(rows[0].search).toContain("pegassi zorrusso")
	expect(rows[0].name).toBe(anItem.name)
})
```

`anItem` and `t` stand for the item and translator the file's existing `dexSearchRows` test builds; reuse those, do not add new ones.

And in the `shipped seed` block of `seed.test.ts`:

```ts
it("finds the four renamed vehicles by their old names (#149)", () => {
	const byAlias = (alias: string) => seedItems.find((i) => i.aliases?.includes(alias))?.name
	expect(byAlias("Pegassi Zorrusso")).toBe("Granforma Zorrusso")
	expect(byAlias("Brute Ambulance")).toBe("Interstate Ambulance")
	expect(byAlias("Western Zombie Chopper")).toBe("Western Zombie Bobber")
	expect(byAlias("Vapid Ganado")).toBe("'70 Vapid Ganado")
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/model/search.test.ts src/model/dex.test.ts src/model/seed.test.ts`
Expected: FAIL on the three new tests.

- [ ] **Step 3: Implement**

`src/model/search.ts`, the match line in `searchView`:

```ts
if (
	queryWords.length > 0 &&
	!hasAll(queryWords, [item.name, ...(item.aliases ?? []), ...(terms[item.group] ?? [])])
)
	continue
```

`src/model/dex.ts`, the `search` field:

```ts
search: normalize([item.name, ...(item.aliases ?? []), ...(terms[item.group] ?? [])].join(" ")),
```

Update the `DexSearchRow.search` doc comment: "The name, its aliases and the group's search words, normalized."

In the seed, add `"aliases"` after `"name"` on the four items: `["Pegassi Zorrusso"]`, `["Brute Ambulance"]`, `["Western Zombie Chopper"]`, `["Vapid Ganado"]`. Find them with `grep -rln "Granforma Zorrusso\|Interstate Ambulance\|Western Zombie Bobber\|'70 Vapid Ganado" src/seed/categories`.

"Vapid Ganado" as an alias does not collide: the item's own name is "'70 Vapid Ganado", which normalizes differently, and no other item is named "Vapid Ganado".

- [ ] **Step 4: Run, then commit**

Run: `npx vitest run src/model && npm run build`
Expected: PASS, build passes.

```bash
git add src/model/search.ts src/model/dex.ts src/model/search.test.ts src/model/dex.test.ts src/model/seed.test.ts src/seed/categories/vehicles
git commit -m "Match aliases in search and give the four renamed vehicles their old names"
```

---

### Task 8: Measure, review, open the PR

- [ ] **Step 1: Full checks**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all green. Read the counts off the output for the PR text.

- [ ] **Step 2: Measure the tracker and Dex on a preview build**

Five category tiles plus All and Sources make seven tiles, one more than today, with longer Norwegian labels ("Aktiviteter", "Samlinger"). Build, run `npm run preview`, unregister the service worker and clear caches in the Browser pane, then in one batched round:
- `/en/tracker/` and `/nb/tracker/` at 320, 768, 1024, 1280, 1600 and 1920 px: tile grid rows even, no label clipped or wrapped badly, chips row heights equal.
- The same two pages at 200 % text (Playwright `Page.setFontSizes`, harness in `%TEMP%/rookdex-e2e`).
- `/en/dex/animals/`, `/nb/dex/collections/`, `/en/dex/activities/`: group headings in the new order.
- `/en/` and `/nb/` dashboard: five category bars.
- A Dex card with a link source and a game source, sources open, at 320 px and at 200 % text. No shipped item has a game source yet, so for this measure only add `{ "kind": "game", "screen": ["Progress", "Vehicles", "Cars"] }` to one car's `sources`, build, and revert it afterwards with `git checkout -- src/seed/categories/vehicles/cars.json`. Expected: the link's row (`.source-list a`) and the game row (`.game-source`) are both 44 px tall, with the same ink. At 200 % text one line is taller than 44 px, so there both rows must be equal and at least 44 px.

Fix what is off, confirm in at most one more round, then show her what is left.

- [ ] **Step 3: Check the 301s on the preview deploy**

On the PR's preview URL (comment from the `preview` job): `curl -sI <preview>/en/dex/wildlife/ | grep -i "^location\|^HTTP"` and the same for `/no/dex/wildlife/`, `/nb/dex/collectibles/`.
Expected: one `301` each, `location` on `/en/dex/animals/`, `/nb/dex/animals/`, `/nb/dex/collections/`.

- [ ] **Step 4: Review gate**

Run `/code-review high` on the branch diff. A bug or security finding blocks the PR until fixed or shown to be a false positive.

- [ ] **Step 5: Open the PR**

Title: "Rebuild the seed on the game's categories". The body (write it to a unique temp file first): what moved and why, what players see (new names and order, ticks unchanged), the four-PR split, the counts from Step 1, the measurements from Step 2, the 301 check from Step 3, and that `shipped-ids` is a new CI job that passes by design on this PR and becomes a required check after the merge (Step 6). After CI: she merges by hand once every check is done. Deploys stay batched: this one makes phones download the precache once.

- [ ] **Step 6: Make `shipped-ids` a required check**

After this PR merges, she adds `shipped-ids` as a required status check in the repo's ruleset. It is a setting she clicks herself: Settings > Rules > Rulesets, open the ruleset on `main`, and under "Require status checks to pass" add `shipped-ids` next to `ward / gate`. Until then a dropped id would show as a red check that does not block the merge.

---

## Out of scope

- **Group slugs that repeat across categories** (`exploration` is the first candidate, and the Sports groups come later). Labels (`group.<id>`) and search terms (`SEARCH_TERMS`) are keyed by the group slug alone today. The first content PR that adds a clashing slug keys both by `category/group`.
- **The words "wildlife" and "collectibles"** in `tracker.description`, `seo.titles.tracker` and the home descriptions stay in this PR. They are search words people still type.

## Self-review

**Spec coverage (this PR's share):**
- §3 folder per category, file per group, header fields, `sort`, `total`, sets in the header, "what counts as listed": Tasks 2, 3. Set folding UI: PR 3.
- §5 every build check listed for items: Tasks 3, 4. Index, chunks, service worker, chunk errors: PR 2.
- §6 ids unchanged, shipped-ids three checks, twins and `replaces`, id length, renamed categories and 301s, `?show` aliases, old group keys dropped, hardcoded ids: Tasks 3, 4, 5, 6. Removed-items Settings message and "Listed n of N" copy: PR 3 (no item is retired here, so nothing would show it).
- §8.1 to §8.7 schema and build rules: Tasks 2, 4. §8.1 search: Task 7. §8.8 Dex rendering: PR 3.
- §9 source rule, allowlist additions, game source kind, empty item sources: Tasks 1, 2, 3, 6.
- §10 seedBuild fixtures: every listed case except the two checklist ones (100 % view PR) and the index snapshot (PR 2). Fixtures are cases in one test file instead of one folder per check: the same coverage in one file instead of about 70.
- Not done here on purpose: retiring the two `vehicles/service` mod shop twins and the PTT raid item (§2). Retiring changes counts players see, so it goes in the vehicles and places content PRs with the other retirements.

**Placeholder scan:** none left. One step points at existing test helpers by role (Task 7 Step 1) because that file already defines them.

**Type consistency:** `buildSeed`, `SeedInput`, `SeedResult`, `SeedGroup`, `sortKey`, `parseShipped`, `shippedIdErrors`, `ciShippedErrors`, `SPEC_KEYS`, `tierItemSources`, `pressEntry`, `confirmedItemErrors(id, sources, list)`, `tierErrors(item, list)`, `officialErrors`, `isGameSource`, `listed`, `countable`, `CATEGORY_ALIASES` are spelled the same in every task.

## Stress test

1. Applied: game `screen` is an array of up to four `text()` parts, joined with a hidden `›` in SourceList and with `/` in `sourceKey()`.
2. Applied: independent press means two different allowlist entries (`pressEntry`), with the list threaded through `confirmedItemErrors` and `tierErrors`.
3. Applied: typecheck holds at every commit (narrowed source reads, old schema kept until Task 6, item built from a rest object, imports moved to Task 4, typecheck in Tasks 3 and 4).
4. Applied: the shipped-ids read step fails closed, she makes it a required check after the merge, and the delivery note says why §6 checks 2 and 3 run in CI.
5. Applied: a group file in a `story` category fails the build.
6. Applied: the old group key test uses `wildlife/birds` and proves `animals/birds` still works.
7. Applied: a category listed twice in `categories.json` fails the build.
8. Applied: the seed glob is `**/*.json`, with a manual misplaced-file check in Task 6.
9. Applied: `listed()` drives chips, tiles and bars, `countable()` drives totals.
10. Applied: the seed.test.ts message updates in Task 1, and the tip-host and location rows sit in Task 3.
11. Applied: service, racing and exploration keep the old groups' search words, with a "nyttekjøretøy" test.
12. Applied: group slug clashes are out of scope until the first content PR that adds one.
13. Applied: `.game-source` matches the link rows, with a 44 px Dex card measure in Task 8.
14. Decided by her: header sources count as a union, with an accepts-case and the review-time rule noted.
15. Decided by her: `sortKey` drops a four-digit year and a curly-apostrophe model year.
16. Applied: the seven new press hosts also count for rumours, as intended.
17. Applied: "wildlife" and "collectibles" stay as search words in the tracker and home copy.

> Stress-tested 2026-11-25 (546547e) — 14 applied, 1 adapted, 2 decided by me.
