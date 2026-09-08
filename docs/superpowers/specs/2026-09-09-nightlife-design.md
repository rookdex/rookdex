# Nightlife — design spec

Codename "nightlife". The brand name is not decided (deadline 15 September 2026; standing candidate: heistbook). Written 2026-09-09.

## 1. What I'm building

A companion for GTA VI that is useful the night the game launches and stays useful for years: a mobile-first, installable web app that tracks what you have found, done and met in the game, computes your player statistics, shows a live feed of confirmed facts, verified reports and labelled rumours, and does it in English and Norwegian first, Spanish and German after.

Three lanes, one product, built in phases:

1. **Tracker and stats** — checklists for wildlife, vehicles, weapons, people, locations and missions, with per-category and overall completion. Local-first, no login, export and import.
2. **Live facts** — a fully automated pipeline that reads an allowlist of sources, writes short original summaries, labels confidence by rules, and feeds confirmed facts straight into the checklists.
3. **Guides and launch hub** — hand-written pages, the Norwegian launch-night page, and later the interactive map.

Family and friends come first. Everything else is built on top of what works for them on 19 November.

### Goals

- Installed on the family's phones before launch night and used with the TV on.
- Never loses progress. Never asks for an account to work.
- Costs nothing when idle, survives a launch-day spike for a few dollars.
- Every fact carries a source, a date and a confidence label.
- Public repo, MIT licence, contributors work through pull requests.
- Fits my learning track: Astro, TypeScript, React in small doses, Cloudflare, Neon.

### Non-goals (for launch)

- No interactive map before phase 3. Own-drawn tiles take weeks and the real map does not exist yet.
- No accounts or sync before phase 2.
- No ads at launch. No Pro tier at launch.
- No native Android or iOS app. The PWA is the app; a store wrapper comes in phase 2.
- No Spanish or German hand-written guides at launch. Automated facts are multilingual from day one.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Launch date target | 19 Nov 2026 (game release, PS5 and Xbox Series only) | Fixed by Rockstar |
| Code freeze | 1 Nov 2026 | Exam on 11 Nov must be untouched |
| Framework | Astro 7 with React islands | Static content, React scoped to a few components, built-in i18n routing |
| Hosting | Cloudflare Workers with static assets | Static requests free and unlimited; 500k-visit day ≈ $5 |
| Database | Neon Postgres, Frankfurt, from day one | Pipeline needs a store; scale-to-zero; already have the account |
| Progress storage | IndexedDB in the browser, export and import as JSON | No account needed; nothing lost |
| Accounts (phase 2) | Better Auth with passkeys, optional email | No passwords to leak; MIT; works with Astro and Neon |
| Content pipeline for guides | Markdown in the repo, one folder per language | Contributions are pull requests; preview URL per PR |
| Automated facts | Cloudflare Worker cron → Claude API → Neon | Nobody has time to review; rules decide confidence |
| AI model for the pipeline | `claude-opus-5`, structured outputs, Batch API | Quality matters for public text; Batch halves cost; hourly cadence tolerates the delay |
| Payments (phase 2) | Lemon Squeezy or Paddle as merchant of record | VAT handled, no company required |
| Analytics | Umami self-hosted or Plausible, cookieless | No consent banner |
| Licence | MIT on code; guide text CC BY-SA 4.0; data in Neon is not redistributed | Contributors keep their attribution; the hosted service is what Pro sells |
| Brand | Neutral name, no "GTA", "VI", "Leonida" or "Vice" in domain or app name | Take-Two enforcement; app-store trademark rules |

## 3. Architecture

```
repo (public)
├── src/                 Astro site: pages, layouts, islands
│   ├── content/         Markdown guides, per language: guides/en/, guides/no/
│   ├── seed/            checklist seed data (categories, groups, items), per language
│   ├── islands/         React: Tracker, Stats, Countdown, LanguageSwitch, Feed, Profiles
│   └── model/           plain TypeScript, no React: progress, merge, stats, import validation
├── worker/              Cloudflare Worker: cron pipeline + small cached API
│   ├── sources/         one fetcher per feed format, fixtures alongside
│   └── rules/           blocklist, confidence, corroboration
├── allowlist.json       the only list of sources the pipeline reads
├── docs/                specs and plans
└── .github/workflows/   Biome, tests, Lighthouse CI, axe, deploy
```

