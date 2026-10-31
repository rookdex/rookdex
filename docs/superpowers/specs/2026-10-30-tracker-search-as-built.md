# Rookdex: tracker search and hide found, as built

Written 31.10.2026 after the build on `feat/tracker-search`. It records where the build differs from the spec (`2026-10-30-tracker-search-design.md`) and the plan beside it, and what I measured before the PR.

## Plan rulings, as shipped

- **P1. Sticky needs a flex wrapper.** `.tracker` itself is the flex column: the search row, the persist hint, then one grid (`.tracker-layout`) for profile, Progress, chips and the list. Column widths are unchanged (see layout B below).
- **P2. Privacy and Delete all.** `privacy.storedChoices` (en, nb) lists Hide found, and Delete all forgets `rookdex.hide-found`. On top of the plan, `privacy.deleteBody` now lists everything Delete all removes (it was incomplete before this branch).
- **P3. Forced colours.** One rule fills the pressed toggle and pressed chips with `Highlight` and `HighlightText`.
- **P4. No synced ticks.** Tested as "no new snapshot when only the records change".
- **P5. Terms.** `aircraft` gained `fly og helikoptre`. Retired items stay out of every count.
- **P6. Extra units.** `useLiveStatus` holds the status text and the 500 ms timer. `emptyState()` in `search.ts` picks the message under the list.
- **P7. Timer tests.** Fake timers in `useLiveStatus.test.ts`; real time with short waits in the island tests.

## Changes during the build

- **`--search-row-h` sits on `html:has(.search-row)`**, not on `.search-row`. `scroll-padding-top` is set on `html`, and custom properties only inherit downwards. The row inherits the same value, so the formula still lives in one place.
- **No match is announced as its own text.** Spec §5 only gives counts as typing examples, so the first build said "0 results" while the list said `No match for "…".` The announcement now mirrors all three empty states (no match, other categories, everything found).
- **The toggle shows its icon only below 768 px.** At 320 px the label squeezed the field to 136.8 px (8.55 rem), under the 9 rem floor. The label stays in the accessible name ("Hide found 37 hidden"); the `·` before the count returns at 768 px with the label.
- **Layout B: the search row spans the full width under the title.** In the first build the row only spanned chips and list, so on desktop Progress started level with the search while chips and list started under it. Now the profile tops the chip column, and from 1024 px the profile, the first card and Progress all start on one line under the row. From 768 px the list spans the profile and chip rows (`grid-template-rows: auto 1fr`), so the chips sit right under the profile. Phones read title, search, profile, Progress, chips, cards. The persist hint moved out of the profile row to sit under the search, because the 170 px column is too narrow for it.
- **The h1 shares the search row's left edge.** It sat 25 px left of the tracker on desktop before this branch (both were capped at 1038 px, only the tracker was centred). From 1024 px the page's h1 is centred at the same cap, `--tracker-max-w` on `main`. It is in the page's own style, so the title does not move when the island mounts.
- **Pressed chips keep a visible focus ring in forced colours.** The P3 rule opts out of forced colours, which also kept the light focus outline; on a light high-contrast theme it vanished. The ring now uses `CanvasText` there.

## Known limits (accepted)

- The status text is not cleared on a profile switch, and a line identical to the current one is not announced again.
- Spec §7 calls restore a profile change, but restore keeps the profile. The snapshot is still retaken after restore and after a confirmed import.
- The persist hint is a second `role="status"` inside the tracker. It is older than this branch and only shows once.
- Turning Hide found on in the moment before the tracker has loaded announces "0 hidden".
- Typing a category name ("dyreliv", "places") finds nothing: category labels are not search terms (spec §3.2). Cheap to add after launch if players type them.

## Measured (served build, 31.10.2026)

| Check | 320 x 800 | 1265 x 900 |
| --- | --- | --- |
| Row height | 61 px | 61 px |
| Field and toggle | both 44 px, same bottom edge | both 44 px, same bottom edge |
| Field width, Hide found off / on | 224 / 209.9 px (14 / 13.1 rem) | 886.8 / 864 px en, 880.4 / 857.5 px nb |
| Toggle overflows | no | no |
| Sideways scroll, incl. a 100-character query | none | none |

- en and nb give the same numbers at 320 px; at 1265 px the nb label is 6.5 px wider.
- Sticky: scrolled to the last of 215 cards, the row's top is 0 and it covers the cards beneath it. `html` scroll-padding-top is 69 px (61 + 8). Shift+Tab back through the last three cards keeps each checkbox below the row.
- At 640 x 360 the row is static.
- The open profile menu (z-index 8) sits above the row (7) where they overlap on desktop.
- One clear button: the native WebKit cancel button computes to `appearance: none`, and only my ✕ shows.
- Placeholder `rgb(163, 163, 163)` on `rgb(13, 13, 13)` is 7.70:1, opacity 1.
- One status region in the tracker for search and ticks. The page's other two are the site-wide update and offline notices.
- Load CLS at 320 px on `/en/tracker/`: 0, re-measured after layout B.
- Layout B at 1265 px: h1 and row both start at x 106 (nb); the profile button, first card and Progress all start at y 292. Same at 1280 px (x 114) and 900 px (profile and first card at y 276, Progress under the list).
- Forced colours: the Browser pane cannot emulate them, so I check the pressed toggle and a pressed chip in Edge DevTools (Rendering, "Emulate CSS forced-colors") before merge.

## Bundle

Tracker island chunk: 10631 bytes before, 17162 bytes after (+6531), for search, the terms table, Hide found and the status hook.

## Left for later

Small test and code gaps that the per-task reviews deferred: an island test for the restore resnapshot and the arrival spare with Hide found on, a stricter forced-colours CSS test, a guard for stale `SEARCH_TERMS` entries, and `delete-all.ts` reusing `clearFlag`. None changes behaviour.
