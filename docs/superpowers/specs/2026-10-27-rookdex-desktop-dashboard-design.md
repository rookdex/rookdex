# Rookdex: desktop dashboard design spec

Written 2026-10-27 from the desktop dashboard brainstorm (sessions 75 to 77). It gives the hub a full-page layout from 1024 px, renames Home to Dashboard, and adds a before-launch checklist. The phone dashboard from `2026-10-14-rookdex-dashboard-design.md` stays as it is, with two exceptions: the tab is renamed, and the checklist shows under the countdown before launch.

GTA VI launches Thursday 19 November 2026. This ships before launch, so the before-launch state is what most visitors see first.

Mockups (gitignored, not product code): `.superpowers/mockups/dashboard/`. `d1-bento.html` is the chosen layout and `pre.html?opt=c` the chosen before-launch state. Serve with the `og` preview (port 4400).

## 1. What this spec covers

- A 12-column grid layout of the hub from 1024 px, with a wide step at 1200 px and a 1360 px cap from 1600 px.
- New desktop blocks: a hero with the big found count, category bars, finds by day, a news tile with Confirmed and Rumours, a Rockstar site card, and guide and settings tiles.
- A tickable "Before launch" checklist, on every screen size, until launch.
- The Home tab renamed to Dashboard (`nb`: Dashbord).
- Copy in English and Norwegian, accessibility, performance, security, tests.

### Non-goals