- **Site.** Astro renders guide pages, the hub and the checklist shells at build time, one route tree per language (`/en/…`, `/no/…`). React islands hydrate only the interactive parts. Zero JavaScript on pure content pages.
- **Worker.** One Cloudflare Worker with two jobs: a cron trigger that runs the pipeline, and a tiny JSON API (`/api/feed`, `/api/facts`, `/api/seed-delta`) that islands read. API responses are cached at the edge for 5 minutes, so a spike hits Cloudflare's cache, not Neon.
- **Database.** Neon Postgres. Tables: `feed_items`, `facts`, `fact_sources`, `checklist_items` (the live delta on top of the seed), `reports`, `switches` (kill-switch, per-source pause, budget cap). Phase 2 adds `users`, `profiles`, `progress`.
- **Progress.** IndexedDB per local profile. The export file is versioned JSON. Phase 2 syncs the same record shape to Neon; nothing in the tracker changes.
- **Deploy.** Merge to `main` builds and deploys the site and the Worker. Pull requests get a preview URL.

Cloudflare has no hard spend cap. Mitigation: Workers Paid is only enabled if the free 100k requests per day are exceeded, the AI budget cap lives in the pipeline, and a Cloudflare notification is set at $10.

## 4. Content and source model

Three kinds of content, three sets of rules.

### Guides
Markdown with frontmatter (`title`, `summary`, `updated`, `sources[]`). Hand-written, reviewed by pull request. The launch hub text, "before you start", region and system explainers. A guide missing in one language renders the English version with a visible "in English" label; there are no dead language links.

### Feed items
`{ title, url, source_id, published_at, fetched_at, hash }`. Pulled from the allowlist, shown as-is in "Latest". Never summarised, never rewritten. Deduplicated by URL hash. The feed is the honest, low-risk layer: linking is legal, nothing is copied.

### Facts
`{ claim_key, category, summaries{en,no,es,de}, confidence, first_seen, last_seen, upgraded_at?, sources[] }`.

Categories: `wildlife`, `vehicle`, `weapon`, `location`, `character`, `mission`, `system`, `other`.

Confidence rules, computed by the Worker, never edited by a person:

| Label | Rule |
|---|---|
| **confirmed** | at least one source is on the Rockstar list (Newswire, official channels) |
| **verified** | at least two distinct allowlisted outlets carry the same `claim_key` within 14 days |
| **rumour** | anything else |

A rumour later matched by a confirmed source is upgraded in place with `upgraded_at` set. Facts are never deleted by the pipeline; the history shows what was known when.

Only **confirmed** facts create or update `checklist_items`. Verified and rumour facts live in the facts feed only, labelled. That is the line between the app knowing things and the app making things up.

### The allowlist
`allowlist.json` in the repo. Each entry: `{ id, name, kind: rockstar|outlet|channel|subreddit|forum, feed_url, tier: rockstar|outlet|community, language }`. Adding a source is a pull request; pausing one is a switch in the database.

Initial list: Rockstar Newswire; three or four established outlets (RockstarINTEL, GTA BOOM, GTABase news); the YouTube channels I actually trust (GTA Series Videos, DarkViperAU, TGG), via their RSS; r/GTA6 and r/GTA; GTAForums GTA VI section. Nothing else.

## 5. Tracker engine and stats

One engine, many checklists. The engine knows categories, groups and items; everything else is data.

- **Items merge from two places.** Seed items ship in the repo per language. Confirmed facts add or update items live from Neon via `/api/seed-delta`. Offline, the seed alone works; online, the delta is applied and cached.
- **Item shape:** `{ id, category, group, names{lang}, description?{lang}, location?{x,y,region}, attributes{}, sources[] }`. `location` is present now so the phase 3 map is a new view over existing data, not a migration.
- **Progress record:** `{ item_id, done, done_at, note?, origin: manual|xbox|psn }`. Stored per local profile. Export writes `{ version, exported_at, profile, records[] }`; import validates the version and merges by `item_id`, newest `done_at` wins.
- **Local profiles.** A profile switcher on day one; each profile is its own store. One phone, three players.
- **Stats** are computed, never stored: per category done/total, overall completion, most recent finds, remaining items in the current region. Items with `origin: xbox|psn` show an "auto" mark.
- **MVC in React terms.** `src/model/` is plain TypeScript with no React import: progress, merge, stats, import validation. Islands are views. Hooks are controllers. The model carries the unit tests.

