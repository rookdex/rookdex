# Rookdex: launch-night dashboard design spec

Written 2026-10-14 from the dashboard brainstorm (sessions 54 to 57). It builds the after-launch state of the home page that the product design promises in §6 of `2026-09-09-rookdex-design.md`, and the scheduled rebuild that goes with it. The tracker's data and the brand stay as they are, with one exception: the active profile is now remembered (section 5).

GTA VI launches Thursday 19 November 2026 at 00:00 CET. This ships before the 1 November freeze.

## 1. What this spec covers

- One `Hub` island on the home page that shows the countdown before launch and the dashboard after it.
- The dashboard: stat tiles, a slim strip, What's next with in-place ticking and Undo, progress bars, recent finds, latest news.
- Remembering the active profile across pages and reloads.
- A required `added` date on rumours, and News sorted by it.
- A preview-only `?phase=after` override and a `ROOKDEX_NOW` build variable for testing the after state.
- The `launch-rebuild` schedule.
- Copy in English and Norwegian, accessibility, performance, security, tests.

### Non-goals

- No "Remaining nearby" (design spec §6). The seed has no region field; it belongs to the phase 3 map.
- No cross-tab sync. A hub tab sees ticks from another tab after a reload (section 7).
- No profile dialogs on the hub. Create, rename, export, import and delete stay on the tracker page.
- No new route. The dashboard takes over the hub at `/en/` and `/nb/`.
- No per-item anchors on News. Latest links to the News page as a whole.
- No facts feed, pipeline or digest. Those are phase 1c, planned for December.
- No Playwright. Layout is measured by hand in the browser pane (section 13).

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Where the dashboard lives | It takes over the hub after launch; no new route | One home for launch night and every day after |
| Layout | Profile chip in the top bar, big pair Overall % + Closest %, slim strip, What's next, Progress, Recent finds, Latest | Mockup B with C's numbers, measured at 320 px with no overflow |
| What's next | The category closest to done; the next one takes over at 100 %; Wildlife when nothing is found | One clear goal instead of a wall of items |
| What's next length | 3 rows. When the closest category has fewer than 3 left, the next-closest fills the rest. Each category's rows sit under a title saying how many are left | Short at 320 px with no empty slots; the tracker holds the full list |
| Ticking on the hub | Row slides out, next fills in, Undo toast that leaves 5 s after focus leaves What's next | Fast to use, a mis-tap is cheap to fix, and screen-reader users can reach Undo (WCAG 2.2.1) |
| Latest | 3 newest rumours by a new required `added` date | Needs a date to sort by; News uses the same order |
| Buying info after launch | Dropped from the hub; the guide's "Buying in Norway" already holds it | The dashboard is for players who own the game |
| Newcomer line | "New to GTA VI? Before you start" only while the active profile has 0 found, in the strip's first half | Helps on day one, then gets out of the way; same slot, so no layout shift |
| Phase before launch | Strictly by device clock in prod; `?phase=after` on preview hosts, `localhost` and dev only | Nobody sees the dashboard early by accident |
| Hub profile chip | Switch only, plus a "Manage profiles" link to the tracker | No dialog code copied onto the hub |
| Active profile | Remembered under one localStorage key | The hub and the tracker must show the same profile |
| Server HTML | Stays "before" until `launch-rebuild` at 00:05 CET on 19 Nov | `initialNow` is the build time |

## 3. Architecture

- **`Hub`** (`src/islands/hub/Hub.tsx`) replaces `Countdown` in `src/pages/[locale]/index.astro`. Still `client:load`, same props (`locale`, `initialNow`, `guideHref`, `trackerHref`) plus `latest` and `newsHref`.
- **`useHubPhase(initialNow)`** wraps the existing `useCountdown` and adds the override. It decides `before` or `after` once on mount and again when the countdown reaches zero.
- **The override.** `?phase=after` counts only when the parameter is exactly `after` and the host ends in `.workers.dev`, is `localhost` or `127.0.0.1`, or `import.meta.env.DEV` is true. Anywhere else it is ignored without a message.
- **`CountdownView`** is today's before-launch markup from `Countdown.tsx`, moved over with one change: the days line loses `aria-live`, because the hub's status region takes over its announcements (section 9). The after branch of `Countdown` (`hub.launched`) goes away; `hub.openTracker` stays for the header link.
- **One status region.** `Hub` renders a visually hidden `role="status"` element from mount, outside both views, so it survives the flip. It carries the daily "N days to go" line, the flip to "Day 0 since launch", tick and Undo results, and profile switches.
- **`Dashboard`** is loaded with a dynamic `import()` only when the phase is `after`, so visitors before launch don't download the tracker model or IndexedDB code. `Hub` renders `DashboardSkeleton` while the chunk loads and while IndexedDB opens. If the import fails, `Hub` replaces the skeleton with an alert (`hub.loadFailed`) and Latest still renders.
- **Shared tracker state.** `useTracker` splits in two:
  - `useTrackerState(tracker)` subscribes and calls `init()`. Used by both pages.
  - `useShowParam(selected)` mirrors the selection to `?show=`. Tracker page only.
