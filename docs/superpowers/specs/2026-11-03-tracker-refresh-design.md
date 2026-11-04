# Rookdex: tracker refresh design spec

Written 03.11.2026 from the tracker refresh brainstorm (sessions 98 to 100), with mockups in the visual companion. It gives the tracker page a stronger look and denser cards before launch: category tiles with icons, big section titles, icon-lead cards with a round check, a slimmer stats rail, a "Last found" row on phones and the profile button in the title row.

GTA VI launches Thursday 19.11.2026. The freeze is Thursday 12.11.2026, so both PRs are merged by Tuesday 10.11.2026 at the latest. Going faster is fine; the dates are ceilings, not a pace.

## 1. What this spec covers

- **PR 1, the look:** category tiles, section and group titles with counts, spacing and page width, a round check with a ✓.
- **PR 2, the structure:** the icon-lead card, the slim stats rail with relative times, the phone "Last found" row and the profile button in the title row. Since 04.11 it also takes the wide-screen steps (§14.2).
- **PR 3, group chips (added 04.11):** toggle chips under each pressed category's title that filter the list by group (§14.1).

PR 1 changes styling and markup only. Card behaviour, the rail and profiles work exactly as today. If PR 2 is not green by 10.11, it waits until after launch week and PR 1 ships alone. PR 3 follows the same rule: cut from main after PR 2 merges, merged by 10.11 or held until after launch week.

### Non-goals

- No change to the tracker model, records, storage, export format or progress maths.
- No change to search, Hide found, the category filter logic or the hub (dashboard). PR 3 is the one exception: it adds a group filter inside the category filter (§14.1). The hub's `RecentFinds` and its `Bar` import keep working as they are.
- No Dex entry link, no favourites star, no profile picture and no site-header profile. Those are December work (§13). This spec only keeps room for them.
- No per-category colours. The brand keeps one accent (pink) and cyan for links and Expected. Category identity comes from icons.

## 2. Locked decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Sidebar | Count cards (Q1 A) with an icon per category | Her pick; tiles across the top would undo layout B |
| Phone tiles | All as a full-width hero row, the four categories in a 2×2 grid (Q2 P2) | One tile component, layouts in CSS only |
| Filters | Stay multi-select toggle buttons with `aria-pressed` | Unchanged behaviour, unchanged tests |
| Profile placement | Tracker title row, top right (Q3 T), initial avatar | Fits before the freeze; the header version is December |
| Card | Icon lead (Q4 B): icon tile, name, one meta line, round check top right, book and flag in the footer, description clamped to 2 lines | 164 px tall against 231 px today |
| Rail | Big overall % and Recent finds with icons and relative times (Q5 R1); the four category bars go | The tiles carry per-category counts now |
| Phones | One "Last found" row (Q5 M1); tapping it jumps to the card | The rail does not fit beside the list |
| Spacing | S3 mix: true black, no panels; 12 px cards, 40 px groups, 72 px categories, 48 px columns | Her verdict on S1, S2 and S3 |
| Titles | Category title in Bebas Neue 40 px with icon, count and a gradient line to the edge; group title 14 px bold uppercase white with its own count and a 1 px line above | Borrowed from the trackers she sent |
| Found state | Icon tile and card border turn pink, the check shows a ✓ | Never colour alone (her feedback on S3) |
| Counts | Always the whole category or group, never the filtered view | Numbers must not jump while typing |
| Delivery | One spec, three PRs (PR 3 added 04.11, §14) | The look can ship alone if PR 2 slips |

## 3. Layout per breakpoint

Mobile-first: the base styles are the phone, then `min-width` 768 px and 1024 px.

### 3.1 Phones (under 768 px)

From top: title row (h1 and profile button), sticky search row, tiles (All hero, 2×2 grid, Sources link full width), "Last found" row, then the list in one column. No rail.

### 3.2 Tablet (768 to 1023 px)

