# Rookdex: tracker search and hide found design spec

Written 30.10.2026 from the tracker search brainstorm (sessions 89 and 90). It adds a search field and a "Hide found" toggle to the tracker page, in one sticky row above the category chips.

GTA VI launches Thursday 19 November 2026. The target moment is launch night and the weeks after it: the game is running, the phone is beside the controller, and a player wants to tick the thing they just saw, or see what is left, in a few seconds and offline.

## 1. What this spec covers

- A search field that matches item names and group terms in English and Norwegian, on every page language.
- A "Hide found" toggle that hides items already found, remembered on the device.
- How search and the category chips work together, including a hint when other categories also match.
- A sticky row on phone and desktop, copy in English and Norwegian, accessibility, edge cases and tests.

### Non-goals

- **No site-wide search.** Searching guides, news, facts and sources is its own sub-project after launch. It needs an index of every page in both languages that works offline (for example one built from the finished HTML at build time, precached by the service worker). `normalize` and `matches` from this spec are written to take plain text fields, so that project can reuse them.
- No search in item descriptions.
- No search on the hub (dashboard). Its tracker cards stay as they are.
- No stronger "found" style. A found item keeps today's look: a ticked checkbox, no dimming.
- No change to the tracker model, profiles, storage format or progress numbers.
- The search text is not remembered and never reaches the URL.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Purpose (Q1) | Quick-tick search and "what's left" matter equally | Launch night is both "I just saw a Tulip" and "what haven't I found" |
| Tick with Hide found on (Q2) | The item stays visible as found until the search or chips change or I leave the page | Nothing moves under the finger during fast ticking, undo is the same tap, and keyboard focus never jumps |
| Search scope (Q3, amended) | Item name plus the group's search terms in both languages, on every page | People type what they see (a name) or the kind of thing ("boat", "båt"). Descriptions would add noise, and English-only prose is no use on `/nb/` |
| Both languages | "car" and "bil" give the same results on `/en/` and `/nb/` | My own request. Norwegian plurals change the stem ("motorsykkel" is not inside "Motorsykler"), so plain label matching would miss singulars |
| Search and chips (Q4) | Search runs inside the selected chips. A line "N more in other categories" with a "Show all categories" button appears when other categories also match | Chips keep meaning what they say, and a car never looks missing because Wildlife was still selected |
| Hide found memory (Q5) | Remembered on this device (localStorage). The toggle shows how many items it hides | The installed app opens from the home screen, where URL state is lost. The count stops "my items vanished" |
| Placement (Q6) | One row above the chips, on phone and desktop, sticky wherever the screen is at least 500 px tall (section 5) | Search is one tap away anywhere in a list of 215 items. Search comes first and the chips refine it |
| Architecture | Pure functions in `src/model/search.ts`, view state in a `useSearch` hook | Follows the stack rule (thin components, hooks, pure modules). The tracker model that owns my saved data stays untouched |
| Search text | Not remembered, clears when I leave the page | Fits Q2: the list tidies itself on the next visit |

## 3. Units

### 3.1 `src/model/search.ts` (pure, no React)

