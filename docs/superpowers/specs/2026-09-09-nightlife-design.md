# Nightlife — design spec

Codename "nightlife". The brand name is not decided (deadline 15 September 2026; standing candidate: heistbook). Written 2026-09-09; stress-tested and revised the same day (see `2026-09-09-nightlife-stress-test.md`).

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
| AI model for the pipeline | `claude-opus-5`, structured outputs, Batch API (direct requests for the Rockstar tier) | Quality matters for public text; Batch halves cost; hourly cadence tolerates the delay |
| Payments (phase 2) | Lemon Squeezy or Paddle as merchant of record | VAT handled, no company required |
| Analytics | Cloudflare Web Analytics at launch (cookieless, same origin); Plausible in phase 2 if longer retention matters | No consent banner, no third-party script |
| Fonts | Self-hosted from the site's origin | No third-party requests; strict CSP |
| Licence | MIT on code; guide text CC BY-SA 4.0; data in Neon is not redistributed | Contributors keep their attribution; the hosted service is what Pro sells |
| Brand | Neutral name, no "GTA", "VI", "Leonida" or "Vice" in domain or app name | Take-Two enforcement; app-store trademark rules |

## 3. Architecture

```
repo (public)
├── src/                 Astro site: pages, layouts, islands
│   ├── content/         Markdown guides, per language: guides/en/, guides/no/
│   ├── seed/            checklist seed data (categories, groups, items), per language
│   ├── islands/         React: Tracker, Stats, Countdown, LanguageSwitch, Feed, Profiles
│   ├── model/           plain TypeScript, no React: progress, merge, stats, import validation
│   └── i18n/            UI strings per language
├── worker/              Cloudflare Worker: cron pipeline + small cached API
│   ├── sources/         one fetcher per feed format, fixtures alongside
│   └── rules/           blocklist, confidence, corroboration, summary filter
├── allowlist.json       the only list of sources the pipeline reads
├── aliases.json         claim-key → seed item id mappings
├── docs/                specs and plans
└── .github/workflows/   Biome, tests, Lighthouse CI, axe, deploy, flip-switch, launch-rebuild
```

- **Site.** Astro renders guide pages, the hub and the checklist shells at build time, one route tree per language (`/en/…`, `/no/…`). React islands hydrate only the interactive parts. Zero JavaScript on pure content pages.
- **Worker.** One Cloudflare Worker with two jobs: a cron trigger that runs the pipeline, and a tiny JSON API (`/api/feed`, `/api/facts`, `/api/seed-delta`, `/api/report`) that islands read. API responses are cached at the edge for 5 minutes, so a spike hits Cloudflare's cache, not Neon. The API answers only the site's own origin and the preview domain. Every endpoint is `GET` except `/api/report`.
- **Database.** Neon Postgres. Tables: `feed_items` (with `extraction_status`), `facts`, `fact_sources`, `checklist_items` (the live delta on top of the seed), `reports`, `switches` (kill-switch, per-source pause, budget cap). Phase 2 adds `users`, `profiles`, `progress`.
- **Progress.** IndexedDB per local profile. The export file is versioned JSON. Phase 2 syncs the same record shape to Neon; nothing in the tracker changes.
- **Deploy.** Merge to `main` builds and deploys the site and the Worker. Pull requests get a preview URL. Two extra workflows: `flip-switch` (manual, see §7) and `launch-rebuild` (scheduled once, 19 Nov 00:05 CET).

Cloudflare has no hard spend cap. Mitigation: Workers Paid is only enabled if the free 100k requests per day are exceeded, the AI budget cap lives in the pipeline, and a Cloudflare notification is set at $10.

## 4. Content and source model

Three kinds of content, three sets of rules.

### Guides
Markdown with frontmatter (`title`, `summary`, `updated`, `sources[]`). Hand-written, reviewed by pull request. The launch hub text, "before you start", region and system explainers. A guide missing in one language renders the English version with a visible "in English" label; there are no dead language links. An unsupported language prefix serves the English 404 page with links to every language home.

### Feed items
`{ title, url, source_id, published_at, fetched_at, hash, extraction_status }`. Pulled from the allowlist, shown as-is in "Latest". Never summarised, never rewritten. Deduplicated by URL hash. The feed is the honest, low-risk layer: linking is legal, nothing is copied.

### Facts
`{ claim_key, category, summaries{en,no,es,de}, confidence, first_seen, last_seen, upgraded_at?, hidden?, sources[] }`.

Categories: `wildlife`, `vehicle`, `weapon`, `location`, `character`, `mission`, `system`, `other`.

