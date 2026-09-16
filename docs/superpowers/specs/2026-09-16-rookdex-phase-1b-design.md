# Rookdex phase 1b — tracker, profiles, rumours, offline fix

Date: 2026-09-16 · Status: approved design, plan pending · Builds on `2026-09-09-rookdex-design.md` §5 and the stress test of the same date.

## 1. What 1b ships

The tracker page: one route per language (`/en/tracker/`, `/no/tracker/`), one React island, seed data checked by CI, local profiles with export and import, computed stats, a read-only Rumours list, and the service-worker fix for slow offline loads. The tracker works fully offline from the seed alone; the live delta from Neon is 1c.

Out of 1b: the Worker and any `/api/*` endpoint, the seed delta, Playwright, Lighthouse CI, precache trim, per-locale manifest, Shiki/CSP, deploy concurrency (all 1c or 1d).

## 2. Decisions made in this brainstorm

| Decision | Choice | Why |
|---|---|---|
| Scope | Tracker + offline fix + only the 1a follow-ups whose files 1b opens anyway | Keeps the 1c window intact |
| Seed content | Two shipped tiers, `confirmed` and `expected`, plus a separate read-only Rumours list | Feels complete without publishing unverified claims as checklist items |
| Leak material | Never cited, never embedded. Rumours cite press reporting, not leaks | Spec §10 legal posture and the Take-Two trap |
| Review | No human review of seed content. Source-tier rules are machine-checked in CI; corrections come from users via the report action (1c) | I don't have the time; the 1c pipeline already runs on the same principle |
| Item names | English only. UI strings, categories and groups are translated | The game has no Norwegian localisation; players see and search English names. Deviation from §5 `names{lang}` |
| Page layout | One `/tracker/` page. Phone: stats on top, category chips, list. 1024+: sidebar toggles · centred 640 px two-column list · stats rail. 768: sidebar + list, rail below | Chosen from mockups 2026-09-16 |
| Category selection | Multi-select toggles; none selected = all; mirrored to `?show=wildlife,vehicles` | I want to compare categories side by side; deep-linkable |
| Storage | Raw IndexedDB behind a ~80-line wrapper, no library | Built-ins over dependencies; the wrapper is where the transaction model is learned |
| Island state | Model with subscribe/notify, read via `useSyncExternalStore` | MVC one-to-one: model in `src/model/`, hook as controller, components as views |
| Schemas | `astro/zod` | Already shipped by Astro; validates seed at build and imports at runtime |
| Offline | Navigations become stale-while-revalidate | Airplane mode currently waits for the network stack to fail; cached page should be instant |
| Storage tests | `fake-indexeddb` (dev dependency) | jsdom has no IndexedDB; the atomic-import guarantee needs a real test |

## 3. Files

```
src/
├── seed/
│   ├── wildlife.json  vehicles.json  places.json  collectibles.json
│   └── rumours.json
├── model/
│   ├── schema.ts      zod schemas: seed item, rumour, progress record, export file, allowlist
│   ├── seed.ts        loads and validates seed JSON, exposes items by category/group
│   ├── store.ts       IndexedDB wrapper: open, get, getAll, put, delete, transaction
│   ├── profiles.ts    create, rename, list, soft-delete, restore, purge > 30 days
│   ├── progress.ts    records per profile, tick/untick, merge (newest updated_at wins)
│   ├── stats.ts       pure functions: overall, per category, recent finds
│   ├── transfer.ts    export file build, import parse + validate + atomic swap
│   └── tracker.ts     the model: state + subscribe/notify, no React, no DOM
├── islands/
│   ├── Tracker.tsx    island root; useTracker() controller hook
│   ├── tracker/       CategoryNav, ItemList, StatsRail, ProfileMenu, RumourList
│   └── useTracker.ts  useSyncExternalStore over tracker.ts
├── pages/[locale]/tracker.astro
└── i18n/en.ts, no.ts  new keys: tracker.*, category.*, group.*, profile.*, rumours.*
allowlist.json         source domains by tier + blocklist (shared with 1c)
```

