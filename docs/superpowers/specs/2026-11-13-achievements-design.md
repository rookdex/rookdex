# Rookdex: Achievements and trophies spec

Written 13.11.2026 from the achievements brainstorm. Two layouts were compared on one page in the Browser pane: tracker-style cards (A) and ledger rows grouped by type (B). B won, with one change: on a phone the Xbox Gamerscore card spans the full row so the score cards line up. Mockup screenshots sit beside this file in `assets/` (`2026-11-13-achievements-desktop.jpg`, `-phone.jpg`, `-console-question.jpg`). They use made-up sample names, highlight the Dashboard tab and show draft copy. Where they differ, this spec wins: the Tracker tab is current (§2) and the copy is in §10.

GTA VI launches 19.11.2026 and has no official achievement list yet. This spec is written now so the build after launch only has to follow it. The code ships after the content freeze ends (03.12.2026). The data ships only when the official list is public on the PlayStation and Xbox platforms. A datamine (GTAForums, 07.11.2026) claims 55 single-player achievements, one of them worth 1000 points. I never seed from it.

## 1. What this spec covers

- **Entry points and route:** a new page at `/[locale]/achievements`, reached from a dashboard tile and from the tracker's left rail (§2).
- **Console question:** the first visit asks "PlayStation, Xbox or both?" and stores the answer per local profile on this device (§3).
- **Page layout:** layout B per screen size (§4) and its rows, filters, search, hidden entries and tracker links (§5).
- **Data:** one `src/seed/achievements.json` file with its own schema, kept out of the tracker's item list (§6).
- **Progress:** ticks are ordinary progress records, so export, import, backup and purge carry them unchanged (§7).
- **Store hardening:** `upgrade()` reads `oldVersion` and the open request handles `onblocked`, before anything else lands (§8).
- **Xbox sync prep:** an `xbox_id` slot per entry, and the rules the later OpenXBL spec must follow (§9).

### Non-goals

- No achievement data in this spec or its first build PR. The list waits for the official platform listing (§13).
- No Xbox or PlayStation sign-in. OpenXBL sync is phase 2 (design spec §8) and gets its own spec.
- No sixth tab. The phone tab bar holds five and wraps 3 + 2 below 18rem.
- No new IndexedDB store and no `DB_VERSION` bump.
- No change to export file versions. Export v1 and backup v2 stay as they are.
- No auto-ticking. An achievement is earned in the game, so only the player ticks it, even when every linked tracker item is found.
- No DLC or online achievements. A later spec adds a pack field if Rockstar ships more.

## 2. Entry points and route

- **Route:** `src/pages/[locale]/achievements.astro`, one page per locale, built from `getStaticPaths` over the locales. The page is built only when the achievements list has at least one entry. With an empty list there is no page, no tile and no rail link.
- **Tab:** the page passes `tab="tracker"` to the layout, so the Tracker tab is current. It ticks the same profile as the tracker.
- **Dashboard tile:** after launch, the Dashboard (`src/islands/hub/Dashboard.tsx`) shows an Achievements tile. It has the label, an "Open" link, the earned count over the total in display numerals, one summary line for the chosen console and a progress bar.
  - PlayStation: "1 gold · 1 silver · 1 bronze".
  - Xbox: "65 / 1000 G".
  - Both: the trophy line and the Gamerscore line, stacked.
  - No console chosen yet: the tile says "Pick your console" and links to the page.
  - Placement follows the desktop dashboard grid rules (desktop dashboard spec) and is measured at every width in §14.
  - The pre-launch Hub does not show the tile.
- **Tracker rail:** the tracker's left rail gets an "Achievements" link under Sources, styled like the Sources link. On a phone it sits in the same place the Sources link does.
- **Profiles:** the page uses the tracker's own profile code, not a copy. On a fresh device it creates the default profile through the same function the tracker uses (`src/model/profiles.ts:38`), and it mounts the tracker's `ProfileMenu` in the profile pill. Switching profile re-reads that profile's ticks and console choice. The console card comes back if the new profile hasn't answered yet.

## 3. Console question