Confidence rules, computed by the Worker, never edited by a person:

| Label | Rule |
|---|---|
| **confirmed** | at least one source is of tier `rockstar` (Newswire, official channels) |
| **verified** | at least two distinct sources of tier `outlet` (or one `outlet` plus corroboration from another `outlet`) carry the same `claim_key` within 14 days |
| **rumour** | anything else |

Community sources (`subreddit`, `forum`) never corroborate anything, including each other. A claim seen only in community sources is a rumour regardless of how many times it appears. A rumour later matched by a confirmed source is upgraded in place with `upgraded_at` set. Facts are never deleted by the pipeline; the history shows what was known when.

Only **confirmed** facts create or update `checklist_items`. Verified and rumour facts live in the facts feed only, labelled. That is the line between the app knowing things and the app making things up.

Source text is untrusted input. The extraction prompt says so explicitly, uses structured outputs with a strict schema, and the Worker post-filters every summary: at most 280 characters, no URLs, no @handles, no email or phone patterns. Summaries render as plain text, never as Markdown or HTML. Confidence labels in the UI are text plus a distinct icon per level; colour is additional, never the only signal.

### The allowlist
`allowlist.json` in the repo. Each entry: `{ id, name, kind: rockstar|outlet|channel|subreddit|forum, feed_url, tier: rockstar|outlet|community, language }`. Adding a source is a pull request; pausing one is a switch in the database.

Initial list: Rockstar Newswire; three or four established outlets (RockstarINTEL, GTA BOOM, GTABase news); the YouTube channels I actually trust (GTA Series Videos, DarkViperAU, TGG), via their RSS, tier `outlet`; r/GTA6 and r/GTA; GTAForums GTA VI section, tier `community`. Nothing else.

## 5. Tracker engine and stats

One engine, many checklists. The engine knows categories, groups and items; everything else is data.

- **Items merge from two places.** Seed items ship in the repo per language. Confirmed facts add items live from Neon via `/api/seed-delta`. Offline, the seed alone works; online, the delta is applied and cached (stale-while-revalidate, one hour).
- **The pipeline never modifies seed items.** A confirmed fact whose `claim_key` matches an entry in `aliases.json` attaches itself as a source to that seed item. Any other confirmed fact creates a new item in a "New" group inside its category. Items can be `retired` (hidden from lists, progress kept), never deleted. Aliases are maintained by pull request; they are how the "New" group gets tidied into the real groups over time.
- **Item shape:** `{ id, category, group, names{lang}, description?{lang}, location?{x,y,region}, attributes{}, sources[], retired? }`. `location` is present now so the phase 3 map is a new view over existing data, not a migration.
- **Progress record:** `{ item_id, done, updated_at, note?, origin: manual|xbox|psn }`. Stored per local profile. Export writes `{ version, exported_at, profile_name, records[] }` and nothing else: no device or client identifiers. Import validates the whole file against the schema (size cap 5 MB), merges into a temporary store by `item_id` with the newest `updated_at` winning, then swaps stores in one transaction. A reload mid-import leaves the old store untouched.
- **Local profiles.** A profile switcher on day one; each profile is its own store. One phone, three players. Deleting a profile moves it to a "deleted profiles" bin for 30 days with a restore action; the confirm dialog offers export first. Nothing in the tracker is a one-click permanent delete.
- **Stats** are computed, never stored: per category done/total, overall completion, most recent finds, remaining items in the current region. Items with `origin: xbox|psn` show an "auto" mark.
- **MVC in React terms.** `src/model/` is plain TypeScript with no React import: progress, merge, stats, import validation. Islands are views. Hooks are controllers. The model carries the unit tests.

Accessibility is built in: real `<input type="checkbox">`, full keyboard navigation, an `aria-live="polite"` region announcing "12 of 40" after a tick, progress bars with `role="progressbar"`, `aria-valuenow`, `aria-valuemax` and visible text, the profile switcher as a menu button with `aria-expanded` and `aria-haspopup` returning focus to its trigger on close, an "Offline, showing saved data" announcement once when connectivity drops, tap targets at least 44 px, visible focus, WCAG 2.2 AA as a merge gate.

## 6. Launch hub and languages

The home page has two states, chosen in the browser by the countdown island from the device clock, so a static build cannot get stuck in the pre-launch state. A scheduled workflow rebuilds the site once at 00:05 CET on 19 November as belt-and-braces.