Categories in 1b: Wildlife, Vehicles, Places, Collectibles. Groups are per category (Wildlife: reptiles, mammals, birds, marine …) and come out of the research task. Adding a category is a JSON file plus i18n keys; the engine has no category list of its own.

## 4. Data model

**Seed item** — `{ id, category, group, name, status, precedent?, description?, location?, sources[], retired? }`

- `id` is a stable slug, `<category>/<kebab-name>`, never reused.
- `status`: `confirmed` needs at least one source on the `official` tier. `expected` needs `precedent` (the earlier title, e.g. "GTA V") and at least one `official` or `press` source.
- `sources[]`: `{ url, title, tier }`; `tier` is derived from the domain at validation time and must match the allowlist.
- `location` kept for the phase 3 map, optional, unused in 1b.

**Rumour** — `{ id, name, claim_key, summary, sources[] }`. One `press` source minimum. No status, no group, never tickable. `claim_key` is the handle the 1c pipeline matches on when it confirms the claim; promotion moves the entry into a category file with a fresh `id`.

**Progress record** — `{ item_id, done, updated_at, note?, origin: "manual" }` (xbox/psn are phase 2). Stored per profile. Merge rule for imports and, later, sync: newest `updated_at` wins, ticks and un-ticks alike.

**Profile** — `{ id, name, created_at, deleted_at? }`. The first visit creates "Player 1" silently.

**Export file** — `{ version: 1, exported_at, profile_name, records[] }`. Nothing else: no device, client or profile ids. Filename `rookdex-<profile>-<yyyy-mm-dd>.json`.

**Allowlist** — `{ official: [domains], press: [domains], blocklist: [domains] }`. A source whose domain is on the blocklist, or on no list, fails validation. Starting content: official = rockstargames.com, Rockstar Newswire, Rockstar's YouTube channel, take2games.com; press = IGN, GamesRadar, Eurogamer, GameSpot, PC Gamer, Rockstar Intel, GTABase; blocklist = the leak hosts and forum dumps the research task encounters. The list is extended by pull request.

## 5. Storage

IndexedDB database `rookdex`, version 1, two object stores:

- `profiles` keyed by `id`.
- `progress` keyed by `[profile_id, item_id]`, index on `profile_id`.

`store.ts` wraps `indexedDB.open` with the upgrade handler and exposes promise-based `get`, `getAll(index?)`, `put`, `delete` and `transaction(stores, mode, fn)`. Every write goes through a transaction; the import swap is one `readwrite` transaction on `progress` that deletes the profile's records and puts the merged set, so a reload mid-import leaves the old records untouched.

Two tabs writing at once is last-write-wins, accepted in the stress test.

## 6. The island

`tracker.ts` holds: profiles, current profile id, items (from seed), records for the current profile, selected category ids, and a `status` (`loading | ready | error`). It exposes actions (`tick`, `untick`, `selectCategories`, `switchProfile`, `createProfile`, `renameProfile`, `deleteProfile`, `restoreProfile`, `exportProfile`, `importFile`) and `subscribe(listener)`. Actions write to the store first, then update state and notify. No React import.

`useTracker()` is the controller: `useSyncExternalStore(tracker.subscribe, tracker.getState)` plus the URL sync for `?show=`. Components render from the returned state and call actions.

Layout is CSS only. Same DOM at every width, mobile-first:

- base: stats cards on top, category chips (horizontal scroll), list, Rumours as the last chip.
- `min-width: 768px`: grid with a 170 px sidebar; stats move below the list.
- `min-width: 1024px`: sidebar · list (max 640 px, two columns by group) · 180 px stats rail.