- **When:** on the achievements page, the first time a profile opens it. Never on app start, so the countdown and tracker stay free of prompts.
- **What:** a card above the list with the heading "Which console do you play on?", one line of explanation naming the active profile, and three 44 px buttons: PlayStation, Xbox, Both. Under them: "Change it any time from the button at the top."
- **Before an answer:** the list is visible under the card and every row shows both the trophy grade and the Gamerscore. Ticking works.
- **After an answer:** the card goes away and a pill at the top shows the choice ("PlayStation", "Xbox" or "PlayStation + Xbox"). Focus moves to the pill, because the button that was pressed no longer exists. The status region says "Console: PlayStation". Tapping the pill brings the card back and moves focus to the pressed choice.
- **Storage:** localStorage key `rookdex.console`, a JSON object from profile id to `"playstation" | "xbox" | "both"`. It is read through a small Zod schema. Bad JSON, an unknown value or blocked storage reads as "not answered". Writing a choice drops entries for profile ids that are no longer in the profiles store. A profile in the 30-day bin keeps its choice, so restoring it keeps the answer.
- **Blocked storage:** when localStorage throws, the choice still applies for the rest of the visit. The card comes back on the next visit. No error message: nothing the player ticked is lost.
- **Not exported.** After a restore on a new device the question comes back once. Keeping it out of the backup leaves the backup v2 format untouched.
- **Delete all** (`src/scripts/delete-all.ts`) removes the key with the others.
- **What the choice changes:**

| Choice | Rows show | Grade filters | Score cards | Platinum entry |
|---|---|---|---|---|
| PlayStation | grade | shown | Earned, PlayStation trophies | listed |
| Xbox | Gamerscore | hidden | Earned, Xbox Gamerscore | not listed |
| Both | grade and Gamerscore | shown | Earned, PlayStation trophies, Xbox Gamerscore | listed |

"Earned" counts the entries listed for that choice, so Xbox shows one fewer than PlayStation.

## 4. Layout per screen size

All CSS is mobile-first with `min-width` steps. No `max-width` queries. The page reuses the tracker's three-column widths so the two pages line up when you switch tabs.

| Width | Layout |
|---|---|
| 320 to 767 px | One column: h1; the console pill and profile pill on one row; score cards two per row, where an odd last card (the Gamerscore card under Both) spans the row; filter chips in one horizontal scroll row; search row; grouped rows with the value under the text. |
| 768 to 1023 px | Same order with the text tab row on top. Rows put the value in a right-hand column. |
| 1024 to 1599 px | Three columns: filter rail 210 px, list, score rail 230 px. Both rails are sticky. |
| 1600 to 1919 px | Rails 230 px and 260 px. |
| 1920 px and up | Inside each group the rows flow in two columns, so a line never runs across a 1000 px row. This matches the "more columns, not longer lines" rule. |

The filter chips row at 320 px shows a partly cut chip at the right edge, so it reads as scrollable. The active chip scrolls into view when it changes.

**No layout shift from the console choice.** The list is static HTML showing both values, and the island would otherwise remove the Platinum row and one value per row after hydrating. A pre-paint inline script, on the same pattern and CSP hash process as `src/model/hub-prepaint.ts`, reads `rookdex.console` for the active profile before first paint. It sets `data-console` on `<html>`, and CSS hides what that choice doesn't show. With no answer, or blocked storage, nothing is set and both values show.

**Focus is never covered.** `scroll-padding-bottom` keeps a focused row above the fixed phone tab bar, and `scroll-padding-top` keeps it below anything sticky, as on the tracker.

## 5. Rows, filters, search

### Rows

- One row per entry: the tick button (44 px) at the left, then the name, the description, tags, and the tracker link when there is one. The value sits at the right from 768 px, or under the text on a phone.
- The value is the grade as a coloured dot plus the word ("Gold"), and/or "50 G". Colour never carries meaning alone.
- Groups, in this order: Story, Missable, Collectible, Other. Each group heading shows "earned of total". Inside a group the entries keep the official list order (file order).
- **Tags:** Missable shows an amber tag. Story and Collectible show a neutral tag only when the list is filtered so the group heading is gone.
- **Earned row:** the tick fills with the accent, as the tracker's tick does. The row stays in place unless "Hide earned" is on.

### Hidden entries

