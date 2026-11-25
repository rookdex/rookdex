# Rookdex: Category model spec

Written 25.11.2026 from the categories brainstorm (23.11 to 25.11). GTA VI shipped on 19.11. The tracker still uses the category guesses I made before launch: 216 items in four seed files, sorted by file name. The game itself counts thousands of things in its Progress menu, and its 100 % checklist sets a need for each of 35 lines. This spec rebuilds the tracker on the game's own structure. Every thing the game counts can then be ticked, and a 100 % view shows how far a player is on each checklist line.

Mockups live beside the brainstorm, not in the repo: `.superpowers/mockups/categories/` (`levels.html`, `checklist.html`, `navigation.html`, `chips.html`). They use made-up progress numbers. Where a mockup and this spec differ, this spec wins.

## 1. What I agreed to

- **The game's names.** Categories, groups and sets use the names the game shows in its Progress menu. The old headings go ("Collectibles" becomes "Collections", "Wildlife" becomes "Animals").
- **Places stays.** Places has no Progress tile in the game, but it stays a counted category of my own.
- **One 100 % view** lists the 35 checklist lines under the game's three headings and counts each line from items in the categories. Items are never listed twice.
- **Every thing the game counts is its own tickable item.** Each collectible card, each hoop, each gang operation. Items are named where sources name them and numbered where nobody does ("Basketball Hoop 1" to "Basketball Hoop 100"). Every total is exact.
- **No user data is affected.** No IndexedDB version bump, no new export version, and no tick is ever lost or moved. If a later step ever has to touch stored data, users are told first and guided through Settings, export and import.
- **Research fills the lists, not my own play.** Names and details come from sources (§9). A save file is never needed.
- **Retire, never delete.** A shipped item that turns out wrong is retired: hidden and not counted, with its ticks kept.
- **Locations are words plus a link.** A location is the area in my own words plus a link to a guide for the exact spot. Pin sets are never copied (§8.3).

### Non-goals

- No map. The map waits for its own spec and for the art question (no Rockstar art until Take-Two answers in writing).
- No spoiler switch. "Hide spoilers" is its own feature. This spec only adds the field it will read (§8.4).
- No Story category content. Story items are not seeded until the spoiler switch ships (§2).
- No Online, PC or platform UI. The fields exist, the UI comes with the first item that needs it (§8.6).
- No per-location ticks. One item is one tick. Items with many spawn points are not ticked per spawn.

## 2. The tree

Category order follows the game's Progress tiles, then Places, then Story. Groups follow the game's tabs. A tile without tabs has one group named like the category. Totals come from the game's own counters where I have photos of them (23.11), otherwise from press (§9).

| Category | Groups (sets in brackets) | Game total |
|---|---|---|
| `vehicles` Vehicles | cars (9 classes as sets), bikes, watercraft, aircraft, service (6 classes as sets), standout (25 sets) | 277 base + 280 Standout |
| `weapons` Weapons | guns, melee, explosives, variants | 66 standard + 130 variants |
| `animals` Animals | hunting, fishing, mammals, cats-and-dogs, reptiles-amphibians, birds, aquatic, other | 255 |
| `equipment` Equipment | equipment | 12 |
| `collections` Collections | kentons-treasures (treasures as sets, doubloons as items), collectible-cards (18 sets), waink (5 sets), exploration (one set per type) | per group |
| `activities` Activities | sports, racing, race-challenges, shooting-ranges, games, stunts, top-fun-drones | per group |
| `contacts` Contacts | contacts | 10 |
| `gangs` Gangs | one group per gang (9), operations as items | 39 operations |
| `robberies` Robberies | one group per robbery type (11), locations as items | per group |
| `challenges` Challenges | combat, criminal, exploration, fitness, shopping, sports, survival, vehicle | 80 (8 x 10) |
| `places` Places | regions, cities, neighborhoods, keys, landmarks, businesses | my own |
| `story` Story (spoiler) | one group per chapter | not seeded yet |

- **Sub-parts become items.** Shooting golds are items per course and tier, with the course as the set. Meditations are items per spot and character, with the spot as the set. The two playlists each get their own set, with the posters that build them as items. Styles' four sub-groups are sets.
- **Places businesses.** The 11 business items stay in Places' existing `businesses` group. The map legend's shop and service layers belong to the map spec. Rideout Customs and One-Eyed Willie's exist twice today: the `vehicles/service` copies are retired. Mount Kalaga and Kelly County move to `regions`. The PTT raid item is retired.
- **Totals that are not settled yet** (Kenton treasures, Exploration types, WAiNK sub-groups, Robberies pairing, Sports items) ship only in the content PR for that group, once a game screen or two sources settle them (§9).