- No change to the phone layout below 1024 px, apart from the checklist and the tab name.
- No new route. The dashboard stays at `/en/` and `/nb/`.
- No Rockstar map image, screenshot or trace. The map card links out (section 4.7).
- No new tracker data. Group names, counts and dates all come from the existing seed and records.
- No charts library. Finds by day is plain HTML and CSS.
- No cross-device sync of the checklist.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Layout | Mockup D1 "Bento": hero and What's next on top, category bars, then Recent finds, news, and a column of link tiles | A mix of A, B and C. Hero, What's next and every category fit above the fold at 1280 |
| Categories | One row-as-bar per category, the fill behind the text, 2 columns from 1200 px | Scales to any item count and any category count. C's one-cell-per-item grid doesn't |
| Before launch | Option C: countdown in the hero, a tickable checklist beside it, categories at 0 below | Gives visitors a reason to come back during the 3 weeks before launch |
| Checklist on phones | Yes, under the countdown | Most visitors before launch are on phones |
| One tree, CSS layout | The same `Dashboard` renders at every width; CSS places blocks and hides the desktop-only ones below 1024 px | No `matchMedia` in JavaScript, so no flash and no layout shift between layouts |
| Breakpoints | Grid from 1024, wide step from 1200, cap 1360 from 1600 | A 1280 window on Windows is about 1265 px wide, so a 1280 step would miss it |
| Title and tagline | `h1` stays in the HTML, visually hidden from 1024 px. The tagline shows as one muted line above the grid | The header already shows the wordmark. Search engines keep both texts |
| Map card | "Leonida on Rockstar's site ↗", linking to Rockstar's GTA VI site, our own art | Never a copy of Rockstar's map (Norwegian copyright law, § 29, doesn't cover a decorative full map). The URL and wording sit in one config entry, so a real official map can replace them later |
| Closest tag | `--accent` surface, `--accent-text` letters (5.6:1) | The brand rule for text on pink. The mockup's grey letters failed contrast |
| Profile chip | Top-right of the hero, beside "Day N since launch" | The hub must switch profiles at every width |
| News tile | The 5 newest items, Confirmed and Rumours mixed, newest first | Desktop has room. Phones keep the 3 newest rumours |
| Finds by day | The last 7 local days, shown only once 2 of them have finds | A chart with one bar says nothing |
| Tab name | `home` becomes `dashboard` everywhere, label Dashboard / Dashbord | "Oversikt" already means the tracker in Norwegian |

## 3. Architecture

- **`Hub`** keeps its role and props, plus build-time `categories`, `news` and `mapLink` props (section 6). It renders the before view or the after view as today.
- **Before view.** `CountdownView` moves into a `hero` wrapper. New `PrelaunchChecklist` and `CategoryBars` (all at 0) render beside and below it. Everything here comes from build-time props, so visitors before launch still never download the tracker chunk.
- **After view.** `Dashboard` adds `Hero`, `CategoryBars`, `FindsByDay`, `NewsTile` and `LinkTiles`. The phone blocks (`StatPair`, `StatStrip`, `Latest`) stay and are hidden from 1024 px. The desktop blocks are hidden below 1024 px. `WhatsNext`, `UndoToast` and `ProfileMenu` render once and are placed by CSS at every width: never two copies, so checkbox ids stay unique.
- **Recent finds** stays one component. From 1024 px CSS shows the first row as the "Latest" highlight and limits the rows below it (section 4.5).
- **New model functions** in `src/model/dashboard.ts`: `latestNews(facts, rumours, limit)` and `findsByDay(items, records, today, days)` (section 6.2).
- **Checklist storage** lives in `src/islands/seenFlag.ts` beside the other keys (section 5).
- **Wider page.** `Base.astro` gets an optional `wide` prop. The hub passes it; `.wrap.wide` caps at 1360 px from 1600 px. Other pages keep 1152.
- **New files** go in `src/islands/hub/`: `Hero.tsx`, `CategoryBars.tsx`, `FindsByDay.tsx`, `NewsTile.tsx`, `LinkTiles.tsx`, `PrelaunchChecklist.tsx`, `ExternalTile.tsx`.

## 4. Layout and components

### 4.1 Grid

From 1024 px the hub is a 12-column grid with a 16 px gap (`--space-3`). Areas, top to bottom:

| Width | After launch | Before launch |
|---|---|---|
| 1200 px and up | `hero` 8 + `next` 4 · `bars` 12 (2 columns) · `recent` 4 + `news` 5 + `tiles` 3 | `hero` 7 + `checklist` 5 · `bars` 12 (2 columns) · `news` 8 + `tiles` 4 |
| 1024 to 1199 px | `hero` 12 · `next` 6 + `recent` 6 · `bars` 12 (1 column) · `news` 6 + `tiles` 6 | `hero` 12 · `checklist` 12 · `bars` 12 (1 column) · `news` 6 + `tiles` 6 |

The tagline line sits above the grid. An art-deco divider labelled "Categories" sits above `bars`, the only place it is used. Below 1024 px the order is today's phone order, with the checklist straight after the countdown before launch.

### 4.2 Hero

- **After launch.** Label "Your progress", then "Day N since launch" (or "Launch day") and the `ProfileMenu` chip on the right. The big found count (`17`, Bebas, glow) with "/ 43 found" beside it, then three label-value pairs: Overall %, Found today, Closest (category name, or "–" with nothing found). A segmented bar at the bottom, one segment per category sized by its total, gradient fill with glow.
- **Before launch.** Label "Launch countdown" with the date only, no time of day (Rockstar hasn't confirmed the unlock time, #73), today's `CountdownView` numbers inside the tile, and the segmented bar at 0.
- Our sun and stripes art in the top-right corner, in an `aria-hidden` layer that clips itself. The tile never clips its text. Minimum height 18.75 rem (300 px at the default size).

### 4.3 Category bars

- One link per category to `tracker/?show=<category>`. The whole row is the target.
- Left: the category name (`h3`), and under it the group names joined by " · " (`seedLabel(t, "group", id)`), one line, cut with an ellipsis only if it would wrap.
- Right: "N left" (or "N to find" before launch, "All found" at 100 %), the fraction in Bebas, and a chevron in `--link`.
- The fill sits behind the text: the brand gradient at 22 % and 16 % strength, no edge line. The name and fraction over it keep at least 7:1; the muted secondary lines (groups, "N left") keep at least 4.5:1 (WCAG AA). Checked during the build.
- The closest category gets the "Closest" tag after its name, after launch only. The tag has a 1 px border in its own background colour, so it stays outlined in forced-colours mode.
- Rows are 72 px tall.

### 4.4 What's next

Today's `WhatsNext` with ticking, Undo and the 3-row reservation, placed in the `next` area. From 1024 px the `UndoToast` sits fixed at the bottom centre of the viewport, since desktop has no bottom tab bar. The phone spec's `scroll-padding-bottom` rule applies at every width, so the toast never covers a focused link in the bottom row.

### 4.5 Recent finds and finds by day

- From 1024 px the first find is the "Latest" highlight: its relative day, the name in Bebas at 2.25 rem, and category · group under it. Up to 4 more rows follow, or 2 when the chart shows.
- **Finds by day** (`FindsByDay`) sits under the rows when `findsByDay` has at least 2 days with finds. One bar per day for the last 7 local days, today labelled "Today", other days as a short date in the page's locale. Each bar's height is its share of the busiest day, at least 2 px.
- The `recent`, `news` and `tiles` row has one reserved minimum height in `rem`, so the chart appearing or not never shifts anything, and text at 200 % grows the row instead of being clipped.
- Empty states: "Nothing to find yet" before launch, "No finds yet" with "Tick your first find in What's next and it lands here." after.

### 4.6 News tile

Label "Latest news" with an "All news" link. The 5 items from `latestNews`, each with its Confirmed or Rumour chip (the News page's styles), the name linking to `/news/`, and a relative date computed in the browser like `Latest`.

### 4.7 Link tiles

A column of three tiles in the `tiles` area:

1. **Rockstar site card** (`ExternalTile`): label "Map", title "Leonida on Rockstar's site ↗", one line of body. Our own art (sun, stripes, compass) at 50 % strength in the corner, behind the text and never under the title. It opens in a new tab and emits the same hidden new-tab note and `new-tab-note` marker as `ExternalLink.astro`, so the build's external-link check covers it. The URL and copy keys come from `MAP_LINK` in `src/config/`. When Rockstar publishes an official map, that entry changes and nothing else does. A test fails the build unless the URL is `https://` on `rockstargames.com`, so a typo or a lookalike domain can't ship.
2. **Guide**: "Before you start", to `guides/before-you-start/`.
3. **Settings**: "Language, updates, your data", to `/settings/`.

### 4.8 Before-launch checklist

- Label "Before launch" and "N of 5 done" on the right. Five rows, each a real checkbox with a 44 px or taller label, the item, and a muted line under it. Rows with a page get an "Open" link on the right, outside the label, so a tap on the text ticks and the link navigates. Each "Open" carries visually hidden text naming its page ("Open: Before you start"), so a screen reader's links list never shows four bare "Open"s. The link is at least 44 px tall like the row.

| Id | Item | Under it | Link |
|---|---|---|---|
| `edition` | Pick your edition | The guide compares them | Before you start |
| `preload` | Preload on 12 November | Confirmed by Rockstar | News |
| `space` | Free up console space | News has the install size once Rockstar confirms it | News |
| `first-hour` | Plan your first hour | The first-hour guide | Your first hour |
| `install` | Install Rookdex | Track finds offline on launch night | Settings |

- A ticked row shows a pink checked box and the item in muted, struck-through text. Muted text keeps at least 4.5:1 on the tile. Ticking never changes a row's height.
- The sub-lines make no claim that can go stale before launch, apart from "Confirmed by Rockstar" on preload, which the News facts already back.
- Inside the installed app (`display-mode: standalone`) the install row shows as ticked and disabled with "Installed". It is not stored.
- A note under the list: "Ticks stay on this device. The list goes away at launch, when the tracker takes over."
- The checklist is gone in the after view. If focus is in it when the hub flips at launch, focus moves to the dashboard heading, as the phone spec's section 6.4 does for the whole hub.

### 4.9 Tagline line and tab

- From 1024 px the `.hub-intro` lockup is visually hidden but stays the page's `h1`. The tagline shows as one muted line, and the "Open tracker" link is hidden because the category bars cover it.
- `TABS` becomes `["dashboard", "tracker", "news", "settings"]`. `TAB_PATHS.dashboard` is `""`. `nav.home` becomes `nav.dashboard`. `TabIcon` keeps the same icon.

## 5. Checklist storage

- **Key.** `rookdex.prelaunch-checklist`, holding a JSON array of ticked ids from the table in section 4.8. Declared in `seenFlag.ts`.
- **Read.** Anything that isn't an array of known ids reads as empty. Blocked storage reads as empty, and ticks then last until the page closes.
- **Write.** On every change, read the key again, add or remove the one id, and write it back, so a tick in another open tab isn't overwritten. Never throws.
- **First paint.** The server renders every box unticked. The island ticks the saved ones after hydration. Ticked and unticked rows have the same height, so this causes no layout shift.
- **Delete all** removes the key. The privacy page's stored-choices paragraph names it.

## 6. Data flow

### 6.1 Build-time props

`index.astro` passes:

- `categories`: `{ id, total, groups }[]` from the countable seed, in `categoryIds` order, `groups` as ids.
- `news`: `latestNews(facts, rumours, 5)` as `{ id, kind, name, date }[]`.
- `mapLink`: the `MAP_LINK` URL.

### 6.2 Model functions (`src/model/dashboard.ts`)

- `latestNews(facts, rumours, limit)`: facts by `announced` and rumours by `added`, merged, newest first. Ties go Confirmed first, then by id. At most `limit`.
- `findsByDay(items, records, today, days)`: `{ day, count }[]` for the `days` local calendar days ending on `today`, oldest first, counting records with `done: true` whose `updated_at` falls on that local day. Retired items don't count. Days step by calendar date with the existing `days.ts` helpers, never by 24 hours, so a daylight-saving change can't skip or repeat a day. The hub shows the chart when at least 2 entries have `count > 0`.
- `closestCategory`, `perCategory`, `foundToday` and `recentFinds` are reused as they are.

### 6.3 Ticking

Unchanged from the phone spec, section 6.1. The hero, the bars, Recent finds and the chart recompute in the same `useMemo` pass.

## 7. Errors and edge states

- **Storage won't open, or the chunk won't load.** As the phone spec, section 7. The news tile and link tiles still render, because they come from build-time props.
- **0 found.** Hero shows 0, Closest "–", bars at 0 with "N left", Recent finds empty state, no chart.
- **All found.** Bars read "All found", no Closest tag, What's next shows its all-found line.
- **Fewer than 5 news items.** The tile shows what there is. No items at all hides the tile and `tiles` takes its columns.
- **Long names.** Category, group and item names wrap or ellipsis as section 4 says. `nb` runs longest and is checked at 1024 px.
- **A sixth category later.** The bars add a row. Nothing else changes.

## 8. Copy

New keys go into both `src/locales/en.json` and `nb.json`. `nav.home` is renamed. Reused as they are: `hub.dashboardHeading`, `hub.overall`, `hub.daySince`, the launch-day text, `hub.allFound`, `hub.allNews`, `tracker.recent`, `tracker.noRecent`, the News chips, the guide titles, the category and group labels. The Norwegian below is a first draft for me to read before the build.

| Key | English | Norwegian |
|---|---|---|
| `nav.dashboard` | Dashboard | Dashbord |
| `hub.foundOf` | / {total} found | / {total} funnet |
| `hub.foundTodayLabel` | Found today | Funnet i dag |
| `hub.closestLabel` | Closest | Nærmest |
| `hub.countdownLabel` | Launch countdown | Nedtelling til lansering |
| `hub.categories` | Categories | Kategorier |
| `hub.left` | {count} left | {count} igjen |
| `hub.toFind` | {count} to find | {count} å finne |
| `hub.foundCount` (visually hidden) | {done} of {total} found | {done} av {total} funnet |
| `hub.latestFind` | Latest | Sist funnet |
| `hub.noFindsYet` | No finds yet | Ingen funn ennå |
| `hub.noFindsBody` | Tick your first find in What's next and it lands here. | Kryss av det første funnet under Neste, så havner det her. |
| `hub.nothingYet` | Nothing to find yet | Ingenting å finne ennå |
| `hub.nothingYetBody` | Your finds land here from 19 November. | Funnene dine havner her fra 19. november. |
| `hub.findsByDay` | Finds by day | Funn per dag |
| `hub.findsOnDay` (visually hidden) | {count} found on {date} | {count} funnet {date} |
| `hub.today` | Today | I dag |
| `hub.latestNews` | Latest news | Siste nytt |
| `hub.mapLabel` | Map | Kart |
| `hub.mapTitle` | Leonida on Rockstar's site | Leonida på Rockstars nettsted |
| `hub.mapBody` | Rockstar's official GTA VI site. | Rockstars offisielle nettsted for GTA VI. |
| `hub.guideBody` | Editions, preload, the first hour. | Utgaver, forhåndsnedlasting, den første timen. |
| `hub.settingsTitle` | Language, updates, your data | Språk, oppdateringer, dataene dine |
| `hub.settingsBody` | Install, check for updates, delete. | Installer, se etter oppdateringer, slett. |
| `hub.beforeLaunch` | Before launch | Før lansering |
| `hub.checklistDone` | {done} of {total} done | {done} av {total} ferdig |
| `hub.checklistNote` | Ticks stay on this device. The list goes away at launch, when the tracker takes over. | Avkrysningene blir på denne enheten. Listen forsvinner ved lansering, når Oversikt tar over. |
| `hub.check.edition` / `.editionSub` | Pick your edition / The guide compares them | Velg utgave / Guiden sammenligner dem |
| `hub.check.preload` / `.preloadSub` | Preload on 12 November / Confirmed by Rockstar | Forhåndslast 12. november / Bekreftet av Rockstar |
| `hub.check.space` / `.spaceSub` | Free up console space / News has the install size once Rockstar confirms it | Frigjør plass på konsollen / Nyheter viser størrelsen når Rockstar bekrefter den |
| `hub.check.firstHour` / `.firstHourSub` | Plan your first hour / The first-hour guide | Planlegg den første timen / Guiden for den første timen |
| `hub.check.install` / `.installSub` | Install Rookdex / Track finds offline on launch night | Installer Rookdex / Følg funnene uten nett på lanseringskvelden |
| `hub.installed` | Installed | Installert |
| `hub.open` | Open | Åpne |
| `hub.openPage` (visually hidden after "Open") | : {page} | : {page} |

`privacy.storedChoices` (both locales) adds "which items you ticked on the before-launch list" to the localStorage sentence, and the privacy page's last-updated date moves to the build day.

## 9. Accessibility

- **Headings.** The hidden `h2` "Your progress" stays. Visible `h2`s: What's next, Categories, Recent finds, Latest news, Before launch. Each category name is an `h3` inside its link.
- **Category bars.** The visual fraction is `aria-hidden`. A visually hidden "{done} of {total} found" carries it, so a link reads "Wildlife, Reptiles · Birds · Mammals · Marine life, 14 left, 9 of 23 found".
- **Hero.** The big number, "/ 43 found" and the three pairs are real text in a `dl`. The segmented bar is `aria-hidden`, because the bars below carry the same numbers.
- **Finds by day** is an `ol`. Each `li` holds a visually hidden "{count} found on {date}"; the bar and the visible digits are `aria-hidden`.
- **Checklist.** Native checkboxes in labels, the list labelled by its heading. The checkbox's own checked state is the audible result of a tick, so "N of 5 done" is plain text, not a live region that would say it twice. The disabled install row says "Installed" in text.
- **Link tiles.** Each tile is one link with its title as the start of the name. The Rockstar card ends with the hidden new-tab note.
- **Labels look like labels.** Tile labels are small uppercase muted text, values are larger and in `--text`. Measured during the build.
- **Targets.** Every link, row and checkbox is at least 44 px tall. Controls side by side share one height and one bottom edge.
- **Reduced motion.** No transitions on the bars or the chart.
- **Text at 200 %.** Reserved heights are `min-height` in `rem`. Only the art layers clip. Nothing that holds text has a fixed height or `overflow: hidden`.
- `vitest-axe` runs on `Hero`, `CategoryBars`, `FindsByDay`, `NewsTile`, `LinkTiles` and `PrelaunchChecklist`.

## 10. Performance

- **No layout shift.** Every block has a fixed or reserved height at each step. `DashboardSkeleton` gets the desktop areas at the same heights. Target 0 CLS at every width and state (section 13).
- **Split bundle stays.** The before view adds only the checklist and the bars at 0, from props. The tracker model still loads only after launch.
- **No new dependencies.** Lighthouse CI budgets from #48 must stay green.

## 11. Security and privacy

- The new localStorage key holds up to 5 fixed ids and nothing else. Delete all removes it, and the privacy page names it.
- The Rockstar card is a plain `https://` link with `rel="noopener noreferrer"`. No embed, no frame, no image from Rockstar. CSP unchanged.
- No new network requests, no new third parties.

## 12. SEO

- The `h1`, the tagline, the countdown, the checklist, the category names with their totals, and the news titles are all in the server HTML before launch.
- The page title and description keys don't change in this spec.

## 13. Testing

- **`dashboard.test.ts`.** `latestNews`: merge order, the Confirmed-first tie, limit. `findsByDay`: 7 days ending today, oldest first, local midnight with `TZ=Europe/Oslo`, retired items skipped, zero days kept.
- **Checklist storage.** Garbage, unknown ids and blocked storage read as empty. Writes round-trip. `delete-all` removes the key.
- **`MAP_LINK`.** Passes for the real URL; a fixture with `http://` and one with a lookalike host must fail.
- **`findsByDay`** also runs across the 25 October 2026 daylight-saving change and returns 7 distinct days.
- **`tabs.test.ts`.** `currentTab("")` is `dashboard`. The tab bar renders "Dashboard" and "Dashbord".
- **Components** (fake-indexeddb, fake timers):
  - `PrelaunchChecklist`: ticks persist and restore, the count updates, the standalone install row is ticked and disabled, links sit outside the labels and carry their hidden page names, a write keeps an id another tab added, and focus moves to the dashboard heading when the hub flips with focus in the list.
  - `CategoryBars`: hrefs, hidden text, "to find" before launch, "All found", the Closest tag only after launch and only on the closest category.
  - `FindsByDay`: hidden with 1 day of finds, shown with 2, hidden labels.
  - `Hero`: both phases, the "–" with nothing found.
  - `NewsTile`: order and chips, hidden with no items.
  - `ExternalTile`: carries the `new-tab-note` marker and the hidden note.
  - `Dashboard`: `WhatsNext` and `ProfileMenu` render once.
- **Copy.** `copy.test.ts` keeps the key sets equal.
- **Layout and shift** (manual, before the PR merges). Build with `ROOKDEX_NOW` after launch, serve locally, and measure in the browser pane at 1024, 1265, 1440 and 1640 px, `en` and `nb`, before launch and with `?phase=after` for 0 finds, 1 find and 6 or more finds over 3 days. Check: no overflow, no clipped or badly wrapped text, layout-shift entries at 0 from a `PerformanceObserver`, controls on a row share one height, tag and bar contrast. Also a hero with a 3-digit count and the longest `nb` category as Closest, contrast of the muted struck-through text, and Chrome's font size at 200 % at 1265 px with nothing clipped. Then 320 px `nb` before launch for the checklist.
- **Keyboard and NVDA walk** (manual). Checklist ticks heard once each, the "Open" links' names, category links, tick and Undo in What's next at desktop width with a bottom-row link focused while the toast is open, the Rockstar card's new-tab note.

## 14. Considered and rejected

- **Mockup D2 (main column plus a right rail).** It pushed the categories below the fold at 1280 and cramped the news titles at 1024.
- **Pre-launch A (same grid, "Get ready" links) and B (one big centred countdown).** A gave visitors nothing to do; B hid the categories until launch.
- **C's one-cell-per-item mosaic.** It doesn't scale as the seed grows.
- **A JavaScript layout switch** (`matchMedia` choosing a desktop component). Flash and layout shift on load, two code paths to test.
- **A separate desktop route.** One home is simpler, and the SEO spec already points search engines at `/en/` and `/nb/`.
- **Embedding or redrawing Rockstar's map.** Copyright, and Take-Two's history of takedowns. If Rockstar publishes an interactive web map that allows framing (no `X-Frame-Options` or `frame-ancestors` block), a framed embed is the legal option, and needs its own small spec for the CSP change.
- **An edge line at the end of each bar's fill.** It ran through the text in the mockup.
- **Category colours.** Cyan is for links only, and the brand allows one accent.
- **Live checklist sync between tabs** (`storage` event). The read-before-write keeps ticks from being lost; a second open tab shows the other tab's ticks after a reload, as the tracker does.
- **A tooltip for cut-off group names.** Only possible at 1200 px and up with long `nb` group lists; the full list is still in the link's accessible name and on the tracker.
- **Clearing the checklist key at launch.** It holds 5 fixed ids. Delete all removes it, and keeping it costs nothing.

## 15. After this spec

The page title and description still say "countdown" after launch. The SEO follow-up for launch night picks that up, together with the `og:image` handoff.

> Stress-tested 2026-10-27 (skill 1b85fca): 10 applied, 3 adapted, 0 decided by me.

## As built (2026-10-28)

The build follows this spec with these settled gaps and deviations:

- **News chips.** The News page has no Confirmed/Rumour chips, so the news tile reuses `facts.title` ("Confirmed" / "Bekreftet") and adds `hub.chipRumour` ("Rumour" / "Rykte") with a small `.news-chip` style. Its rows link to `/news/#confirmed` and `/news/#rumours`.
- **Tile labels.** The guide tile uses a new key, `hub.guideLabel` ("Guide"). The settings tile reuses `nav.settings`.
- **No `hub.countdownLabel`.** It would repeat `hub.countdownHeading`, which the hero reuses as its label.
- **No `hub.nothingYet` keys.** The before-launch grid (§4.1) has no Recent finds area to show them.
- **Guide titles as props.** "Before you start" and "Your first hour" come from the guides' frontmatter, so `index.astro` passes them to the hub.
- **Hero markup.** "17 / 43 found" is a paragraph; the three label-value pairs are the `dl` (§9).
- **Blocked storage (§5).** The checklist read returns `null` when storage is blocked, and the note swaps to `hub.checklistNoStorage`.
- **Live sync between tabs is in.** §14 lists the `storage`-event sync as rejected; the plan's stress test added it back (about ten lines and one test).
- **News and link tiles live in `Hub`,** so they render even when the dashboard chunk fails (§3 put them in Dashboard).
- **From 1024 px** the countdown's buying block and its days unit are hidden; the hero shows the days line instead.

The measurement pass (Task 11) fixed, in CSS only: the link tiles and category rows losing their layout to `.hub-state a` after launch (page overflow at 1265 px, a 30 px skeleton shift), the tagline's `65ch` cap rewrapping on font swap (22 px shift at 1024 px), the countdown units moving when reduced motion drops the seconds, the hero date's contrast on the sun (3.9:1, now full text colour), the Rockstar card's `nb` text under the sun, and three overflows at 200 % text. The bottom-row reserve is `26rem`. Over a full category fill, `--text` measures 13.5:1 and the muted lines 6.0:1 (5.5:1 on hover); §4.3 now asks AA (4.5:1) for those muted lines instead of 7:1.