- An entry with `hidden: true` renders as "Hidden achievement 1", "Hidden achievement 2" and so on, numbered in list order, with its grade and Gamerscore visible. The number keeps the rows and their tick names apart for a screen reader. Its name and description sit inside a `<details>` with the summary "Show name and description". This works without JavaScript and the reveal lasts until the page is left.
- At launch the platforms may list a hidden entry before anyone knows its text. Such an entry has no name or description in the data. It renders the same numbered label with no `<details>`, and the data PR fills the text in once a source shows it.
- An earned hidden entry renders revealed.
- Search does not match the text of an unrevealed hidden entry, so typing a word cannot spoil one. Searching "hidden" (en) or "skjult" (nb) matches every hidden entry.

### Tracker links

- An entry with a `link` shows a line such as "Wildlife: 18 of 25" with a thin bar and an "Open" link to `tracker?show=<category>`, the existing `parseShow` route.
- The count covers countable seed items (not retired) in that category, narrowed to the group when `link.group` is set. The same rule as `stats.ts`.
- When the count reaches the total, the line says so ("Wildlife: 25 of 25"). The tick stays the player's job.

### Filters

- Single select, like the tracker's category rail: All, then Platinum, Gold, Silver, Bronze (only when the choice includes PlayStation), then Story, Missable, Collectible, Hidden.
- All shows "earned/total"; every other filter shows its total.
- A filter that would be empty for the current choice is not shown. Xbox has no Platinum, so it never shows one.
- The filter is kept in the URL as `?filter=<id>` so a link opens the same view. Unknown values fall back to All.

### Search and "Hide earned"

- One search field and one "Hide earned" toggle, the same height and bottom edge (44 px).
- Search matches name and description, case and accent insensitive. It reuses the normaliser in `src/model/search.ts`. It combines with the filter (both must match).
- No match: "No achievements match." with a "Clear search" button.
- "Hide earned" is stored in localStorage `rookdex.hide-earned`, separate from the tracker's `rookdex.hide-found`. Delete all clears it.
- The search placeholder must fit a 320 px phone in both languages next to the toggle. Candidates "Name or text" and "Navn eller tekst". The tracker's placeholder clipped at 360 px before #125, so this is measured, not assumed.

## 6. Data

### File and loader

- `src/seed/achievements.json` is an array of entries. `src/model/seed.ts` special-cases the file name as it does `rumours` and `facts`. It is parsed with its own schema and exported as `achievements`. It is never part of `seedItems`, so tracker totals, Dex pages, the sitemap categories and stats do not see it.
- Validation runs at build like the rest of the seed. A bad entry fails the build.
- The page passes the island only what it needs: the entries, and for each linked category or group the list of countable item ids. The island does not import `seed.ts`, so it does not bundle the whole seed.

### Schema

```ts
const GRADES = ["platinum", "gold", "silver", "bronze"] as const
const ACHIEVEMENT_GROUPS = ["story", "missable", "collectible", "other"] as const

export const achievementInputSchema = z
	.strictObject({
		id: idSchema, // "achievements/<slug>", never changed once shipped
		name: text(TEXT.name).optional(), // official English name; absent only on a hidden entry whose text is unknown
		description: text(TEXT.description).optional(), // official English description; same rule as name
		tip: localized(TEXT.description).optional(), // my own words, en + nb
		grade: z.enum(GRADES),
		gamerscore: z.int().min(5).max(1000).optional(), // absent only on the Platinum
		hidden: z.boolean().optional(),
		group: z.enum(ACHIEVEMENT_GROUPS),
		link: z.strictObject({ category: z.string().regex(SLUG), group: z.string().regex(SLUG).optional() }).optional(),
		xbox_id: z.string().regex(/^\d{1,10}$/).optional(),
		sources: z.array(sourceInputSchema).min(1),
	})
	.refine((entry) => (entry.grade === "platinum") === (entry.gamerscore === undefined), {
		message: "the Platinum has no Gamerscore, and every other entry has one",
	})
	.refine((entry) => entry.hidden === true || (entry.name !== undefined && entry.description !== undefined), {
		message: "only a hidden entry may leave out its name and description",
	})
	.refine((entry) => (entry.name === undefined) === (entry.description === undefined), {
		message: "name and description are known together or not at all",
	})
```