All as a full-width row, then the four categories in one row of four (about 176 px each at 768 px), then Sources. The list shows two cards across where it has room (§3.4). No rail; the "Last found" row stays.

Section 1 of the brainstorm said all five tiles in one row. At 768 px that leaves about 137 px a tile, and "Collectibles" with its count does not fit, so All keeps its own row. This keeps the tablet from being a stretched phone layout either way.

### 3.3 Desktop (1024 px and up)

Three columns: tiles stacked (200 px), the list, the rail (200 px), with 48 px between columns. `--tracker-max-w` becomes `calc(200px + 624px + 200px + 2 * 48px)` = 1120 px. The h1 keeps reading the same width, so the title starts on the search row's left edge.

### 3.4 The card grid

`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` with a 12 px gap. At 1024 px the list is about 496 px, so it shows one card across; from about 1200 px it shows two.

### 3.5 Spacing

| Between | Space |
| --- | --- |
| Cards | 12 px |
| Groups | 40 px |
| Categories | 72 px |
| Columns (desktop) | 48 px |

The page background stays true black (`--bg`). No panels around categories or groups.

## 4. PR 1: the look

### 4.1 Category tiles (`CategoryNav.tsx`)

Each filter button becomes a tile: an icon tile (36 px), the label, a count and a slim progress bar.

- The count shows "40/148" in Bebas Neue at 26 px, **regular weight (400)**, with "/148" at 0.6 em in `--text-muted`. Bebas Neue ships one weight; any bold would be faked by the browser and smear the digits (her feedback on S3).
- The button's accessible name is the label and the count in words: "Vehicles, 40 of 148" (`tracker.count`). The visual "40/148" and the bar are `aria-hidden`. A `role="progressbar"` inside a button would lose its role anyway (button children are presentational).
- **Two arrangements of the one tile, set in CSS only:**
  - **Wide:** icon, label, count right-aligned on the label's line, bar under. Used for All on phones and tablet, and for every tile on desktop (S3).
  - **Stacked:** icon and label on the first line, the count under it, the bar under that. Used for the four category tiles in the phone 2×2 grid and the tablet row of four (the approved P2 mockup). At 320 px a grid tile is about 138 px wide, and the wide arrangement does not fit "Collectibles" and its count.
  - The label may wrap at 200 % text; the count never overlaps it.
- Pressed tiles get the pink border and the pink icon tile, as in S3. In forced colours they join today's rule for pressed chips (`forced-color-adjust: none`, `Highlight` background and border, `HighlightText`), because forced colours drop the pink and pressed would look like not pressed.
- Tiles are at least 44 px tall; S3 measured 58 px, all five the same height. Tiles in one row share one height.
- `CategoryNav` gets the per-category counts it needs as a prop (`counts: Record<string, Count>` plus the overall count for All). `Tracker.tsx` already computes them for the rail.

### 4.2 Icons (`icons.tsx`)

Five new icons in the existing style (24 viewBox, 2 px stroke, `currentColor`, `aria-hidden`): All (a 2×2 grid), Collectibles (a star), Places (a map pin), Vehicles (a car), Wildlife (a paw). My own geometry, so no icon set's licence applies. A `categoryIcon(id)` helper maps category ids to icons and falls back to the All icon for an unknown id.

### 4.3 Section and group titles (`ItemList.tsx`)

- **Category:** icon tile, the name as `h2` in Bebas Neue (40 px from 1024 px, 32 px below), "40 of 148" in Bebas Neue 22 px muted (a sibling of the `h2`, not inside it, so the headings list and the existing heading-name tests read just "Vehicles"), then a 2 px line with the brand gradient fading to transparent at the edge. Bebas Neue has capitals only, so "of" shows as "OF". The line is decorative (`aria-hidden`).
- **Group:** the `h3` in 14 px, bold, white, uppercase with letter spacing, then "12 of 61" in 13 px muted, also outside the heading. A 1 px `--border` line above each group.
- The counts come in as props: `perCategory` (exists) and a new `perGroup` in `src/model/stats.ts`, both over `countable(items)` and the records, never over `view.visible`.
- Heading levels and ids stay as today, so `aria-labelledby` and the search tests keep working.