Accessibility, from spec §5 and the stress test: real `<input type="checkbox">`, 44 px rows, `aria-pressed` on category toggles, `role="progressbar"` with `aria-valuenow/max` and visible "5 of 14", a polite live region announcing "12 of 40 found" after a tick, the profile menu as a menu button with `aria-expanded`/`aria-haspopup` that returns focus to its trigger, an "Offline, showing saved data" announcement once when connectivity drops, visible focus everywhere.

## 7. Profiles, export, import

- Menu: switch, new, rename, export, import, delete, deleted profiles.
- Delete opens a confirm dialog with two actions, "Export first" and "Delete"; delete sets `deleted_at` and hides the profile. "Deleted profiles" lists them with a restore action for 30 days; on open, records older than 30 days are purged with their progress.
- Export builds the file from the current profile and triggers a download.
- Import: `<input type="file" accept=".json">`, 5 MB cap checked before reading, whole file parsed and validated against the export schema, merged with existing records by `item_id` (newest wins), swapped in one transaction. Records whose `item_id` is not in the seed are kept but not counted. Errors are shown in plain words ("This isn't a Rookdex export file"), never as a stack trace.

## 8. Rumours

A read-only list, reached from the last chip / sidebar entry. Each row: name, one-line summary, "Reported by <outlet>" linking the press source. No checkbox, excluded from stats and counts. Header text explains the tier: "Reported by press, not confirmed by Rockstar. Rumours move to the tracker when confirmed."

## 9. Seed research (no human review)

A plan task run by subagents, one per category, plus one for rumours:

1. Read official material first: trailers 1–2 and their Newswire posts, rockstargames.com/VI, Take-Two releases. Everything visible or named there becomes `confirmed` with the official source.
2. Series precedent: collectible and checklist systems from GTA V and RDR2 that press coverage expects to return become `expected` with `precedent` and a press source.
3. Rumours: claims with press reporting that neither of the above covers. Research the origin of each; if the only origin is leak material, the entry cites the reporting outlet and never the leak.
4. Every item gets an English name as used by Rockstar or press. Wildlife uses the common English name.
5. Output: the seed JSON files, `allowlist.json` additions, and `docs/seed-report.md` listing every item with its tier and sources.

The seed test then enforces: schema, tier rules, allowlist membership, blocklist absence, unique ids, English name present. A review subagent checks that each source actually supports its item. The PR merges when CI is green; I don't read the list. A 1d task re-runs steps 1–3 for anything new before the freeze.

## 10. Offline fix and 1a follow-ups

`sw.js`: `request.mode === "navigate"` becomes stale-while-revalidate — serve the cached page immediately, fetch and re-cache in the background, fall back to the network when nothing is cached, then to the locale home. Assets stay cache-first. Precache adds `/en/tracker/` and `/no/tracker/`. A new service worker still clears old caches on activate, so a deploy lands with the SW update.

Follow-ups folded in because their files are already open: persistent live region across the launch flip (`Countdown.tsx`), seconds hidden under `prefers-reduced-motion`, `h3 Buying in Norway` → `h2` on the hub, `overflow-wrap: anywhere` on source links, the report-item button rendered disabled with a "coming soon" title until 1c.

## 11. Testing

- Vitest, `src/model/`: merge (newest wins, un-tick wins over older tick), stats, export shape, import validation (bad JSON, wrong version, over cap, unknown fields), atomic swap (throw mid-import leaves old records), profile soft-delete/restore/purge, seed validation and tier rules, allowlist and blocklist. Storage tests run on `fake-indexeddb`.
- Testing Library + axe, `src/islands/`: tick updates the live region, toggles set `aria-pressed` and `?show=`, profile menu opens/closes with keyboard and returns focus, import error renders in words. Real timers in axe tests (1a trap).
- Biome clean, `astro check` clean, 1a's 32 tests still green.

## 12. Open

- Exact category and group list comes out of the research task, not this spec.
- Whether Collectibles has enough confirmed content to ship as a category or starts as `expected` only — decided by the research output.