## 3. Levels and files

- **Folder per category, file per group:** `src/seed/categories/<category>/<group>.json`. A group file has a header and its items:

  ```json
  {
    "group": "collectible-cards",
    "order": 2,
    "total": 480,
    "sort": "file",
    "counts": true,
    "sets": [{ "id": "vice-city-flamingos", "total": 24 }],
    "sources": [{ "url": "https://...", "title": "..." }],
    "items": [{ "id": "collections/vice-city-flamingos-1", "set": "vice-city-flamingos", "name": "...", "status": "confirmed", "sources": [] }]
  }
  ```

- **No `category` or `group` on an item.** The folder and file give them. `set` is optional and must match a set in the header.
- **`src/seed/categories.json`** lists the category order and which category is a spoiler. Labels stay in `src/locales/{en,nb}.json` as `category.<id>`, `group.<id>` and `set.<id>`.
- **`total`** is the game's count for the group or set. The build fails when more items are listed than the total. When fewer are listed, the view says "Listed 60 of 125".
- **`sort: name | file`.** `name` sorts numbers by value and ignores leading punctuation, so "'70 Vapid Ganado" sorts under V and "Hoop 10" comes after "Hoop 9". `file` keeps the order in the file (card numbers, chapter order).
- **Sets fold.** In the tracker and the Dex, each set is a native `details` element, open by default. Its `summary` holds the set name as an `h4`, "n of N" and a progress bar marked `aria-hidden="true"` (the text carries the value). There are no set chips. If the NVDA pass shows the `h4` is not reachable with H inside `summary`, the fallback is `h4 > button[aria-expanded]`.
- **Nothing hides inside a closed set.** A hash target (`#item-<id>`, `hashTarget()` in `src/islands/tracker/hash.ts`), a Dex `#<id>` or a `?line=` filter opens every ancestor `details` before focus and scroll. While a search is active, sets with a match are open and sets without one are hidden.
- **What counts as listed:** only countable items (not retired, not `counts: false`, not edition-only). A set is complete only when listed equals its total and every item is ticked.

## 4. The 100 % view

- **Data:** `src/seed/checklist.json` holds 3 headings and 35 lines. Each line has `id`, `heading`, `need`, `count`, `from`, optional `spoiler`, optional `note` and `sources`. Labels are `checklist.<id>`.
- **Count types:**
  - `items`: ticked items in the line's `from` refs. Most lines. Race Challenge golds need 10 (three sources; one press page says 30, read as a typo).
  - `sets`: completed sets. Collectible cards (15 of 18), Kenton (5 of 7), playlists (2 of 2).
  - `target`: the game tracks money or an open-ended count that is not a list. The four Fenced lines and Optional Tasks show the need only, on a dotted track with no bar.
- **`from: [{ category, group?, set? }]`** lets one line span groups (Stick Ups, Smash 'n' Grabs, Bank Jobs, Magazines). The 8 vaults are their own items in a Vaults group, each with a `bank` link to its bank.
- **Build checks:** every ref exists, retired and `counts: false` items never count, no item sits in two lines, and a short list shows "Listed n of N".
- **Story line:** until the spoiler switch ships, Story is a `target` line with no items behind it.
- **View:** `/[locale]/tracker/completion/` under the Tracker tab (no sixth tab). Headings fold like sets, with "n of N lines". Each line shows ticked / need, a bar and a gray meta line. No overall percentage, because the game's weighting is unconfirmed. Spoiler lines keep their name and count. Kenton has a caution note, because one guide says it closes after an early chapter.
- **Air between headings:** the heading sections sit 40 px apart (the gap between tracker groups), not the 8 px in the mockup.
- **Entry points:** a bar at the top of the Tracker and a link on the dashboard. A line links to `?line=<id>`, which filters the tracker to that line's `from` refs.
- **`line` is a view param.** `openingView()` in `src/model/savedView.ts` treats a URL with `line` as naming a view (today only `show` and `group` do, so a saved view would win), `viewParams` saves it, and changing a tile or chip clears it. An unknown line id is dropped like an unknown `show` value (`parseLine`), and the tracker opens unfiltered.
- **Logic:** a pure `checklistProgress()` in `src/model/checklist.ts`. It is computed and never stored.

## 5. Build pipeline

