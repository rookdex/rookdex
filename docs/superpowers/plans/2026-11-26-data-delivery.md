# Data delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The seed reaches the browser as data instead of code: a small index inlined in the tracker and hub pages, one hashed chunk of card text per category, and a service worker that copies unchanged hashed files instead of downloading everything on every deploy.

**Architecture:** At build, `seed.ts` (unchanged as the validator) also produces `seedIndex` and `seedChunks` through a pure, build-only `seedDelivery.ts`. A static endpoint writes each chunk to `/data/<category>.<hash>.json`, and a `SeedIndex.astro` data block inlines the index. The islands stop importing `seed.ts`. They read the index from the page (`chunks.ts`), work on light `TrackItem`s (`trackItems.ts`), and the tracker model loads the chunks the current view needs and merges their text into its items.

**Tech Stack:** Astro 7 (static endpoints), React 19 islands, TypeScript 6, Vitest 5 with jsdom, the plain-JS service worker in `src/sw/sw.js`.

**Spec:** `docs/superpowers/specs/2026-11-25-category-model-design.md` (§5, §10). PR split and PR 1: `docs/superpowers/plans/2026-11-25-seed-pipeline.md`.

## Decisions the spec left open

The spec says the index holds "categories, groups, sets, totals, the checklist and the countable ids per group and set", and a category's chunk loads "when the category opens". The code reads more than that without a chunk:

- **No category pressed shows every item** (`searchView`: `all = selected.length === 0`). All is the default view.
- **Search counts matches outside the filters** (`elsewhere`), so it reads every item's name, aliases and search words.
- **The hub builds the same tracker** (`buildTracker`) and shows item names in recent finds and What's next, without ever showing card text.

So I split the item by what reads it:

1. **The index carries every item's id, name, status, set, aliases and the retired and uncounted flags,** nested under its group. Counts, tiles, chips, search, the hub and the stats rail all work from the index alone. The hub never loads a chunk.
2. **A chunk carries only the card text** (`description`, `precedent`) of one category's shown items. That is 63 % of the item bytes once sources are gone (measured 26.11: index items 17.7 KB raw and 3.6 KB gzipped, card text 30.6 KB raw and 7.9 KB gzipped). Sources never reach the browser: no island reads them (the book links to the Sources page).
3. **The list waits for the chunks it shows,** because a description that arrives later would change the card's height. Under All that is every chunk. The results area keeps a screen of reserved height while it waits, so the footer never paints in view (the same rule as `.tracker-fallback`).

Size at scale: about 2,600 items make the index about 210 KB raw and 43 KB gzipped (my estimate, 12 times today). That is above the spec's 15 KB guess, so the index ships as its own hashed file from this PR on (plan review ruling 3), not inlined in two pages' HTML.

## Delivery change from the spec

- **Chunks come from a static endpoint,** `src/pages/data/[chunk].json.ts`, not an `integrations/seed.mjs` integration. Astro then builds them, serves them in dev and reruns on seed changes, and the endpoint imports the TypeScript seed directly. PR 1 already loads the seed through `import.meta.glob` in `seed.ts` instead of the integration.
- **The checklist joins the index in the 100 % view PR,** which builds `checklist.json`.
- **Zod leaves the tracker and hub bundles too** (plan review ruling 6). The browser's only Zod parse is an import file (`parseImport` in `transfer.ts`). IndexedDB records and the saved view are read without Zod. Zod reached the tracker only because `tracker.ts` imports `transfer.ts` and the `TEXT` limits from `schema.ts`. Task 6b loads `transfer.ts` on demand and moves the plain limits to a file without Zod, which closes the senior review's "Zod ships to client" finding for every page but the moment someone imports a file.
- **The failure message is visible as well as spoken.** The `useLiveStatus` region is visually hidden, so it can't hold a Reload button. The notice shows above the list and is spoken once through that region, the way the backup nudge works.

## Global Constraints