- **Before 19 November 00:00 CET:** countdown, preload date (12 Nov), where to buy and prices in Norway, "before you start", "Latest" feed. The Norwegian version is the page nobody else has.
- **From launch night:** the same route flips to the dashboard: stats tiles, remaining nearby, "Latest", and "days since launch" in the corner.
- **Countdown accessibility.** The ticking digits are `aria-live="off"`. A separate polite region announces once per day change ("70 days to go"). Under `prefers-reduced-motion` the digits update once a minute without transitions.
- **Installable from the first visit.** Web app manifest, service worker via `@vite-pwa/astro`, app shell and seed cached, offline works. The install prompt is a dialog shown once, dismissible by keyboard, returning focus on dismiss.

Languages:

- Each language is a folder under `src/content/` and `src/seed/`, and a strings file under `src/i18n/`. Astro's built-in i18n routing handles `/en/` and `/no/`; every page sets `lang` and `hreflang`. Adding a language is a folder, a strings file and one flag in the pipeline config. No code changes.
- Hand-written guides: English and Norwegian at launch.
- Automated fact summaries: English, Norwegian, Spanish and German from day one. This is my own text, produced by the pipeline, so translating it is one extra instruction, not a translation project.

## 7. The pipeline

A Cloudflare Worker cron. Hourly. During launch week (12–26 Nov) the Rockstar tier runs every 15 minutes.

Each run, in order, and the run stops cleanly at the first failure without partial writes:

1. **Reconcile.** Collect results for every feed item in `extraction_status = submitted:<batch_id>`; write facts for finished batches; leave the rest. This makes reruns idempotent: a crash between submitting a batch and recording it never double-bills, because submission (step 4) records the batch id in the same transaction as the status change.
2. **Fetch** every allowlist entry that is not paused. Fetch only hosts present in `allowlist.json`, follow redirects only to the same host, cap bodies at 2 MB, time out at 10 seconds. A feed failing three runs in a row is skipped and named in the digest. Parse per feed format. Deduplicate by URL hash against `feed_items`; new items get `extraction_status = pending`.
3. **Filter leaks.** Items whose title, text or source matches the leak blocklist (`worker/rules/blocklist.ts`: "leak", "leaked", "datamine", "cyberleek", build numbers, torrent terms) are marked `skipped`. This runs before anything costs money.
4. **Extract facts.** `pending` items from the `rockstar` tier go to Claude directly, one request each, so confirmed facts are not delayed by batch latency. All other `pending` items go in one Batch API request per run, up to the budget cap. Model `claude-opus-5`, structured outputs with a strict schema: `claims[] { claim_key, category, summaries{en,no,es,de} }`. The prompt states that the source text is untrusted data, forbids quoting it, forbids naming leaked material, and asks for a normalised `claim_key` (lower-case, entity + attribute) so two outlets saying the same thing in different words collide. Items move to `submitted:<batch_id>` or, for direct requests, straight to `done`.
5. **Score and store.** Apply the summary filter (§4), the confidence rules and upgrades, write `facts` and `fact_sources`, push confirmed facts into `checklist_items` via the alias rule (§5).

### Cost of the AI step

Assumptions: about 2,000 input tokens and 600 output tokens per item at Claude Opus 5 rates ($5 in, $25 out per million), Batch API at half price for everything but the Rockstar tier.

| Load | Items/day | Per day | Per month |
|---|---|---|---|
| Normal | 50 | ≈ $0.60 | ≈ $19 |
| Launch week | 500 | ≈ $6 | one week ≈ $44 |

The budget cap switch limits items per run; when hit, the rest wait for the next run. The switch defaults to 100 items per run.

### Safety valves

All valves are rows in `switches`. They are flipped by a GitHub Actions `workflow_dispatch` job named `flip-switch`, which runs with the Neon secret and takes the switch name and value as inputs. It is reachable from the GitHub mobile app behind the account's 2FA, so no admin route or token exists on the site. A flipped switch reaches every visitor within five minutes (the edge cache TTL).

- **Kill-switch** hides the whole automated layer from the site and stops the cron.
- **Per-source pause.**
- **Budget cap** on items per run.
- **Report button** on every fact and feed item. Reports are keyed by a hash of the client IP with a daily rotating salt, rate-limited to 20 per hour per hash, and purged after 30 days. Five reports from distinct hashes hide a **verified** or **rumour** item until the next run re-evaluates it; a hidden item is not re-published from the same sources without a new corroborating source. **Confirmed** facts cannot be hidden by reports.
- **Daily digest** to me (Discord webhook): items fetched, facts written, batch status, skipped feeds, errors. Two silent days means the pipeline died.