- **`src/model/seedBuild.ts`** is pure. It reads `src/seed/categories/` and `checklist.json`, validates and sorts. An Astro integration, `integrations/seed.mjs`, calls it on build and on dev changes, the way `precache.mjs` runs. Vitest calls it directly.
- **Every check runs at build:** schema, duplicate ids, missing `from` refs, an item in two lines, listed above total, source hosts on the allowlist, the shipped-id list (§6) and the extras rules (§8). The browser never parses the seed with Zod again. This closes the senior review finding.
- **Output:**
  - The full result goes to the Dex, sitemap and Sources pages at build time.
  - A small index is inlined in the tracker page: categories, groups, sets, totals, the checklist and the countable ids per group and set. About 15 KB gzipped (estimate).
  - One hashed chunk per category, `/data/<category>.<hash>.json`, is loaded when the category opens and is precached.
- **Size:** vehicles today is 148 items in 93,936 bytes, about 635 bytes per item. About 2,600 items comes to about 1.6 MB raw, which is why the chunks are split.
- **Service worker:** on install, unchanged hashed files are copied from the old cache and only changed ones are fetched. Today `cache.addAll` into a fresh cache downloads everything on every deploy.
  - Only content-addressed URLs are copied: `/_astro/*` and `/data/*.<hash>.json`, where the hash covers the exact bytes. They are looked up with `caches.match` across the `rookdex-*` caches, and only ok responses are copied.
  - Everything else (pages, `/`, icons, the manifest) is always fetched. Any failed fetch rejects `install`, so a half-filled cache never activates.
  - `public/_headers` gets the same immutable `Cache-Control` for `/data/*` that `/_astro/*` has.
- **Chunk loads** are keyed by category and cached in memory. A response renders only if its category is still pressed, so a slow chunk never lands under a newer pick.
- **Index serialization:** the inlined index escapes `<` as `\u003c`. Every string field in the seed, including `specs` text and checklist `note`, goes through `text()`.
- **When a chunk fails,** one message goes to the tracker's existing `useLiveStatus` region, in en and nb:
  - Offline before the chunk is cached: "Can't load Collections offline yet. Open it once while online and it stays available."
  - A 404 or a body that is not the expected JSON (an old tab after an update): "Rookdex was updated. Reload to see the new list." with a Reload button.

## 6. Ids

- **An id never changes once shipped.** Moving an item means moving its JSON entry. `wildlife/cougar` lives in `src/seed/categories/animals/` and keeps its id. This replaces the `formerIds` idea.
- **Prefix rule and shipped ids:** `src/seed/shipped-ids.txt` lists every id that has shipped. Three checks keep it honest:
  1. Every id in the seed must be in the file, so a new item's line is added in the same PR.
  2. A CI step fails if the file at HEAD drops a line that is on `main`.
  3. An id that is not in the file on `main` must start with its folder's category (this replaces the prefix check at `seed.ts:114`).
- **Same thing, same id.** A content PR keeps the shipped id when the item is the same thing, as #149 did for the renames. Only items that do not exist in the game are retired. The build fails when a new item's name or alias equals a retired item's name in the same category, unless the new item lists that id in `replaces`. Otherwise a tick would sit on a hidden item while its twin shows unticked.
- **Id length:** item ids stay on `idSchema` (one slash, 80 characters max), because `progressRecordSchema` checks stored ticks against it.
- **Removed items:** Settings shows "N items you ticked were removed from the list. Your ticks are kept." with the list (nb: «N elementer du har krysset av, er fjernet fra lista. Avkrysningene dine er tatt vare på.»). "Listed n of N" is «Listet n av N» in nb. `mergedInto` is added only when the first real merge happens.
- **Renamed categories:** 301s in `public/_redirects` send `/dex/wildlife/` to `/dex/animals/` and `/dex/collectibles/` to `/dex/collections/`, in both locales. `?show=wildlife` and a saved tracker view naming `wildlife` are read as `animals`. Old group keys (`vehicles:boats`, `wildlife:*`) are dropped by `parseGroups`, so such a view falls back to the whole category.
- **Old Dex anchors** for items that leave Collections (stunts and races move to Activities) land on the Collections page without the item, because the server never sees the fragment. Accepted: these were pre-launch guesses with few links.
- **New ids come from names.** Duplicates get a distinguishing part (`lombank-ocean-beach-north`). Unnamed items are numbered (`basketball-hoop-1` to `basketball-hoop-100`).
- **Stored data:** no DB bump and no export v3. `transfer.ts` already keeps unknown ids on import, so an older backup still imports.
- **Hardcoded ids to update:** `FIRST_GOAL` in `src/model/dashboard.ts`, `src/model/searchTerms.ts`, the `?show=` values in `CategoryBars`, and `categoryIcon` in `src/islands/tracker/icons.tsx`, which also needs icons for the 8 new categories.