- **No user data is affected.** No IndexedDB version bump, no export version change, every shipped id unchanged.
- **No new dependencies.** The import guard uses the `typescript` package that is already a devDependency (6.0.3).
- **The browser never parses the seed with Zod** and never imports `src/model/seed.ts`, `seedBuild.ts`, `seedDelivery.ts`, `tiers.ts` or `allowlist.json` (Task 5's guard test).
- **Inlined JSON escapes `<` as `\u003c`** (`jsonLd()` in `src/model/seo.ts`).
- **Data URLs are content-addressed:** `/data/<category>.<10 hex>.json` and `/data/seed-index.<10 hex>.json`, the hash over the exact bytes served. The only inlined JSON left is the index file's URL.
- **Copy:** US spelling, no em dashes, times with a colon, dates with periods. In Norwegian the person is «bruker». New strings exist in `src/locales/en.json` and `src/locales/nb.json` (flat keys).
- **Work in `../rookdex-lf`** on branch `feat/data-delivery` (cut from `origin/main` at `6bd4e92`). `npm run lint` is `biome ci .` and must run there.
- **Commits:** stage named paths only, never `git commit -a`. No `Co-Authored-By` or AI lines. Messages are plain sentences like the log ("Measure a card's text only when it nears the screen").
- **Tests:** `src/test/setup.ts` pins `TZ=Europe/Oslo`. Run one file with `npx vitest run <path>`. Types: `npm run check`. Write test files with Write or Edit, never a Bash heredoc (heredocs halve backslashes).
- **Merge:** `ward / gate` and `shipped-ids` are required, but she merges by hand only when every check is done, Lighthouse included.

## Review Focus

1. **First visit offline, All view:** every chunk fails. Expected: one message that names every category, not one per category and not a blank list. Test in Task 5.
2. **An old tab after a deploy** presses a category whose chunk URL the server no longer has. Expected: "Rookdex was updated. Reload to see the new list." with a working Reload button. Test in Task 5 (404 body).
3. **A Sources back link (`#item-<id>`) while the chunk is still on its way.** Expected: the checkbox still gets focus once the list renders, not never. Test in Task 5 (deferred fetch).
4. **The hub never fetches a chunk.** Expected: no request to `/data/` from the dashboard. Test in Task 5.
5. **The index file fails to load** (offline, a 404 after a deploy, or a stall past 10 s). Expected: the tracker and the hub show the notice with its button, never a blank island or a thrown error. Test in Task 6 (ruling 3). The old `</script>` case is gone with the inlined index.
6. **On All, chunks land out of list order.** Expected: no card paints above a card already on screen. Test in Task 6 (ruling 9).
7. **The tracker and hub pages load no Zod.** Expected: the guard test fails on any static import of `schema.ts`, `transfer.ts` or Zod from browser code, and the built pages preload no chunk holding Zod. Task 6b.

## Stress-test amendments (26.11)

These override the task text below wherever they differ. Each names the task that owns it.

1. **Task 2: `seed.ts` stays free of Node imports.** `seedChunks` and `seedIndex` live in a new build-only `src/model/seedDelivered.ts`, which imports `seed.ts` and `seedDelivery.ts`. The endpoint, `SeedIndex.astro`, the page tests and `seedDelivery.test.ts` import them from there. Vite stubs `node:crypto` in browser builds, so a `seed.ts` that imports it would crash the tracker and hub at runtime in every commit from Task 2 to Task 5, because the islands still import `seed.ts` until Task 6. Add `src/model/seedDelivered.ts` to the guard's `FORBIDDEN` list (Task 6). Proof: the Task 3 build log has no "externalized for browser compatibility" line.
2. **Task 2: the index has a size tripwire.** Add to `seedDelivery.test.ts`: `expect(gzipSync(jsonLd(seedIndex)).length, "index over 30 KB gzipped: move it to a hashed file (data delivery plan)").toBeLessThan(30_000)` (`gzipSync` from `node:zlib`).
3. **Task 3: drop the `trailingSlash` fallback in Step 6.** An endpoint with an extension already builds to a file (`src/pages/sitemap.xml.ts` builds `dist/sitemap.xml`). Keep the `ls dist/data` check.
4. **Task 4: a stalled fetch times out.** `createChunkLoader` takes a third parameter, `timeoutMs = 10_000`. Each fetch gets an `AbortController` aborted by `setTimeout`, so `fetchFn` becomes `(url: string, init: { signal: AbortSignal }) => Promise<Response>` and `buildTracker` passes `(url, init) => fetch(url, init)`. An abort reads as `"offline"`. Test: a never-resolving fetch with `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync(10_000)` resolves to `{ ok: false, reason: "offline" }`.
5. **Task 5: chunks load per category and never blank the list.** Adapted from "hold the whole list until every chunk settles", which would unmount loaded cards on every tile press:
   - `ListChunks` gains `pending: string[]` (needed categories still `"loading"` or not started). `settled` stays: `pending.length === 0`.
   - Once the needed chunks have settled the first time, `loadChunks` starts every remaining category in the background (7.9 KB gzipped in total today, and precached anyway), so later tile presses are instant.
   - Failed chunks are tried again in `refresh()` and on the `window` `online` event. `createTracker` gets `deps.onOnline?: (retry: () => void) => () => void`, and `buildTracker` wires it to `window.addEventListener("online", …)`.
   - Tests: after the first settle, `loadChunk` has been called for every category. `onOnline`'s retry calls `loadChunk` again for a failed category. Replace the trivially true `selected` assertion in the "slow chunk" test with a check that the merged text of both categories is in `items`.
6. **Task 6: render by category, and derive the list's state from the shown cards.**
   - `shownCards` drops items in pending categories as well as failed ones. The `.pending` reserve and `aria-busy={!chunkView.settled}` go on `.tracker-results`. `.tracker` keeps `aria-busy={state.status === "loading"}`.
   - The `{chunkView.settled && …}` wrapper goes. The list renders as soon as one needed category is in, so `ItemList` stays mounted across tile presses. The arrival and scroll-restore effects still wait for `listReady` (store ready and `settled`).
   - `empty` comes from `emptyState({ ...view, visible: shownCards }, search.query)`, and the Last found jump uses `jumpable(recent[0], shownCards, listReady)`. `ItemList` is skipped when `shownCards` is empty and no pressed category has chips, so a failed All view shows only the notice, never "Nothing here yet."
   - Tests: on `?show=animals`, pressing Vehicles with a deferred fetch keeps the same "American alligator" checkbox node in the document. A reverse-order render test: `?show=vehicles`, both fetches deferred, press Animals, release Animals and then Vehicles, then the alligator and pelican are shown and Bike is not. A last find in a failed category gives no jump button. Add `expect(screen.queryByText("Nothing here yet.")).toBeNull()` to the Review Focus 1 test.
7. **Task 6: notice tests query one element.** Find the notice with `within(container.querySelector(".chunk-notice"))`. Assert the live region with `await waitFor(() => expect(screen.getByRole("status", { name: "" })…))`, or by selecting `p[aria-live="polite"]` and `toHaveTextContent(notice)`. For the hub test, use the exact ready query from `Dashboard.test.tsx` instead of the regex.
8. **Task 6: the guard also walks `src/scripts/`** (non-test `.ts` files): `dex-search.ts`, `settings.ts` and `delete-all.ts` run in the browser too.
9. **Tasks 1 and 6: stage every touched file.** Add `src/islands/tracker/LastFound.tsx` (its `visible: SeedItem[]` becomes `TrackItem[]`) to Task 1's file list and `git add` line, and add `src/islands/Tracker.tick.test.tsx` to Task 6's. End every task with `git status --short`, which must print nothing.
10. **Task 6: nb copy uses «listen»,** as the rest of `nb.json` does: «Rookdex er oppdatert. Last inn siden på nytt for å se den nye listen.»

## Plan review rulings (27.11)

My review of the decisions above. These override both the task text and the stress-test amendments wherever they differ. Decisions 1, 2, 4, 5, 7 and 8 stand as written.

**Before Task 0:** rebase `feat/data-delivery` on `origin/main` (`bb92d08`, the News PR #157, content only), so Task 0 measures what is live.

### Ruling 3: the index ships as a hashed file, not inlined

- **Task 2:** `seedDelivery.ts` also exports `buildIndexFile(index: SeedIndex): SeedFile`, where `SeedFile` is `SeedChunk` without `category` (`{ file, url, body }`). The file is `seed-index.<chunkHash(body)>`, the body is `JSON.stringify(index)`, the URL `/data/seed-index.<hash>.json`. `seedDelivered.ts` exports `seedIndexFile` beside `seedChunks` and `seedIndex`. Tests: the index file's URL matches `/^\/data\/seed-index\.[0-9a-f]{10}\.json$/`, its body parses back to `seedIndex`, and no chunk's `file` starts with `seed-index.` (a category may never be named `seed-index`). Drop amendment 2 (the 30 KB tripwire) and the `</script>` test (Review Focus 5 changed). Task 8 still measures the index size.
- **Task 3:** the endpoint serves the index file too: `getStaticPaths` maps `[...seedChunks, seedIndexFile]`. `SeedIndex.astro` now renders two lines and nothing else:
  ```astro
  <link rel="preload" href={seedIndexFile.url} as="fetch" crossorigin="anonymous" />
  <script type="application/json" id="seed-index" is:inline set:html={jsonLd({ url: seedIndexFile.url })}></script>
  ```
  The preload starts the download while the HTML parses, in parallel with the island's JS (`preload` is allowed in the body). `crossorigin="anonymous"` matches a same-origin `fetch()`, so the browser reuses the preloaded response. The page tests check that both pages carry the link and a data block whose `url` equals `seedIndexFile.url`, and that the URL in the link and the block are the same. `ls dist/data` now shows six files.
- **Task 4:** `chunks.ts` gets one shared fetch path for the index and the chunks: the timeout from amendment 4, `!response.ok` or a body that fails its shape check reads as `"stale"`, and a rejected or aborted fetch reads as `"offline"`. Replace `readSeedIndex` with `readSeedIndexUrl(doc?: Document): string` (throws "Seed index missing" as before) and add `loadSeedIndex(url, fetchFn, timeoutMs = 10_000): Promise<{ ok: true; index: SeedIndex } | { ok: false; reason: ChunkFailure }>`. Its shape check: `categories` and `groups` are arrays. A failed load is not cached. Tests mirror the chunk tests: success, offline, 404, HTML body, wrong shape, timeout.
- **Task 6:** both islands wait for the index through one small component, `src/islands/IndexGate.tsx`: `IndexGate({ fetchFn?, children: (index: SeedIndex) => ReactNode, reserve: string })`. It reads the URL, calls `loadSeedIndex`, and renders, in order: the `reserve` class while loading (the tracker passes the class that holds the page's `.tracker-fallback` height, so nothing shifts; the hub passes its own existing loading class, or none if the hub has no reserve today), the notice on failure, and `children(index)` once loaded. The notice reuses `.chunk-notice` and the live region pattern. Copy:
  - `tracker.index.offline`: en "The list could not load. Check your connection and try again." nb «Listen kunne ikke lastes. Sjekk tilkoblingen og prøv igjen.» Button `tracker.index.retry`: en "Try again", nb «Prøv igjen». The button and the `online` event both retry.
  - Stale: the existing `tracker.chunk.stale` and `tracker.chunk.reload` keys, so a reload is offered with the same words.
  
  `Tracker.tsx` and `Dashboard.tsx` keep their bodies and take `index: SeedIndex` as a prop instead of calling `readSeedIndex()`. Their default exports wrap them in `IndexGate`, so the pages and the tests render the same component. `buildTracker` requires `index` (no fallback read). `installSeed` stubs `fetch` for the index URL as well as the chunks, and writes the URL block. `renderReady` already waits for the ready tracker, which now comes after the index. New tests (`Tracker.chunks.test.tsx` and `Dashboard.test.tsx`): the index fetch rejects, then the notice and "Try again" show, no list and no throw. Pressing "Try again" with a working fetch renders the tracker. A 404 on the index shows the stale notice with Reload. The hub test that counts `/data/` requests now expects exactly one, for the index, and none for a chunk (Review Focus 4 changes from "no request" to "only the index").
- **Task 7:** the worker's copy rule already matches `/data/<name>.<10 hex>.json`, so the index file copies across deploys like a chunk. Add a test case with `data/seed-index.0123456789.json`.
- **Task 8:** report the index file's raw and gzipped size from `dist/data/seed-index.*.json` instead of the inlined block (replace the `node -e` line that greps `id="seed-index"`). Lighthouse must still meet main's median, because the index now is a request on the path to the list.

### Ruling 6: Zod leaves the tracker and hub (new Task 6b, after Task 6)

**Files:** create `src/model/limits.ts`; modify `src/model/schema.ts`, `src/model/transfer.ts`, `src/model/tracker.ts`, `src/test/island-imports.test.ts`, and any browser file the guard flags.

1. Move `TEXT`, `MAX_RECORDS`, `MAX_BACKUP_PROFILES`, `ID_PATTERN` and `SLUG` from `schema.ts` into `limits.ts`, a file with no imports. `schema.ts` imports them and re-exports them, so build code and tests keep their imports. Move `MAX_IMPORT_BYTES` from `transfer.ts` to `limits.ts` the same way (`transfer.ts` re-exports it).
2. `tracker.ts` imports `TEXT` and `MAX_IMPORT_BYTES` from `./limits`, keeps `import type` for transfer's types, and loads the rest on demand: `const transfer = () => import("./transfer")`, awaited inside the export, backup and import actions, which are already async. The size check (`file.size > MAX_IMPORT_BYTES`) stays synchronous, before the import.
3. The guard (`island-imports.test.ts`, Task 6) adds `src/model/schema.ts`, `src/model/transfer.ts`, `zod` and `astro/zod` to `FORBIDDEN` for static value imports. It already skips `import type`; it must also skip dynamic `import()`, which is how browser code may still reach `transfer.ts`. The test fails before step 2, naming `src/model/schema.ts via src/model/tracker.ts`.
4. Tests: the existing import, export and backup tests in `Tracker.import.test.tsx` and `src/scripts/settings` pass unchanged. Add one: a file over `MAX_IMPORT_BYTES` fails with `"too-large"` before `transfer.ts` is imported (spy on the dynamic import through a `deps` hook, or assert the result without reading the file).
5. Build check: `npm run build`, then for `dist/en/tracker/index.html` and `dist/en/index.html` list every `_astro/*.js` the page loads and modulepreloads, and grep those files for a Zod marker (`"jitless"` or `ZodError`). Expected: no match. The chunk that holds Zod still exists and loads only when someone imports a file.
6. Commit: "Load the import code on demand so Zod leaves the tracker and hub".

### Ruling 9: chunks show in list order on All (Task 6)

Amendment 6's `shownCards` changes as follows. A needed category shows once every needed category before it in list order (`categoryIds(items)`) has loaded or failed. A category that is already on screen stays there, even when a newly pressed category before it is still loading. Track the shown set in the island (a `useRef<Set<string>>` updated during render, reset only when the page reloads), so a tile press never hides cards and `ItemList` stays mounted as amendment 6 requires. Tests in `Tracker.chunks.test.tsx`:

Below, "first" and "second" are the fixtures' first two categories in list order; read them from `categoryIds` in the test instead of naming them.

- On All with both fetches deferred, release the second category first: none of its cards render. Release the first: both render, the first category's cards before the second's in document order.
- Amendment 6's reverse-order test still passes as written.
- On `?show=<second>` with it loaded, press the first category with its fetch deferred: a card of the second category stays the same node, and the first category's cards render before it once released.

---

### Task 0: Baseline numbers from main

**Files:** none committed. Output in `../rookdex-lf/.superpowers/lh/`.

- [ ] **Step 1: Install and build main as it is**

Run in `../rookdex-lf`:

```bash
npm install --no-audit --no-fund
npm run build
rm -rf .superpowers/lh/dist-main && cp -r dist .superpowers/lh/dist-main
ls -S dist/_astro/*.js | head -6 | xargs wc -c > .superpowers/lh/bundles-main.txt
cat .superpowers/lh/bundles-main.txt
```

Expected: the build passes. The list shows the largest client chunks (on 26.11 `stats.*.js` was 141,833 bytes and `schema.*.js` 94,428).

- [ ] **Step 2: Lighthouse baseline on the tracker**

```bash
.superpowers/lh/measure.sh main "$(pwd)/.superpowers/lh/dist-main" 5
```

Expected: five runs of `/en/tracker/` with performance scores around 0.89 to 0.91. Write the median score, LCP, CLS and total blocking time into `.superpowers/lh/baseline.md`. Task 7 compares against it.

---

### Task 1: Browser-safe item helpers

**Files:**
- Create: `src/model/trackItems.ts`
- Create: `src/model/trackItems.test.ts`
- Modify: `src/model/seed.ts` (the `categoryIds` and `groupItems` definitions become a re-export)
- Modify: `src/model/stats.ts`, `src/model/dashboard.ts`, `src/model/tracker.ts`, `src/model/search.ts`, `src/islands/tracker/ItemList.tsx`, `src/islands/hub/WhatsNext.tsx` (imports and `SeedItem` → `TrackItem` on the island path)

**Interfaces:**
- Consumes: `SeedItem` (`src/model/schema.ts`), `SeedCategory` and `SeedGroup` (`src/model/seedBuild.ts`), type imports only.
- Produces: `TrackItem`, `ItemText`, `IndexItem`, `IndexGroup`, `IndexCategory`, `SeedIndex`, `ChunkBody`; `categoryIds(items)`, `groupItems(items)`, `indexItems(index)`, `withText(items, text)`.

- [ ] **Step 1: Write the failing test**

`src/model/trackItems.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
	categoryIds,
	groupItems,
	indexItems,
	type SeedIndex,
	type TrackItem,
	withText,
} from "./trackItems"

const item = (id: string, category: string, group: string): TrackItem => ({
	id,
	category,
	group,
	name: id,
	status: "confirmed",
})

describe("trackItems", () => {
	it("lists categories in item order, once each", () => {
		const items = [item("a/1", "a", "x"), item("b/1", "b", "y"), item("a/2", "a", "x")]
		expect(categoryIds(items)).toEqual(["a", "b"])
	})

	it("groups items in order and keeps their own type", () => {
		const items = [item("a/1", "a", "x"), item("a/2", "a", "y"), item("a/3", "a", "x")]
		const groups = groupItems(items)
		expect([...groups.keys()]).toEqual(["x", "y"])
		expect(groups.get("x")?.map((i) => i.id)).toEqual(["a/1", "a/3"])
	})

	it("flattens the index in group order and gives each item its category and group", () => {
		const index: SeedIndex = {
			categories: [{ id: "a", chunk: "/data/a.0123456789.json" }],
			groups: [
				{ category: "a", id: "x", order: 1, sets: [], counts: true, items: [{ id: "a/1", name: "One", status: "confirmed" }] },
				{ category: "a", id: "y", order: 2, sets: [], counts: false, items: [{ id: "a/2", name: "Two", status: "expected", uncounted: true }] },
			],
		}
		expect(indexItems(index)).toEqual([
			{ id: "a/1", name: "One", status: "confirmed", category: "a", group: "x" },
			{ id: "a/2", name: "Two", status: "expected", uncounted: true, category: "a", group: "y" },
		])
	})

	it("merges card text into the items it names and leaves the rest as they are", () => {
		const items = [item("a/1", "a", "x"), item("a/2", "a", "x")]
		const merged = withText(items, { "a/1": { description: "Text.", precedent: "GTA V" } })
		expect(merged[0]).toEqual({ ...items[0], description: "Text.", precedent: "GTA V" })
		expect(merged[1]).toBe(items[1])
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/model/trackItems.test.ts`
Expected: FAIL, cannot resolve `./trackItems`.

- [ ] **Step 3: Write `src/model/trackItems.ts`**

```ts
// The seed as the browser sees it (data delivery plan). Zod-free and free of seed.ts, so an island
// that imports this never bundles the seed or its build checks (src/test/island-imports.test.ts).
import type { SeedItem } from "./schema"
import type { SeedCategory, SeedGroup } from "./seedBuild"

/** What the tracker and the hub read of an item. A SeedItem is one too, so pages and tests pass theirs. */
export type TrackItem = Pick<
	SeedItem,
	| "id"
	| "category"
	| "group"
	| "name"
	| "status"
	| "set"
	| "aliases"
	| "retired"
	| "uncounted"
	| "description"
	| "precedent"
>

/** The card text a category chunk carries per item: most of an item's bytes once sources are gone. */
export type ItemText = Pick<SeedItem, "description" | "precedent">

/** An item in the inlined index. Its group gives category and group, its chunk gives the text. */
export type IndexItem = Omit<TrackItem, "category" | "group" | "description" | "precedent">

export interface IndexGroup extends SeedGroup {
	items: IndexItem[]
}

export interface IndexCategory extends SeedCategory {
	/** `/data/<category>.<hash>.json` */
	chunk: string
}

/** Inlined in the tracker and hub pages by SeedIndex.astro. Groups are in display order. */
export interface SeedIndex {
	categories: IndexCategory[]
	groups: IndexGroup[]
}

/** The body of `/data/<category>.<hash>.json`. */
export interface ChunkBody {
	category: string
	text: Record<string, ItemText>
}

/** Category ids in item order. */
export function categoryIds(items: readonly { category: string }[]): string[] {
	return [...new Set(items.map((i) => i.category))]
}

/** Items by group in item order. seedBuild sorts once, so every page and the tracker list items the
 *  same way. */
export function groupItems<T extends { group: string }>(items: readonly T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>()
	for (const item of items) {
		const list = groups.get(item.group)
		if (list) list.push(item)
		else groups.set(item.group, [item])
	}
	return groups
}

/** The index's items in display order, each with its category and group. */
export function indexItems(index: SeedIndex): TrackItem[] {
	return index.groups.flatMap(({ category, id, items }) =>
		items.map((item) => ({ ...item, category, group: id }))
	)
}

/** Items with a chunk's text merged in. Items the chunk does not name keep their identity. */
export function withText<T extends TrackItem>(items: T[], text: Record<string, ItemText>): T[] {
	return items.map((item) => (Object.hasOwn(text, item.id) ? { ...item, ...text[item.id] } : item))
}
```

- [ ] **Step 4: Point the island path at it**

In `src/model/seed.ts`, delete the `categoryIds` and `groupItems` functions with their doc comments, and add beside the other re-export:

```ts
export { categoryIds, groupItems } from "./trackItems"
```

Pages keep importing them from `seed.ts`. Then change these imports:

- `src/model/stats.ts`: `import { categoryIds } from "./seed"` → `import { categoryIds, type TrackItem } from "./trackItems"`. Replace every `SeedItem` with `TrackItem` (including `RecentFind.item`) and drop `SeedItem` from the `./schema` import.
- `src/model/dashboard.ts`: `import { categoryIds, groupItems } from "./seed"` → `from "./trackItems"`, and add `type TrackItem`. Replace `SeedItem` with `TrackItem` in every function the hub island calls (`rankCategories`, `closestCategory`, `nextGroups`, `foundToday`, `findsByDay`, `categoryRows` and their helper types). `latestRumours`, `newestFacts` and `latestNews` keep their types.
- `src/model/tracker.ts`: `import { categoryIds, groupItems } from "./seed"` → `from "./trackItems"`. `TrackerState.items`, `TrackerDeps.items` and `chipGroups(items, …)` take `TrackItem[]`.
- `src/model/search.ts`: `SeedItem` → `TrackItem` (import from `./trackItems`) in `searchFields` and `SearchInput`.
- `src/islands/tracker/ItemList.tsx`: `from "../../model/seed"` → `from "../../model/trackItems"`; its item props take `TrackItem`.
- `src/islands/hub/WhatsNext.tsx`: `import type { SeedItem } from "../../model/schema"` → `import type { TrackItem } from "../../model/trackItems"`, and rename the uses.

`dex.ts` keeps `SeedItem` and keeps importing from `./seed`: it runs at build only.

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/model/trackItems.test.ts && npm run check && npm test`
Expected: the new file passes, `astro check` reports 0 errors, and the full suite passes (2175 tests on main plus 4 new). A type error means a `SeedItem` on the island path was missed. Fix it in the file it names.

- [ ] **Step 6: Commit**

```bash
git add src/model/trackItems.ts src/model/trackItems.test.ts src/model/seed.ts src/model/stats.ts src/model/dashboard.ts src/model/tracker.ts src/model/search.ts src/islands/tracker/ItemList.tsx src/islands/hub/WhatsNext.tsx
git commit -m "Give the islands a light item type and order helpers that never load the seed"
```

---

### Task 2: Build the index and the chunks

**Files:**
- Create: `src/model/seedDelivery.ts`
- Create: `src/model/seedDelivery.test.ts`
- Modify: `src/model/seed.ts` (export `seedChunks` and `seedIndex`)

**Interfaces:**
- Consumes: `SeedItem`, `SeedResult` (type), `categoryIds`, `ChunkBody`, `IndexItem`, `ItemText`, `SeedIndex` from Task 1; `jsonLd` from `src/model/seo.ts` (tests only).
- Produces: `SeedChunk { category: string; file: string; url: string; body: string }`, `chunkHash(body): string`, `buildChunks(items: SeedItem[]): SeedChunk[]`, `buildIndex(seed: Pick<SeedResult, "categories" | "groups" | "items">, chunks: SeedChunk[]): SeedIndex`; `seedChunks` and `seedIndex` exported from `seed.ts`.

- [ ] **Step 1: Write the failing test**

`src/model/seedDelivery.test.ts`:

```ts
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import type { SeedItem } from "./schema"
import { seedChunks, seedIndex, seedItems } from "./seed"
import { buildChunks, buildIndex, chunkHash } from "./seedDelivery"
import type { SeedGroup } from "./seedBuild"
import { jsonLd } from "./seo"
import { indexItems } from "./trackItems"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const item = (over: Partial<SeedItem> & Pick<SeedItem, "id" | "category" | "group">): SeedItem => ({
	name: over.id,
	status: "confirmed",
	sources: [src],
	...over,
})

const items: SeedItem[] = [
	item({ id: "vehicles/bike", category: "vehicles", group: "bikes", name: "Bike", description: "Two wheels." }),
	item({ id: "vehicles/old", category: "vehicles", group: "bikes", name: "Old", retired: true, description: "Gone." }),
	item({ id: "wildlife/pelican", category: "animals", group: "birds", name: "Pelican", status: "expected", precedent: "GTA V", aliases: ["Brown pelican"] }),
	item({ id: "wildlife/gull", category: "animals", group: "birds", name: "Gull", uncounted: true, set: "coast" }),
]
const groups: SeedGroup[] = [
	{ category: "vehicles", id: "bikes", order: 1, sets: [], counts: true },
	{ category: "animals", id: "birds", order: 1, total: 40, sets: [{ id: "coast", total: 5 }], counts: true },
]
const categories = [{ id: "vehicles" }, { id: "weapons" }, { id: "animals" }]

describe("buildChunks", () => {
	it("writes one chunk per category with the card text of its shown items only", () => {
		const chunks = buildChunks(items)
		expect(chunks.map((c) => c.category)).toEqual(["vehicles", "animals"])
		expect(JSON.parse(chunks[0].body)).toEqual({
			category: "vehicles",
			text: { "vehicles/bike": { description: "Two wheels." } },
		})
		expect(JSON.parse(chunks[1].body)).toEqual({
			category: "animals",
			text: { "wildlife/pelican": { precedent: "GTA V" } },
		})
	})

	it("names each chunk by a hash of its exact bytes", () => {
		const [vehicles] = buildChunks(items)
		expect(vehicles.file).toBe(`vehicles.${chunkHash(vehicles.body)}`)
		expect(vehicles.url).toBe(`/data/${vehicles.file}.json`)
		expect(vehicles.url).toMatch(/^\/data\/[a-z0-9-]+\.[0-9a-f]{10}\.json$/)
	})

	it("keeps the URL when the text is unchanged and changes it when one character changes", () => {
		const again = buildChunks(items.map((i) => ({ ...i })))
		expect(again[0].url).toBe(buildChunks(items)[0].url)
		const edited = items.map((i) => (i.id === "vehicles/bike" ? { ...i, description: "Two wheels!" } : i))
		expect(buildChunks(edited)[0].url).not.toBe(buildChunks(items)[0].url)
		expect(buildChunks(edited)[1].url).toBe(buildChunks(items)[1].url)
	})
})

describe("buildIndex (spec §10 index shape)", () => {
	it("holds categories with their chunk, groups in order and light items without text or sources", () => {
		const chunks = buildChunks(items)
		expect(buildIndex({ categories, groups, items }, chunks)).toEqual({
			categories: [
				{ id: "vehicles", chunk: chunks[0].url },
				{ id: "animals", chunk: chunks[1].url },
			],
			groups: [
				{
					category: "vehicles",
					id: "bikes",
					order: 1,
					sets: [],
					counts: true,
					items: [
						{ id: "vehicles/bike", name: "Bike", status: "confirmed" },
						{ id: "vehicles/old", name: "Old", status: "confirmed", retired: true },
					],
				},
				{
					category: "animals",
					id: "birds",
					order: 1,
					total: 40,
					sets: [{ id: "coast", total: 5 }],
					counts: true,
					items: [
						{ id: "wildlife/pelican", name: "Pelican", status: "expected", aliases: ["Brown pelican"] },
						{ id: "wildlife/gull", name: "Gull", status: "confirmed", set: "coast", uncounted: true },
					],
				},
			],
		})
	})

	it("survives seed text that closes a script tag (Review Focus 5)", () => {
		const evil = [item({ id: "vehicles/x", category: "vehicles", group: "bikes", name: "</script><b>x" })]
		const index = buildIndex({ categories, groups: [groups[0]], items: evil }, buildChunks(evil))
		const html = `<script type="application/json" id="seed-index">${jsonLd(index)}</script><p id="after"></p>`
		const doc = new JSDOM(html).window.document
		expect(doc.getElementById("after")).not.toBeNull()
		const parsed = JSON.parse(doc.getElementById("seed-index")?.textContent ?? "")
		expect(parsed.groups[0].items[0].name).toBe("</script><b>x")
	})
})

describe("the shipped seed's delivery", () => {
	it("lists every item in the index in the seed's display order", () => {
		expect(indexItems(seedIndex).map((i) => i.id)).toEqual(seedItems.map((i) => i.id))
	})

	it("gives every category in the index a chunk that the build writes", () => {
		const urls = new Set(seedChunks.map((c) => c.url))
		for (const category of seedIndex.categories) expect(urls.has(category.chunk)).toBe(true)
	})

	it("never puts sources in the index", () => {
		expect(JSON.stringify(seedIndex)).not.toContain('"sources"')
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/model/seedDelivery.test.ts`
Expected: FAIL, cannot resolve `./seedDelivery`.

- [ ] **Step 3: Write `src/model/seedDelivery.ts`**

```ts
// Build only (it imports node:crypto): the tracker's inlined index and the per-category chunks
// (spec §5, data delivery plan). Pages and the chunk endpoint reach it through seed.ts.
import { createHash } from "node:crypto"
import type { SeedItem } from "./schema"
import type { SeedResult } from "./seedBuild"
import {
	type ChunkBody,
	categoryIds,
	type IndexItem,
	type ItemText,
	type SeedIndex,
} from "./trackItems"

export interface SeedChunk {
	category: string
	/** "vehicles.0123456789": the endpoint's route param. */
	file: string
	/** "/data/vehicles.0123456789.json" */
	url: string
	/** The exact bytes served, which the hash covers. */
	body: string
}

/** 10 hex characters of SHA-256. The service worker's copy rule matches exactly this length. */
export function chunkHash(body: string): string {
	return createHash("sha256").update(body).digest("hex").slice(0, 10)
}

/** One chunk per category that has items, with the card text of its shown items. A category whose
 *  items have no text still gets a chunk, so the tracker never lacks a URL. */
export function buildChunks(items: SeedItem[]): SeedChunk[] {
	return categoryIds(items).map((category) => {
		const text: Record<string, ItemText> = {}
		for (const item of items) {
			if (item.category !== category || item.retired) continue
			const entry: ItemText = {}
			if (item.description !== undefined) entry.description = item.description
			if (item.precedent !== undefined) entry.precedent = item.precedent
			if (Object.keys(entry).length > 0) text[item.id] = entry
		}
		const body = JSON.stringify({ category, text } satisfies ChunkBody)
		const file = `${category}.${chunkHash(body)}`
		return { category, file, url: `/data/${file}.json`, body }
	})
}

function indexItem(item: SeedItem): IndexItem {
	const out: IndexItem = { id: item.id, name: item.name, status: item.status }
	if (item.set !== undefined) out.set = item.set
	if (item.aliases !== undefined) out.aliases = item.aliases
	if (item.retired) out.retired = true
	if (item.uncounted) out.uncounted = true
	return out
}

/** Categories that have a chunk, in categories.json order, and every group in display order with
 *  its light items. Retired items stay in, flagged, so the model sees what it sees today. */
export function buildIndex(
	seed: Pick<SeedResult, "categories" | "groups" | "items">,
	chunks: SeedChunk[]
): SeedIndex {
	const urls = new Map(chunks.map((c) => [c.category, c.url]))
	return {
		categories: seed.categories.flatMap((category) => {
			const chunk = urls.get(category.id)
			return chunk ? [{ ...category, chunk }] : []
		}),
		groups: seed.groups
			.filter((group) => urls.has(group.category))
			.map((group) => ({
				...group,
				items: seed.items
					.filter((i) => i.category === group.category && i.group === group.id)
					.map(indexItem),
			})),
	}
}
```

- [ ] **Step 4: Export the shipped seed's delivery from `seed.ts`**

In `src/model/seed.ts`, add `import { buildChunks, buildIndex } from "./seedDelivery"` to the imports, and after `export const facts …` at the end:

```ts
/** Card text per category, served as /data/<category>.<hash>.json (src/pages/data/[chunk].json.ts). */
export const seedChunks = buildChunks(built.items)
/** Inlined in the tracker and hub pages (SeedIndex.astro). */
export const seedIndex = buildIndex(built, seedChunks)
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/model/seedDelivery.test.ts`
Expected: PASS, 8 tests. If "lists every item in the index in the seed's display order" fails, `SeedResult.groups` is not in display order. Sort the groups in `buildIndex` by the position of their first item in `seed.items`, and say so in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/model/seedDelivery.ts src/model/seedDelivery.test.ts src/model/seed.ts
git commit -m "Build the tracker's seed index and one hashed chunk of card text per category"
```

---

### Task 3: Serve the chunks and inline the index

**Files:**
- Create: `src/pages/data/[chunk].json.ts`
- Create: `src/components/SeedIndex.astro`
- Create: `src/test/data-chunks.test.ts`
- Modify: `src/pages/[locale]/tracker/index.astro`, `src/pages/[locale]/index.astro` (render `<SeedIndex />`)
- Modify: `public/_headers` (immutable `/data/*`)
- Modify: `src/test/tracker-page.test.ts`, `src/test/public-files.test.ts`, `integrations/precache.test.ts`

**Interfaces:**
- Consumes: `seedChunks`, `seedIndex` (Task 2), `jsonLd` (`src/model/seo.ts`).
- Produces: `GET /data/<file>.json` for every `seedChunks` entry; `<script type="application/json" id="seed-index">` on `/[locale]/tracker/` and `/[locale]/`.

- [ ] **Step 1: Write the failing tests**

`src/test/data-chunks.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { seedChunks } from "../model/seed"
import { GET, getStaticPaths } from "../pages/data/[chunk].json"

describe("chunk endpoint (spec §5)", () => {
	it("builds one route per chunk, named by its hash", () => {
		const paths = getStaticPaths()
		expect(paths.map((p) => p.params.chunk)).toEqual(seedChunks.map((c) => c.file))
	})

	it("serves each chunk's exact bytes as JSON", async () => {
		for (const path of getStaticPaths()) {
			// biome-ignore lint/suspicious/noExplicitAny: the endpoint reads only props
			const response = await GET({ props: path.props } as any)
			expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8")
			expect(await response.text()).toBe(path.props.body)
		}
	})
})
```

Add to `src/test/tracker-page.test.ts`, inside `describe("Tracker page", …)`, and import `seedIndex` beside `seedItems`:

```ts
	it("inlines the seed index as data the island reads", async () => {
		const doc = await renderPage(Tracker)
		const node = doc.getElementById("seed-index")
		expect(node?.getAttribute("type")).toBe("application/json")
		expect(JSON.parse(node?.textContent ?? "")).toEqual(seedIndex)
	})
```

Add the same check for the hub. If no hub page test renders `src/pages/[locale]/index.astro` yet, add this file. Its `renderPage` is the one in `tracker-page.test.ts`. The hub page calls `getCollection`, so it mocks `astro:content` the way `src/test/news-page.test.ts` does. Copy that file's `vi.mock("astro:content", …)` block as it stands.

`src/test/hub-page.test.ts`:

```ts
import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"
import { describe, expect, it, vi } from "vitest"
import { seedIndex } from "../model/seed"
import Hub from "../pages/[locale]/index.astro"

// (paste the vi.mock("astro:content", …) block from src/test/news-page.test.ts here)

describe("Hub page", () => {
	it("inlines the seed index for the dashboard", async () => {
		const container = await AstroContainer.create()
		container.addServerRenderer({ renderer: reactRenderer })
		container.addClientRenderer({ name: "@astrojs/react", entrypoint: "@astrojs/react/client.js" })
		const html = await container.renderToString(Hub, { params: { locale: "en" } })
		const node = new JSDOM(html).window.document.getElementById("seed-index")
		expect(JSON.parse(node?.textContent ?? "")).toEqual(seedIndex)
	})
})
```

In `src/test/public-files.test.ts`, beside the workers.dev test:

```ts
	it("caches the hashed seed chunks like the hashed build assets", () => {
		const lines = read("public/_headers").split(/\r?\n/)
		const astro = lines.indexOf("/_astro/*")
		const data = lines.indexOf("/data/*")
		expect(data).toBeGreaterThanOrEqual(0)
		expect(lines[data + 1].trim()).toBe(lines[astro + 1].trim())
	})
```

In `integrations/precache.test.ts`, inside the `shouldPrecache` describe:

```ts
	it("precaches the seed chunks", () => {
		expect(shouldPrecache("data/vehicles.0123456789.json")).toBe(true)
	})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/test/data-chunks.test.ts src/test/tracker-page.test.ts src/test/hub-page.test.ts src/test/public-files.test.ts integrations/precache.test.ts`
Expected: `data-chunks` fails to resolve the endpoint, both page tests find no `#seed-index`, and the `_headers` test finds no `/data/*`. The precache test already passes, because `shouldPrecache` takes every file it does not skip. It is there to keep that true.

- [ ] **Step 3: Write the endpoint**

`src/pages/data/[chunk].json.ts`:

```ts
// One hashed chunk of card text per category (spec §5). The file name carries a hash of the bytes,
// so public/_headers can mark /data/* immutable and the service worker can copy it across deploys.
import type { APIRoute } from "astro"
import { seedChunks } from "../../model/seed"

export function getStaticPaths() {
	return seedChunks.map((chunk) => ({ params: { chunk: chunk.file }, props: { body: chunk.body } }))
}

export const GET: APIRoute = ({ props }) =>
	new Response((props as { body: string }).body, {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	})
```

- [ ] **Step 4: Write the data block and render it**

`src/components/SeedIndex.astro`:

```astro
---
// The seed index the tracker and the hub islands read (spec §5, data delivery plan). It is data
// and never runs, so it needs no CSP hash. jsonLd escapes "<", so seed text can't close the tag.
import { seedIndex } from "../model/seed"
import { jsonLd } from "../model/seo"
---

<script type="application/json" id="seed-index" is:inline set:html={jsonLd(seedIndex)}></script>
```

In `src/pages/[locale]/tracker/index.astro`, import it (`import SeedIndex from "../../../components/SeedIndex.astro"`) and put `<SeedIndex />` on the line before `<Tracker client:only="react" …>`.

In `src/pages/[locale]/index.astro`, import it (`import SeedIndex from "../../components/SeedIndex.astro"`) and put `<SeedIndex />` on the line before `<div class="build-stamp" data-build-stamp>`, outside that div. `withoutBuildStamps` in `integrations/precache.mjs` empties a stamped div's children before hashing, and the version hash must see the index, because a seed change has to make a new worker version.

- [ ] **Step 5: Mark the chunks immutable**

In `public/_headers`, after the `/_astro/*` block:

```
/data/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 6: Run the tests, then build and look at the output**

Run: `npx vitest run src/test/data-chunks.test.ts src/test/tracker-page.test.ts src/test/hub-page.test.ts src/test/public-files.test.ts integrations/precache.test.ts`
Expected: PASS.

Run: `npm run build && ls dist/data && grep -c '"/data/' dist/sw.js`
Expected: the build passes. `dist/data/` holds five files, `activities.<hash>.json` through `vehicles.<hash>.json`, and `dist/sw.js` lists them (count 1, since the list is on one line). If Astro writes `dist/data/vehicles.<hash>.json/index.html` instead, `trailingSlash: "always"` applied to the endpoint. Change the file to `src/pages/data/[chunk].ts` with the param `chunk: \`${chunk.file}.json\``, then rebuild and check again.

- [ ] **Step 7: Commit**

```bash
git add "src/pages/data/[chunk].json.ts" src/components/SeedIndex.astro src/test/data-chunks.test.ts src/test/hub-page.test.ts "src/pages/[locale]/tracker/index.astro" "src/pages/[locale]/index.astro" public/_headers src/test/tracker-page.test.ts src/test/public-files.test.ts integrations/precache.test.ts
git commit -m "Serve each category's card text as a hashed file and inline the seed index"
```

---

### Task 4: Read the index and load chunks in the browser

**Files:**
- Create: `src/model/chunks.ts`
- Create: `src/model/chunks.test.ts`

**Interfaces:**
- Consumes: `SeedIndex`, `ChunkBody`, `ItemText` (Task 1).
- Produces: `SEED_INDEX_ID = "seed-index"`, `type ChunkFailure = "offline" | "stale"`, `type ChunkOutcome = { ok: true; text: Record<string, ItemText> } | { ok: false; reason: ChunkFailure }`, `readSeedIndex(doc?: Document): SeedIndex`, `createChunkLoader(index: SeedIndex, fetchFn: (url: string) => Promise<Response>): (category: string) => Promise<ChunkOutcome>`.

- [ ] **Step 1: Write the failing test**

`src/model/chunks.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { createChunkLoader, readSeedIndex, SEED_INDEX_ID } from "./chunks"
import type { SeedIndex } from "./trackItems"

const index: SeedIndex = {
	categories: [
		{ id: "vehicles", chunk: "/data/vehicles.0123456789.json" },
		{ id: "animals", chunk: "/data/animals.abcdef0123.json" },
	],
	groups: [],
}
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const vehicles = { category: "vehicles", text: { "vehicles/bike": { description: "Two wheels." } } }

describe("readSeedIndex", () => {
	it("parses the page's data block", () => {
		const node = document.createElement("script")
		node.type = "application/json"
		node.id = SEED_INDEX_ID
		node.textContent = JSON.stringify(index)
		document.head.append(node)
		expect(readSeedIndex()).toEqual(index)
		node.remove()
	})

	it("throws when the page has none, so a missing block fails loudly", () => {
		expect(() => readSeedIndex()).toThrow("Seed index missing")
	})
})

describe("createChunkLoader (spec §5)", () => {
	it("fetches a category's chunk once and answers later calls from memory", async () => {
		const fetchFn = vi.fn(async () => json(vehicles))
		const load = createChunkLoader(index, fetchFn)
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
		expect(fetchFn).toHaveBeenCalledOnce()
		expect(fetchFn).toHaveBeenCalledWith("/data/vehicles.0123456789.json")
	})

	it("reads a rejected fetch as offline", async () => {
		const load = createChunkLoader(index, async () => {
			throw new TypeError("Failed to fetch")
		})
		expect(await load("vehicles")).toEqual({ ok: false, reason: "offline" })
	})

	it("reads a 404 as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => new Response("Not found", { status: 404 }))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads an HTML body as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => new Response("<!doctype html><p>hi</p>"))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads another category's chunk as an old page after an update", async () => {
		const load = createChunkLoader(index, async () => json({ ...vehicles, category: "animals" }))
		expect(await load("vehicles")).toEqual({ ok: false, reason: "stale" })
	})

	it("reads a category the index does not know as an old page after an update", async () => {
		const fetchFn = vi.fn(async () => json(vehicles))
		expect(await createChunkLoader(index, fetchFn)("weapons")).toEqual({ ok: false, reason: "stale" })
		expect(fetchFn).not.toHaveBeenCalled()
	})

	it("tries again after a failure, so coming back online loads the chunk", async () => {
		const fetchFn = vi
			.fn<(url: string) => Promise<Response>>()
			.mockRejectedValueOnce(new TypeError("offline"))
			.mockResolvedValueOnce(json(vehicles))
		const load = createChunkLoader(index, fetchFn)
		expect(await load("vehicles")).toEqual({ ok: false, reason: "offline" })
		expect(await load("vehicles")).toEqual({ ok: true, text: vehicles.text })
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/model/chunks.test.ts`
Expected: FAIL, cannot resolve `./chunks`.

- [ ] **Step 3: Write `src/model/chunks.ts`**

```ts
// The browser's side of the seed delivery (spec §5): the index the page inlined, and the card text
// chunks, keyed by category and kept in memory. No Zod: the build already checked every byte, so a
// shape check is enough to tell a chunk from an old page's 404 or HTML.
import type { ChunkBody, ItemText, SeedIndex } from "./trackItems"

export const SEED_INDEX_ID = "seed-index"

/** offline: the fetch itself failed. stale: the server answered, but not with this chunk, which is
 *  what an old tab sees after a deploy replaced the file. */
export type ChunkFailure = "offline" | "stale"
export type ChunkOutcome =
	| { ok: true; text: Record<string, ItemText> }
	| { ok: false; reason: ChunkFailure }

/** The index SeedIndex.astro inlined. Throws when the page has none: a page whose island builds a
 *  tracker must render SeedIndex.astro (the page tests check both pages). */
export function readSeedIndex(doc: Document = document): SeedIndex {
	const text = doc.getElementById(SEED_INDEX_ID)?.textContent
	if (!text) throw new Error("Seed index missing")
	return JSON.parse(text) as SeedIndex
}

function isChunk(body: unknown, category: string): body is ChunkBody {
	if (typeof body !== "object" || body === null) return false
	const { category: own, text } = body as Partial<ChunkBody>
	return own === category && typeof text === "object" && text !== null && !Array.isArray(text)
}

/** Loads a category's chunk. A success is kept for the page's life; a failure is not, so the next
 *  call tries the network again. */
export function createChunkLoader(
	index: SeedIndex,
	fetchFn: (url: string) => Promise<Response>
): (category: string) => Promise<ChunkOutcome> {
	const urls = new Map(index.categories.map((c) => [c.id, c.chunk]))
	const loaded = new Map<string, Promise<ChunkOutcome>>()

	async function fetchChunk(category: string): Promise<ChunkOutcome> {
		const url = urls.get(category)
		if (!url) return { ok: false, reason: "stale" }
		let response: Response
		try {
			response = await fetchFn(url)
		} catch {
			return { ok: false, reason: "offline" }
		}
		if (!response.ok) return { ok: false, reason: "stale" }
		try {
			const body: unknown = await response.json()
			return isChunk(body, category) ? { ok: true, text: body.text } : { ok: false, reason: "stale" }
		} catch {
			return { ok: false, reason: "stale" }
		}
	}

	return (category) => {
		const known = loaded.get(category)
		if (known) return known
		const pending = fetchChunk(category).then((outcome) => {
			if (!outcome.ok) loaded.delete(category)
			return outcome
		})
		loaded.set(category, pending)
		return pending
	}
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/model/chunks.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/chunks.ts src/model/chunks.test.ts
git commit -m "Read the inlined seed index and load a category's chunk once per page"
```

---

### Task 5: The tracker loads the chunks its view needs

**Files:**
- Modify: `src/model/tracker.ts`
- Create: `src/model/tracker.chunks.test.ts`

**Interfaces:**
- Consumes: `ChunkFailure`, `ChunkOutcome` (Task 4, type only), `withText` (Task 1).
- Produces: `type ChunkState = "loading" | "ready" | ChunkFailure`; `TrackerState.chunks: Record<string, ChunkState>`; `TrackerDeps.loadChunk?: (category: string) => Promise<ChunkOutcome>`; `listChunks(state): { settled: boolean; failed: { category: string; reason: ChunkFailure }[] }`.

- [ ] **Step 1: Write the failing test**

`src/model/tracker.chunks.test.ts`:

```ts
import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import type { ChunkOutcome } from "./chunks"
import { openStore } from "./store"
import { createTracker, listChunks } from "./tracker"
import type { TrackItem } from "./trackItems"

const items: TrackItem[] = [
	{ id: "vehicles/bike", category: "vehicles", group: "bikes", name: "Bike", status: "confirmed" },
	{ id: "wildlife/pelican", category: "animals", group: "birds", name: "Pelican", status: "expected" },
]
const texts: Record<string, ChunkOutcome> = {
	vehicles: { ok: true, text: { "vehicles/bike": { description: "Two wheels." } } },
	animals: { ok: true, text: { "wildlife/pelican": { precedent: "GTA V" } } },
}

/** Each category's load waits until the test releases it, so arrival order can be staged. */
function staged() {
	const release = new Map<string, () => void>()
	const loadChunk = vi.fn(
		(category: string) =>
			new Promise<ChunkOutcome>((resolve) => release.set(category, () => resolve(texts[category])))
	)
	return { loadChunk, release: (category: string) => release.get(category)?.() }
}

const make = (loadChunk?: (category: string) => Promise<ChunkOutcome>, selected: string[] = []) =>
	createTracker({
		openStore: () => openStore(new IDBFactory()),
		items,
		defaultProfileName: "Player 1",
		selected,
		loadChunk,
	})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("chunk loading (spec §5)", () => {
	it("loads every chunk under All and merges the text when it lands", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk)
		void tracker.init()
		expect(loadChunk.mock.calls.map(([c]) => c)).toEqual(["vehicles", "animals"])
		expect(listChunks(tracker.getState()).settled).toBe(false)
		release("vehicles")
		release("animals")
		await flush()
		expect(listChunks(tracker.getState())).toEqual({ settled: true, failed: [] })
		expect(tracker.getState().items[0].description).toBe("Two wheels.")
		expect(tracker.getState().items[1].precedent).toBe("GTA V")
	})

	it("loads only the pressed category, and the next one when it is pressed", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["animals"])
		void tracker.init()
		expect(loadChunk.mock.calls.map(([c]) => c)).toEqual(["animals"])
		tracker.selectCategories(["vehicles"])
		expect(loadChunk.mock.calls.map(([c]) => c)).toEqual(["animals", "vehicles"])
		release("vehicles")
		await flush()
		expect(listChunks(tracker.getState()).settled).toBe(true)
	})

	it("a slow chunk for a category no longer pressed never holds up the pressed one", async () => {
		const { loadChunk, release } = staged()
		const tracker = make(loadChunk, ["vehicles"])
		void tracker.init()
		tracker.selectCategories(["animals"])
		release("animals")
		await flush()
		expect(listChunks(tracker.getState()).settled).toBe(true)
		release("vehicles")
		await flush()
		expect(tracker.getState().selected).toEqual(["animals"])
		expect(listChunks(tracker.getState()).settled).toBe(true)
	})

	it("reports failed chunks in tile order and tries again when the category is pressed again", async () => {
		const loadChunk = vi
			.fn<(category: string) => Promise<ChunkOutcome>>()
			.mockResolvedValueOnce({ ok: false, reason: "offline" })
			.mockResolvedValueOnce({ ok: false, reason: "stale" })
			.mockResolvedValue(texts.vehicles)
		const tracker = make(loadChunk)
		void tracker.init()
		await flush()
		expect(listChunks(tracker.getState())).toEqual({
			settled: true,
			failed: [
				{ category: "vehicles", reason: "offline" },
				{ category: "animals", reason: "stale" },
			],
		})
		tracker.selectCategories(["vehicles"])
		await flush()
		expect(listChunks(tracker.getState())).toEqual({ settled: true, failed: [] })
	})

	it("without a loader (the hub) never loads anything", async () => {
		const tracker = make(undefined)
		await tracker.init()
		expect(tracker.getState().chunks).toEqual({})
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/model/tracker.chunks.test.ts`
Expected: FAIL, `listChunks` is not exported.

- [ ] **Step 3: Implement it in `src/model/tracker.ts`**

Imports: add `import type { ChunkFailure, ChunkOutcome } from "./chunks"`, and add `withText` to the `./trackItems` import from Task 1.

Types, beside `Status`:

```ts
/** Per category: its card text chunk is on its way, has landed, or failed (spec §5). */
export type ChunkState = "loading" | "ready" | ChunkFailure
```

In `TrackerState`, after `items`:

```ts
	/** Card text chunks by category. Empty on the hub, which never loads one. */
	chunks: Record<string, ChunkState>
```

In `TrackerDeps`, after `items`:

```ts
	/** Loads a category's card text. Leave undefined where no card is shown (the hub). */
	loadChunk?: (category: string) => Promise<ChunkOutcome>
```

After `showParam`, the pure view of it:

```ts
export interface ListChunks {
	/** Every chunk the view shows has landed or failed. Until then the list holds its space. */
	settled: boolean
	failed: { category: string; reason: ChunkFailure }[]
}

/** The chunks the list needs: the pressed categories, or every category under All. */
export function listChunks(state: Pick<TrackerState, "chunks" | "selected" | "items">): ListChunks {
	const needed = state.selected.length > 0 ? state.selected : categoryIds(state.items)
	const failed = needed.flatMap((category) => {
		const status = state.chunks[category]
		return status === "offline" || status === "stale" ? [{ category, reason: status }] : []
	})
	const settled = needed.every((category) => {
		const status = state.chunks[category]
		return status !== undefined && status !== "loading"
	})
	return { settled, failed }
}
```

In `createTracker`, add `chunks: {},` to the initial `state` after `items: deps.items,`, and after the `set` function:

```ts
	/** Starts every needed chunk that is neither on its way nor in. A failed one is tried again. A
	 *  chunk that lands after its category was unpressed is merged all the same: it is the same
	 *  seed text, and the list only renders pressed categories. */
	function loadChunks(selected: string[]): void {
		const load = deps.loadChunk
		if (!load) return
		for (const category of selected.length > 0 ? selected : [...known]) {
			const status = state.chunks[category]
			if (status === "loading" || status === "ready") continue
			set({ chunks: { ...state.chunks, [category]: "loading" } })
			void load(category).then((outcome) => {
				if (outcome.ok) {
					set({
						items: withText(state.items, outcome.text),
						chunks: { ...state.chunks, [category]: "ready" },
					})
				} else {
					set({ chunks: { ...state.chunks, [category]: outcome.reason } })
				}
			})
		}
	}
```

In `init()`, before `booted ??= boot()`:

```ts
			// First, so the chunks travel while the store opens.
			loadChunks(state.selected)
```

In `selectCategories`, after its `set(…)`:

```ts
			loadChunks(selected)
```

The two places that read `deps.items` for chips (`selectCategories` and `toggleGroup`) keep doing so: chips depend on ids and groups, which merged text never changes.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/model/tracker.chunks.test.ts src/model/tracker.test.ts`
Expected: PASS. `tracker.test.ts` builds trackers without `loadChunk` and sees no change apart from the new `chunks: {}` key. If it compares whole states with `toEqual`, add `chunks: {}` to the expected objects there.

- [ ] **Step 5: Commit**

```bash
git add src/model/tracker.ts src/model/tracker.chunks.test.ts
git commit -m "Load the card text chunks the tracker's view needs and merge them into its items"
```

---

### Task 6: The islands read the index, and the list waits for its chunks

**Files:**
- Create: `src/test/island-imports.test.ts`
- Modify: `src/islands/buildTracker.ts`, `src/islands/Tracker.tsx`, `src/islands/hub/Dashboard.tsx` (only if its call needs the new signature)
- Modify: `src/test/tracker-fixtures.tsx` (`installSeed`, called from `resetBrowser`)
- Modify: `src/islands/Tracker.test.tsx`, `Tracker.groups.test.tsx`, `Tracker.import.test.tsx`, `Tracker.profiles.test.tsx`, `Tracker.search.test.tsx`, `Tracker.tick.test.tsx` (if it mocks the seed), `src/islands/hub/Dashboard.test.tsx` (drop the dead `vi.mock("../model/seed")` blocks)
- Create: `src/islands/Tracker.chunks.test.tsx`
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Modify: `src/styles/global.css` (the pending list's reserve)

**Interfaces:**
- Consumes: `readSeedIndex`, `createChunkLoader`, `SEED_INDEX_ID` (Task 4); `indexItems`, `categoryIds` (Task 1); `listChunks`, `ChunkState` (Task 5); `buildChunks`, `buildIndex` (Task 2, tests only); `jsonLd`.
- Produces: `buildTracker(defaultProfileName: string, options?: { index?: SeedIndex; selected?: string[]; groups?: string[]; chunks?: boolean }): Tracker`; `installSeed(items?: SeedItem[]): { chunks: SeedChunk[]; fetch: Mock }` in `tracker-fixtures.tsx`; locale keys `tracker.chunk.offline.one`, `tracker.chunk.offline.other`, `tracker.chunk.stale`, `tracker.chunk.reload`.

- [ ] **Step 1: Write the import guard, which fails today**

`src/test/island-imports.test.ts`:

```ts
// Spec §5: the browser never parses the seed again. Walks every island's value imports (type-only
// imports are erased) and fails if one reaches the seed, its build checks or the source rules.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ROOT = resolve(import.meta.dirname, "../..")
const FORBIDDEN = new Set([
	"src/model/seed.ts",
	"src/model/seedBuild.ts",
	"src/model/seedDelivery.ts",
	"src/model/tiers.ts",
	"allowlist.json",
])

function valueImports(file: string): string[] {
	const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true)
	const found: string[] = []
	const visit = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
			if (ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text)
		} else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
			if (ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text)
		} else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [arg] = node.arguments
			if (arg && ts.isStringLiteral(arg)) found.push(arg.text)
		}
		ts.forEachChild(node, visit)
	}
	visit(source)
	return found
}

function resolveLocal(from: string, specifier: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined
	const base = resolve(dirname(from), specifier.split("?")[0])
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
	}
	return undefined
}

function islandEntries(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
		.map((e) => join(e.parentPath, e.name))
}

describe("island imports (spec §5)", () => {
	it("never reach the seed, its build checks or the source rules", () => {
		const seen = new Map<string, string>()
		const queue = islandEntries(join(ROOT, "src/islands")).map((f) => [f, f] as const)
		const reached: string[] = []
		while (queue.length > 0) {
			const [file, via] = queue.shift() as readonly [string, string]
			const rel = relative(ROOT, file).split("\\").join("/")
			if (seen.has(rel)) continue
			seen.set(rel, via)
			if (FORBIDDEN.has(rel)) {
				reached.push(`${rel} via ${relative(ROOT, via).split("\\").join("/")}`)
				continue
			}
			if (!/\.tsx?$/.test(file)) continue
			for (const specifier of valueImports(file)) {
				const next = resolveLocal(file, specifier)
				if (next) queue.push([next, file])
			}
		}
		expect(reached).toEqual([])
	})
})
```

Run: `npx vitest run src/test/island-imports.test.ts`
Expected: FAIL, listing `src/model/seed.ts via src/islands/buildTracker.ts` and `via src/islands/Tracker.tsx`.

- [ ] **Step 2: Deliver the fixtures the way a page does**

In `src/test/tracker-fixtures.tsx`, replace the header comment with:

```ts
// Shared setup for the Tracker and Dashboard island tests. resetBrowser() puts the fixtures on the
// page as a seed index and serves their chunks through a stubbed fetch, the way the built pages do.
```

Add these imports:

```ts
import { SEED_INDEX_ID } from "../model/chunks"
import { buildChunks, buildIndex } from "../model/seedDelivery"
import { jsonLd } from "../model/seo"
import { categoryIds } from "../model/trackItems"
```

Add this after `fixtures`:

```ts
/** The latest installSeed's chunks and fetch stub, for tests that check what was fetched. */
export const delivered = { chunks: [] as ReturnType<typeof buildChunks>, fetch: vi.fn() }

/**
 * Puts `items` on the page as the seed index and stubs fetch to serve their chunks (404 for any
 * other URL). Groups keep their first-seen order, as the fixtures are already in display order.
 */
export function installSeed(items: SeedItem[] = fixtures) {
	const chunks = buildChunks(items)
	const groups = [
		...new Map(
			items.map((i, n) => [
				`${i.category}/${i.group}`,
				{ category: i.category, id: i.group, order: n + 1, sets: [], counts: true },
			])
		).values(),
	]
	const index = buildIndex({ categories: categoryIds(items).map((id) => ({ id })), groups, items }, chunks)
	document.getElementById(SEED_INDEX_ID)?.remove()
	const node = document.createElement("script")
	node.type = "application/json"
	node.id = SEED_INDEX_ID
	node.textContent = jsonLd(index)
	document.head.append(node)
	const serve = vi.fn(async (url: string) => {
		const chunk = chunks.find((c) => c.url === url)
		return chunk
			? new Response(chunk.body, { headers: { "Content-Type": "application/json" } })
			: new Response("Not found", { status: 404 })
	})
	vi.stubGlobal("fetch", serve)
	delivered.chunks = chunks
	delivered.fetch = serve
	return { chunks, fetch: serve }
}
```

At the end of `resetBrowser()`, add `installSeed()`.

Then delete the `vi.mock("../model/seed", …)` block (or `"../../model/seed"`) from every island test that has one: `Tracker.test.tsx`, `Tracker.groups.test.tsx`, `Tracker.import.test.tsx`, `Tracker.profiles.test.tsx`, `Tracker.search.test.tsx`, `src/islands/hub/Dashboard.test.tsx`, and any other that `grep -rln 'vi.mock("[./]*model/seed"' src/islands` finds. A test that must render other items calls `installSeed(itsItems)` after `resetBrowser()`.

- [ ] **Step 3: Build the tracker from the index**

`src/islands/buildTracker.ts`, the import and signature:

```ts
import { createChunkLoader, readSeedIndex } from "../model/chunks"
import { openStore } from "../model/store"
import { createTracker, type Tracker } from "../model/tracker"
import { indexItems, type SeedIndex } from "../model/trackItems"
import { activeProfileStorage, countBackupTick, HINT_SEEN_KEY, readFlag } from "./seenFlag"

export interface BuildOptions {
	/** The page's index, when the caller already read it. */
	index?: SeedIndex
	selected?: string[]
	groups?: string[]
	/** Load card text chunks. The tracker page shows cards; the hub shows none. */
	chunks?: boolean
}

/**
 * Both islands build their tracker here, so the hub and the tracker page open the same database,
 * the same seed index and the same remembered profile in the same way (dashboard spec §3).
 */
export function buildTracker(defaultProfileName: string, options: BuildOptions = {}): Tracker {
	const index = options.index ?? readSeedIndex()
	return createTracker({
		openStore: () => openStore(indexedDB),
		items: indexItems(index),
		loadChunk: options.chunks ? createChunkLoader(index, (url) => fetch(url)) : undefined,
		defaultProfileName,
		selected: options.selected ?? [],
		groups: options.groups ?? [],
```

The rest of the `createTracker` call stays as it is. `Dashboard.tsx` keeps `buildTracker(t("profile.defaultName"))`.

- [ ] **Step 4: Wire the tracker island**

In `src/islands/Tracker.tsx`:

1. Replace `import { categoryIds, seedItems } from "../model/seed"` with:

```ts
import { readSeedIndex } from "../model/chunks"
import { categoryIds, indexItems } from "../model/trackItems"
```

and add `listChunks` to the `../model/tracker` import.

2. The tracker's construction:

```ts
	const [tracker] = useState(() => {
		const index = readSeedIndex()
		const items = indexItems(index)
		const selected = parseShow(startView.search, categoryIds(items))
		return buildTracker(t("profile.defaultName"), {
			index,
			selected,
			groups: parseGroups(startView.search, chipGroups(items, selected)),
			chunks: true,
		})
	})
```

3. Right after `const state = useTrackerState(tracker)`:

```ts
	// The list renders once its card text is in, so no card grows under the reader (data delivery
	// plan). Everything that needs a card in the DOM waits for listReady, not for the store alone.
	const chunkView = listChunks(state)
	const listReady = state.status === "ready" && chunkView.settled
```

4. In the scroll restore effect, `state.status !== "ready"` becomes `!listReady`, and its deps become `[listReady, startView.scroll]`. In the arrival effect, `state.status !== "ready"` becomes `!listReady`. Swap `state.status` for `listReady` in its dependency list the same way.

5. The notice. Put it after `const live = useLiveStatus()`:

```ts
	// One message for every chunk that failed (spec §5): stale wins, because Reload fixes it.
	const notice = (() => {
		const { failed } = chunkView
		if (failed.length === 0) return ""
		if (failed.some((f) => f.reason === "stale")) return t("tracker.chunk.stale")
		const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(
			failed.map((f) => seedLabel(t, "category", f.category))
		)
		return plural("tracker.chunk.offline", failed.length, { categories: names })
	})()
	const stale = chunkView.failed.some((f) => f.reason === "stale")
	// Spoken once per new text through the status line; the visible copy is not a live region.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `live` is a new object each render; only a new text should speak
	useEffect(() => {
		if (notice) live.say(notice)
	}, [notice])
```

6. `jumpable(recent[0], view.visible, state.status === "ready")` becomes `jumpable(recent[0], view.visible, listReady)`. `aria-busy={state.status === "loading"}` becomes `aria-busy={!listReady}`.

7. The results area. Replace `<div className="tracker-results" ref={results} tabIndex={-1}>` and its children with:

```tsx
				<div
					className={chunkView.settled ? "tracker-results" : "tracker-results pending"}
					ref={results}
					tabIndex={-1}
				>
					{notice && (
						<p className="hint chunk-notice">
							<span>{notice}</span>
							{stale && (
								<>
									{" "}
									<button type="button" onClick={() => window.location.reload()}>
										{t("tracker.chunk.reload")}
									</button>
								</>
							)}
						</p>
					)}
					{chunkView.settled && (
						<>
							{/* the existing ItemList, item-empty and search-elsewhere blocks, unchanged,
							    except ItemList's items: */}
						</>
					)}
				</div>
```

Inside the fragment, keep the three existing blocks exactly as they are, except that `ItemList` gets `items={shownCards}`. Define this before the `return`:

```ts
	// A category whose chunk failed shows no cards: the notice says why.
	const failedCategories = new Set(chunkView.failed.map((f) => f.category))
	const shownCards = view.visible.filter((item) => !failedCategories.has(item.category))
```

- [ ] **Step 5: Hold the list's space while it waits**

In `src/styles/global.css`, after the `.tracker-results` rule:

```css
/* While the card text is on its way, the empty list keeps a screen of height, so the footer never
   paints in view and then jumps away (the same reserve as the page's .tracker-fallback). */
.tracker-results.pending {
	min-height: 100dvh;
}
```

- [ ] **Step 6: Add the copy**

`src/locales/en.json`, after `tracker.dismiss`:

```json
	"tracker.chunk.offline.one": "Can't load {categories} offline yet. Open it once while online and it stays available.",
	"tracker.chunk.offline.other": "Can't load {categories} offline yet. Open them once while online and they stay available.",
	"tracker.chunk.stale": "Rookdex was updated. Reload to see the new list.",
	"tracker.chunk.reload": "Reload",
```

`src/locales/nb.json`, same place. These are my drafts, and she approves them in the PR:

```json
	"tracker.chunk.offline.one": "{categories} kan ikke lastes uten nett ennå. Åpne den én gang på nett, så er den tilgjengelig etterpå.",
	"tracker.chunk.offline.other": "{categories} kan ikke lastes uten nett ennå. Åpne dem én gang på nett, så er de tilgjengelige etterpå.",
	"tracker.chunk.stale": "Rookdex er oppdatert. Last inn siden på nytt for å se den nye listen.",
	"tracker.chunk.reload": "Last inn på nytt",
```

- [ ] **Step 7: Write the island's chunk tests**

`src/islands/Tracker.chunks.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { delivered, renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Dashboard } from "./hub/Dashboard"
import { Tracker } from "./Tracker"

beforeEach(resetBrowser)

const offline = () => {
	vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
}

describe("chunks in the tracker (spec §5, §10)", () => {
	it("shows each card's text from its chunk", async () => {
		await renderReady(<Tracker locale="en" />)
		expect(screen.getByText("Everglades native.")).toBeInTheDocument()
	})

	it("names every category in one message when all chunks fail offline (Review Focus 1)", async () => {
		offline()
		render(<Tracker locale="en" />)
		expect(
			await screen.findByText(
				"Can't load Vehicles and Animals offline yet. Open them once while online and they stay available."
			)
		).toBeInTheDocument()
		expect(screen.queryByRole("checkbox")).toBeNull()
	})

	it("asks for a reload when a chunk is gone after an update (Review Focus 2)", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response("<!doctype html>", { status: 404 })))
		render(<Tracker locale="en" />)
		expect(await screen.findByText("Rookdex was updated. Reload to see the new list.")).toBeInTheDocument()
		// jsdom can't reload or spy on `location`; Task 8 clicks it in a real browser.
		expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
	})

	it("says it in Norwegian too", async () => {
		offline()
		window.history.replaceState(null, "", "/nb/tracker/?show=animals")
		render(<Tracker locale="nb" />)
		expect(
			await screen.findByText(/kan ikke lastes uten nett ennå\. Åpne den én gang på nett/)
		).toBeInTheDocument()
	})

	it("focuses a Sources back link's item once a late chunk lands (Review Focus 3)", async () => {
		let release: () => void = () => {}
		const served = delivered.fetch
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) => new Promise<Response>((resolve) => {
				release = () => resolve(served(url))
			}))
		)
		window.history.replaceState(null, "", "/en/tracker/?show=animals#item-wildlife/american-alligator")
		render(<Tracker locale="en" />)
		await new Promise((r) => setTimeout(r, 50))
		expect(screen.queryByRole("checkbox")).toBeNull()
		release()
		const box = await screen.findByRole("checkbox", { name: "American alligator" })
		await waitFor(() => expect(box).toHaveFocus())
	})

	it("the hub never fetches a chunk (Review Focus 4)", async () => {
		render(
			<Dashboard
				locale="en"
				today="2026-11-26"
				daysSince={7}
				guideHref="/en/guides/before-you-start/"
				trackerHref="/en/tracker/"
				dexHref="/en/dex/"
				announce={() => {}}
			/>
		)
		await screen.findByText(/Bike|American alligator|Pelican|0 of/)
		expect(delivered.fetch).not.toHaveBeenCalled()
	})
})
```

The `Dashboard` props above must match `DashboardProps` in `src/islands/hub/Dashboard.tsx`. Copy the props from the first `render(<Dashboard …/>)` in `Dashboard.test.tsx` instead of the ones here if they differ. The `findByText` waits for any rendered dashboard text the fixtures produce. Use the same "ready" query `Dashboard.test.tsx` uses.

- [ ] **Step 8: Run everything**

Run: `npx vitest run src/test/island-imports.test.ts src/islands/Tracker.chunks.test.tsx && npm run check && npm test && npm run lint`
Expected: the guard passes (no forbidden module reached), the new island tests pass, there are 0 type errors, the full suite passes and Biome is clean. If the guard still lists a path, the line after `via` names the file that imports it. Point that import at `trackItems.ts`, `chunks.ts` or a type-only import.

- [ ] **Step 9: Commit**

```bash
git add src/test/island-imports.test.ts src/islands/buildTracker.ts src/islands/Tracker.tsx src/islands/Tracker.chunks.test.tsx src/test/tracker-fixtures.tsx src/islands/Tracker.test.tsx src/islands/Tracker.groups.test.tsx src/islands/Tracker.import.test.tsx src/islands/Tracker.profiles.test.tsx src/islands/Tracker.search.test.tsx src/islands/hub/Dashboard.test.tsx src/locales/en.json src/locales/nb.json src/styles/global.css
git commit -m "Read the seed from the page in both islands and show cards once their text is in"
```

Add any other test file Step 2 touched to the `git add` line by name.

---

### Task 7: The service worker copies unchanged hashed files

**Files:**
- Modify: `src/sw/sw.js` (install)
- Modify: `src/sw/sw.test.ts` (harness with several caches, new tests)

**Interfaces:**
- Consumes: the precache list (`PRECACHE`), which already includes `/data/*.json` (Task 3).
- Produces: an install that copies content-addressed URLs (`/_astro/*`, `/data/<category>.<10 hex>.json`) from older `rookdex-*` caches when the old copy is ok, fetches everything else, and rejects when any fetch fails.

- [ ] **Step 1: Rework the harness and write the failing tests**

In `src/sw/sw.test.ts`, replace `loadWorker` with a version that has one fake cache per name and a real `add`:

```ts
type FakeCache = {
	add: ReturnType<typeof vi.fn>
	match: ReturnType<typeof vi.fn>
	put: ReturnType<typeof vi.fn>
	store: Map<string, Response>
}

/** Runs the worker in a sandbox with fake self, caches and fetch (feedback spec §15.3). `old` seeds
 *  caches that an earlier version left behind. */