- **One tracker per page.** The hub builds its own `createTracker(...)` over the same IndexedDB. The `buildTracker` helper in `Tracker.tsx` moves to a shared module so both islands build it the same way.
- **Pure model functions** live in `src/model/dashboard.ts` (section 6.2).
- **`Bar`** is exported from `StatsRail.tsx` and reused.

## 4. Layout and components

All new files go in `src/islands/hub/`. Top to bottom, the dashboard is:

1. **Top bar.** `ProfileMenu` in switch mode. Its six action props become optional. A new optional `manageHref` adds one "Manage profiles" link item under the profile list. With no action props, no action items render.
2. **`StatPair`.** Two big tiles: Overall % and Closest % with the category name under it. At 100 % everywhere, the Closest tile reads "All found".
3. **`StatStrip`.** "N found today · Day N since launch". While the active profile has 0 found in total, the first half is the newcomer link instead: "New to GTA VI? Before you start", to the guide. Same slot, so it appearing or going causes no shift.
4. **`WhatsNext`.** Up to 3 unfound items, each a checkbox row that calls `tracker.tick`. They come from the closest category first. When it has fewer than 3 left, the next-closest category fills the rest, at most two categories in all. Each category's rows sit under a small title: "Collectibles · 1 left" for the first, "Then: Places · 6 left" for the second. The count is every unfound item in that category, not only the ones shown. When everything is found it shows "You've found everything tracked so far" instead. The block always reserves the height of 3 rows and 2 titles.
5. **Progress.** One `Bar` per category. Overall isn't repeated; the tile shows it.
6. **Recent finds.** `recentFinds(items, records, 5)`, as on the tracker. Reserves the height of 5 rows, also when it shows `tracker.noRecent`.
7. **`Latest`.** The 3 newest rumours, name and relative date, then an "All news" link. Hidden when there are no rumours (known at build time, so the skeleton matches).

Long item and category names, emoji included, wrap and are never cut off. Norwegian runs longest; the 320 px check uses `nb`.

**`UndoToast`.**
- Opens after a tick. Holds one item id; a new tick replaces it.
- Its 5 s timer runs only while focus is outside What's next and the toast, and the pointer isn't over the toast. A tick puts focus on a What's next row, so Undo stays one Tab away until the player moves on.
- Rendered in the DOM straight after the What's next list, so Tab from the last row reaches Undo. Visually it sits fixed above the bottom tab bar; while it is open, `scroll-padding-bottom` equals its height so it never covers the focused element.
- Undo calls `tracker.untick(id)`, then focus moves to the restored item's checkbox. Escape closes the toast and focus stays in What's next.

**`DashboardSkeleton`.** Placeholders for blocks 1 to 7 at the fixed and reserved heights above, so the swap causes no layout shift (section 10).

**On the tracker page.** The `Progress` heading in `StatsRail` becomes a link to the hub from launch on. Before launch it stays plain text, because the hub is still a countdown then.

## 5. Active profile

Today `init()` always opens the first active profile (`ensureActiveProfile`, `profiles.ts:43`), and `switchProfile` only changes memory. A reload, or moving between the hub and the tracker, loses the choice.

- **Key.** `rookdex.active-profile`, holding the profile id. Declared in `src/islands/seenFlag.ts` next to the two existing keys, so the Settings delete script can name it without React.
- **Model stays DOM-free.** `TrackerDeps` gets an optional `activeProfile: { read(): string | null; write(id: string): void }`. Each island passes a localStorage wrapper that never throws.
- **Read.** `init()` uses the saved profile when it exists and isn't deleted. Otherwise it falls back to the first active profile and writes that id back.
- **Write.** On `switchProfile`, `createProfile`, import into a new profile, and the fallback after deleting the active profile.
- **Delete all.** `src/scripts/delete-all.ts` removes the key along with the language key.