### 4.4 The round check

The checkbox keeps today's technique (`appearance: none`, the ✓ as a clip-path `::before`, `CanvasText` in forced colours). It becomes round (24 px, `border-radius: 50%`) with a 44 px hit area. Checked: pink fill, black ✓ (`--accent-text`). In PR 1 it stays where it is today.

### 4.5 Width and spacing

The new `--tracker-max-w` (§3.3), the spacing table (§3.5) and the tablet and phone tile layouts. The sticky search row is unchanged.

## 5. PR 2: the structure

### 5.1 The card (`ItemList.tsx`, `ItemRow`)

Order in the DOM, which is also the Tab order: checkbox, book link, flag button.

- **Icon tile** (36 px) with the category icon. Found: pink background tint and pink icon.
- **Name** (15 px, semibold), as the checkbox's `label`.
- **Meta line** (12 px, muted): a 7 px dot (pink for Confirmed, cyan for Expected), the tier text as today (`tracker.confirmed` or `tracker.expectedFrom`), " · ", the group label. It may wrap on narrow phones; it is never cut off.
- **Check** top right, absolutely placed in a 44 px box. The label's `::after` still covers the card, so a tap anywhere on the card toggles it.
- **Description** clamped to 2 lines (`-webkit-line-clamp: 2`). The full text stays in the DOM, so screen readers read all of it.
- **Footer**, right-aligned: book (Sources) and flag ("coming soon", `aria-disabled`). Both sit above the label's click layer, as today. The footer is a flex row so December can add "Entry →" and a star without changing the layout. No empty placeholders now.
- **Found:** the card border turns pink (45 % mix), the icon tile turns pink and the check shows the ✓.

### 5.2 The rail (`StatsRail.tsx`, desktop only)

- The heading stays `h2`, "Overall" (`tracker.overall`). From launch it links to the hub, as today (`hubHref`).
- The big number: the overall percentage in Bebas Neue 48 px, the % sign smaller, then one bar. The percentage is rounded **down** (`Math.floor`), so 214 of 215 reads 99 %, never 100 % before everything is found. A total of 0 reads 0 %. The bar keeps `role="progressbar"` with `aria-valuetext` as "60 of 215".
- The four category bars are removed. `Bar` stays exported, because the hub's `Dashboard.tsx` imports it.
- **Recent finds** (`h3`, as today): up to 5 rows, each with the category icon tile (28 px, pink), the name and a `<time datetime>` with the relative time (§5.4).
- New styles are scoped to `.stats`. The hub also uses `.recent`, so unscoped rules would leak onto the dashboard.

### 5.3 The "Last found" row (phones and tablet, under 1024 px)

- Shows the most recent find: icon, "Last found" (`tracker.lastFound`), the name and the relative time.
- It is a `button` when the item's card is in the current view. Activating it focuses that card's checkbox. `focus()` scrolls the card into view, and the existing `scroll-padding-top` keeps it clear of the sticky search row.
- When search, Hide found or the category filter hides that card, or the checkboxes are disabled (the tracker is not `ready`, and a disabled input cannot take focus), the row renders as plain text. Nothing is there to jump to, and the row never changes the user's filters.
- With no finds, the row is not rendered.
- Hidden from 1024 px, where the rail shows the same information.

### 5.4 Relative time (`src/model/relativeTime.ts`, pure)

`relativeTime(then: string, now: Date, locale: Locale): string` with `Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })`:

| Age | Unit |
| --- | --- |
| Under 1 minute, or in the future | 0 seconds ("now" / "nå") |
| Under 1 hour | minutes |
| Same local calendar day | hours |
| Earlier days | days by local calendar day (`daysAgo`, `localDayKey`), so 1 reads "yesterday" / "i går" |