function loadWorker(
	network: (url: string) => Promise<Response>,
	{ precache = ["/en/"], old = {} as Record<string, Record<string, Response>> } = {}
) {
	const listeners = new Map<string, Listener>()
	const fetch = vi.fn(network)
	const caches = new Map<string, FakeCache>()
	const open = (name: string): FakeCache => {
		const existing = caches.get(name)
		if (existing) return existing
		const store = new Map<string, Response>()
		const cache: FakeCache = {
			store,
			match: vi.fn(async (key: string) => store.get(key)),
			put: vi.fn(async (key: string, response: Response) => {
				store.set(key, response)
			}),
			add: vi.fn(async (url: string) => {
				const response = await fetch(url)
				if (!response.ok) throw new TypeError(`Request failed: ${url}`)
				store.set(url, response)
			}),
		}
		caches.set(name, cache)
		return cache
	}
	for (const [name, entries] of Object.entries(old)) {
		for (const [url, response] of Object.entries(entries)) open(name).store.set(url, response)
	}
	const self = {
		location: { origin: "https://rookdex.app" },
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		skipWaiting: vi.fn(async () => {}),
		clients: { claim: vi.fn(async () => {}) },
	}
	const cacheStorage = {
		open: vi.fn(async (name: string) => open(name)),
		keys: vi.fn(async () => [...caches.keys()]),
		delete: vi.fn(async (name: string) => caches.delete(name)),
		match: vi.fn(async (key: string) => {
			for (const cache of caches.values()) {
				const hit = cache.store.get(key)
				if (hit) return hit
			}
			return undefined
		}),
	}
	vm.runInNewContext(fillWorker(template, "v1", precache), {
		self,
		caches: cacheStorage,
		fetch,
		URL,
		Response,
		Promise,
	})
	const cache = open("rookdex-v1")
	return { listeners, self, cache, put: cache.put, fetch }
}