### Known unknowns for the pipeline

- Reddit's API terms for commercial use need checking before the Pro tier exists. Until then the pipeline reads Reddit's public RSS only.
- The exact YouTube channel IDs and forum RSS URLs go into `allowlist.json` during phase 0.

## 8. Accounts, sync and player statistics (phase 2)

- **Sign-in:** Better Auth with passkeys. Email optional, for recovery. Delete-account button on day one.
- **Sync:** the same progress record, pushed per profile to Neon. Conflict rule is the import rule: newest `updated_at` wins.
- **Xbox:** "Sign in with Xbox" through OpenXBL. Achievements for the game map onto checklist items with `origin: xbox`. Free tier, 150 requests per hour, so refresh is on demand and rate-limited per user.
- **PlayStation:** opt-in "import trophies" using an unofficial library, clearly labelled experimental, never on by default. The user pastes their own token; it is used for one server-side request, never persisted, and redacted from Worker logs. The app stores nothing beyond the mapped records.
- **Rockstar Social Club:** not used. If an official API ever appears, it plugs into the same `origin` field.
- **Pro tier:** progress tracking stays free forever. Pro sells cross-device sync, themes, a supporter badge and early features. Family and friends get it free by invite code. Sold through a merchant of record.
- **Play Store:** a Trusted Web Activity wrapper built with PWABuilder, signed in Android Studio, published under the real brand after the 14-day closed test. iOS only on demand.

## 9. Security and privacy

- Content Security Policy with nonces via Astro's native CSP support. No `unsafe-inline`. No third-party scripts or requests from the browser at launch: fonts self-hosted, analytics same-origin.
- No cookies at launch.
- Secrets (Neon URL, Anthropic key, Discord webhook) live as Cloudflare secrets and GitHub Actions secrets; never in the repo. Dependabot and CodeQL on from the first commit.
- API endpoints are read-only except `/api/report`, which accepts only an item id and is rate-limited as in §7.
- Neon in Frankfurt (EU). Phase 2 accounts hold a passkey credential and an optional email, nothing else.
- Export files contain version, timestamp, profile name and progress records only.
- Everything the pipeline publishes passes the summary filter in §4 and renders as plain text.

## 10. Legal posture

- Footer on every page: unofficial fan project, not affiliated with or endorsed by Rockstar Games or Take-Two Interactive; trademarks belong to their owners.
- No Rockstar artwork, logos, screenshots, trailer frames or leaked material anywhere in the repo or the database. Icons and any map art are my own.
- Every fact and feed item links its source.
- A takedown contact address (a project alias, not my private mail) in the footer, so a letter comes to me and not to Cloudflare.
- Domain and app name contain none of: gta, gta6, gtavi, rockstar, leonida, vice city.

## 11. Testing

- **Unit (Vitest):** `src/model/` (merge by `updated_at` including un-ticks, stats, import validation and atomic swap, profile isolation, deleted-profile bin) and `worker/rules/` (blocklist, confidence with community sources never corroborating, upgrades, summary filter, reconciliation idempotency) plus one fixture per feed format in `worker/sources/`.
- **Browser smoke (Playwright), one flow:** open, install prompt shown and dismissed by keyboard, tick an item, export, wipe, import, switch language, go offline, reload. A second check asserts the countdown region is `aria-live="off"`.
- **Quality gates in every pull request:** Biome, Vitest, Lighthouse CI (performance ≥ 90, accessibility = 100 on the tracker and hub), axe with zero violations.
- **Pipeline dry-run mode:** `DRY_RUN=1` writes to `_staging` tables so a new source can be tested without touching the live feed.

## 12. Phases and calendar

| Phase | Dates | Ships |
|---|---|---|
| 0 · Setup | by 15 Sep | brand decision, GitHub org, `.app` domain at Cloudflare Registrar, Cloudflare and Neon projects, repo scaffold, CI green, Discord webhook |
| 1a · Foundation | 15–28 Sep | Astro site, i18n routing, hub in EN and NO, PWA install and offline, deploy to a preview domain. Exam 23 Sep sits inside this window; the week is light. |
| 1b · Tracker | 29 Sep–12 Oct | model with tests, tracker island, profiles with the deleted bin, export and import, stats |
| 1c · Pipeline | 13–26 Oct | Worker, allowlist, feed, blocklist, facts with confidence, switches and `flip-switch`, digest |
| 1d · Polish | 27 Oct–1 Nov | Lighthouse and axe to the bar, smoke test, seed content, family test install, `launch-rebuild` scheduled |
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
