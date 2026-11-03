# Dex category pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ten static, zero-JS pages (`/xx/dex/` and `/xx/dex/<category>/` in English and Norwegian) that list every live tracker item with its status, description and sources, linked from the tracker page, the hub and the Sources page.

**Architecture:** A pure `src/model/dex.ts` shapes live seed items into page data and looks up the per-category copy. Two Astro pages render it. Two small shared components carry markup that now appears on several pages: `SourceList.astro` (one item's sources) and `ChipNav.astro` (a row of 44 px chip links). The item card's sources sit in a native `<details>`; a container query decides whether the "Tick it off" link shares the summary row.

**Tech Stack:** Astro 7 (static pages, Container API tests), React 19 (only `BookIcon` and the hub islands), TypeScript, Vitest + jsdom + Testing Library, Biome, plain CSS (scoped Astro styles plus `src/styles/global.css` for the hub).

**Spec:** `docs/superpowers/specs/2026-11-03-category-pages-design.md` (stress-tested 03.11.2026). Executors read both.

## Global Constraints

- Code, identifiers, comments and commit messages in English. Comments in first person where they speak about decisions ("I keep", not "the developer keeps").
- No em dashes anywhere: code, comments, copy, commits, PR text.
- Dates in prose take periods (`07.11.2026`); ISO dates stay in filenames.
- Mobile-first CSS: base styles target 320 px; changes only inside `min-width` queries (768 px, 1024 px) and the one `@container` query in spec §5.2.
- Every link and the summary are at least 44 px tall (`var(--tap)`). Controls side by side share one height and one bottom edge.
- No new dependency, no network call, no storage. Seed text is rendered as Astro text only (`{value}`), never `set:html`.
- Pages pass `tab="tracker"` to `Base` (no Dex tab until December).
- nb pages mark item names, descriptions and source titles `lang="en"`, and nothing else: Norwegian hidden text (the new-tab note, the ": " before a hidden name) must stay outside the `lang="en"` element.
- Titles: no counts, each at most 65 characters including ` · Rookdex`, at least 40. Meta descriptions 120 to 160 characters at count 1 and at count 999.
- Copy keys exactly as listed in Task 2 (en and nb). Plurals use `.one` / `.other`.
- Biome: tabs, double quotes, no semicolons, line width 100. Run `npx biome check --write <files>` on touched files before each commit.
- **CRLF trap:** Edit on this Windows working copy can stage CRLF. Before each `git add`, run `sed -i 's/\r$//' <each touched file>`.
- **Escape trap:** Edit can write `æ`-style escapes into files holding æ, ø or å. After editing one, check with `grep -n '\\u00' <file>` (expect no output).
- Stage explicit paths only, never `git commit -a`. Run commands from the worktree root.
- Commit messages: one imperative sentence, sentence case, no prefix ("Add the Dex model"). No `Co-Authored-By`, no AI attribution.
- `getStaticPaths` runs in its own scope in Astro: it may use imports only, never a top-level frontmatter variable.
- **Build only at Task 8.** Between Tasks 4 and 6 the Dex pages exist but the sitemap does not list them yet, so `npm run build` fails seo-check rule 0 on those commits. That is expected: Tasks 4 to 6 ship in one PR, and each task's gate is its tests plus `astro check`.
- **Size budget.** Baseline at `3adc38f` (built 03.11.2026): `dist/en/tracker/sources/index.html` is 393,812 bytes raw and 18,792 bytes gzipped; the precache lists 51 URLs, 1,850,030 bytes raw. The Dex pages render the same sources plus descriptions, so expect the ten pages to add about 0.8 to 1 MB raw (about 50 KB compressed). Flag it in the PR if `dist/en/dex/vehicles/index.html` passes 400 KB raw or the precache grows by more than 1.2 MB raw.

## Plan rulings (where this plan departs from or fills in the spec)

- **P1. React renderer in `renderDoc`.** `BookIcon` is a React component. The shared Container API helper (`src/test/render.ts`) has no renderer, so a page that renders it would fail in tests. The helper gains React's server renderer (no client renderer: Dex pages have no islands).
- **P2. `plural()` passes vars.** The lede needs three numbers ("25 animals so far: 24 confirmed, 1 expected."). The vendored library's `plural(lang, key, count, vars?)` already takes vars; `Translator.plural` in `src/i18n/index.ts` gains the optional `vars` argument and forwards it.
- **P3. `ChipNav.astro`.** Spec §5.1 asks for chips with "the same look as the Sources page chips" in three new places (group chips, tracker "Browse by category", "More in the Dex"). Rather than copy the Sources page CSS three times, the chips move into one component. The Sources page uses it too, so its chip class changes from `source-chips` to `chip-list` (tests updated). `ChipNav` renders a visible H2 when given a `headingId`.
- **P4. `lang="en"` on the Sources page too.** `SourceList` takes a `lang` prop, and the Sources page passes it on nb, with `lang="en"` on its item H3s. Same rule, same seed text, two attributes; spec §5.3 said the Sources page HTML stays the same, and this is the one deliberate exception besides the heading links.
- **P5. Extra copy keys** the spec's table did not name: `dex.groups` (group chip nav name), `dex.indexLede`, `dex.indexDescription`, `dex.confirmedCount`, `dex.expectedCount`. The index page's Sources link and the "More in the Dex" Sources chip reuse `sources.title`.
- **P6. Groups line on index cards** joins the group labels with ` · `, as `CategoryBars` does, instead of the spec's lowercase comma list. Lowercasing would break labels such as "Keys" (the Florida Keys).
- **P7. Status text helper.** The "Expected" fallback for an item without `precedent` can never be reached by the live seed (`tierErrors` rejects such an item), so it is unit-tested through a pure `dexStatus(t, item)` in `src/model/dex.ts`, which the page uses.
- **P8. Cards align to the top** of their grid row (`align-items: start`), so opening one card's sources never stretches its neighbours.
- **P9. Lighthouse CI** gets `http://localhost/en/dex/vehicles/` (the largest Dex page), so the accessibility score of 1 is enforced on a Dex page.
- **P10. The tick link threshold** starts at a provisional `26em` in Task 4 and is replaced in Task 8 with the value measured in the browser, as spec §5.2 requires.

## Review Focus

1. **200 % text on a wide card.** The tick link and the summary must never overlap: the `em` threshold has to grow with the text. Pinned by the Task 8 measurement at 200 % text (both locales), written into the PR body.
2. **Norwegian hidden text inside `lang="en"`.** On nb, the new-tab note "(åpnes i ny fane)" and the tick link's ": " must not inherit `lang="en"`, or NVDA reads Norwegian with an English voice. Pinned by a Task 4 test that no `.new-tab-note` has an `[lang="en"]` ancestor.
3. **A category with zero expected items** (places) must still read naturally: "32 places so far: 32 confirmed, 0 expected." and "0 expected" on the index card. Pinned by a Task 2 test of the lede with `expected: 0`.
4. **The hub's Categories heading row at 320 px** with the new link: the heading must not wrap into the link or squeeze the decorative lines to nothing in Norwegian. Pinned by the Task 8 measurement (before-launch and launch-night layouts).
5. **A tracker deep link that lands nowhere.** The tick link must point at the id the tracker really renders (`item-<seed id>` on the checkbox input in `ItemList.tsx`). Pinned by a Task 4 test that compares the tick link's hash with the `inputId` pattern.

---

## File structure

| File | Responsibility |
|---|---|
| `src/model/dex.ts` (new) | `dexCategory`, `dexIndex`, `dexKeys`, `dexCopy`, `dexStatus`: pure page data and copy lookup |
| `src/model/dex.test.ts` (new) | Unit tests for the above |
| `src/i18n/index.ts` | `plural()` forwards vars (P2) |
| `src/locales/en.json`, `src/locales/nb.json` | New `dex.*` and `seo.titles.dex*` keys |
| `src/i18n/copy.test.ts`, `src/i18n/translator.test.ts` | Copy guards for the new keys, plural vars |
| `src/components/SourceList.astro` (new) | One item's sources: title link, outlet under it |
| `src/components/ChipNav.astro` (new) | A nav of chip links, optional visible H2 |
| `src/pages/[locale]/tracker/sources.astro` | Uses both components; H2s link to the category pages |
| `src/test/render.ts` | Adds the React server renderer (P1) |
| `src/pages/[locale]/dex/[category].astro` (new) | Category page |
| `src/pages/[locale]/dex/index.astro` (new) | Dex index page |
| `src/test/dex-page.test.ts`, `src/test/dex-index-page.test.ts` (new) | Page tests, both locales |
| `src/model/seo.ts`, `src/pages/sitemap.xml.ts`, `lighthouserc.json` | Dex paths in the sitemap; Lighthouse URL (P9) |
| `src/pages/[locale]/tracker/index.astro` | "Browse by category" chips |
| `src/islands/hub/CategoryBars.tsx`, `Hub.tsx`, `Dashboard.tsx`, `DashboardSkeleton.tsx`, `src/pages/[locale]/index.astro`, `src/styles/global.css` | "Every item in the Dex" link |

---

### Task 1: Dex model

**Files:**
- Create: `src/model/dex.ts`
- Test: `src/model/dex.test.ts`

**Interfaces:**
- Consumes: `categoryIds(items: SeedItem[]): string[]` and `groupItems(items: SeedItem[]): Map<string, SeedItem[]>` from `src/model/seed.ts`; `SeedItem` from `src/model/schema.ts`.
- Produces:
  - `interface DexGroup { id: string; items: SeedItem[] }`
  - `interface DexCategory { id: string; total: number; confirmed: number; expected: number; groups: DexGroup[] }`
  - `dexCategory(items: SeedItem[], category: string): DexCategory` (throws on a retired item or a category with no items)
  - `dexIndex(items: SeedItem[]): DexCategory[]`
  - `dexKeys(category: string): string[]`

- [ ] **Step 1: Write the failing test**

Create `src/model/dex.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { dexCategory, dexIndex, dexKeys } from "./dex"
import type { SeedItem } from "./schema"
import { categoryIds, groupItems, seedItems } from "./seed"

const live = seedItems.filter((item) => !item.retired)

function item(
	name: string,
	group: string,
	status: "confirmed" | "expected" = "confirmed",
	extra: Partial<SeedItem> = {}
): SeedItem {
	return {
		id: `wildlife/${name}`,
		category: "wildlife",
		group,
		name,
		status,
		...(status === "expected" ? { precedent: "GTA V" } : {}),
		sources: [{ url: "https://www.rockstargames.com/VI", title: "Trailer 1", tier: "official" }],
		...extra,
	}
}

const fixture = [
	item("ibis", "birds", "expected"),
	item("crane", "birds"),
	item("gator", "reptiles"),
	item("crab", "marine", "confirmed", { id: "places/crab", category: "places" }),
]

describe("dexCategory (category pages spec §4)", () => {
	it("counts one category's items by status", () => {
		const dex = dexCategory(fixture, "wildlife")
		expect(dex).toMatchObject({ id: "wildlife", total: 3, confirmed: 2, expected: 1 })
	})

	it("groups in the tracker's order, items by name", () => {
		const dex = dexCategory(fixture, "wildlife")
		expect(dex.groups.map((g) => [g.id, g.items.map((i) => i.name)])).toEqual([
			["birds", ["crane", "ibis"]],
			["reptiles", ["gator"]],
		])
	})

	it.each(categoryIds(live))("matches groupItems for the live %s", (category) => {
		const expected = [...groupItems(live.filter((i) => i.category === category))].map(
			([id, items]) => ({ id, items })
		)
		expect(dexCategory(live, category).groups).toEqual(expected)
	})

	it("throws on a retired item, naming it", () => {
		const items = [...fixture, item("dodo", "birds", "confirmed", { retired: true })]
		expect(() => dexCategory(items, "wildlife")).toThrow("wildlife/dodo")
	})

	it("throws on a category with no items", () => {
		expect(() => dexCategory(fixture, "boats")).toThrow('"boats"')
	})
})

describe("dexIndex (category pages spec §4)", () => {
	it("has one entry per live category in categoryIds order, covering every item", () => {
		const index = dexIndex(live)
		expect(index.map((c) => c.id)).toEqual(categoryIds(live))
		expect(index.reduce((sum, c) => sum + c.total, 0)).toBe(live.length)
		for (const c of index) expect(c.confirmed + c.expected).toBe(c.total)
	})

	it("throws on a retired item", () => {
		expect(() => dexIndex([item("dodo", "birds", "confirmed", { retired: true })])).toThrow()
	})
})

describe("dexKeys (category pages spec §8)", () => {
	it("names the title, lede and description keys a category needs", () => {
		expect(dexKeys("wildlife")).toEqual([
			"seo.titles.dex.wildlife",
			"dex.lede.wildlife.one",
			"dex.lede.wildlife.other",
			"dex.description.wildlife.one",
			"dex.description.wildlife.other",
		])
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/model/dex.test.ts`
Expected: FAIL, "Failed to resolve import "./dex"".

- [ ] **Step 3: Write the implementation**

Create `src/model/dex.ts`:

```ts
// Page data for the Dex (category pages spec §4). Pure: it shapes live seed items, so the pages
// and the tests share one source of truth and the tracker's group order.
import type { SeedItem } from "./schema"
import { categoryIds, groupItems } from "./seed"

export interface DexGroup {
	id: string
	items: SeedItem[]
}

export interface DexCategory {
	id: string
	total: number
	confirmed: number
	expected: number
	groups: DexGroup[]
}

/** Callers filter retired items out, as the Sources page does. Throwing keeps a stale item from
 *  ever reaching a page. */
function assertLive(items: SeedItem[]): void {
	const retired = items.find((item) => item.retired)
	if (retired) throw new Error(`${retired.id} is retired; filter retired items out first`)
}

export function dexCategory(items: SeedItem[], category: string): DexCategory {
	assertLive(items)
	const own = items.filter((item) => item.category === category)
	if (own.length === 0) throw new Error(`No live items in category "${category}"`)
	const confirmed = own.filter((item) => item.status === "confirmed").length
	return {
		id: category,
		total: own.length,
		confirmed,
		expected: own.length - confirmed,
		groups: [...groupItems(own)].map(([id, list]) => ({ id, items: list })),
	}
}

export function dexIndex(items: SeedItem[]): DexCategory[] {
	assertLive(items)
	return categoryIds(items).map((category) => dexCategory(items, category))
}

/** The copy keys a category page needs. copy.test.ts checks both bundles hold them for every live
 *  category, so a new seed category fails CI until its copy exists. */
export function dexKeys(category: string): string[] {
	return [
		`seo.titles.dex.${category}`,
		`dex.lede.${category}.one`,
		`dex.lede.${category}.other`,
		`dex.description.${category}.one`,
		`dex.description.${category}.other`,
	]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/model/dex.test.ts`
Expected: PASS (all tests, including one `matches groupItems` case per live category).

- [ ] **Step 5: Commit**

```bash
npx biome check --write src/model/dex.ts src/model/dex.test.ts
sed -i 's/\r$//' src/model/dex.ts src/model/dex.test.ts
git add src/model/dex.ts src/model/dex.test.ts
git commit -m "Add the Dex model that shapes live seed items into page data"
```

---

### Task 2: Copy, plural vars and the copy lookup

**Files:**
- Modify: `src/i18n/index.ts` (the `Translator` interface and `translator()`)
- Modify: `src/locales/en.json`, `src/locales/nb.json` (append the keys below; keep each file's existing order and tab indentation)
- Modify: `src/model/dex.ts` (add `dexCopy`, `dexStatus`)
- Test: `src/i18n/translator.test.ts`, `src/i18n/copy.test.ts`, `src/model/dex.test.ts`

**Interfaces:**
- Consumes: `DexCategory`, `dexKeys` from Task 1.
- Produces:
  - `Translator.plural(key: PluralKey, count: number, vars?: Vars): string`
  - `interface DexCopy { title: string; lede: string; description: string }`
  - `dexCopy(tr: Translator, category: DexCategory): DexCopy` (throws `Missing copy key "<key>"` when a key is absent)
  - `dexStatus(t: Translate, item: SeedItem): string`
  - Copy keys: see the table in Step 3.

- [ ] **Step 1: Write the failing tests**

Append to `src/i18n/translator.test.ts`, inside its top-level `describe`, next to the existing plural test (reuse the file's existing `en` translator constant):

```ts
	it("fills extra vars in a plural", () => {
		expect(
			en.plural("dex.lede.wildlife", 25, { confirmed: 24, expected: 1 })
		).toBe("25 animals so far: 24 confirmed, 1 expected.")
	})
```

Append to `src/i18n/copy.test.ts` (add the two imports at the top of the file, and add `"dex.indexDescription"` to the `descriptionKeys` array):

```ts
import { dexKeys } from "../model/dex"
import { categoryIds, seedItems } from "../model/seed"
```

```ts
describe("Dex copy (category pages spec §8, §12)", () => {
	const categories = categoryIds(seedItems.filter((item) => !item.retired))
	const missing = (bundle: Record<string, string>, category: string) =>
		dexKeys(category).filter((key) => !Object.hasOwn(bundle, key))

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s has every live category's title, lede and description", (_locale, bundle) => {
		for (const category of categories) expect(missing(bundle, category), category).toEqual([])
	})

	it("goes red on a category without its keys", () => {
		expect(missing(en, "fixture")).toEqual(dexKeys("fixture"))
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s category descriptions are 120 to 160 characters at any count", (_l, bundle) => {
		const strings: Record<string, string> = bundle
		for (const category of categories) {
			for (const form of ["one", "other"]) {
				const key = `dex.description.${category}.${form}`
				for (const count of [1, 999]) {
					const length = [...strings[key].replace("{count}", String(count))].length
					expect(length, `${key} at ${count}`).toBeGreaterThanOrEqual(120)
					expect(length, `${key} at ${count}`).toBeLessThanOrEqual(160)
				}
			}
		}
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s ledes carry all three numbers", (_locale, bundle) => {
		const strings: Record<string, string> = bundle
		for (const category of categories) {
			for (const form of ["one", "other"]) {
				const lede = strings[`dex.lede.${category}.${form}`]
				for (const name of ["{count}", "{confirmed}", "{expected}"]) expect(lede).toContain(name)
			}
		}
	})
})
```

Append to `src/model/dex.test.ts` (extend the imports: `dexCopy, dexStatus` from `./dex`, and `import { translator } from "../i18n"`):

```ts
describe("dexCopy (category pages spec §8)", () => {
	const en = translator("en")
	const nb = translator("nb")

	it("builds the title, lede and description for a category", () => {
		const copy = dexCopy(en, dexCategory(fixture, "wildlife"))
		expect(copy.title).toBe("GTA 6 animals: every species confirmed so far · Rookdex")
		expect(copy.lede).toBe("3 animals so far: 2 confirmed, 1 expected.")
		expect(copy.description).toMatch(/^All 3 GTA 6 animals in the Dex so far/)
	})

	it("picks the singular and keeps zero counts readable", () => {
		const one = dexCategory([item("crane", "birds")], "wildlife")
		expect(dexCopy(en, one).lede).toBe("1 animal so far: 1 confirmed, 0 expected.")
		expect(dexCopy(nb, one).lede).toBe("1 dyr så langt: 1 bekreftet, 0 forventet.")
	})

	it("throws on a category without copy, naming the key", () => {
		const bogus = { ...dexCategory(fixture, "wildlife"), id: "bogus" }
		expect(() => dexCopy(en, bogus)).toThrow('"seo.titles.dex.bogus"')
	})
})

describe("dexStatus (category pages spec §5.2)", () => {
	const { t } = translator("en")

	it("says Confirmed, or Expected with its precedent", () => {
		expect(dexStatus(t, item("crane", "birds"))).toBe("Confirmed")
		expect(dexStatus(t, item("ibis", "birds", "expected"))).toBe("Expected, as in GTA V")
	})

	it("never ends in 'as in' when an expected item has no precedent", () => {
		const bare = { ...item("ibis", "birds", "expected"), precedent: undefined }
		expect(dexStatus(t, bare)).toBe("Expected")
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/i18n/translator.test.ts src/i18n/copy.test.ts src/model/dex.test.ts`
Expected: FAIL. The type of `dex.lede.wildlife` is not a `PluralKey` yet (vitest still runs and returns `dex.lede.wildlife.other`), the copy keys are missing, and `dexCopy` / `dexStatus` are not exported.

- [ ] **Step 3: Add the copy keys**

Append to `src/locales/en.json` (before the closing brace, after the last existing key):

```json
	"seo.titles.dexIndex": "GTA 6 Dex: every animal, car, place and collectible · Rookdex",
	"seo.titles.dex.wildlife": "GTA 6 animals: every species confirmed so far · Rookdex",
	"seo.titles.dex.vehicles": "GTA 6 cars and vehicles: every one confirmed so far · Rookdex",
	"seo.titles.dex.places": "GTA 6 places: every location confirmed so far · Rookdex",
	"seo.titles.dex.collectibles": "GTA 6 collectibles: what to expect at launch · Rookdex",
	"dex.title": "Dex",
	"dex.indexLede": "Every animal, car, place and collectible confirmed for GTA 6 so far, with its sources.",
	"dex.indexDescription": "Every GTA 6 animal, car, place and collectible confirmed so far, sorted by category, each with its status and a link to the trailer or report that shows it.",
	"dex.groups": "Groups",
	"dex.expected": "Expected",
	"dex.sources": "Sources ({count})",
	"dex.tick": "Tick it off in the tracker",
	"dex.more": "More in the Dex",
	"dex.browse": "Browse by category",
	"dex.everyItem": "Every item in the Dex",
	"dex.confirmedCount": "{count} confirmed",
	"dex.expectedCount": "{count} expected",
	"dex.lede.wildlife.one": "{count} animal so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.wildlife.other": "{count} animals so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.vehicles.one": "{count} vehicle so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.vehicles.other": "{count} vehicles so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.places.one": "{count} place so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.places.other": "{count} places so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.collectibles.one": "{count} collectible so far: {confirmed} confirmed, {expected} expected.",
	"dex.lede.collectibles.other": "{count} collectibles so far: {confirmed} confirmed, {expected} expected.",
	"dex.description.wildlife.one": "The {count} GTA 6 animal in the Dex so far, with its status and a link to the trailer or report that shows it. More arrive as Rockstar confirms them.",
	"dex.description.wildlife.other": "All {count} GTA 6 animals in the Dex so far: birds, mammals, marine life and reptiles, each with its status and a link to the trailer or report that shows it.",
	"dex.description.vehicles.one": "The {count} GTA 6 vehicle in the Dex so far, with its status and a link to the trailer or report that shows it. More arrive as Rockstar confirms them.",
	"dex.description.vehicles.other": "All {count} GTA 6 cars, bikes, boats and aircraft in the Dex so far, each with its status and a link to the trailer or report that shows it.",
	"dex.description.places.one": "The {count} GTA 6 place in the Dex so far, with its status and a link to the trailer or report that shows it. More arrive as Rockstar confirms them.",
	"dex.description.places.other": "All {count} GTA 6 cities, regions, landmarks and businesses in the Dex so far, each with its status and a link to the trailer or report that shows it.",
	"dex.description.collectibles.one": "The {count} GTA 6 collectible in the Dex so far, with its status and a link to the source behind it. More arrive as Rockstar confirms them.",
	"dex.description.collectibles.other": "All {count} GTA 6 collectibles in the Dex so far, from hidden items to stunts. Most are expected from GTA V, and each links to the source behind it."
```

Append to `src/locales/nb.json` the same keys in the same order:

```json
	"seo.titles.dexIndex": "GTA 6 Dex: alle dyr, biler, steder og samleobjekter · Rookdex",
	"seo.titles.dex.wildlife": "GTA 6 dyr: alle arter bekreftet så langt · Rookdex",
	"seo.titles.dex.vehicles": "GTA 6 biler og kjøretøy: alle bekreftet så langt · Rookdex",
	"seo.titles.dex.places": "GTA 6 steder: alle bekreftet så langt · Rookdex",
	"seo.titles.dex.collectibles": "GTA 6 samleobjekter: dette venter ved lansering · Rookdex",
	"dex.title": "Dex",
	"dex.indexLede": "Alle dyr, biler, steder og samleobjekter som er bekreftet for GTA 6 så langt, med kildene.",
	"dex.indexDescription": "Alle dyr, biler, steder og samleobjekter som er bekreftet for GTA 6 så langt, sortert etter kategori, hvert med status og lenke til traileren eller saken bak.",
	"dex.groups": "Grupper",
	"dex.expected": "Forventet",
	"dex.sources": "Kilder ({count})",
	"dex.tick": "Kryss av i trackeren",
	"dex.more": "Mer i Dex-en",
	"dex.browse": "Bla etter kategori",
	"dex.everyItem": "Alt i Dex-en",
	"dex.confirmedCount": "{count} bekreftet",
	"dex.expectedCount": "{count} forventet",
	"dex.lede.wildlife.one": "{count} dyr så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.wildlife.other": "{count} dyr så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.vehicles.one": "{count} kjøretøy så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.vehicles.other": "{count} kjøretøy så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.places.one": "{count} sted så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.places.other": "{count} steder så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.collectibles.one": "{count} samleobjekt så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.lede.collectibles.other": "{count} samleobjekter så langt: {confirmed} bekreftet, {expected} forventet.",
	"dex.description.wildlife.one": "Foreløpig {count} dyr i GTA 6 i Dex-en, med status og lenke til traileren eller saken som viser det. Flere kommer når Rockstar bekrefter dem.",
	"dex.description.wildlife.other": "Alle {count} dyrene i GTA 6 i Dex-en så langt: fugler, pattedyr, sjødyr og krypdyr, hvert med status og lenke til traileren eller saken som viser det.",
	"dex.description.vehicles.one": "Foreløpig {count} kjøretøy i GTA 6 i Dex-en, med status og lenke til traileren eller saken som viser det. Flere kommer når Rockstar bekrefter dem.",
	"dex.description.vehicles.other": "Alle {count} kjøretøyene i GTA 6 i Dex-en så langt: biler, motorsykler, båter og fly, hvert med status og lenke til traileren eller saken som viser det.",
	"dex.description.places.one": "Foreløpig {count} sted i GTA 6 i Dex-en, med status og lenke til traileren eller saken som viser det. Flere kommer når Rockstar bekrefter dem.",
	"dex.description.places.other": "Alle {count} stedene i GTA 6 i Dex-en så langt: byer, regioner, landemerker og bedrifter, hvert med status og lenke til traileren eller saken som viser det.",
	"dex.description.collectibles.one": "Foreløpig {count} samleobjekt i GTA 6 i Dex-en, med status og lenke til kilden bak det. Flere kommer når Rockstar bekrefter dem.",
	"dex.description.collectibles.other": "Alle {count} samleobjektene i GTA 6 i Dex-en så langt, fra skjulte gjenstander til stunt. De fleste er forventet fra GTA V, og hvert lenker til kilden sin."
```

Mind the comma after the previous last key in each file, and check with `grep -n '\\u00' src/locales/nb.json` (expect no output).

- [ ] **Step 4: Forward plural vars**

In `src/i18n/index.ts`, change the interface line and the implementation:

```ts
	plural(key: PluralKey, count: number, vars?: Vars): string
```

```ts
		plural: (key, count, vars) => i18n.plural(locale, key, count, vars),
```

- [ ] **Step 5: Add `dexCopy` and `dexStatus`**

In `src/model/dex.ts`, add the imports and the functions:

```ts
import { hasKey, type Key, type PluralKey, type Translate, type Translator } from "../i18n"
```

```ts
export interface DexCopy {
	title: string
	lede: string
	description: string
}

function key(name: string): Key {
	if (!hasKey(name)) throw new Error(`Missing copy key "${name}"`)
	return name
}

/** A category page's title, lede and meta description. Throws on a missing key, so a seed
 *  category without copy fails the build instead of showing a raw key. */
export function dexCopy({ t, plural }: Translator, category: DexCategory): DexCopy {
	for (const name of dexKeys(category.id)) key(name)
	const counts = { confirmed: category.confirmed, expected: category.expected }
	return {
		title: t(key(`seo.titles.dex.${category.id}`)),
		// dexKeys checked `.one` and `.other` above, which is what makes these plural keys.
		lede: plural(`dex.lede.${category.id}` as PluralKey, category.total, counts),
		description: plural(`dex.description.${category.id}` as PluralKey, category.total),
	}
}

/** The word beside an item's status dot. The word carries the status, so colour is never the
 *  only signal. An expected item always has a precedent in the shipped seed (tierErrors); the
 *  plain fallback keeps the line from ending in "as in ". */
export function dexStatus(t: Translate, item: SeedItem): string {
	if (item.status === "confirmed") return t("tracker.confirmed")
	return item.precedent ? t("tracker.expectedFrom", { precedent: item.precedent }) : t("dex.expected")
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/i18n src/model/dex.test.ts`
Expected: PASS, including `bundles.test.ts` (parity and complete plurals) and the existing title length checks, which now also cover `seo.titles.dex.*`.

Run: `npx astro check 2>&1 | tail -3`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
npx biome check --write src/i18n/index.ts src/i18n/translator.test.ts src/i18n/copy.test.ts src/model/dex.ts src/model/dex.test.ts src/locales/en.json src/locales/nb.json
sed -i 's/\r$//' src/i18n/index.ts src/i18n/translator.test.ts src/i18n/copy.test.ts src/model/dex.ts src/model/dex.test.ts src/locales/en.json src/locales/nb.json
git add src/i18n/index.ts src/i18n/translator.test.ts src/i18n/copy.test.ts src/model/dex.ts src/model/dex.test.ts src/locales/en.json src/locales/nb.json
git commit -m "Add the Dex copy in both languages and let plural fill extra values"
```

---

### Task 3: SourceList and ChipNav, used by the Sources page

**Files:**
- Create: `src/components/SourceList.astro`, `src/components/ChipNav.astro`
- Modify: `src/pages/[locale]/tracker/sources.astro`
- Test: `src/test/sources-page.test.ts`

**Interfaces:**
- Consumes: `ExternalLink.astro` (`href`, `locale`, `class`), `outletOf(url)` from `src/model/outlet.ts`, `Source` from `src/model/schema.ts`.
- Produces:
  - `<SourceList sources={Source[]} locale={Locale} lang?={string} />` renders `ul.tap-links.source-list > li > (a.go-link[target=_blank] + span.outlet)`; with `lang`, the title sits in `<span lang>` inside the link.
  - `<ChipNav label={string} chips={{ href: string; label: string; count?: number }[]} headingId?={string} />` renders `nav.chip-nav` (named by `aria-label`, or by its visible `h2.chip-heading#headingId`) `> ul.chip-list > li > a` with an optional `span.count`.

- [ ] **Step 1: Update the Sources page test (failing)**

In `src/test/sources-page.test.ts`:

1. In "counts the live items of each category on its chip", change both `.source-chips a` selectors to `.chip-list a`.
2. Add these tests inside the `describe`:

```ts
	it("links each category heading to its Dex page", async () => {
		const doc = await page("nb")
		for (const c of categoryIds(live)) {
			const link = doc.getElementById(`cat-${c}`)?.querySelector("a")
			expect(link?.getAttribute("href")).toBe(`/nb/dex/${c}/`)
		}
	})

	it("marks the English seed text on nb, and only that", async () => {
		const doc = await page("nb")
		for (const item of live.slice(0, 5)) {
			const entry = doc.getElementById(item.id)
			expect(entry?.querySelector("h3")?.getAttribute("lang")).toBe("en")
			const titles = [...(entry?.querySelectorAll(".source-list a > span[lang='en']") ?? [])]
			expect(titles.map((s) => s.textContent)).toEqual(item.sources.map((s) => s.title))
		}
		for (const note of doc.querySelectorAll(".new-tab-note")) {
			expect(note.closest("[lang='en']")).toBeNull()
		}
		const en = await page("en")
		expect(en.querySelector(".source-section [lang='en']")).toBeNull()
	})
```

Run: `npx vitest run src/test/sources-page.test.ts`
Expected: FAIL (no `.chip-list`, no heading links, no `lang`).

- [ ] **Step 2: Create `src/components/SourceList.astro`**

```astro
---
import type { Locale } from "../i18n"
import { outletOf } from "../model/outlet"
import type { Source } from "../model/schema"
import ExternalLink from "./ExternalLink.astro"

interface Props {
	sources: Source[]
	locale: Locale
	/** "en" on nb pages: source titles are English seed text (category pages spec §10). */
	lang?: string
}

// One item's sources, title first and the outlet under it (category pages spec §5.3). The Sources
// page and the Dex cards share it. Many items cite two trailers on youtube.com, so the title leads.
const { sources, locale, lang } = Astro.props
---

<ul class="tap-links source-list">
	{
		sources.map((source) => (
			<li>
				{/* No whitespace around the title: a space before the ↗ would let it wrap alone. The lang
				    span stays inside the link and stops before the Norwegian new-tab note. */}
				<ExternalLink href={source.url} locale={locale} class="go-link"
					>{lang ? <span lang={lang}>{source.title}</span> : source.title}</ExternalLink
				>
				<span class="outlet">{outletOf(source.url)}</span>
			</li>
		))
	}
</ul>

<style>
	.source-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* The 44 px target is the link itself (the global .tap-links utility), not the row. */
	.source-list li {
		display: flex;
		flex-direction: column;
	}

	/* In a flex link a wrapped title and its ↗ are separate items, which pushes the ↗ out to the
	   right edge. Plain block flow keeps it after the last word; the padding centres one line in
	   the 44 px target. ExternalLink renders the <a>, outside this component's scope. */
	.source-list li :global(a) {
		display: block;
		padding-block: calc((var(--tap) - 1lh) / 2);
	}

	.outlet {
		color: var(--text-muted);
		font-size: 0.75rem;
	}
</style>
```

- [ ] **Step 3: Create `src/components/ChipNav.astro`**

```astro
---
interface Chip {
	href: string
	label: string
	count?: number
}

interface Props {
	/** The nav's name. With `headingId` it is also shown, as an H2 the nav is labelled by. */
	label: string
	chips: Chip[]
	headingId?: string
}

// A row of 44 px chip links (category pages spec §5.1, the Sources page's chips). Used for in-page
// jumps and for links between pages.
const { label, chips, headingId } = Astro.props
---

<nav class="chip-nav" aria-label={headingId ? undefined : label} aria-labelledby={headingId}>
	{headingId && <h2 id={headingId} class="chip-heading">{label}</h2>}
	<ul class="chip-list">
		{
			chips.map((chip) => (
				<li>
					<a href={chip.href}>
						{chip.label}
						{chip.count !== undefined && <span class="count">{chip.count}</span>}
					</a>
				</li>
			))
		}
	</ul>
</nav>

<style>
	.chip-heading {
		margin: 0 0 var(--space-2);
		font-size: 1.125rem;
	}

	.chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}

	.chip-list a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap);
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-raised);
		color: var(--text);
		font-size: 0.9375rem;
		text-decoration: none;
		transition: background-color 120ms, border-color 120ms;
	}

	@media (hover: hover) {
		.chip-list a:hover {
			background: var(--bg-hover);
			border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		}
	}

	@media (hover: none) {
		.chip-list a:active {
			background: var(--bg-hover);
		}
	}

	.chip-list a:focus-visible {
		background: var(--bg-hover);
	}

	.count {
		color: var(--text-muted);
		font-size: 0.75rem;
	}
</style>
```

- [ ] **Step 4: Use both in `sources.astro`**

Replace the imports and the body. The frontmatter becomes:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import ChipNav from "../../../components/ChipNav.astro"
import SourceList from "../../../components/SourceList.astro"
import { isLocale, type Locale, locales, seedLabel, translator } from "../../../i18n"
import Base from "../../../layouts/Base.astro"
import { categoryIds, groupItems, seedItems } from "../../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale }, props: {} }))
}

// Where every tracker item comes from (feedback spec §5). Built from the seed, zero JavaScript.
// Categories and entries follow the tracker's order; retired items are left out, as there.
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const { t } = translator(locale as Locale)
const live = seedItems.filter((item) => !item.retired)
const sections = categoryIds(live).map((category) => ({
	category,
	label: seedLabel(t, "category", category),
	items: [...groupItems(live.filter((item) => item.category === category)).values()].flat(),
}))
const tracker = getRelativeLocaleUrl(locale as Locale, "tracker")
// Seed text is English; nb pages say so (category pages spec §10).
const itemLang = locale === "en" ? undefined : "en"
---
```

The body:

```astro
<Base locale={locale} title={t("seo.titles.sources")} description={t("sources.description")} path="tracker/sources">
	<h1>{t("sources.title")}</h1>
	<p class="lede">{t("sources.lede")}</p>
	<ChipNav
		label={t("tracker.categories")}
		chips={sections.map((section) => ({
			href: `#cat-${section.category}`,
			label: section.label,
			count: section.items.length,
		}))}
	/>
	{
		sections.map((section) => (
			<section class="source-section" aria-labelledby={`cat-${section.category}`}>
				<h2 id={`cat-${section.category}`}>
					<a class="go-link" href={getRelativeLocaleUrl(locale as Locale, `dex/${section.category}`)}>
						{section.label}
					</a>
				</h2>
				{section.items.map((item) => (
					<article id={item.id} class="source-entry">
						<h3 lang={itemLang}>{item.name}</h3>
						<SourceList sources={item.sources} locale={locale as Locale} lang={itemLang} />
						<a class="back go-link" href={`${tracker}#item-${item.id}`}>
							{t("sources.back")}<span class="visually-hidden">: <span lang={itemLang}>{item.name}</span></span>
						</a>
					</article>
				))}
			</section>
		))
	}
</Base>
```

In the `<style>` block, delete the rules that moved into the components: `.source-chips` and all its `a` rules (including the hover, active and focus-visible blocks), `.count`, `.source-entry ul`, `.source-entry li`, `.source-entry li :global(a)` and `.outlet`. Keep `h1`, `.lede`, `.source-section`, `.source-section h2`, `.source-entry`, `.source-entry:target` (both rules), `.source-entry h3`, `.back` and `.back::after`.

Note on the back link: the visually hidden name now sits in a `lang` span on nb. The existing test reads `text(back)`, which is unchanged.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/test/sources-page.test.ts src/components`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npx biome check --write src/components/SourceList.astro src/components/ChipNav.astro "src/pages/[locale]/tracker/sources.astro" src/test/sources-page.test.ts
sed -i 's/\r$//' src/components/SourceList.astro src/components/ChipNav.astro "src/pages/[locale]/tracker/sources.astro" src/test/sources-page.test.ts
git add src/components/SourceList.astro src/components/ChipNav.astro "src/pages/[locale]/tracker/sources.astro" src/test/sources-page.test.ts
git commit -m "Share the source list and chip row, and link each Sources heading to its Dex page"
```

(If Biome does not format `.astro` files in this repo, the `biome check` line is a no-op for them; that is fine.)

---

### Task 4: Category page

**Files:**
- Modify: `src/test/render.ts` (P1)
- Create: `src/pages/[locale]/dex/[category].astro`
- Test: `src/test/dex-page.test.ts`

**Interfaces:**
- Consumes: `dexCategory`, `dexCopy`, `dexStatus` (Tasks 1, 2); `SourceList`, `ChipNav` (Task 3); `BookIcon` from `src/islands/tracker/icons.tsx`; `Chevron.astro` (`down` prop); `Base.astro` (`locale`, `title`, `description`, `path`, `tab`).
- Produces: the route `/xx/dex/<category>/`; `article.dex-card#<item id>`; `details.card-sources`; `a.tick`; `section.dex-group[aria-labelledby=group-<id>]`; `nav#dex-more` (the More chips are labelled by `h2#dex-more`).

- [ ] **Step 1: Give `renderDoc` the React server renderer**

Replace `src/test/render.ts` with:

```ts
// Renders an .astro component through Astro's Container API and parses the HTML. Call it from
// node-environment tests only: under jsdom, Vitest compiles .astro files for the browser and the
// container finds no renderer. React's server renderer is registered for components that render
// a React component without a client directive (the Dex cards' BookIcon); pages with islands need
// the client renderer too and build their own container (tracker-page.test.ts).
import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"

type RenderArgs = Parameters<AstroContainer["renderToString"]>

let container: Promise<AstroContainer> | undefined

async function create(): Promise<AstroContainer> {
	const created = await AstroContainer.create()
	created.addServerRenderer({ renderer: reactRenderer })
	return created
}

export async function renderDoc(
	component: RenderArgs[0],
	options?: RenderArgs[1]
): Promise<Document> {
	container ??= create()
	return new JSDOM(await (await container).renderToString(component, options)).window.document
}
```

Run: `npx vitest run src/test src/components src/layouts`
Expected: PASS (every existing `renderDoc` test still passes with the renderer added).

- [ ] **Step 2: Write the failing page test**

Create `src/test/dex-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { translator } from "../i18n"
import { dexCategory } from "../model/dex"
import { categoryIds, seedItems } from "../model/seed"
import Page from "../pages/[locale]/dex/[category].astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "nb", category: string) =>
	renderDoc(Page, { params: { locale, category } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Dex category page (category pages spec §5)", () => {
	it("is a titled sub page under the Tracker tab, with its counts in the lede", async () => {
		const doc = await page("en", "wildlife")
		const dex = dexCategory(live, "wildlife")
		expect(doc.querySelectorAll("h1")).toHaveLength(1)
		expect(text(doc.querySelector("h1"))).toBe("Wildlife")
		expect(text(doc.querySelector(".lede"))).toBe(
			`${dex.total} animals so far: ${dex.confirmed} confirmed, ${dex.expected} expected.`
		)
		expect(doc.title).toBe("GTA 6 animals: every species confirmed so far · Rookdex")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Tracker")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/en/dex/wildlife/"
		)
	})

	it.each(categoryIds(live))("has a chip, a section and one card per item for %s", async (c) => {
		const doc = await page("en", c)
		const dex = dexCategory(live, c)
		const chips = [...doc.querySelectorAll('nav[aria-label="Groups"] a')]
		expect(chips.map((a) => a.getAttribute("href"))).toEqual(dex.groups.map((g) => `#group-${g.id}`))
		expect(chips.map((a) => text(a.querySelector(".count")))).toEqual(
			dex.groups.map((g) => String(g.items.length))
		)
		for (const group of dex.groups) {
			const h2 = doc.getElementById(`group-${group.id}`)
			expect(h2?.tagName).toBe("H2")
			const section = h2?.closest("section")
			expect(section?.getAttribute("aria-labelledby")).toBe(`group-${group.id}`)
			const ids = [...(section?.querySelectorAll("article.dex-card") ?? [])].map((a) => a.id)
			expect(ids).toEqual(group.items.map((item) => item.id))
		}
	})

	it("shows each item's name, status word and description", async () => {
		const doc = await page("en", "collectibles")
		const { t } = translator("en")
		for (const item of live.filter((i) => i.category === "collectibles")) {
			const card = doc.getElementById(item.id)
			expect(text(card?.querySelector("h3"))).toBe(item.name)
			const status = card?.querySelector(".status")
			expect(status?.classList.contains(item.status)).toBe(true)
			expect(text(status)).toBe(
				item.status === "confirmed"
					? t("tracker.confirmed")
					: t("tracker.expectedFrom", { precedent: item.precedent ?? "" })
			)
			expect(status?.querySelector(".dot")?.getAttribute("aria-hidden")).toBe("true")
			expect(text(card?.querySelector(".desc")) ?? null).toBe(item.description ?? null)
		}
	})

	it("keeps sources in a closed dropdown that counts them", async () => {
		const doc = await page("nb", "vehicles")
		for (const item of live.filter((i) => i.category === "vehicles")) {
			const details = doc.getElementById(item.id)?.querySelector("details.card-sources")
			expect(details?.hasAttribute("open")).toBe(false)
			expect(text(details?.querySelector("summary"))).toBe(`Kilder (${item.sources.length})`)
			expect(details?.querySelector("summary svg")?.getAttribute("aria-hidden")).toBe("true")
			const links = [...(details?.querySelectorAll('a[target="_blank"]') ?? [])]
			expect(links.map((a) => a.getAttribute("href"))).toEqual(item.sources.map((s) => s.url))
		}
	})

	it("links each card to its checkbox in the tracker, after the sources", async () => {
		const doc = await page("en", "places")
		for (const item of live.filter((i) => i.category === "places")) {
			const card = doc.getElementById(item.id)
			const tick = card?.querySelector("a.tick")
			// ItemList.tsx gives each checkbox the id `item-${item.id}`.
			expect(tick?.getAttribute("href")).toBe(`/en/tracker/#item-${item.id}`)
			expect(text(tick)).toBe(`Tick it off in the tracker: ${item.name}`)
			const focusable = [...(card?.querySelectorAll("summary, a") ?? [])]
			expect(focusable.at(0)?.tagName).toBe("SUMMARY")
			expect(focusable.at(-1)).toBe(tick)
		}
	})

	it("marks English seed text on nb and leaves Norwegian text outside it", async () => {
		const doc = await page("nb", "wildlife")
		const card = doc.querySelector("article.dex-card")
		expect(card?.querySelector("h3")?.getAttribute("lang")).toBe("en")
		if (card?.querySelector(".desc")) {
			expect(card.querySelector(".desc")?.getAttribute("lang")).toBe("en")
		}
		expect(card?.querySelector("a.tick .visually-hidden [lang='en']")).not.toBeNull()
		for (const note of doc.querySelectorAll(".new-tab-note")) {
			expect(note.closest("[lang='en']")).toBeNull()
		}
		expect(text(card?.querySelector(".status"))).toMatch(/^(Bekreftet|Forventet)/)
		const en = await page("en", "wildlife")
		expect(en.querySelector(".dex-group [lang='en']")).toBeNull()
	})

	it("ends with the other categories and the Sources page", async () => {
		const doc = await page("en", "wildlife")
		const more = doc.querySelector('nav[aria-labelledby="dex-more"]')
		expect(text(more?.querySelector("h2"))).toBe("More in the Dex")
		expect([...(more?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual([
			...categoryIds(live)
				.filter((c) => c !== "wildlife")
				.map((c) => `/en/dex/${c}/`),
			"/en/tracker/sources/",
		])
	})

	it("refuses a category the seed does not have", async () => {
		await expect(page("en", "boats")).rejects.toThrow('"boats"')
	})
})
```

Run: `npx vitest run src/test/dex-page.test.ts`
Expected: FAIL, the page file does not exist.

- [ ] **Step 3: Create `src/pages/[locale]/dex/[category].astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import ChipNav from "../../../components/ChipNav.astro"
import Chevron from "../../../components/Chevron.astro"
import SourceList from "../../../components/SourceList.astro"
import { isLocale, type Locale, locales, seedLabel, translator } from "../../../i18n"
import { BookIcon } from "../../../islands/tracker/icons"
import Base from "../../../layouts/Base.astro"
import { dexCategory, dexCopy, dexStatus } from "../../../model/dex"
import { categoryIds, seedItems } from "../../../model/seed"

export function getStaticPaths() {
	const ids = categoryIds(seedItems.filter((item) => !item.retired))
	return locales.flatMap((locale) =>
		ids.map((category) => ({ params: { locale, category }, props: {} }))
	)
}

// One Dex page per tracker category (category pages spec §5). Zero JavaScript: the sources
// dropdown is a native <details>, and the BookIcon renders once, on the server.
const { locale, category } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const tr = translator(locale as Locale)
const { t } = tr
const live = seedItems.filter((item) => !item.retired)
const dex = dexCategory(live, String(category))
const copy = dexCopy(tr, dex)
const tracker = getRelativeLocaleUrl(locale as Locale, "tracker")
// Seed text is English; nb pages say so (spec §10).
const itemLang = locale === "en" ? undefined : "en"
const more = [
	...categoryIds(live)
		.filter((id) => id !== dex.id)
		.map((id) => ({
			href: getRelativeLocaleUrl(locale as Locale, `dex/${id}`),
			label: seedLabel(t, "category", id),
		})),
	{ href: getRelativeLocaleUrl(locale as Locale, "tracker/sources"), label: t("sources.title") },
]
---

<Base locale={locale} title={copy.title} description={copy.description} path={`dex/${dex.id}`} tab="tracker">
	<h1>{seedLabel(t, "category", dex.id)}</h1>
	<p class="lede">{copy.lede}</p>
	<ChipNav
		label={t("dex.groups")}
		chips={dex.groups.map((group) => ({
			href: `#group-${group.id}`,
			label: seedLabel(t, "group", group.id),
			count: group.items.length,
		}))}
	/>
	{
		dex.groups.map((group) => (
			<section class="dex-group" aria-labelledby={`group-${group.id}`}>
				<h2 id={`group-${group.id}`}>
					{seedLabel(t, "group", group.id)} <span class="count">{group.items.length}</span>
				</h2>
				<div class="dex-grid">
					{group.items.map((item) => (
						<article id={item.id} class="dex-card">
							<h3 lang={itemLang}>{item.name}</h3>
							<p class:list={["status", item.status]}>
								<span class="dot" aria-hidden="true" />
								{dexStatus(t, item)}
							</p>
							{item.description && (
								<p class="desc" lang={itemLang}>
									{item.description}
								</p>
							)}
							<div class="card-foot">
								<details class="card-sources">
									<summary>
										<span class="summary-row">
											<BookIcon />
											{t("dex.sources", { count: item.sources.length })}
											<Chevron down />
										</span>
									</summary>
									<SourceList sources={item.sources} locale={locale as Locale} lang={itemLang} />
								</details>
								{/* One line on purpose: Astro keeps the whitespace between lines, and the name
								    would read "tracker : Crane". */}
								<a class="tick go-link" href={`${tracker}#item-${item.id}`}>
									{t("dex.tick")}<span class="visually-hidden">: <span lang={itemLang}>{item.name}</span></span>
								</a>
							</div>
						</article>
					))}
				</div>
			</section>
		))
	}
	<ChipNav label={t("dex.more")} headingId="dex-more" chips={more} />
</Base>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: var(--space-1);
	}

	.lede {
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.dex-group {
		margin-bottom: var(--space-5);
	}

	/* The tracker refresh's group heading (S3): small bold capitals, the count in muted ink, a hairline above. */
	.dex-group h2 {
		margin: 0 0 12px;
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.dex-group h2 .count {
		color: var(--text-muted);
		font-weight: 600;
	}

	/* align-items: start, so opening one card's sources never stretches its neighbours. */
	.dex-grid {
		display: grid;
		gap: 12px;
		align-items: start;
	}

	@media (min-width: 768px) {
		.dex-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.dex-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.dex-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: 12px 12px 0 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		min-width: 0;
	}

	/* The card a link pointed at, as on the Sources page. */
	.dex-card:target {
		border-color: var(--link);
	}

	@media (prefers-reduced-motion: no-preference) {
		.dex-card:target {
			box-shadow: 0 0 16px color-mix(in srgb, var(--link) 20%, transparent);
		}
	}

	.dex-card h3 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.confirmed .dot {
		background: var(--tier-confirmed);
	}

	.expected .dot {
		background: var(--tier-expected);
	}

	/* Forced colours drop backgrounds; the border keeps the dot, and the word carries the status. */
	@media (forced-colors: active) {
		.dot {
			border: 1px solid CanvasText;
		}
	}

	.desc {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	/* The footer is the size container for the tick link's placement (spec §5.2). */
	.card-foot {
		position: relative;
		container-type: inline-size;
		font-size: 0.8125rem;
	}

	/* The summary keeps its native display (list-item) and disclosure role; the flex row sits on the
	   inner span. fit-content keeps its hit area to its own label. */
	.card-sources summary {
		width: fit-content;
		list-style: none;
		cursor: pointer;
		color: var(--text-muted);
		border-radius: var(--radius);
	}

	.card-sources summary::-webkit-details-marker {
		display: none;
	}

	.summary-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap);
	}

	.summary-row :global(svg) {
		flex: none;
		width: 18px;
		height: 18px;
	}

	.summary-row :global(.row-chevron) {
		width: 16px;
		height: 16px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.summary-row :global(.row-chevron) {
			transition: rotate 150ms;
		}
	}

	.card-sources[open] .summary-row :global(.row-chevron) {
		rotate: 180deg;
	}

	@media (hover: hover) {
		.card-sources summary:hover {
			color: var(--text);
		}
	}

	.card-sources :global(.source-list) {
		padding-bottom: var(--space-2);
	}

	.tick {
		color: var(--text-muted);
	}

	/* Wide enough for both labels: the tick link shares the summary row, open or closed. In em, so
	   at 200 % text the threshold grows with the labels. Value measured in Task 8. */
	@container (min-width: 26em) {
		.tick {
			position: absolute;
			inset-block-start: 0;
			inset-inline-end: var(--space-2);
		}
	}
</style>
```

Notes for the implementer:
- `inset-inline-end: var(--space-2)` cancels `.go-link`'s negative inline margin, so the link's text sits on the card's padding edge.
- If `class:list` is not wanted, `class={\`status ${item.status}\`}` is equivalent; the test only needs both classes.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/test/dex-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npx biome check --write src/test/render.ts src/test/dex-page.test.ts "src/pages/[locale]/dex/[category].astro"
sed -i 's/\r$//' src/test/render.ts src/test/dex-page.test.ts "src/pages/[locale]/dex/[category].astro"
git add src/test/render.ts src/test/dex-page.test.ts "src/pages/[locale]/dex/[category].astro"
git commit -m "Add a Dex page per tracker category with sources in a dropdown"
```

---

### Task 5: Dex index page

**Files:**
- Create: `src/pages/[locale]/dex/index.astro`
- Test: `src/test/dex-index-page.test.ts`

**Interfaces:**
- Consumes: `dexIndex` (Task 1); copy keys `dex.title`, `dex.indexLede`, `dex.indexDescription`, `seo.titles.dexIndex`, `dex.confirmedCount`, `dex.expectedCount`, `sources.title`.
- Produces: the route `/xx/dex/`; `ul.dex-index > li > a.dex-tile`.

- [ ] **Step 1: Write the failing test**

Create `src/test/dex-index-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { dexIndex } from "../model/dex"
import { seedItems } from "../model/seed"
import Page from "../pages/[locale]/dex/index.astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "nb") => renderDoc(Page, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Dex index page (category pages spec §6)", () => {
	it("is titled Dex under the Tracker tab", async () => {
		const doc = await page("en")
		expect(text(doc.querySelector("h1"))).toBe("Dex")
		expect(doc.title).toBe("GTA 6 Dex: every animal, car, place and collectible · Rookdex")
		expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current]'))).toBe("Tracker")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/en/dex/"
		)
	})

	it("has one whole-card link per category, named in plain words", async () => {
		const doc = await page("nb")
		const links = [...doc.querySelectorAll(".dex-index a")]
		const index = dexIndex(live)
		expect(links.map((a) => a.getAttribute("href"))).toEqual(index.map((c) => `/nb/dex/${c.id}/`))
		for (const [i, c] of index.entries()) {
			const a = links[i]
			expect(a.closest("li")?.querySelectorAll("a")).toHaveLength(1)
			expect(text(a.querySelector(".counts"))).toContain(`${c.confirmed} bekreftet`)
			expect(text(a.querySelector(".counts"))).toContain(`${c.expected} forventet`)
			for (const hidden of a.querySelectorAll(".dot, .sep")) {
				expect(hidden.getAttribute("aria-hidden")).toBe("true")
			}
			expect(a.querySelector(".groups")?.textContent?.split(" · ")).toHaveLength(c.groups.length)
		}
	})

	it("links to the Sources page under the grid", async () => {
		const doc = await page("en")
		const link = doc.querySelector("main a.sources-link")
		expect(link?.getAttribute("href")).toBe("/en/tracker/sources/")
		expect(text(link)).toBe("Sources")
	})
})
```

Run: `npx vitest run src/test/dex-index-page.test.ts`
Expected: FAIL, the page file does not exist.

- [ ] **Step 2: Create `src/pages/[locale]/dex/index.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { isLocale, type Locale, locales, seedLabel, translator } from "../../../i18n"
import Base from "../../../layouts/Base.astro"
import { dexIndex } from "../../../model/dex"
import { seedItems } from "../../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale }, props: {} }))
}