## 6. Data flow

### 6.1 Ticking

1. A What's next checkbox calls `tracker.tick(id)`. While a tick is in flight, and for 400 ms after it lands, What's next ignores further ticks. A double tap would otherwise tick the item that just slid in under the finger.
2. The model writes the record, then notifies subscribers. On a failed write nothing changes (section 7).
3. `Dashboard` recomputes in one `useMemo` over `items`, `records` and the local day key: overall count, `perCategory`, `closestCategory`, `whatsNext`, `foundToday` and `recentFinds`. The day key comes from the hub's clock and changes at local midnight, so "found today", "Day N" and the relative dates in Latest roll over on an open page.
4. The ticked row slides out and the next unfound item fills the third slot, from the next-closest category when needed. When the ticked item was the last of its category, that title goes and the next category's title loses its "Then:". Focus moves to the checkbox in the filled-in row, or to the What's next heading when no row is left.
5. `UndoToast` opens and the status region says "{item} marked as found." Undo calls `tracker.untick(id)`; the item returns to the list and the status region says "{item} marked as not found."
6. Switching profile closes the toast, so Undo never acts on another profile, and the status region says "Showing {name}."

### 6.2 Model functions (`src/model/dashboard.ts`)

- `closestCategory(items, records): string | undefined`. The category with the highest percentage below 100. Ties go to `categoryIds` order. With nothing found, `wildlife`. With every category at 100 %, `undefined`. Retired items don't count.
- `nextGroups(items, records, limit): { category, left, items }[]`. Categories below 100 % ranked as `closestCategory` ranks them (highest percentage first, ties by `categoryIds` order, `wildlife` first when nothing is found), so the first group is always the closest category. Each group holds its unfound, non-retired items in the tracker's order (`groupItems`: group, then name), and `left` counts all of them. Groups fill until `limit` items, at most two groups. Empty when every category is at 100 %. The hub and the tracker list items the same way.
- `foundToday(records, now): number`. Records with `done: true` whose `updated_at` (stored in UTC) falls on `now`'s local calendar day.
- `latestRumours(rumours, limit): Rumour[]`. Newest `added` first, ties by id, at most `limit`.

### 6.3 Latest

- `rumourInputSchema` gets a required `added` (ISO date, `YYYY-MM-DD`). The three current rumours get the date their file was first committed (2026-09-18).
- `news.astro` sorts by `added`, newest first.
- `index.astro` passes `latestRumours(rumours, 3)` to `Hub` as `{ name, added }[]`.
- The relative date ("3 days ago", "i dag") is computed in the browser from `added` with `Intl.RelativeTimeFormat` in the page's locale, so it never goes stale between builds. Dates in the future are clamped to today.

### 6.4 Phase

- `initialNow` is the build time, unless the build sets `ROOKDEX_NOW` (an ISO timestamp). Prod never sets it; it exists to build the after state for testing. A value that doesn't parse as a date fails the build with a message naming the variable, instead of shipping `Invalid Date`.
- Before `launch-rebuild` runs on launch night, the server HTML is the countdown and the client swaps to the dashboard by clock.
- If focus is inside the hub when it flips at midnight, focus moves to the dashboard's heading (`hub.dashboardHeading`, `tabindex="-1"`) instead of falling to `body`.

## 7. Errors and edge states

- **The dashboard chunk won't load** (offline with a stale cache, or a deploy mid-session). The skeleton is replaced by the `hub.loadFailed` alert; Latest still renders.
- **Storage won't open** (`status: "error"`). The tracker blocks are replaced by the tracker's own alert (`tracker.storageError`). Latest still renders.
- **A tick or Undo fails** (`error: "storage"`). The row stays. No toast opens for a failed tick; a failed Undo leaves the item ticked and the toast shows the error. The existing `tracker.errors.storage` text shows as an alert above What's next. The next successful action clears it.
- **Data changed in another tab** (`error: "closed"`). The existing "Reload to continue" alert shows and the What's next checkboxes are disabled.
- **Two open tabs.** Not synced. Accepted: on a phone every page load mounts fresh.
- **Blocked localStorage.** The key reads as null and writes do nothing: the first active profile, as today.
- **Saved id is stale.** Fallback to the first active profile, and the key is rewritten.
- **All found.** "All found" on the Closest tile, the all-found line in What's next.
- **No rumours.** Latest is hidden.
- **Bad `added` date.** Seed validation rejects it like any other field.
- **Override off-host.** `?phase=after` is ignored.