- `normalize(text: string): string`: Unicode NFD, combining marks removed, lowercase, trimmed, runs of whitespace collapsed to one space. "Übermacht" becomes "ubermacht" and "Båter" becomes "bater". "ø" and "æ" are letters, not accents, so they stay as they are.
- `matches(query: string, fields: string[]): boolean`: splits the normalized query on spaces. Every word must appear as a substring in at least one normalized field, checked with `String.prototype.includes`. A `RegExp` is never built from the query, so characters like `(` or `*` are plain text. An empty query matches everything.
- `searchView(input): SearchView` takes:
  - `items` (the seed items), `records` (the current profile's ticks), `selected` (chip ids, empty means All),
  - `query`, `hidden` (the snapshot set of ids, empty when Hide found is off),
  - `terms` (group id to search terms, from 3.2).

  It returns:
  - `visible`: items inside the chips that match the query and are not in `hidden`, in today's order.
  - `elsewhere`: the number of items outside the chips that match the query and are not in `hidden`. It is 0 when the query is empty or no chips are selected.
  - `hiddenCount`: the number of items inside the chips that match the query and are in `hidden`.

  A field list per item is `[item.name, ...terms[item.group]]`.

### 3.2 `src/model/searchTerms.ts`

One map from group id to search words in both languages. Each entry holds the `en` and `nb` labels plus singulars and common words. Draft, to be checked when building:

| Group | Terms |
|---|---|
| cars | car, cars, bil, biler |
| motorcycles | motorcycle, motorcycles, motorbike, bike, motorsykkel, motorsykler, mc |
| boats | boat, boats, båt, båter |
| aircraft | aircraft, plane, planes, helicopter, helicopters, fly, helikopter, helikoptre |
| emergency | emergency, police, ambulance, utrykning, politi, ambulanse |
| commercial | commercial, van, truck, bus, nyttekjøretøy, varebil, lastebil, buss |
| service | service, services, garage, shop, tjeneste, tjenester, verksted |
| vehicles | vehicle, vehicles, kjøretøy |
| reptiles | reptile, reptiles, animal, animals, krypdyr, dyr |
| birds | bird, birds, animal, animals, fugl, fugler, dyr |
| mammals | mammal, mammals, animal, animals, pattedyr, dyr |
| marine | marine life, fish, sea, animal, animals, sjødyr, fisk, hav, dyr |
| cities | city, cities, by, byer |
| keys | keys, island, islands, øy, øyer |
| regions | region, regions, regioner |
| landmarks | landmark, landmarks, landemerke, landemerker |
| businesses | business, businesses, shop, store, bedrift, bedrifter, butikk |
| neighborhoods | neighborhood, neighborhoods, district, bydel, bydeler |
| hidden-items | hidden item, hidden items, skjult gjenstand, skjulte gjenstander |
| stunts | stunt, stunts, jump, hopp |
| challenges | challenge, challenges, utfordring, utfordringer |

The terms carry no page language, so the island needs no second dictionary.

### 3.3 `src/islands/seenFlag.ts`

Add `clearFlag(key)` beside `writeFlag`, with the same `try`/`catch` behaviour. Add `HIDE_FOUND_KEY = "rookdex.hide-found"`.

### 3.4 `src/islands/tracker/useSearch.ts` (hook)

Holds `query`, `hideFound` (read with `readFlag` on mount, written with `writeFlag`/`clearFlag`) and the `hidden` snapshot. Exposes `setQuery`, `clearQuery`, `toggleHideFound` and the `searchView` result.

Snapshot rule: when Hide found is on, `hidden` is the set of ids found at the moment of the last snapshot. When it is off, `hidden` is empty. A new snapshot is taken when:

1. the tracker becomes ready (the first snapshot waits for this, because the island is `client:only` and ticks load after mount),
2. the query changes,
3. the chips change,
4. Hide found is switched on,
5. the current profile changes,
6. an import is confirmed.

A tick, an untick, or ticks synced from another tab never take a new snapshot.

### 3.5 `src/islands/tracker/SearchBar.tsx`

The sticky row: the field, its clear button and the toggle. Props carry the query, the flag, `hiddenCount`, the handlers and `t`. It holds no state of its own.

### 3.6 `src/islands/Tracker.tsx`

- Renders `SearchBar` above `CategoryNav`.
- Passes `searchView().visible` to `ItemList` instead of today's chip filter. `ItemList` does not change.
- Renders the "N more in other categories" line and the empty states under the list.
- The stats rail and category counts keep counting every item.

## 4. Behaviour

- **Typing:** the list filters on every keystroke, with no delay. 215 items need none.
- **Empty or space-only query:** today's chip view, with Hide found applied.
- **Categories and groups** with no visible items are left out, as `ItemList` already does for empty input.
- **Elsewhere hint:** shown when the query is not empty, chips are selected and `elsewhere > 0`. "Show all categories" selects All, keeps the query and moves focus to the search field, because the button itself disappears.
- **Empty states, in this order:**
  1. No match in the chips and `elsewhere > 0`: the hint line becomes the main message.
  2. No match anywhere and `hiddenCount > 0`: "Everything that matches is found. Turn off Hide found to see it."
  3. No match anywhere: "No match for "{query}"."
- **Hide found count:** shown on the toggle only while it is on: "Hide found · 37". The number is `hiddenCount`.

## 5. Layout and accessibility

- **Row:** a `role="search"` element above the chips with a solid `--bg` background and a hairline bottom border. The field and the toggle are both `var(--tap)` (44 px) high and share one bottom edge. The row is about 60 px high.
- **Sticky only where there is room:** the base style is static. From `@media (min-height: 500px)` the row gets `position: sticky; top: 0`. A phone in landscape (about 360 px high) or a page at 200 % zoom would otherwise lose a third of the screen to the row.
- **Field:** `<input type="search">` with a visually hidden `<label>` and a placeholder, `maxlength="100"`, `autocomplete="off"`, `enterkeyhint="search"`. Enter does nothing (no form submit). Escape clears the field. A clear button (44 px target, accessible name "Clear search") shows only while there is text, and puts focus back in the field.
- **Placeholder contrast:** the placeholder is the only visible hint once the label is hidden, so its colour meets 4.5:1 against the field background, like body text.
- **Toggle:** `<button aria-pressed>` with an eye-off icon. It uses the chips' pressed style, including their `forced-colors` handling, so the on state never depends on colour alone. At narrow widths the label may become visually hidden, leaving the icon and count. I decide this by measuring at 320 px in both languages ("Skjul funnet" is longer), not by guessing.
- **Focus not obscured (WCAG 2.2, 2.4.11; house bar 2.4.12):** while the row is sticky, the tracker page sets `scroll-padding-top` to the row's height, so a checkbox focused while tabbing backwards never sits under the row.
- **Announcements:** search uses the tracker's existing polite status region (`Tracker.tsx`), not a second one. One status region per page is the house rule, and it already exists from mount, outside the list that re-renders. The last event wins:
  - **Typing:** the result ("12 results", "No results in the selected categories. 4 in other categories.") is written about 500 ms after typing stops.
  - **A tick:** today's tick announcement. It cancels a pending typing announcement, so a fast tick is never talked over.
  - **Hide found:** "Hide found on. 37 hidden." or "Hide found off."
  - **Clear button or Escape:** "Search cleared".
  - **Show all categories:** the new result count, written at once.
  - The pending timer is cleared on unmount.
- **Mobile-first CSS:** the base styles are for 320 px. Changes at `min-width` breakpoints only, if the measurements call for them.

## 6. Copy

| Key | en | nb |
|---|---|---|
| `tracker.search.label` | Search the tracker | Søk i oversikten |
| `tracker.search.placeholder` | Name or type, e.g. Tulip or boat | Navn eller type, f.eks. Tulip eller båt |
| `tracker.search.clear` | Clear search | Tøm søket |
| `tracker.search.hideFound` | Hide found | Skjul funnet |
| `tracker.search.hiddenCount` | {count} hidden | {count} skjult |
| `tracker.search.elsewhere.one` | 1 more in other categories | 1 til i andre kategorier |
| `tracker.search.elsewhere.other` | {count} more in other categories | {count} til i andre kategorier |
| `tracker.search.showAll` | Show all categories | Vis alle kategorier |
| `tracker.search.noMatch` | No match for "{query}". | Ingen treff på «{query}». |
| `tracker.search.allFound` | Everything that matches is found. Turn off Hide found to see it. | Alt som passer er funnet. Slå av Skjul funnet for å se det. |
| `tracker.search.results.one` | 1 result | 1 treff |
| `tracker.search.results.other` | {count} results | {count} treff |
| `tracker.search.resultsElsewhere` | No results in the selected categories. {count} in other categories. | Ingen treff i de valgte kategoriene. {count} i andre kategorier. |
| `tracker.search.hideFoundOn` | Hide found on. {count} hidden. | Skjul funnet på. {count} skjult. |
| `tracker.search.hideFoundOff` | Hide found off. | Skjul funnet av. |
| `tracker.search.cleared` | Search cleared | Søket er tømt |

Plural keys follow the existing `.one` / `.other` pattern (`hub.foundToday`).

## 7. Edge cases

- **Loading:** the row renders at once. The field works while loading, and results apply when the tracker is ready. The first snapshot waits for ready (3.4).
- **Layout shift:** the page's fallback already reserves a full screen (`.tracker-fallback`, `min-height: 100dvh`) and the island mounts inside it, so the new row needs no extra reserve. I re-measure load CLS at 320 px to confirm.
- **Storage blocked:** `readFlag` returns false, so Hide found starts off. Writes fail silently, as the other flags do.
- **Profile switch, delete or restore:** counts as a profile change, so a new snapshot is taken.
- **Another tab ticks** (storage-event sync): the list updates, no new snapshot.
- **Deep links:** `?show=` keeps working. The query always starts empty.
- **Untick a found item that is visible:** it simply becomes not found and stays where it is.
- **Very long input:** capped at 100 characters by `maxlength`.

## 8. Privacy, security and performance

- No network calls. Matching runs in the browser on data the page already has.
- The query is never stored, logged or put in the URL. The only new stored value is the flag `rookdex.hide-found`.
- The query is rendered as text only (React escaping). It never reaches `innerHTML`.
- Bundle cost: about 21 short term lists plus a few small functions. I report the tracker bundle size before and after in the PR.

## 9. Tests

**Unit (pure):**
- `src/model/search.test.ts`
  - `normalize`: "Übermacht", "Båter", extra spaces, "ø" kept.
  - `matches`: multi-word ("albany primo"), name hits, term hits in both languages ("car" and "bil" return the same set), empty and space-only queries.
  - `searchView`: chips plus query, `elsewhere` (0 with no query, 0 with All), snapshot (found before it hidden, found after it visible), `hiddenCount`.
- `src/model/searchTerms.test.ts`: the check is a pure function, `missingTerms(groups, terms, labels)`, run on the real seed and both locale files: every group has terms, and each entry contains that group's `en` and `nb` labels. A second case feeds it a broken fixture (one group with no entry, one entry missing its `nb` label) and expects both reported, so the guard is proven to go red.
- `src/islands/seenFlag.test.ts`: `clearFlag`, including blocked storage.

**Hook and components:**
- `src/islands/tracker/useSearch.test.ts`: remembered flag, first snapshot waits for ready, new snapshot on query, chips, toggle on, profile change and import, no new snapshot on a tick or a synced tick.
- Announcements (in `Tracker.search.test.tsx`, fake timers): the result after 500 ms, a tick cancelling a pending result, the Hide found on and off lines, "Search cleared", and no write after unmount.
- `src/islands/tracker/SearchBar.test.tsx`: label, `aria-pressed`, count, clear button, Escape, Enter does not submit.
- `src/islands/Tracker.search.test.tsx`: typing filters, a tick stays visible with Hide found on, "Show all categories" switches to All and moves focus to the field, all three empty states, live region text.
- `src/i18n/copy.test.ts`: every `tracker.search.*` key exists in `en` and `nb`.

**Measured in the Browser pane before the PR:**
- At 320 px and 1265 px, on `/en/` and `/nb/`: row height, both controls exactly 44 px on one bottom edge, toggle text fits or drops to icon plus count.
- Sticky row while scrolling, and backwards tabbing never hides a focused checkbox under it. At a 640x360 viewport (landscape phone) the row is static.
- Placeholder contrast read off computed colours (4.5:1 or more).
- `forced-colors`: the toggle's on state stays visible. Manual: me, in the Browser pane with forced-colors emulation if it offers it. Otherwise Malin checks it once in Edge DevTools (Rendering, "Emulate CSS forced-colors") before merge.
- Load CLS on `/en/tracker/` at 320 px. Lighthouse CI already runs on that page.
- Accessibility tree: search landmark, accessible names, live region.

## 10. Considered and rejected

- **Constant `aria-pressed="true"` on the toggle.** The house rule for settings toggles applies to a button whose text shows the current value. "Hide found" has a fixed label, like the chips, so the standard `true`/`false` pattern is right and matches `CategoryNav`.
- **Enter closes the phone keyboard by blurring the field.** Blurring sends focus to `<body>`, which loses a keyboard user's place. The phone's own back or hide-keyboard key does the job.
- **Whole-word or prefix matching for group terms**, so "bus" stops listing businesses. It would also break partial typing ("helik" finding helicopters). The false positives are few, visible and harmless.
- **A second live region for search.** One status region per page is the house rule. The tick-cancels-pending rule in section 5 solves the clash that a second region was meant to avoid.
- **Syncing Hide found across tabs.** Another tab keeps its own setting until it reloads. A storage listener for one view flag is more code than the case is worth.
- **Hide found per profile.** Ruled out at Q5: a profile data change for a view preference.

> Stress-tested 2026-10-30 (skill 1b85fca): 8 applied, 1 adapted, 0 decided by me.