`sourceInputSchema` is the source shape the items already use (https only, title). The loader attaches tiers as it does for items. `localized` and `SLUG` are module-private in `schema.ts` today, so the build exports them.

### Rules the loader and `seed.test.ts` enforce

- Every id starts with `achievements/`. Ids are unique across the whole seed (the existing duplicate check covers it).
- Ids follow the banned brand token rule: no `gta`, `gta6`, `gtavi`, `rockstar`, `leonida` or `vice` as a whole segment. The slug comes from the name with those words dropped, plus `-2` on a clash. "Welcome to Vice City" would become `achievements/welcome-to-city`. A hidden entry with no known text gets `achievements/hidden-<n>`.
- **An id never changes once shipped**, because ticks are stored under it. When a hidden entry's name becomes known, the text is filled in and the id stays `achievements/hidden-<n>`. A test compares the shipped ids with a committed list (`src/seed/achievements.ids.txt`) and fails when one disappears.
- Names are printable ASCII, like item names. Curly quotes and apostrophes are straightened when the data is entered.
- A non-empty list has exactly one Platinum, and its Gamerscores add up to 1000.
- `link.category` names a seed category that exists. `link.group`, when set, is a group inside it.
- Every source URL is on `allowlist.json` and not blocked. Unlike tracker items there is no confirmed/expected tier rule: an achievement either is on the platform list or is not in the file. Datamine hosts stay on the blocklist.
- The data PR adds the hosts it needs to `allowlist.json`: the platform holders' own pages as official, and mirror sites that read the platform data (for example TrueAchievements, PSNProfiles, Exophase) as press. The build checks which pages actually list GTA VI before adding any host.
- **Where the text comes from:** I type the list from the platform holders' own listing, the same way every item is written by hand. A mirror site is cited as a source but never bulk-copied: a whole list lifted from one site is a database-right question (åndsverkloven § 24) and may break its terms. If only a mirror has the list, the data PR first reads that site's terms and notes the result in the PR.
- **No platform marks:** no PlayStation or Xbox logos, no official trophy or Gamerscore icons. The platform names appear as plain words to say which console a value belongs to. Grades are plain coloured dots with a word.
- `xbox_id`, when set, is unique.
- The `tip` follows the copy rules for both languages (no prices, no links, no markup).

### Language

Names and descriptions stay in English, as item names do. Consoles show them in English in Norway because GTA V shipped without Norwegian. The nb page marks them with `lang="en"`. Only `tip` is written in both languages.

## 7. Progress, export, backup

- **A tick is a progress record:** `{ item_id: "achievements/<slug>", done, updated_at, note?, origin: "manual" }`, stored under `[profile_id, item_id]` and written through `setDone` in `src/model/progress.ts`. `ID_PATTERN` already accepts these ids.
- **Export v1, backup v2, import and restore** carry the records with no change. Import does not filter by known ids, and the merge rule stays "newest `updated_at` wins".
- **Older builds:** a file exported by the new build imports into an older one. The older build stores the achievement records, ignores them, and shows them once it updates.
- **Profile purge** after 30 days and Delete all remove them with the rest of the profile's progress.
- **Tracker and dashboard:** stats, `recentFinds`, `categoryRows`, `foundToday` and the finds-by-day chart already count only records that have a seed item. A test pins this for an `achievements/` record so a later change cannot let ticks leak into "Recent finds".
- **Backup reminder:** achievement ticks call `countBackupTick` like tracker ticks. A player who only ticks achievements still gets the reminder after 25 ticks.
- **Privacy page:** the "What Rookdex stores, on your device only" list and `privacy.deleteBody` name every key Delete all clears. Both gain the console choice and whether Hide earned is on, in en and nb, in the same PR that adds the keys.
- **Write failures:** a tick that fails to save shows the tracker's existing `tracker.errors.storage` message and the tick goes back to its old state. A database closed by another tab shows `tracker.errors.closed`. A blocked open shows `achievements.blocked` (§8).

## 8. Store hardening (build task 1)