## 7. Navigation

- **Phones:** the category grid folds to one bar on the first tile press ("Collections 3 of 886 · Change"). With two pressed it lists both; with All it says "All". "Change" is a `button` with `aria-expanded`. After folding, focus moves to Change; after unfolding, to the first pressed tile, so focus never drops to `body`. Pressing more categories means unfolding first. With 11 tiles (Story hidden), the unfolded grid would push the first item to about 931 px on a 360 px phone. Folded, it starts at about 426 px.
- **768 px and up:** the grid always shows. 11 categories plus the All and Sources tiles make 13, so 4 columns by 4 rows (Story stays hidden until the spoiler switch ships). Desktop keeps the side list.
- **Tile order:** the game's Progress order, then Places, then Story. Story shows only when Hide spoilers is off.
- **Group chips (option B):** small square chips replace the pills.
  - The visible box is `min-height: 2rem` (32 px at normal text size), padding-driven so a wrapped label at 200 % text never clips, with a 6 px radius and 0.8125rem text.
  - A `::before` with `inset: -6px -3px` keeps the tap area at 44 px. Rows sit 12 px apart and chips 6 px apart, so tap areas never overlap.
  - Pressed is a pink border, a 16 % pink tint and the check. It is never shown by color alone.
  - Multi-select, the fieldset and the counts stay as they are.
  - Measured on a 360 px phone with the 6 Vehicles groups: 76 px in 2 rows, against 146 px in 3 rows today.
  - The Dex `ChipNav` is not touched.

## 8. Item extras

All of these are optional, checked at build and English-only in the seed. They are rendered with `lang="en"` on `/nb/` (this also fixes the missing `lang` on tracker seed text). Plain text fields keep the existing rule: no URLs and no markup.

### 8.1 Aliases

`aliases`: up to 5 old or common names, 80 characters each. Search matches them, but they are never shown. The build fails if an alias equals another item's name or alias in the same category. The four renames from #149 get their old names, so "Pegassi Zorrusso" still finds the Granforma Zorrusso.

### 8.2 Tips

`tips`: up to 3. Each is `{ text, spoiler?, sources }`, where `text` is one or two sentences in my own words (300 characters max) with at least one source. Guide text is never pasted. A tip with a spoiler stays folded behind a disclosure.

### 8.3 Locations

`locations`: up to 10. Each is `{ area, kind, link? }`.
- `area` is the place in my own words, 120 characters max ("behind the gas station, grid F6").
- `kind` is `find`, `spawn`, `buy` or `unlock`.
- `link` is `{ url, title }` to a guide page for the exact spot. Its host must be on the allowlist, as for sources.

These replace the unused `location` field. There is no x/y: coordinates and a `positionSource` (`own`, `guide-text` or `licensed`) arrive with the map spec. A whole pin set is never copied from another map. Under the EEA database right (åndsverkloven § 24), a map's collected pins are protected even though each position is a fact.

### 8.4 Spoilers

`spoiler: story | gate`. `story` is plot content, `gate` is when or how something unlocks. Until the spoiler switch ships, `story` items are not seeded and every `gate` text sits behind a disclosure. The same field exists on checklist lines and on groups.

### 8.5 Edition

`edition: ultimate | plus`, for edition-only items such as Wyman's Cars. These items do not count unless the line says so.

### 8.6 Mode and platforms

`mode: story | online` (default `story`; the label is "Story mode" so it never clashes with the Story category) and `platforms: [ps5, xbox, pc]` (default all). Both are in the schema now with no UI. The build fails on an `online` item or a platform-limited item until the Settings preference exists. That preference gets built with the first such item (Online or the PC launch).

### 8.7 Specs

`specs` holds what the game's own Progress screens show, read from game screenshots:
- **Vehicles, base models:** `style`, `era`, `modShop` as exact text from the screen.
- **Vehicles, Standout:** `rating` as exact text, plus `speed`, `acceleration`, `asphaltHandling`, `offRoadHandling` and `strength` as 1 to 10, read from each bar's length.
- **Weapons:** `damage`, `accuracy`, `handling` and `range`, 1 to 10 from the bars.

Rules:
- The allowed keys are fixed per category and group, and the build rejects others.
- The Dex shows bars as bars, never as bare numbers, so a reading never looks more exact than the screen. Each bar is `aria-hidden` and has a visually hidden text equivalent that keeps the same precision ("Speed: about 7 of 10", in en and nb).
- The source is a new kind, `{ kind: "game", screen: "Progress > Vehicles > Standout" }`, with no URL. The Sources page lists it as "In-game Progress menu".
- Values fill in as screenshots arrive. An item without specs shows nothing.
- Numbers tables from other sites are never copied.