// The Dex's front page (category pages spec §6): one whole-card link per category.
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const { t } = translator(locale as Locale)
const categories = dexIndex(seedItems.filter((item) => !item.retired))
---

<Base locale={locale} title={t("seo.titles.dexIndex")} description={t("dex.indexDescription")} path="dex" tab="tracker">
	<h1>{t("dex.title")}</h1>
	<p class="lede">{t("dex.indexLede")}</p>
	<ul class="dex-index">
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
	<p>
		<a class="go-link sources-link" href={getRelativeLocaleUrl(locale as Locale, "tracker/sources")}>
			{t("sources.title")}
		</a>
	</p>
</Base>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: var(--space-1);
	}

	.lede {
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.dex-index {
		display: grid;
		gap: 12px;
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}

	@media (min-width: 768px) {
		.dex-index {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.dex-tile {
		display: grid;
		gap: var(--space-1);
		height: 100%;
		min-height: var(--tap);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		color: var(--text);
		text-decoration: none;
		transition: background-color 120ms, border-color 120ms;
	}

	@media (hover: hover) {
		.dex-tile:hover {
			background: var(--bg-hover);
			border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		}
	}

	@media (hover: none) {
		.dex-tile:active {
			background: var(--bg-hover);
		}
	}

	/* Same lift as the chips: the global ring alone is thin on a large card. */
	.dex-tile:focus-visible {
		background: var(--bg-hover);
	}

	.name {
		font-family: var(--font-display);
		font-size: 2rem;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.counts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.confirmed {
		background: var(--tier-confirmed);
	}

	.expected {
		background: var(--tier-expected);
	}

	@media (forced-colors: active) {
		.dot {
			border: 1px solid CanvasText;
		}
	}

	.groups {
		color: var(--text-muted);
		font-size: 0.8125rem;
	}
</style>
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/test/dex-index-page.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
npx biome check --write src/test/dex-index-page.test.ts "src/pages/[locale]/dex/index.astro"
sed -i 's/\r$//' src/test/dex-index-page.test.ts "src/pages/[locale]/dex/index.astro"
git add src/test/dex-index-page.test.ts "src/pages/[locale]/dex/index.astro"
git commit -m "Add the Dex index page with one card per category"
```

---

### Task 6: Sitemap and Lighthouse

**Files:**
- Modify: `src/model/seo.ts`, `src/pages/sitemap.xml.ts`, `lighthouserc.json`
- Test: `src/model/seo.test.ts`

**Interfaces:**
- Consumes: `categoryIds` from `src/model/seed.ts`.
- Produces: `validSlugs(slugs: string[], fix?: string): string[]`; `indexablePaths(guideSlugs: string[], categoryIds: string[]): string[]`.

- [ ] **Step 1: Update the tests (failing)**

In `src/model/seo.test.ts`, replace the `indexablePaths` describe block with:

```ts
describe("indexablePaths (SEO spec §4.1, category pages spec §9)", () => {
	it("lists home, the tracker pages, the Dex, news, privacy, then each guide once", () => {
		expect(
			indexablePaths(["before-you-start", "before-you-start"], ["wildlife", "places"])
		).toEqual([
			"",
			"tracker",
			"tracker/sources",
			"dex",
			"dex/places",
			"dex/wildlife",
			"news",
			"privacy",
			"guides/before-you-start",
		])
	})

	it("never lists settings", () => {
		expect(indexablePaths(["before-you-start"], ["wildlife"])).not.toContain("settings")
	})

	it("throws on a bad guide slug", () => {
		expect(() => indexablePaths(["Bad Slug"], ["wildlife"])).toThrow("src/content/guides/")
	})

	it("throws on a bad category slug, pointing at the seed", () => {
		expect(() => indexablePaths(["before-you-start"], ["Wild Life"])).toThrow(
			/"Wild Life".*src\/seed\//
		)
	})
})
```

Run: `npx vitest run src/model/seo.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

In `src/model/seo.ts`, replace `validSlugs` and `indexablePaths`:

```ts
/** Slugs, deduped and sorted. Throws on a slug that isn't safe to put in a URL unescaped; `fix`
 *  tells the reader where the slug comes from. */
export function validSlugs(
	slugs: string[],
	fix = "rename the file in src/content/guides/"
): string[] {
	for (const slug of slugs) {
		if (!SLUG.test(slug)) throw new Error(`Slug "${slug}" must match ${SLUG}; ${fix}`)
	}
	return [...new Set(slugs)].sort()
}

/** Locale-less paths the sitemap lists and IndexNow pings, in the same form pages pass to Base.
 *  New indexable pages are added here. */
export function indexablePaths(guideSlugs: string[], categoryIds: string[]): string[] {
	return [
		"",
		"tracker",
		"tracker/sources",
		"dex",
		...validSlugs(categoryIds, "rename the seed file in src/seed/").map((id) => `dex/${id}`),
		"news",
		"privacy",
		...validSlugs(guideSlugs).map((slug) => `guides/${slug}`),
	]
}
```

In `src/pages/sitemap.xml.ts`:

```ts
import { getCollection } from "astro:content"
import { getAbsoluteLocaleUrl } from "astro:i18n"
import { locales } from "../i18n"
import { guideSlugs } from "../model/guides"
import { categoryIds, seedItems } from "../model/seed"
import { indexablePaths, sitemapXml } from "../model/seo"

// Prerendered to dist/sitemap.xml. The host serves it as XML from the extension; a static
// endpoint's response headers are dropped at build (SEO spec §4.2).
export async function GET() {
	const live = seedItems.filter((item) => !item.retired)
	const paths = indexablePaths(guideSlugs(await getCollection("guides")), categoryIds(live))
	const urls = locales.flatMap((locale) => paths.map((path) => getAbsoluteLocaleUrl(locale, path)))
	return new Response(sitemapXml(urls))
}
```

In `lighthouserc.json`, add `"http://localhost/en/dex/vehicles/"` after the tracker URL.

Check for other callers: `grep -rn "indexablePaths\|validSlugs" src integrations --include=*.ts --include=*.mjs --include=*.astro`. Update any other call the same way (at plan time the only callers are `sitemap.xml.ts` and the tests).

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/model/seo.test.ts src/test integrations`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
npx biome check --write src/model/seo.ts src/model/seo.test.ts src/pages/sitemap.xml.ts lighthouserc.json
sed -i 's/\r$//' src/model/seo.ts src/model/seo.test.ts src/pages/sitemap.xml.ts lighthouserc.json
git add src/model/seo.ts src/model/seo.test.ts src/pages/sitemap.xml.ts lighthouserc.json
git commit -m "List the Dex pages in the sitemap and audit one in Lighthouse CI"
```

---

### Task 7: Links into the Dex from the tracker and the hub

**Files:**
- Modify: `src/pages/[locale]/tracker/index.astro`
- Modify: `src/islands/hub/CategoryBars.tsx`, `src/islands/hub/Hub.tsx`, `src/islands/hub/Dashboard.tsx`, `src/islands/hub/DashboardSkeleton.tsx`, `src/pages/[locale]/index.astro`, `src/styles/global.css`
- Test: `src/test/tracker-page.test.ts`, `src/islands/hub/CategoryBars.test.tsx`, `src/islands/hub/Hub.test.tsx`, `src/islands/hub/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `ChipNav` (Task 3); `categoryIds`.
- Produces: `CategoryBars` prop `dexHref: string` (required); `Hub` prop `dexHref: string`; `Dashboard` prop `dexHref: string`; class `deco-link` on the link (and on the skeleton's placeholder span).

- [ ] **Step 1: Write the failing tests**

`src/test/tracker-page.test.ts`, add inside the `describe`:

```ts
	it("ends with a Browse by category row linking to each Dex page", async () => {
		const doc = await renderPage(Tracker)
		const nav = doc.querySelector('nav[aria-labelledby="dex-browse"]')
		expect(nav?.querySelector("h2")?.textContent).toBe("Browse by category")
		const categories = categoryIds(seedItems.filter((item) => !item.retired))
		expect([...(nav?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual(
			categories.map((c) => `/en/dex/${c}/`)
		)
		// Server-rendered after the island, so it sits under the fallback's reserved height.
		const island = doc.querySelector("astro-island")
		expect(island?.compareDocumentPosition(nav as Node)).toBe(4) // DOCUMENT_POSITION_FOLLOWING
	})
```

Add `import { categoryIds, seedItems } from "../model/seed"` to the file's imports.

`src/islands/hub/CategoryBars.test.tsx`:
1. Add `dexHref="/en/dex/"` to both `<CategoryBars ... />` renders in the file.
2. In "links each row to the tracker filtered to its category", change `screen.getAllByRole("link")` to `within(screen.getByRole("list")).getAllByRole("link")`. In the next test, change `screen.getAllByRole("link")[1]` the same way. Apply the same scoping wherever the file indexes row links.
3. Add:

```ts
	it("links the heading row to the Dex, in both phases", () => {
		for (const phase of ["before", "after"] as const) {
			const { unmount } = bars(phase)
			const link = screen.getByRole("link", { name: "Every item in the Dex" })
			expect(link).toHaveAttribute("href", "/en/dex/")
			expect(link.closest(".deco")).not.toBeNull()
			unmount()
		}
	})
```

`src/islands/hub/Hub.test.tsx` and `src/islands/hub/Dashboard.test.tsx`: add `dexHref: "/en/dex/",` next to `trackerHref: "/en/tracker/",` in each file's props object, and add one test in each that renders the component the way the file's existing CategoryBars-related test does and asserts:

```ts
		expect(screen.getByRole("link", { name: "Every item in the Dex" })).toHaveAttribute(
			"href",
			"/en/dex/"
		)
```

(Hub: in the before-launch phase. Dashboard: in its default after-launch render.) If either file asserts an exact count of links, adjust that count by one and say so in the commit's test diff.

Run: `npx vitest run src/test/tracker-page.test.ts src/islands/hub`
Expected: FAIL (no browse row, no `dexHref`, type errors surface in `astro check` later).

- [ ] **Step 2: Tracker page browse row**

In `src/pages/[locale]/tracker/index.astro`, extend the frontmatter:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import ChipNav from "../../../components/ChipNav.astro"
import { isLocale, type Locale, locales, seedLabel, translator } from "../../../i18n"
import { Tracker } from "../../../islands/Tracker"
import Base from "../../../layouts/Base.astro"
import { categoryIds, seedItems } from "../../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale }, props: {} }))
}

const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const { t } = translator(locale as Locale)
const browse = categoryIds(seedItems.filter((item) => !item.retired)).map((id) => ({
	href: getRelativeLocaleUrl(locale as Locale, `dex/${id}`),
	label: seedLabel(t, "category", id),
}))
---
```

After `</Tracker>` inside `<Base>`:

```astro
	{/* Server-rendered under the fallback's reserved height, so it adds no layout shift (category
	    pages spec §7). The tracker refresh also edits this file; whichever lands second rebases. */}
	<div class="dex-browse">
		<ChipNav label={t("dex.browse")} headingId="dex-browse" chips={browse} />
	</div>
```

In the page's `<style>`, add:

```css
	.dex-browse {
		margin-top: var(--space-5);
	}
```

and inside the existing `@media (min-width: 1024px)` block, extend the selector so the row shares the title's cap: `h1, .dex-browse { max-width: var(--tracker-max-w); margin-inline: auto; }`.

- [ ] **Step 3: CategoryBars, Hub, Dashboard, skeleton, hub page**

`src/islands/hub/CategoryBars.tsx`: add to `Props`:

```ts
	/** The Dex index, linked beside the heading (category pages spec §7). */
	dexHref: string
```

destructure `dexHref`, and change the deco block to:

```tsx
			<div className="deco">
				<h2 id="cat-bars-heading">{t("hub.categories")}</h2>
				<a className="go-link deco-link" href={dexHref}>
					{t("dex.everyItem")}
				</a>
			</div>
```

`src/islands/hub/Hub.tsx`: add `dexHref: string` to the props interface, destructure it, pass `dexHref={dexHref}` to `<CategoryBars ... />` (line ~235) and to `<Dashboard ... />` (the render near line ~213 that already passes `trackerHref`).

`src/islands/hub/Dashboard.tsx`: add `dexHref: string` to its props interface, destructure it, pass `dexHref={dexHref}` to `<CategoryBars ... />`.

`src/islands/hub/DashboardSkeleton.tsx`: in the `cat-bars` skeleton's deco, after the `<h2>`, add a non-interactive placeholder with the same text so the skeleton's row matches the real one:

```tsx
					<span className="go-link deco-link">{t("dex.everyItem")}</span>
```

`src/pages/[locale]/index.astro`: add `dexHref={getRelativeLocaleUrl(locale, "dex")}` to the `<Hub ... />` props, after `trackerHref`.

`src/styles/global.css`, after the `.cat-bars .deco h2 { letter-spacing: 0.12em; }` rule:

```css
/* The Dex link ends the heading row, after the right-hand rule (order puts it past ::after). */
.cat-bars .deco-link {
	order: 1;
	flex: none;
	color: var(--text-muted);
	font-size: 0.8125rem;
}
```

- [ ] **Step 4: Run tests and the type check**

Run: `npx vitest run src/test/tracker-page.test.ts src/islands/hub`
Expected: PASS.

Run: `npx astro check 2>&1 | tail -3`
Expected: 0 errors (a missed `dexHref` shows up here as a missing required prop).

- [ ] **Step 5: Commit**

```bash
FILES="src/pages/[locale]/tracker/index.astro src/islands/hub/CategoryBars.tsx src/islands/hub/Hub.tsx src/islands/hub/Dashboard.tsx src/islands/hub/DashboardSkeleton.tsx src/pages/[locale]/index.astro src/styles/global.css src/test/tracker-page.test.ts src/islands/hub/CategoryBars.test.tsx src/islands/hub/Hub.test.tsx src/islands/hub/Dashboard.test.tsx"
npx biome check --write $FILES
sed -i 's/\r$//' $FILES
git add $FILES
git commit -m "Link the Dex from the tracker page and the hub's Categories heading"
```

(In a worktree session that refuses `$VAR` paths, write the file list out in each command.)

---

### Task 8: Build, measure and finish

**Files:**
- Modify: `src/pages/[locale]/dex/[category].astro` (the measured threshold only)

- [ ] **Step 1: Size baseline before the Dex**

Already recorded under Global Constraints ("Size budget"), measured at `3adc38f` before Task 1. Nothing to run.

- [ ] **Step 2: Full suite, lint, types, build**

```bash
npx vitest run
npx biome ci .
npx astro check
npm run build
```

Expected: all green; the build log shows seo-check passing with the ten new pages in the sitemap. Then record `wc -c dist/en/dex/vehicles/index.html` and the precache total (the number of URLs and bytes the precache integration prints, or `node -e` over `dist/sw.js`'s list). Compare with the size budget under Global Constraints; a jump beyond it means something else got pulled in (for example a client bundle for `BookIcon`, which must not exist: `grep -l "BookIcon" dist/_astro/*.js` should list only the tracker island's chunk).

- [ ] **Step 3: Measure in the browser (one batched round)**

Serve `dist/` (the repo's `preview-main` launch config pattern, or `npm run preview`) and open `/en/dex/vehicles/` and `/nb/dex/vehicles/`. At 320, 768 and 1280 px, and at 1280 px with 200 % text (`document.documentElement.style.fontSize = "200%"`), read with `javascript_tool`:

- each card footer's height, closed and open;
- the summary's and the tick link's bounding boxes: same `top` and same `bottom` when they share a row, no horizontal overlap ever;
- the narrowest `.card-foot` width at which both labels fit with a 16 px gap, in both locales: `summary.scrollWidth + 16 + tick.scrollWidth` in px, divided by the footer's computed font size;
- the grid's column count at each width.

Set the `@container (min-width: …)` value in `[category].astro` to the larger locale's measured width in `em`, rounded up to the next whole `em`, and update its comment to say it was measured (with the date and both numbers).

Then the hub: `/en/` and `/nb/` at 320 and 1280 px, before launch and in the launch-night layout (the repo's existing way to force the phase in the preview), measuring the `.cat-bars .deco` row: heading and link on one line, both 44 px tall where tappable, the decorative rules still visible.

Last, the tracker page at 320 px: the browse row's chips are 44 px and wrap cleanly.

- [ ] **Step 4: Fix and confirm (at most one more round)**

Fix anything the measurements show, re-measure once. Anything still off after that is listed for Malin rather than polished further.

- [ ] **Step 5: Commit the threshold**

```bash
sed -i 's/\r$//' "src/pages/[locale]/dex/[category].astro"
git add "src/pages/[locale]/dex/[category].astro"
git commit -m "Set the tick link threshold to the measured label widths"
```

- [ ] **Step 6: Final review and PR**

Run a whole-branch review against the spec (fresh reviewer). Then push and open the PR with a body that lists: what shipped, the measured numbers from Step 3, the size before and after from Steps 1 and 2, and what is still hers to check (NVDA in Firefox: the summary announces collapsed and expanded; nb item text switches voice).

## Considered and rejected (plan stress test)

- **A service worker update mid-session.** A visitor whose worker predates this release has no Dex pages cached, so `/dex/` offline shows the offline fallback until the new worker installs. Every new page has had this gap since the PWA shipped; the next visit fixes it.
- **Generic "Tick it off" text for an item already ticked.** The page is static and cannot know the tracker's state. The link still lands on the right checkbox.
- **Memoised rejected container in `renderDoc`.** If `AstroContainer.create()` ever rejects, every later call in that test file rejects too. That is the right outcome for a broken test environment.
- **" · " read aloud in the index cards' group line.** NVDA may say "dot" at high punctuation levels. `CategoryBars` uses the same separator; one fix for both belongs to its own change.
- **Smaller HTML through fewer inline SVGs.** Each card repeats the book and chevron SVGs. Gzipped they cost little (the 394 KB Sources page ships as 18.8 KB), and a sprite would add a request and a pattern this repo does not use.

> Stress-tested 2026-11-03 (skill b9705f6), 5 applied, 1 adapted, 0 decided by me.