## 8. Copy

New keys go into both `src/locales/en.json` and `nb.json`; `copy.test.ts` checks the sets match. `hub.launched` is removed; `hub.openTracker` stays because the hub header's tap link uses it. Reused as they are: `hub.daySince`, `tracker.progress`, `tracker.recent`, `tracker.noRecent`, `tracker.count`, the category labels and the error strings.

| Key | English | Norwegian |
|---|---|---|
| `hub.dashboardHeading` (visually hidden) | Your progress | Din fremgang |
| `hub.overall` | Overall | Totalt |
| `hub.closest` | Closest: {category} | Nærmest: {category} |
| `hub.allFound` | All found | Alt funnet |
| `hub.foundToday.one` / `.other` | {count} found today | {count} funnet i dag |
| `hub.whatsNext` | What's next | Neste |
| `hub.nextGroup` | {category} · {count} left | {category} · {count} igjen |
| `hub.nextGroupThen` | Then: {category} · {count} left | Deretter: {category} · {count} igjen |
| `hub.everythingFound` | You've found everything tracked so far. | Du har funnet alt vi følger så langt. |
| `hub.latest` | Latest | Siste nytt |
| `hub.allNews` | All news | Alle nyheter |
| `hub.newHere` | New to GTA VI? Before you start | Ny i GTA VI? Før du starter |
| `hub.manageProfiles` | Manage profiles | Administrer profiler |
| `hub.markedFound` | {item} marked as found. | {item} er merket som funnet. |
| `hub.undo` | Undo | Angre |
| `hub.undone` | {item} marked as not found. | {item} er merket som ikke funnet. |
| `hub.switched` | Showing {name}. | Viser {name}. |
| `hub.loadFailed` | Your progress couldn't load. Reload the page to try again. | Fremgangen din kunne ikke lastes. Last inn siden på nytt for å prøve igjen. |

## 9. Accessibility

- **Headings.** A visually hidden `h2` ("Your progress") over the tiles and strip; visible `h2`s for What's next, Progress, Recent finds and Latest. Each What's next group title is an `h3`, and its list is labelled by it.
- **One status region** (section 3), in the DOM from load and outside both views, so the flip at midnight is announced once and no re-render wipes it. It is written in one go and cleared between messages. The visible days line and found-today count are not live, so nothing is announced twice. Errors keep using the existing `role="alert"` paragraphs.
- **Every press is heard.** Tick, Undo and profile switch each write one status line (section 6.1). "Manage profiles" and "All news" are links.
- **Toast.** Undo is a real button, one Tab after the last What's next row. The timer only runs once focus has left What's next and the toast (section 4), which meets WCAG 2.2.1 without a setting. Escape closes it. It never covers the focused element (2.4.12).
- **Focus** after a tick goes to the filled-in row's checkbox, after Undo to the restored item's checkbox, and after the midnight flip to the dashboard heading. Never to `body`.
- **Reduced motion.** No slide; the row is replaced in place.
- **Targets.** Checkbox rows, Undo and links are at least 44 px tall. Controls on one row share one height and bottom edge.
- **Tiles.** Each percentage has its label in text next to it, not only colour.
- `vitest-axe` runs on `CountdownView`, `Dashboard`, `DashboardSkeleton` and `UndoToast`.

## 10. Performance

- **No layout shift.** Every block has a fixed or reserved height (section 4), and the skeleton uses the same heights at each breakpoint, keeping the 0 CLS from #45. Measured as in section 13.
- **Split bundle.** `Dashboard` and the tracker model load only in the after phase.
- **No new dependencies.** `Intl.RelativeTimeFormat` and existing code only.
- **Bars** keep writing width through the CSSOM, which the CSP allows.

## 11. Security and privacy

- The new localStorage key holds a random profile id and nothing else. Delete all removes it.
- `?phase` is compared to the exact string `after` and never echoed into the page or URL.
- `ROOKDEX_NOW` is read at build time only and is not set in any deploy.
- No new network requests, no new third parties, CSP unchanged.

## 12. launch-rebuild