A find at 23:00 yesterday reads "yesterday" at 08:00, not "9 hours ago". A future timestamp (clock skew, an import from another device) reads "now". The exact words come from the browser's CLDR data, so tests compare against `Intl.RelativeTimeFormat` output, never hard-coded strings.

A `useNow(60_000)` hook re-renders the rail and the row once a minute and on `visibilitychange`, so "2 min ago" never goes stale, also after sleep or a throttled background tab. The interval is cleared on unmount. The hook is called inside `StatsRail` and `LastFound`, never in `Tracker.tsx`, so the minute tick does not re-render 215 cards. Neither the rail nor the row is a live region, so the changing times are never announced.

### 5.5 Profile button in the title row

- The Astro page wraps the h1 in `.tracker-head` (flex, `justify-content: space-between`, `align-items: center`, `min-height: 44px`) with an empty `<div id="tracker-profile">` after it.
- `ProfileMenu` renders into that slot with a React portal. Portals keep React events and state, so the menu, its keyboard pattern and the dialogs are unchanged. If the slot is missing (component tests, or a page without it), it renders in place, where `.tracker-top` holds it today.
- The slot is at the right edge, so the button appearing on mount moves nothing. The row's height is fixed, so there is no layout shift.
- Tab order: the profile button comes before the search field, which matches reading order.
- **Trigger:** a 28 px round avatar (pink tint, the profile's first character) and the name. The accessible name stays `profile.menu` ("Profile: Malin"); the avatar is `aria-hidden`.
- **First character:** the first grapheme of the trimmed name from `Intl.Segmenter`, upper-cased for the page locale, so a name starting with an emoji or a combining character shows the whole character. Where `Intl.Segmenter` is missing, `Array.from(name)[0]` is the fallback.
- **Long names:** up to 40 characters (the existing limit). On phones the visible name is cut with an ellipsis at a max width; the accessible name is always the full name.
- The avatar is its own element with a fixed size, so a picture can replace the letter later without changing the layout.

## 6. Copy

| Key | English | Norwegian |
| --- | --- | --- |
| `tracker.lastFound` | Last found | Sist funnet |

Everything else reuses existing keys: `tracker.count`, `tracker.overall`, `tracker.recent`, `tracker.confirmed`, `tracker.expectedFrom`, `profile.menu`, `category.*` and the group labels. The relative times come from `Intl`, not from the bundles. `tracker.progress` stays: the hub dashboard and its skeleton use it.

## 7. Accessibility

- Nothing is told by colour alone: found shows a ✓, a pink border and a pink icon tile; Confirmed and Expected keep their words next to the dot.
- Every control is at least 44 px. Controls on one row share one height and one bottom edge: the profile button with the h1 row, and the search field with Hide found.
- Labels look like labels: group titles and "Overall" / "Recent finds" stand apart from their values by weight, size and colour.
- Forced colours: tiles, cards and the check keep visible borders and the ✓ (`CanvasText`). Pressed tiles use `Highlight` (§4.1). A found card loses its pink border and tile there but keeps the ✓, which is enough. The gradient line can disappear; it is decorative.
- Reduced motion: no new motion. The jump from the "Last found" row is a focus move, not an animation.
- Muted text keeps AA (4.5:1) on true black, as ruled for the dashboard.
- Screen readers: tile names include counts; the card's name, tier and description are read in order; relative times are `<time>` with a `datetime`.

## 8. Edge cases

- **No finds:** the rail shows `tracker.noRecent` as today; the phone row is not rendered.
- **Profile with a 40-character name:** cut with an ellipsis on phones, full on desktop where it fits, full accessible name everywhere.
- **Empty search result:** unchanged empty state; the titles and counts of hidden categories are not shown, because their sections are not rendered.
- **A category with every item found and Hide found on:** its section disappears as today; its tile still shows the full count.
- **Unknown category id in a future seed:** the All icon and the raw id label (`seedLabel`'s fallback).
- **Launch:** the rail heading links to the hub from launch; tested with a date before and after `hubPhase`.
- **Long Norwegian group names:** they wrap; the count stays on the title's line or wraps below it, never overlapping.

## 9. Privacy, security and performance

- No new data, storage, network calls or third parties. Relative times are computed on the device.
- No inline styles from the server; bar widths keep going through the CSSOM, which the CSP allows.
- Bebas Neue is already preloaded, so the bigger titles add no font request. Layout shift on load is measured at 0 at 320, 768, 1024 and 1280 px, including a slow simulated connection.
- The once-a-minute tick re-renders only the rail and the row.

## 10. Units touched

| File | PR | Change |
| --- | --- | --- |
| `src/islands/tracker/icons.tsx` | 1 | Five category icons, `categoryIcon(id)` |
| `src/islands/tracker/CategoryNav.tsx` | 1 | Tiles with icon, count and bar |
| `src/islands/tracker/ItemList.tsx` | 1, 2 | Titles with counts (1); icon-lead card (2) |
| `src/islands/Tracker.tsx` | 1, 2 | Pass counts (1); row, portal target, `now` (2) |
| `src/styles/global.css` | 1, 2 | Layout, tiles, titles, check (1); card, rail, row, profile (2) |
| `src/islands/tracker/StatsRail.tsx` | 2 | Big %, recent with icons and times |
| `src/islands/tracker/LastFound.tsx` | 2 | New: the phone row |
| `src/islands/tracker/ProfileMenu.tsx` | 2 | Avatar trigger, portal |
| `src/islands/tracker/useNow.ts` | 2 | New: minute tick |
| `src/model/relativeTime.ts` | 2 | New: pure relative time |
| `src/model/stats.ts` | 1 | New `perGroup(items, records)` beside `perCategory`, both over `countable` items |
| `src/pages/[locale]/tracker/index.astro` | 2 | `.tracker-head` and the profile slot |
| `src/locales/en.json`, `nb.json` | 2 | `tracker.lastFound` |
| `src/layouts/Base.astro` | 2 | `trackerWide` prop (§14.2) |
| `src/model/tracker.ts`, `src/model/search.ts`, `src/islands/tracker/useSearch.ts`, `src/islands/useTracker.ts` | 3 | Group selection, `?group=` (§14.1) |
| `src/islands/tracker/GroupChips.tsx` | 3 | New: the chip row (§14.1) |
| `src/locales/en.json`, `nb.json` | 3 | `tracker.groupChips`, reworded elsewhere copy (§14.1) |

## 11. Tests

**PR 1**

- `CategoryNav`: each tile's accessible name includes its count; `aria-pressed` and multi-select behaviour unchanged; Sources stays a link without `aria-pressed`.
- `ItemList`: every category and group title shows its count from all items, not the filtered view (search for one item, the count stays the same).
- `categoryIcon`: every category in the seed has its own icon; an unknown id gets the fallback.
- Category and group heading names are the label alone ("Vehicles"), with the count beside them.
- A CSS test (as `src/styles/hover.test.ts` does) checks that pressed tiles are in the forced-colours `Highlight` rule.
- Measured: the stacked tiles at 320 px and at 320 px with 200 % text, no overlap and one height per row.
- Existing tracker, search and profile tests pass unchanged.

**PR 2**

- `relativeTime`: now, future, minutes, same-day hours, yesterday across midnight, older days, in `en` and `nb`, compared against `Intl.RelativeTimeFormat` output.
- `useNow`: ticks with fake timers and clears on unmount.
- `ItemRow`: Tab order is checkbox, book, flag; a click on the card body toggles; found adds the found class; the description is in the DOM in full.
- `StatsRail`: big percentage rounded down (214 of 215 reads 99 %, 0 of 0 reads 0 %), no category bars, recent rows with `<time datetime>`, hub link only from launch.
- `LastFound`: a button when the card is visible, focus lands on the checkbox; plain text when hidden by search, Hide found or a filter, and while the tracker is not ready; absent with no finds. `useNow` is not called by `Tracker.tsx` (a render count on an item card stays the same across a tick).
- `ProfileMenu`: renders into the slot when present and in place when not; accessible name "Profile: {name}"; first grapheme of an emoji name; the menu keyboard pattern unchanged.
- Old tests that find the checkbox or the book by position are rewritten to find them by role and name.

**Both PRs, before opening**

`npm test`, `npx biome ci .` and the build; Lighthouse CI; layout shift and alignment measured at 320, 768, 1024 and 1280 px in English and Norwegian; keyboard-only, reduced motion and forced colours. Each PR gets a preview URL for a phone check.

## 12. Considered and rejected

- **Tiles across the top on desktop (Q1 C):** undoes layout B and needed per-category hues the brand does not have.
- **Category panels (S2):** boxes inside boxes; S3 keeps the separation with lines and type instead.
- **Profile in the site header (Q3 H):** about 8 to 12 hours across every page; too big before the freeze. December.
- **Absolutely positioning the profile button over the h1:** a portal into a reserved slot is simpler and cannot overlap a long title.
- **Five tablet tiles in one row:** does not fit at 768 px (§3.2).
- **Expanding a clamped description on tap:** competes with the card-wide toggle. The Dex gives every item its full text in December.
- **Keeping the four category bars in the rail:** they repeat the tiles.
- **Showing the full description when text spacing is raised (WCAG 1.4.12):** the 2-line clamp is a deliberate cut, not a loss caused by spacing, and the full text is in the DOM for assistive tech. Accepted until the Dex.
- **Hiding the profile name on a shared device:** the name already shows in today's profile button; moving it to the title row shows nothing new.
- **Making the Last found row clear filters so it can always jump:** it would change state the user set without asking.

## 13. Later (December)

- **Dex:** an "Entry →" link in the card footer, per-item pages sharing the seed. The crawlable category pages built for SEO may become its start; the URLs should not change when it does.
- **Favourites:** a star in the card footer, its own field and timestamp in the record, export v2.
- **Profile in the site header,** with an own profile picture (local-only, size-capped, in export and import) replacing the letter avatar.

> Stress-tested 2026-11-03 (skill b9705f6): 7 applied, 1 adapted, 0 decided by me. §14 stress-tested 2026-11-04: 13 findings, 11 applied, 2 decided by me (chips wrap at every width; the wide search field is accepted).

## 14. Addendum (04.11.2026): group chips and wide screens

Two asks after PR 1 merged, settled in the brainstorm of 04.11 with mockups in the visual companion. Vehicles holds 148 items in 7 groups (86 of them cars), so an open category still means a long scroll. On a 2000 px window the tracker sits in a 1088 px column with 424 px of black on each side. Both break the standard set the same day: every screen size, professional, from the start.

### 14.1 Group chips (PR 3)

**Locked:**

| Decision | Choice | Why |
| --- | --- | --- |
| When chips show | Under every pressed category, none under All | Her pick: chips appear where a category is actually pressed |
| Where | A row right under the category title, above its first group (mockup A) | The chips sit with the title they belong to; nothing sticky grows |
| Behaviour | Multi-select toggles with `aria-pressed`; none pressed shows the whole category | The same rule as the tiles above them |

**Behaviour:**

- A pressed category renders a chip per group that has at least one countable item (built from `countable(state.items)`, never from the filtered view), in the list's group order (`groupItems` sorts by group id). Under All no chip row renders.
- **A pressed category with a chip row always renders its title and chip row, even when no card is left** (a search with no match there, or Hide found emptying the group), whether or not a chip is pressed (plan R17). The empty or elsewhere message renders under it. Without this the list unmounts and the focused chip takes focus with it.
- A chip shows the group label and the count in the tile's "done/total" form, for the whole group, never the filtered view (§2 Counts). Its accessible name is the label and the count in words (`tracker.count`), as the tiles do.
- Pressing chips narrows that category only: an item shows when its category is pressed and either none of that category's chips are pressed or its own group's chip is. Vehicles with Cars pressed and Wildlife with none pressed shows every car and all of Wildlife.
- Unpressing a category drops its pressed chips. Pressing it again starts with none pressed.
- The group selection lives in the tracker model beside `selected` (`groups: string[]`, `toggleGroup(key)`), so `searchView` takes it as one more input. `selectCategories` drops groups whose category is no longer pressed; `toggleGroup` ignores unknown keys. `useSearch` adds `groups` to its source, its snapshot key and `viewFor`, so a chip toggle retakes the Hide found snapshot as a tile does and every announced count respects the chips. Group ids are unique across categories in today's seed. The model keys them by `groupKey(category, group)` anyway, so a future seed cannot collide.
- `?group=` mirrors the selection beside `?show=`: `groupKey`s, comma-joined, in `groupItems` order, re-serialised from state the way `useShowParam` does it. It is parsed after `parseShow`; parsing keeps only known keys whose category is pressed, and the raw value is never echoed.
- A chip toggle cancels a pending typing announcement, the way a tile toggle does (`live.cancel()`). The list change itself is not announced; `aria-pressed` carries the state.
- The pressed groups keep their group titles, so the reader keeps their place. Unpressed groups (titles and cards) are not rendered.

**Search, Hide found and Last found:**

- A search match hidden by a chip counts toward the elsewhere line, the same as a match in an unpressed category.
- **My call:** that line said "in other categories", which is wrong once a match can sit in a pressed category. It becomes "{count} more outside your filters" / "{count} til utenfor filtrene dine", and its button "Clear filters" / "Fjern filtrene". `tracker.search.resultsElsewhere` changes the same way. The button clears categories and chips together; Hide found and the query stay, and focus moves to the search field as today. Rewrite the copy assertions in `Tracker.search.test.tsx` (about lines 72-73 and 195-201).
- Hide found is unchanged. `hiddenCount` counts only items inside the pressed chips, like `elsewhere`. A group whose items are all found and hidden keeps its chip and its full count, like a tile.
- The "Last found" row shows plain text when its card is hidden by a chip, as it already does for any other filter.

**Layout and look:**

- Chips are at least 44 px tall (`min-height`, so a long label can take two lines), pill-shaped, with the group label and the count; 8 px between chips. The title's existing 28 px gap (`.cat-head`) sits above the row; 24 px below it, before the first group title.
- **My call (stress test 04.11): the chips wrap onto more lines at every width.** Mockup A showed a sideways-scrolling row on phones, but with a hidden scrollbar a mouse user has no cue, and at 320 px with 200 % text it becomes two-dimensional scrolling (WCAG 1.4.10). Vehicles takes about 4 rows at 320 px; that is the price.
- Pressed chips get the pink fill with `--accent-text`, plus a ✓ before the label, so pressed is never told by colour alone. As a pink surface they join the `outline-color: var(--text)` focus-ring list, and every hover, active and focus rule on chips carries the `:not([aria-pressed="true"])` guard the tiles use. In forced colours they join the pressed-tile rule (`Highlight`, `HighlightText`).
- The row is a `<fieldset>` (its implicit group role; Biome rejects `role="group"` on a div, plan R18) named "Groups: {category}" / "Grupper: {category}" (the `tracker.announce` "{category}: ..." form, because nb category labels are capitalised).

**Copy:**

| Key | English | Norwegian |
| --- | --- | --- |
| `tracker.groupChips` | Groups: {category} | Grupper: {category} |
| `tracker.search.elsewhere.one` | 1 more outside your filters | 1 til utenfor filtrene dine |
| `tracker.search.elsewhere.other` | {count} more outside your filters | {count} til utenfor filtrene dine |
| `tracker.search.showAll` | Clear filters | Fjern filtrene |
| `tracker.search.resultsElsewhere` | No results inside your filters. {count} outside them. | Ingen treff innenfor filtrene dine. {count} utenfor. |

**Units touched:** `src/model/tracker.ts` (groups, `toggleGroup`, `parseGroups`, `groupParam`), `src/model/search.ts` (`groups` input), `src/islands/tracker/useSearch.ts` (`groups` in source, key and `viewFor`), `src/islands/useTracker.ts` (`useGroupParam`), `src/islands/tracker/GroupChips.tsx` (new), `src/islands/tracker/ItemList.tsx` (renders the row), `src/islands/Tracker.tsx` (wiring, Clear filters), `src/styles/global.css`, both locale bundles.

**Edge cases:**

- A category with one group (none today) shows no chip row; one chip would filter nothing.
- A press that empties the view keeps the category's title and chip row, and focus stays on the chip (tested).
- A `?group=` key for a group that has since lost every item is dropped on parse.
- Long Norwegian group labels: the row wraps at every width, and a chip may wrap its label onto two lines rather than overflow.
- Switching profile keeps the selection, as the tile selection already does.

### 14.2 Wide screens (PR 2)

**Locked: option C, two steps.** The tracker page grows in steps that each add a card column; the tiles and the rail stay 200 px. Measured in the companion with the real card rule (280 px minimum, 12 px gap), on a 2000 px window:

| Viewport | Page cap | Tracker | List | Cards across |
| --- | --- | --- | --- | --- |
| 1024 to 1599 px | 72rem (today) | up to 1088 px | up to 592 px | 1 to 2 |
| 1600 to 1919 px | 90rem | up to 1376 px | up to 880 px | 3 |
| 1920 px and up | 120rem | up to 1856 px | up to 1360 px | 4 |

- The tracker page's `main` gets its own server-rendered modifier (`Base.astro` prop `trackerWide`, class `tracker-wide`; the hub's `.wrap.wide` stays 85rem). The modifier sets `--tracker-max-w: none` at the steps, so `.tracker`, the title row, the h1 and `.dex-browse` all fill `main` together. Never a `.tracker` or `:has()` rule: those match only after the island mounts and would shift the title.
- At a 1920 px viewport with a 17 px scrollbar the list is about 1343 px, still four cards. The search field spans the tracker's width (about 1800 px); accepted.
- Above 120rem the page stays centred and the sides stay empty on purpose; more than four columns is harder to scan.
- **Accepted:** the hub (85rem) and the tracker differ in width from 1600 px.
- Breakpoints read the viewport width, so a 1920 px wide browser window with borders lands just under 1920 and shows three cards. That is fine; the measure set emulates exact widths.
- Phones, tablet and 1024 to 1599 px do not change.

### 14.3 Tests and measures added

**PR 2:** a CSS test (as `tracker-refresh.test.ts` does) checks both wide steps; the PR 2 measure set adds 1600 and 1920 px: card columns 3 and 4, no overflow, h1 still on the search row's left edge, layout shift 0. This includes the nb desktop rail at 200 % text, parked from PR 1.

**PR 3:**

- `parseGroups` / `groupParam`: round trip, unknown keys dropped, keys of unpressed categories dropped.
- Tracker model: `toggleGroup` on and off; unpressing a category drops its groups.
- `searchView` with groups: visible, elsewhere and hiddenCount for chips pressed in one of two categories.
- `GroupChips`: renders only under pressed categories, `aria-pressed`, accessible names with whole-group counts, ✓ only when pressed, the group's name.
- `Tracker`: `?group=` mirrored; Clear filters clears categories and groups and moves focus to the field; a chip toggle cancels a pending announcement; Last found is plain text when a chip hides its card.
- Measured at 320, 768, 1024, 1280, 1600 and 1920 px in English and Norwegian, and at 320 px with 200 % text: chips 44 px tall, one height per row, the page never scrolls sideways, layout shift 0. Forced colours: pressed chips show `Highlight`. Keyboard only: Tab reaches every chip in order.