The senior review on 12.11.2026 found that `upgrade()` ignores `oldVersion` and that the open request has no `onblocked`. This feature needs no version bump, but any later bump would run every create again and throw on stores that already exist. The fix lands first, on its own commit.

```ts
function upgrade(db: IDBDatabase, oldVersion: number): void {
	if (oldVersion < 1) {
		db.createObjectStore("profiles", { keyPath: "id" })
		const progress = db.createObjectStore("progress", { keyPath: ["profile_id", "item_id"] })
		progress.createIndex("profile_id", "profile_id")
	}
	// Future versions add `if (oldVersion < 2) { ... }` here. Never edit a branch that has shipped.
}
```

- `open.onupgradeneeded = (event) => upgrade(open.result, event.oldVersion)`.
- `openStore` takes an optional `onBlocked` callback, wired to `open.onblocked`. The tracker uses it to show the existing "closed" message, with the copy "Close other Rookdex tabs, then reload." It does not reject, because the open completes once the other tab lets go.
- `openStore` takes an optional `version` for tests only (default `DB_VERSION`). That lets a test open a version above 1 against a connection that ignores `versionchange`.
- `DB_VERSION` stays 1.

## 9. Xbox sync prep

- **`xbox_id`** holds the achievement id OpenXBL returns for the title. The data PR fills it when a public source gives the ids. Otherwise the sync spec fills it from the API.
- **`origin`** stays `z.literal("manual")` in this build. The sync spec widens it to `"manual" | "xbox"`. That spec must also bump the export to version 3, because today's strict schema rejects any other origin, so older builds would refuse new files with a clear "newer version" message instead of failing silently.
- **Console choice:** when Xbox sign-in exists, signing in sets the profile's choice to Xbox, or to Both if PlayStation was already chosen.
- **PlayStation:** no `psn_id` now. PSN has no safe API. Trophy import stays the opt-in experimental idea in design spec §8, and ticking by hand is the baseline.

## 10. Copy

New keys in `src/locales/en.json` and `nb.json`, checked by `bundles.test.ts`:

| Key | en | nb |
|---|---|---|
| `achievements.title` | Achievements | Prestasjoner |
| `achievements.console.question` | Which console do you play on? | Hvilken konsoll spiller du på? |
| `achievements.console.body` | Rookdex shows the trophies or achievements for it. Ticks are saved on this device for {profile}. | Rookdex viser troféene eller prestasjonene for den. Hakene lagres på denne enheten for {profile}. |
| `achievements.console.playstation` | PlayStation | PlayStation |
| `achievements.console.xbox` | Xbox | Xbox |
| `achievements.console.both` | Both | Begge |
| `achievements.console.pill.both` | PlayStation + Xbox | PlayStation + Xbox |
| `achievements.console.change` | Change it any time from the button at the top. | Du kan endre det når som helst med knappen øverst. |
| `achievements.filter.label` | Filter achievements | Filtrer prestasjoner |
| `achievements.filter.all` | All | Alle |
| `achievements.grade.platinum` / `gold` / `silver` / `bronze` | Platinum / Gold / Silver / Bronze | Platina / Gull / Sølv / Bronse |
| `achievements.group.story` / `missable` / `collectible` / `other` | Story / Missable / Collectible / Other | Historie / Kan gå tapt / Samleobjekt / Annet |
| `achievements.hidden` | Hidden | Skjult |
| `achievements.hidden.entry` | Hidden achievement {n} | Skjult prestasjon {n} |
| `achievements.hidden.show` | Show name and description | Vis navn og beskrivelse |
| `achievements.search.placeholder` | Name or text | Navn eller tekst |
| `achievements.hideEarned` | Hide earned | Skjul oppnådde |
| `achievements.empty` | No achievements match. | Ingen prestasjoner passer. |
| `achievements.score.earned` | Earned | Oppnådd |
| `achievements.score.trophies` | PlayStation trophies | PlayStation-troféer |
| `achievements.score.gamerscore` | Xbox Gamerscore | Xbox Gamerscore |
| `achievements.tick` | Earned: {name} | Oppnådd: {name} |
| `achievements.link` | {category}: {done} of {total} | {category}: {done} av {total} |
| `achievements.tile.pick` | Pick your console | Velg konsoll |
| `achievements.blocked` | Close other Rookdex tabs, then reload. | Lukk andre Rookdex-faner og last inn på nytt. |
| `achievements.status.console` | Console: {console} | Konsoll: {console} |
| `achievements.status.earned` | {name} earned | {name} oppnådd |
| `achievements.status.unearned` | {name} not earned | {name} ikke oppnådd |
| `achievements.status.count.one` / `.other` | {count} achievement shown / {count} achievements shown | {count} prestasjon vises / {count} prestasjoner vises |