- `deploy.yml` gets a `schedule` trigger at `5 23 18 11 *` (23:05 UTC on 18 Nov, which is 00:05 CET on 19 Nov). The scheduled job runs only when the year is 2026, so it doesn't fire again in 2027.
- GitHub can delay scheduled runs. Until it lands, the client still switches by clock; the only cost is a one-time layout shift for anyone loading the hub in that window.
- A `workflow_dispatch` dry run on a preview happens before the freeze.
- **Noticing a missed run.** GitHub emails me when the run fails. A run that never starts sends nothing, so on the morning of 19 Nov I check the Actions tab and the hub's page source; if the rebuild is missing, I start `deploy.yml` by hand.

## 13. Testing

- **`dashboard.test.ts`.** `closestCategory`: ties, nothing found, all at 100 %, retired items ignored. `foundToday`: local-midnight boundary with an injected `now`, run with `TZ=Europe/Oslo` so a record at 23:30 UTC counts for the next local day. `latestRumours`: order, ties, limit. `nextGroups`: skips done and retired, tracker order, limit, fills from the next-closest category, at most two groups, `left` counts unshown items, first group equals `closestCategory`.
- **Tracker model.** Active profile restored; fallback when its profile is deleted or missing; written on switch, create, import as new and the delete fallback; blocked storage behaves as today.
- **`delete-all`.** The new key is removed.
- **`useHubPhase`.** Override honoured only on allowed hosts and only for `after`; the phase flips at zero.
- **Components** (fake-indexeddb, fake timers).
  - Skeleton first, then data. A rejected `import()` shows `hub.loadFailed`.
  - Tick slides the row out and opens the toast; Undo restores the item and focuses its checkbox.
  - The toast timer doesn't run while focus is in What's next or the toast, and closes 5 s after focus leaves. Escape closes it.
  - A second tick within 400 ms, or while the first is in flight, is ignored.
  - Focus moves to the filled-in row. No slide under reduced motion.
  - Switching profile closes the toast and writes "Showing {name}." to the status region; tick and Undo write theirs.
  - The status region exists on first render in both phases and survives the flip; a flip with focus inside the hub moves focus to the dashboard heading.
  - The day key rolling over at midnight updates "found today".
  - The error and edge states from section 7 render. `ProfileMenu` in switch mode renders only the profiles and the manage link.
- **Seed and News.** A rumour without `added`, or with a bad date, fails validation. `news-page.test.ts` checks the order.
- **Build variable.** An unparseable `ROOKDEX_NOW` fails with the variable's name in the message.
- **Layout shift** (manual, me, before the PR merges). Build with `ROOKDEX_NOW` after launch, serve locally, open `/en/?phase=after` and `/nb/?phase=after` in the browser pane at 320 px and desktop, with three profiles: 0 finds, 1 find, and 6 or more finds. Read layout-shift entries with a `PerformanceObserver`. Target 0. In the same pass: the toast doesn't cover the focused checkbox at 320 px, and long `nb` names wrap without overflow.
- **Keyboard and NVDA walk** (manual, me, before the PR merges). Tick, Tab to Undo, Undo, Escape, switch profile, each heard once.
- **launch-rebuild.** The `workflow_dispatch` dry run from section 12.

## 14. Considered and rejected

- **Undo for more than the last tick.** The toast holds one item; two quick ticks leave only the second undoable on the hub. The tracker's untick undoes anything, with no time limit.
- **Cross-tab sync** (BroadcastChannel). Desktop-only edge, and every phone page load is fresh.
- **Announcing profile switches on the tracker page.** The tracker has the same silent switch today. Out of scope here; worth a small follow-up.
- **A device clock set forward** shows the dashboard early. Accepted: prod follows the device clock by design, and nothing is lost.
- **An installed app serving the old "before" HTML after launch.** The client flips by clock anyway; the cost is one layout shift until the service worker updates.
- **A third What's next group.** When the two closest categories have one item left each, What's next shows 2 rows. A third title would need its height reserved on every visit for a case that lasts one tick.
- **Removing the schedule trigger after launch.** The year guard already stops a 2027 run; removing the trigger can happen in any later chore.

## 15. After this spec

The Android sub-project (TWA, closed test, Ko-fi link hidden inside the TWA) gets its own spec next. The phase 1c pipeline follows in December.

> Stress-tested 2026-10-14 (skill 1b85fca): 14 applied, 2 adapted, 1 decided by me.
>
> Amended 2026-10-15: What's next fills to 3 rows from the next-closest category, each category under a titled group (§2, §4, §6.1, §6.2, §8, §9, §13, §14). Decided after the Task 10 browser pass showed 1 row in space for 3.