Accessibility is built in: real `<input type="checkbox">`, full keyboard navigation, an `aria-live` region announcing "12 of 40", tap targets at least 44 px, focus visible, WCAG 2.2 AA as a merge gate.

## 6. Launch hub and languages

The home page has two states, chosen by the date.

- **Before 19 November 00:00 CET:** countdown, preload date (12 Nov), where to buy and prices in Norway, "before you start", "Latest" feed. The Norwegian version is the page nobody else has.
- **From launch night:** the same route flips to the dashboard: stats tiles, remaining nearby, "Latest", and "days since launch" in the corner.
- **Installable from the first visit.** Web app manifest, service worker via `@vite-pwa/astro`, app shell and seed cached, offline works. Install prompt shown once, dismissible.

Languages:

- Each language is a folder under `src/content/` and `src/seed/`, and a strings file under `src/i18n/`. Astro's built-in i18n routing handles `/en/` and `/no/`. Adding a language is a folder, a strings file and one flag in the pipeline config. No code changes.
- Hand-written guides: English and Norwegian at launch.
- Automated fact summaries: English, Norwegian, Spanish and German from day one. This is my own text, produced by the pipeline, so translating it is one extra instruction, not a translation project.

## 7. The pipeline

A Cloudflare Worker cron. Hourly. During launch week (12–26 Nov) the Rockstar tier runs every 15 minutes.

Each run, in order, and the run stops cleanly at the first failure without partial writes:

1. **Fetch** every allowlist entry that is not paused. Parse per feed format. Deduplicate by URL hash against `feed_items`.
2. **Filter leaks.** Drop any item whose title, text or source matches the leak blocklist (`worker/rules/blocklist.ts`: "leak", "leaked", "datamine", "cyberleek", build numbers, torrent terms). This runs before anything costs money.
3. **Write feed items.**
4. **Extract facts.** New items go to Claude in one Batch API request per run. Model `claude-opus-5`, structured outputs with a strict schema: `claims[] { claim_key, category, summaries{en,no,es,de} }`. The prompt forbids quoting the source, forbids naming leaked material, and asks for a normalised `claim_key` (lower-case, entity + attribute) so two outlets saying the same thing in different words collide. Batch results are collected on the next run.
5. **Score and store.** Apply the confidence rules and upgrades, write `facts` and `fact_sources`, push confirmed facts into `checklist_items`.

### Cost of the AI step

Assumptions: about 2,000 input tokens and 600 output tokens per item at Claude Opus 5 rates ($5 in, $25 out per million), Batch API at half price.

| Load | Items/day | Per day | Per month |
|---|---|---|---|
| Normal | 50 | ≈ $0.60 | ≈ $19 |
| Launch week | 500 | ≈ $6 | one week ≈ $44 |

The budget cap switch limits items per run; when hit, the rest wait for the next run. The switch defaults to 100 items per run.

### Safety valves (all switches in `switches`, none require a deploy)

- **Kill-switch** hides the whole automated layer from the site and stops the cron.
- **Per-source pause.**
- **Budget cap** on items per run.
- **Report button** on every fact and feed item. Five reports from distinct clients hide the item until the next run re-evaluates it; a hidden item is never re-published from the same sources without a new corroborating source.
- **Daily digest** to me (Discord webhook): items fetched, facts written, batch status, errors. Two silent days means the pipeline died.

### Known unknowns for the pipeline

- Reddit's API terms for commercial use need checking before the Pro tier exists. Until then the pipeline reads Reddit's public RSS only.
- The exact YouTube channel IDs and forum RSS URLs go into `allowlist.json` during phase 0.

## 8. Accounts, sync and player statistics (phase 2)

- **Sign-in:** Better Auth with passkeys. Email optional, for recovery. Delete-account button on day one.
- **Sync:** the same progress record, pushed per profile to Neon. Conflict rule is the import rule: newest `done_at` wins.
- **Xbox:** "Sign in with Xbox" through OpenXBL. Achievements for the game map onto checklist items with `origin: xbox`. Free tier, 150 requests per hour, so refresh is on demand and rate-limited per user.
- **PlayStation:** opt-in "import trophies" using an unofficial library, clearly labelled experimental, never on by default. The user pastes their own token; the app stores nothing beyond the mapped records.
- **Rockstar Social Club:** not used. If an official API ever appears, it plugs into the same `origin` field.
- **Pro tier:** progress tracking stays free forever. Pro sells cross-device sync, themes, a supporter badge and early features. Family and friends get it free by invite code. Sold through a merchant of record.
- **Play Store:** a Trusted Web Activity wrapper built with PWABuilder, signed in Android Studio, published under the real brand after the 14-day closed test. iOS only on demand.