async function install(worker: ReturnType<typeof loadWorker>) {
	const pending: Promise<unknown>[] = []
	worker.listeners.get("install")?.({ waitUntil: (p: Promise<unknown>) => pending.push(p) })
	await Promise.all(pending)
}
```

`page(headers)` has to accept the URL argument now. Its `async () => …` already ignores arguments, so it needs no change. In the first test, replace the `addAll` assertion with:

```ts
		await install(worker)
		expect(worker.cache.store.has("/en/")).toBe(true)
		expect(worker.self.skipWaiting).not.toHaveBeenCalled()
```

and drop its own `pending` lines. The offline tests use `worker.put`, which still exists. Add a new describe:

```ts
describe("install copies unchanged hashed files (spec §5)", () => {
	const chunk = "/data/vehicles.0123456789.json"
	const script = "/_astro/Tracker.Ab12Cd34.js"
	const fresh = async (url: string) => new Response(`new ${url}`)

	it("copies an unchanged chunk and script from the old cache instead of fetching them", async () => {
		const worker = loadWorker(fresh, {
			precache: [chunk, script, "/en/"],
			old: { "rookdex-v0": { [chunk]: new Response("old chunk"), [script]: new Response("old js") } },
		})
		await install(worker)
		expect(worker.fetch.mock.calls.map(([url]) => url)).toEqual(["/en/"])
		expect(await worker.cache.store.get(chunk)?.text()).toBe("old chunk")
		expect(await worker.cache.store.get(script)?.text()).toBe("old js")
	})

	it("fetches a page even when the old cache has it, because a page's URL never changes", async () => {
		const worker = loadWorker(fresh, { old: { "rookdex-v0": { "/en/": new Response("old page") } } })
		await install(worker)
		expect(await worker.cache.store.get("/en/")?.text()).toBe("new /en/")
	})

	it("never copies a failed response or one from a cache that is not Rookdex's", async () => {
		const worker = loadWorker(fresh, {
			precache: [chunk, script],
			old: {
				"rookdex-v0": { [chunk]: new Response("gone", { status: 404 }) },
				"other-v0": { [script]: new Response("foreign") },
			},
		})
		await install(worker)
		expect(await worker.cache.store.get(chunk)?.text()).toBe(`new ${chunk}`)
		expect(await worker.cache.store.get(script)?.text()).toBe(`new ${script}`)
	})

	it("rejects install when one fetch fails, so a half-filled cache never activates", async () => {
		const worker = loadWorker(async (url) => new Response("", { status: url === "/en/" ? 500 : 200 }), {
			precache: [chunk, "/en/"],
		})
		await expect(install(worker)).rejects.toThrow()
	})
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/sw/sw.test.ts`
Expected: the four new tests fail (the worker still calls `addAll`, which the fake no longer has). The first test fails the same way.

- [ ] **Step 3: Rewrite the install in `src/sw/sw.js`**

Replace the install listener with:

```js
// URLs whose name changes whenever their bytes do: Astro's hashed assets and the seed chunks
// (/data/<category>.<10 hex>.json, the hash in src/model/seedDelivery.ts).
const CONTENT_ADDRESSED = /^\/(?:_astro\/|data\/[a-z0-9-]+\.[0-9a-f]{10}\.json$)/

// The new worker precaches, then waits. The page's update notice asks it to take over, so an open
// page never runs half on the old version and half on the new (feedback spec §10.1).
self.addEventListener("install", (event) => {
	event.waitUntil(precache())
})

/**
 * Fills this version's cache (spec §5). A content-addressed file an older Rookdex cache already
 * holds is copied from there, so a deploy downloads only what changed. Pages, the root, icons and
 * the manifest keep their URL across versions, so they are always fetched. `cache.add` rejects on
 * any failed fetch, which rejects install: a half-filled cache never activates.
 */
async function precache() {
	const cache = await caches.open(CACHE)
	const names = (await caches.keys()).filter((key) => key.startsWith("rookdex-") && key !== CACHE)
	const older = await Promise.all(names.map((name) => caches.open(name)))
	await Promise.all(
		PRECACHE.map(async (url) => {
			if (CONTENT_ADDRESSED.test(url)) {
				for (const previous of older) {
					const copy = await previous.match(url)
					if (copy?.ok) {
						await cache.put(url, copy)
						return
					}
				}
			}
			await cache.add(url)
		})
	)
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/sw/sw.test.ts integrations/precache.test.ts`
Expected: PASS. `precache.test.ts` checks that `fillWorker` still finds both placeholders.

- [ ] **Step 5: Commit**

```bash
git add src/sw/sw.js src/sw/sw.test.ts
git commit -m "Copy unchanged hashed files from the old cache when a new service worker installs"
```

---

### Task 8: Measure, verify in a browser, open the PR

**Files:** none committed except the plan and, if Step 3 needs it, the preload change. Probes and numbers live in `../rookdex-lf/.superpowers/`.

- [ ] **Step 1: Build and read the numbers**

```bash
npm run build
ls -l dist/data
grep -l "Seed invalid" dist/_astro/*.js || echo "seed validator not in any client file"
ls -S dist/_astro/*.js | head -6 | xargs wc -c
node -e 'const fs=require("fs"),z=require("zlib");for(const p of ["dist/en/tracker/index.html","dist/en/index.html"]){const h=fs.readFileSync(p,"utf8");const m=h.match(/<script type="application\/json" id="seed-index">([\s\S]*?)<\/script>/);console.log(p,"index raw",m[1].length,"gz",z.gzipSync(m[1]).length)}'
```

Expected: five chunk files, "seed validator not in any client file", and no client file at the size of main's `stats.*.js` (141,833 bytes). The index is about 18 KB raw and 4 KB gzipped on both pages. Write the before and after bundle sizes into `.superpowers/lh/baseline.md` beside Task 0's.

- [ ] **Step 2: Lighthouse against the baseline**

```bash
rm -rf .superpowers/lh/dist-branch && cp -r dist .superpowers/lh/dist-branch
.superpowers/lh/measure.sh branch "$(pwd)/.superpowers/lh/dist-branch" 5
```

Expected: the `/en/tracker/` median performance is at least main's median from Task 0, and CLS does not rise. Write the numbers into `baseline.md`.

- [ ] **Step 3: Only if the tracker is slower than main, preload the chunks**

If the median is lower, the chunk fetch waits for the island. In that case, start it with the HTML. In `src/layouts/Base.astro`, add `<slot name="head" />` just before `</head>`. In `src/components/SeedIndex.astro`, add a `preload?: boolean` prop, and render this when it is set:

```astro
{preload && seedIndex.categories.map((c) => <link rel="preload" as="fetch" crossorigin="anonymous" href={c.chunk} slot="head" />)}
```

If Astro does not pass `slot` through a component's own output, render the links from the tracker page instead:

```astro
<Fragment slot="head">{seedIndex.categories.map((c) => <link rel="preload" as="fetch" crossorigin="anonymous" href={c.chunk} />)}</Fragment>
```

Then rebuild and rerun Step 2. Commit only if the median improved ("Preload the seed chunks with the tracker page"). If it did not, revert it and write both numbers in the PR body.

- [ ] **Step 4: Check it in a real browser**

Run the built site: `WRANGLER_SEND_METRICS=false npx wrangler dev --port 8799`. Write `.superpowers/probe/chunk-probe.mjs` on the pattern of `.superpowers/probe/panel-probe.mjs` (headless Brave over CDP, a fresh profile per run). It checks:

1. `/en/tracker/` with no service worker: the list renders with descriptions, and the console has no CSP error and no "Seed index missing".
2. The `/data/*.json` responses carry `Cache-Control: public, max-age=31536000, immutable`.
3. With `Fetch.enable` on `*/data/*` failing every request (`Fetch.failRequest`, `InternetDisconnected`), the offline notice shows above the list. Screenshot it at 320 and 1280 px, and at 320 px with 200 % text (`Page.setFontSizes`). The notice must not overflow and its Reload-free line must wrap cleanly.
4. With `Fetch.fulfillRequest` answering 404 for `*/data/*`, the stale notice shows with a Reload button 44 px tall. Measure the button's box.
5. `/en/` (the hub) makes no request to `/data/`.

Save the screenshots in `.superpowers/probe/` and look at every one before going on.

- [ ] **Step 5: Code review gate**

Run `/code-review high` on the branch diff against `origin/main`. Fix every bug or security finding, or show it is a false positive. Record what was kept and why under `## Review` in the PR body, per `~/.claude/loadout/standards/pr-review.md` (three rounds at most).

- [ ] **Step 6: Commit the plan and open the PR**

```bash
git add docs/superpowers/plans/2026-11-26-data-delivery.md
git commit -m "Add the data delivery plan"
git push -u origin feat/data-delivery
```

Write the PR body to `.superpowers/probe/pr-body-data-delivery.md` and open the PR from `../rookdex-lf` with `gh pr create --base main --head feat/data-delivery --title "Deliver the seed as an inlined index and hashed chunks" --body-file .superpowers/probe/pr-body-data-delivery.md`. The body covers what changed, the decisions above (index carries names; Zod stays for user data), the before and after numbers from `baseline.md`, the nb strings for her approval, the browser checks with what was not tested (a real phone, a real deploy with an old worker), and `## Review`. She merges by hand once every check is done.

---

## Self-review

- **Spec §5 coverage:** pure build and every check stay in `seedBuild.ts` and `seed.ts` (PR 1). Full result to Dex, sitemap and Sources (unchanged, they import `seed.ts`). Inlined index (Tasks 2, 3). Hashed chunk per category, loaded when shown, precached (Tasks 2, 3, 5, 6). Service worker copy of content-addressed URLs from `rookdex-*` caches, only ok responses, everything else fetched, a failed fetch rejects install (Task 7). Immutable `/data/*` (Task 3). Chunk loads keyed by category, cached in memory, and a late one never renders an unpressed category (Tasks 4, 5). `<` escaped (Task 2). Both failure messages in en and nb with Reload (Task 6). Browser never parses the seed (Task 6 guard).
- **Spec §10 coverage:** index shape snapshot (Task 2, as an explicit expected object, so a review sees the shape). Reverse-order chunk arrivals (Task 5). A rejected fetch and a 404 HTML body each show their message (Task 6). New locale keys in en and nb (Task 6, and the existing locale parity test). Service worker: copied not fetched, a changed page fetched, a failed fetch rejects (Task 7).
- **Not here, by the PR split:** the checklist in the index (100 % view PR), sets and hash opening of closed sets (PR 3), the Playwright smoke test (PR 4).
- **Types:** `TrackItem`, `SeedIndex`, `ChunkOutcome`, `ChunkState`, `listChunks`, `buildTracker(name, options)` and `installSeed` are used with the same names and shapes in every task that mentions them.

> Stress-tested 2026-11-26 (skill 546547e): 10 applied, 1 adapted, 0 decided by me.