### 8.8 Where the extras show

- On the Dex card, tips, locations and specs are folding rows built like the Sources row today.
- The tracker row stays as it is and links to the Dex card (`#<id>`).
- Dex search matches aliases.

## 9. Source rule after launch

- **Source of record:** a game screen (the `game` source kind), or two independent press sources.
- **Allowlist additions to press:** powerpyx.com, pushsquare.com, videogameschronicle.com, kotaku.com, blog.playstation.com, news.xbox.com and redbull.com.
- **Independent** means two different hosts after `normalizeHost`. Item `sources` may be empty only when the group header has sources; the status rule applies to the union. `game` is its own branch of a discriminated source schema and has no `url`.
- **No list is taken whole from one site.** Under the EEA database right (åndsverkloven § 24), a guide's complete list (names, order and set split) is protected even though each entry is a fact. That holds for gtabase.com, powerpyx.com and every other guide. A group's list comes from a game screen, or each item has two independent press sources. Single facts from one site are fine.
- **Status:** new items are `confirmed`. `expected` and `precedent` stay in the schema for the items already shipped. The pre-launch guesses get retired in the content PRs (§11).

## 10. Testing

- **`seedBuild`:** one fixture folder per check that must fail the build: duplicate id, unknown set, listed above total, missing `from` ref, item in two lines, missing shipped id, seed id not in `shipped-ids.txt`, new id with a foreign prefix, id over 80 characters, new item matching a retired item's name without `replaces`, alias collision, tip without a source, two press sources on one host, empty item sources under an empty header, a `game` source with a `url`, a `<` in a `specs` value, link host not on the allowlist, unknown spec key, spec value outside 1 to 10, `online` item with no UI. One fixture folder that must pass, with retired items at a group's total.
- **Index shape:** a snapshot of the inlined index for the fixture.
- **`checklistProgress()`:** `items`, `sets` and `target` lines, retired items, `counts: false`, a short list, and a short set that never counts as complete.
- **Tracker:** `savedView.test.ts` (a saved view plus `?line=x` opens on line x; an unknown line opens unfiltered), a hash target inside a closed set opens it and focuses the checkbox, a search match inside a closed set is visible, two chunk fetches resolved in reverse order render only the pressed category, a rejected fetch and a 404 HTML body each show their message, and every new locale key exists in en and nb.
- **Ids:** `seed.test.ts` moves to the new loader. The shipped-id check and the redirect lines are tested.
- **Search:** an alias finds the item, and an old name finds the new name.
- **Dex render:** tips, locations and specs fold. Gate text stays hidden until opened. axe passes on a Dex page with every extra.
- **Service worker:** an unchanged chunk is copied, not fetched; a changed page is fetched even when the old cache has it; a failed fetch rejects install.
- **Playwright smoke** (the first one; this closes the senior review finding): open the tracker, pick a category, press a group chip, tick an item, reload, and check that the tick is still there. The same run checks that a point 5 px above a chip's visible box still hits the chip (the 44 px tap area).
- **Screen reader:** an NVDA pass with Brave on a tracker set, a 100 % heading, the folded category bar and one Standout card.
- **Layout:** the tracker with chips B, the folded grid and the 100 % view, measured at 320, 768, 1024, 1280, 1600 and 1920 px, in English and Norwegian, at 200 % text.

## 11. Delivery

1. **Foundation PR.** Pipeline, schema and extras fields, the folder layout with today's 216 items moved in (ids unchanged), `shipped-ids.txt`, chunks, the service worker fix, navigation, chips B, the 301s and the Playwright smoke test. The smoke test adds `@playwright/test` as a dev dependency at an exact version with the lockfile committed. It runs in its own CI job, which is not a required check at first. Players see the new grid and chips. Their ticks stay the same.
2. **100 % view PR.** `checklist.json`, `checklistProgress()` and the page.
3. **Content PRs, one per group.** Each one lists its names, totals and sources, retires the matching pre-launch guesses, and passes the build checks. Groups with settled totals go first (vehicles, weapons, animals, challenges, collectible cards). Unsettled groups wait for screenshots of the 100 % checklist and the tiles that are still open.

Deploys stay batched: each deploy makes phones download the changed chunks, so content PRs merge one or two a day at most.

> Stress-tested 2026-11-25 (skill 546547e): 17 applied, 1 adapted, 0 decided by me.