The search empty state reuses `tracker.search.clear` ("Clear search"), the tracker link reuses `hub.open` ("Open"), and write failures reuse `tracker.errors.storage` and `tracker.errors.closed`. `copy.test.ts` gets an achievements block that runs the same rules as the Dex copy block: no prices, and long nb words carry soft hyphens where the 320 px check needs them.

## 11. Accessibility

- The tick is a `<button aria-pressed>` with the accessible name "Earned: {name}". For an unrevealed hidden entry the name is "Earned: Hidden achievement 3", with its number.
- Group headings are `h2`. The filter rail and the chip row are one `nav` labelled "Filter achievements". Each filter is a button with `aria-pressed`, the same pattern as `CategoryNav`.
- **Every press is heard.** One `role="status"` region sits in the page's static Astro markup, outside the island, so it exists from load and no re-render wipes it. It is cleared and written once per action:
  - a tick: "Opening Night earned" or "Opening Night not earned";
  - a console choice: "Console: Xbox";
  - a filter, search or "Hide earned" change: "12 achievements shown".
- Failures (§7) show in the tracker's existing alert pattern, in both languages.
- The tick's earned state follows the tracker tick, including its forced-colours rule. The fill is not a `box-shadow` alone.
- The profile name in the console card is user text. It is passed to the translator as a value and rendered as a text node, never through `set:html`.
- Grade colours and the Gamerscore colour are new tokens (`--grade-platinum`, `--grade-gold`, `--grade-silver`, `--grade-bronze`, `--gamerscore`, `--missable`) defined in `tokens.css`. Each must reach 4.5:1 on `--bg-raised` and always sits next to a text label. In forced colours they fall back to `CanvasText`.
- The console card's buttons are a group labelled by its heading. The current choice has `aria-pressed="true"`.
- Every target is at least 44 px. The search field and toggle share one height and bottom edge.
- The reveal uses native `<details>`, so it works by keyboard and screen reader with no script.

## 12. SEO

- `indexablePaths` gains `"achievements"`, so the sitemap and the `seo-check` integration include it.
- Titles: en "GTA 6 trophies and achievements list · Rookdex", nb "GTA 6: troféer og prestasjoner · Rookdex". The description names the count and the grades.
- The full list is in the static HTML, so it is indexable without JavaScript. Hidden entries keep their text inside `<details>`.

## 13. Build order

**PR 1, code with an empty list (after 03.12.2026):**

1. Store hardening (§8), with tests.
2. Achievements schema, loader special case and seed rules (§6), with fixture tests. The shipped `achievements.json` is `[]`.
3. Pure model in `src/model/achievements.ts`: filter, group, hidden-safe search, score per console, link progress, console choice read/write.
4. The page (static list, hidden `<details>`, `lang="en"`, the static status region, the console pre-paint script), built only for a non-empty list.
5. The island: profile bootstrap and `ProfileMenu`, console card and pill, filters, search, "Hide earned", ticks, status lines, failure messages.
6. Dashboard tile and tracker rail link, both hidden for an empty list.
7. Copy, tokens, SEO path, Delete all keys, privacy page list and `privacy.deleteBody`.
8. Verification (§14) against a fixture list of nine sample entries, since the real list is empty.

**PR 2, data (when the official list is public):**

- The full list from the platform listing, in its official order, with grades, Gamerscores, hidden flags and sources. Allowlist hosts added in the same PR (§6). `src/seed/achievements.ids.txt` starts here, one id per line.
- Groups and links assigned by me. Missable is set only where a press or official source says the entry can be missed.
- Never from the datamine or the 55-name list from X.
- After merge: the page, tile and rail link appear. Store screenshots and README art get a retake only if the listing should show the page.