## 9. Security and privacy

- Content Security Policy with nonces via Astro's native CSP support. No `unsafe-inline`. No third-party scripts at launch.
- No cookies at launch. Cookieless analytics only.
- Secrets (Neon URL, Anthropic key, Discord webhook) live as Cloudflare secrets; never in the repo. Dependabot and CodeQL on from the first commit.
- API endpoints are read-only except `/api/report`, which is rate-limited per IP and accepts only an item id.
- Neon in Frankfurt (EU). Phase 2 accounts hold a passkey credential and an optional email, nothing else.
- Export files contain progress only, never identifiers.

## 10. Legal posture

- Footer on every page: unofficial fan project, not affiliated with or endorsed by Rockstar Games or Take-Two Interactive; trademarks belong to their owners.
- No Rockstar artwork, logos, screenshots, trailer frames or leaked material anywhere in the repo or the database. Icons and any map art are my own.
- Every fact and feed item links its source.
- A takedown contact address (a project alias, not my private mail) in the footer, so a letter comes to me and not to Cloudflare.
- Domain and app name contain none of: gta, gta6, gtavi, rockstar, leonida, vice city.

## 11. Testing

- **Unit (Vitest):** `src/model/` (merge, stats, import validation, profile isolation) and `worker/rules/` (blocklist, confidence, corroboration, upgrades) plus one fixture per feed format in `worker/sources/`.
- **Browser smoke (Playwright), one flow:** open, install prompt shown, tick an item, export, wipe, import, switch language, go offline, reload. Runs in CI.
- **Quality gates in every pull request:** Biome, Vitest, Lighthouse CI (performance ≥ 90, accessibility = 100 on the tracker and hub), axe with zero violations.
- **Pipeline dry-run mode:** `DRY_RUN=1` writes to `_staging` tables so a new source can be tested without touching the live feed.

## 12. Phases and calendar

| Phase | Dates | Ships |
|---|---|---|
| 0 · Setup | by 15 Sep | brand decision, GitHub org, `.app` domain at Cloudflare Registrar, Cloudflare and Neon projects, repo scaffold, CI green, Discord webhook |
| 1a · Foundation | 15–28 Sep | Astro site, i18n routing, hub in EN and NO, PWA install and offline, deploy to a preview domain. Exam 23 Sep sits inside this window; the week is light. |
| 1b · Tracker | 29 Sep–12 Oct | model with tests, tracker island, profiles, export and import, stats |
| 1c · Pipeline | 13–26 Oct | Worker, allowlist, feed, blocklist, facts with confidence, switches, digest |
| 1d · Polish | 27 Oct–1 Nov | Lighthouse and axe to the bar, smoke test, seed content, family test install |
| Freeze | 1–11 Nov | content only. Exam 11 Nov. |
| Launch | 12–19 Nov | preload-day content, family installs, watch the digest |
| 2 · Accounts | Dec–Jan | sync, Xbox sign-in, PlayStation import, Pro tier, Play Store, ENK and tax check before the first payout |
| 3 · Map | Feb 2027 on | Leaflet map with own tiles on R2, Spanish and German guides, ad network decision |

Budget: 8 hours a week, roughly 55 hours before the freeze. Fallback if 1c runs late: launch with feed only, switch facts on in December. Nobody notices; the tracker still works.

## 13. Open questions

1. Brand name (deadline 15 Sep). Heistbook is free on every surface; nothing better has survived the checks yet.
2. Which YouTube channels and forums make the initial allowlist.
3. Whether the phase 2 sync API is a Cloudflare Worker or an ASP.NET Core service on Azure (career value versus cost). Decided in January.
4. Whether to add ads at all. Pro plus Ko-fi may be enough; the decision waits for real traffic numbers.

## 14. Out of scope, permanently

- Reading in-game save data. No platform exposes it.
- Scraping Rockstar Social Club.
- Machine-translated hand-written guides.
- Anything that embeds or redistributes Rockstar media.