## 14. Testing and verification

- **Unit (Vitest):**
  - Schema and loader, each with a fixture that must fail: a Platinum with a Gamerscore, a Gold without one, two Platinums, a list summing to 990, a link to a missing category or group, a missing `achievements/` prefix, a `vice` id segment, a curly apostrophe in a name, an unlisted source host, a duplicate `xbox_id`, a non-hidden entry without a name, a name without a description, and a shipped id missing from the list in `achievements.ids.txt`.
  - Model: each filter per console choice, hidden-safe search, hidden numbering, score per console, link progress ignores retired items, console choice with bad JSON or blocked storage, pruning keeps a binned profile's choice.
  - Store: a fresh open creates both stores; an open at version 2 against an existing v1 database keeps its data (via the test `version` option); `onBlocked` fires when another connection ignores `versionchange`.
  - Progress: an export and import round trip with an `achievements/` record; `recentFinds`, `categoryRows`, `foundToday` and stats ignore it; a tick counts toward the backup reminder.
- **Page tests** (`src/test/achievements-page.test.ts`): renders the fixture list grouped, hidden text inside `<details>`, `lang="en"` on names in nb, no page for an empty list, path in `indexablePaths`.
- **Island tests** (jsdom + vitest-axe): the console card flow with focus landing on the pill, the pill reopening the card with focus on the pressed choice, a profile switch re-reading the choice, filter counts, the status text for a tick, a choice and a filter, a failed write rolling the tick back with the storage message, ticking writes a record, no axe violations.
- **Pre-paint:** a test runs the inline script against a stubbed localStorage for each choice, plus bad JSON, and checks `data-console`. Its text is pinned so its CSP hash never drifts, as `hub-prepaint.test.ts:84` does for the hub script, and the hash is added to the CSP the same way.
- **Measured in the `preview` build** (not dev, whose toolbar covers the phone bar): 320, 768, 1024, 1280, 1600, 1920 and 3440 px, plus 200 % text through `Page.setFontSizes`. Check no horizontal overflow, the 44 px control rows and their shared bottom edge, the score cards lining up at 320 and 390, the search placeholder unclipped in both languages, and the tile in the dashboard grid. Load with each console choice stored and read CLS from a `PerformanceObserver` (layout-shift); it must stay under 0.01.
- **Keyboard walk:** tab through card, pill, chips, search, toggle and ticks at 390 px. No focused row may sit under the phone tab bar.
- **Screen reader:** one NVDA pass in Brave through CDP: the console card, a tick, a filter change announced, and a hidden entry revealed.

## 15. Considered and rejected

- **A sixth tab.** The phone bar holds five and wraps 3 + 2 below 18rem.
- **A Dex category.** Dex pages are zero-JS reference pages, and achievements are progress.
- **A new IndexedDB store and a `DB_VERSION` bump.** Same data as a progress record, plus a migration inside the two-week no-upgrade window after launch.
- **The console choice on the profile record and in the backup.** It would need backup v3 for one question that takes a second to answer again.
- **Linked item ids listed one by one.** The list goes stale as the seed grows. A category or group link counts new items automatically.
- **Layout A, cards like the tracker.** About 55 entries scroll much longer on a phone, and the grades don't line up for scanning.
- **Asking the console question on app start.** It would interrupt the countdown and the tracker for a feature many players open later.
- **Ticking an achievement automatically when its linked items are all found.** The game decides when it is earned. The tracker can be ahead of or behind the game.
- **Seeding from the datamine.** The project rule is official or press sources only, and the 55-name list is likely fake.
- **Syncing the console choice across open tabs.** A `storage` listener would update a second open achievements tab right away. Reloading does the same, and two achievements tabs open at once is rare.
- **No shift when "Hide earned" is on.** Ticks load from IndexedDB after first paint, so with the toggle on the earned rows leave after load. A pre-paint script cannot read IndexedDB synchronously. The shift only happens for a player who turned the toggle on, and Lighthouse CI (empty storage) never sees it.
- **A status line for "Show name and description".** Native `<details>` already announces expanded and collapsed.

> Stress-tested 2026-11-13 (skill 5065c26): 18 applied, 1 adapted, 0 decided by me.
