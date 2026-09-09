# Rookdex spec — stress test (2026-09-09)

Four passes over `2026-09-09-rookdex-design.md` before plan-writing: security, privacy, accessibility, loopholes. All proposed changes are folded into the spec in the same commit.

## Findings

### 🔴 Security — two community posts could manufacture a "verified" fact
Corroboration counted "two distinct allowlisted outlets", and subreddits and forums are allowlisted. One person posting the same claim to r/GTA6 and GTAForums produces a verified label with zero editorial source. Because the pipeline is unattended, that label ships.

**Fix:** corroboration counts only sources of tier `outlet` or `rockstar`. Community sources never corroborate anything, including each other. A claim seen only in community sources is a rumour no matter how many times it appears.

### 🔴 Loopholes — profile delete is an open delete with no undo
Profiles are the family's progress. The spec had a switcher but no delete rule, which means the first implementation will be a button that wipes a store.

**Fix:** deleting a profile moves it to a "deleted profiles" bin in IndexedDB for 30 days with a restore action, and the confirm dialog offers export first.

### 🟠 Security — source text is a prompt-injection channel into published text
Reddit posts and video descriptions go into the model. Confidence cannot be injected (rules, not the model, decide it), but a summary can be steered into something offensive, defamatory, or containing a link.

**Fix:** the system prompt states that source text is untrusted data; structured output with a strict schema; summaries capped at 280 characters, no URLs, no handles, PII pattern filter; rendered as plain text only, never as Markdown or HTML.

### 🟠 Security — mass reporting could hide Rockstar-confirmed facts
"Five reports hide an item" applied to every fact. A handful of griefers on launch night could blank the confirmed list.

**Fix:** confirmed facts cannot be hidden by reports. Only verified and rumour items can. Reports are keyed by a hashed IP with a daily salt and rate-limited to 20 per hour per hash.

### 🟠 Security — the safety valves exist but nobody can reach them
Switches live in a database table and the spec had no way to flip one from a phone at 01:00 on launch night without a deploy or a laptop.

**Fix:** switches are flipped by a GitHub Actions `workflow_dispatch` job ("Flip switch") that runs with the Neon secret. It is reachable from the GitHub mobile app behind the account's 2FA, and it needs no new auth surface on the site.

### 🟠 Loopholes — the home page cannot flip at midnight if it is a static build
A pre-rendered page renders the pre-launch state until the next build. Nobody is rebuilding at 00:00 CET.

**Fix:** the hub state is decided in the browser by the countdown island from the device clock, and a scheduled rebuild at 00:05 CET on 19 November is the belt-and-braces.

### 🟠 Loopholes — "newest done_at wins" loses un-ticks
Un-ticking sets `done: false` and has no `done_at`, so an older tick from another device or an older export always wins over a newer un-tick.

**Fix:** every progress record carries `updated_at`; merge compares `updated_at`, not `done_at`.

### 🟠 Loopholes — a crash between "submit batch" and "record batch id" double-bills
Feed items were marked new by absence of facts. A run that submitted a batch and died before recording it resubmits the same items next hour.

**Fix:** each feed item has `extraction_status` (`pending`, `submitted:<batch_id>`, `done`, `skipped`). A run first reconciles every `submitted` batch, then submits only `pending` items. Rerunning is idempotent.

### 🟠 Loopholes — confirmed facts creating checklist items will duplicate seed items
"Alligator" in the seed and "American alligator" from the pipeline become two items unless matching is defined.

**Fix:** the pipeline never modifies seed items. New confirmed items land in a "New" group inside their category. An `aliases.json` in the repo maps claim keys to seed item ids and is maintained by pull request; a matching alias attaches the fact as a source to the seed item instead of creating one. Items can be `retired` (hidden, progress kept), never deleted.

### 🟠 Accessibility — a ticking countdown in a live region is unusable
A per-second countdown announced by a screen reader is noise; the same element animating ignores reduced-motion users.

**Fix:** the countdown is `aria-live="off"`; a separate polite region announces once per day change. Under `prefers-reduced-motion` the digits update once a minute without transitions.

### 🟠 Accessibility — confidence must not be colour-only
Confirmed, verified and rumour are the product's trust signal. A colour badge alone fails colour-blind users and grayscale screens.

**Fix:** every confidence label is text plus a distinct icon; colour is additional.

### 🟡 Privacy — fonts and analytics must not become third-party requests
Google Fonts from the browser is a third-party request and breaks the "no third-party scripts" CSP; Umami self-hosting needs a Node server the architecture does not have.

**Fix:** fonts are self-hosted from the site's own origin. Launch analytics is Cloudflare Web Analytics (free, cookieless, no script from another origin). Plausible is the phase 2 upgrade if retention beyond six months matters.

### 🟡 Privacy — report data retention was unstated
**Fix:** report rows keep only the hashed IP and item id and are purged after 30 days.

### 🟡 Privacy — the export file claim "never identifiers" was too strong
The profile name is in the file by design. **Fix:** state exactly what the file holds: version, timestamp, profile name, records. No device or client ids.

### 🟡 Privacy — PlayStation token handling (phase 2)
**Fix:** the pasted token is used for one server-side request and never persisted or logged; the Worker's logging redacts it.

### 🟡 Security — the pipeline's fetcher needs hardening rules
**Fix:** fetch only hosts present in `allowlist.json`, follow redirects only to the same host, cap bodies at 2 MB, time out at 10 seconds, ignore feeds that fail three runs in a row and flag them in the digest.

### 🟡 Security — API surface rules
**Fix:** the JSON API answers only same-origin and the preview domain; all endpoints are `GET` except `/api/report` (`POST`, item id only, rate-limited).

### 🟡 Loopholes — import is not atomic
A reload mid-import leaves a half-merged store. **Fix:** import validates the whole file, merges into a temporary store, then swaps in one transaction.

### 🟡 Loopholes — Batch API latency defeats the 15-minute Rockstar cadence
Batch results can take hours. **Fix:** items from the `rockstar` tier bypass the batch and use a direct request; everything else stays batched.

### 🟡 Loopholes — unknown language route
**Fix:** an unsupported language prefix serves the English 404 page with links to every language home.

### 🟡 Accessibility — profile switcher, progress bars, offline state, install prompt
**Fix:** the switcher is a menu button with `aria-expanded` and `aria-haspopup`, focus returns to the trigger on close; progress bars use `role="progressbar"` with `aria-valuenow`/`aria-valuemax` and a visible "12 of 40" text; going offline announces "Offline, showing saved data" once; the install prompt is a dialog that returns focus on dismiss.

### ✅ Privacy — data flow
Progress never leaves the device before phase 2; the pipeline's only outbound calls are from the Worker to allowlisted feeds, the Claude API, Neon and one Discord webhook carrying counts only.

### Considered and rejected
- **Kill-switch latency.** The edge cache means the switch takes up to five minutes to reach every visitor, plus whatever the service worker holds. Accepted; "instant" in the spec now reads "within five minutes".
- **Two tabs writing to IndexedDB.** Last write wins. A family phone rarely has two tabs open in the tracker; not worth a lock.
- **Rumours being wrong.** The label is the mitigation. Removing rumours entirely would remove most of the launch-week signal.
- **Human review of facts.** Explicitly out. The rules, the tiering and the valves replace it; the trade is an occasional wrong rumour, labelled as such.
- **Cloudflare's missing spend cap.** Static requests are free and the AI budget cap is the only meaningful variable cost; a $10 notification is enough at this scale.

## Proposed changes to the spec before writing-plans

1. Rewrite the confidence table: community sources never corroborate.
2. Add profile delete rule: 30-day bin with restore, export offered first.
3. Add prompt-injection rules to the facts section: untrusted input, strict schema, 280-character cap, no URLs or handles, PII filter, plain-text rendering.
4. Reports cannot hide confirmed facts; hashed IP with daily salt; rate limit; 30-day purge.
5. Switches are flipped via GitHub Actions `workflow_dispatch`.
6. Hub state decided client-side; scheduled rebuild on launch night.
7. Progress records carry `updated_at`; merge by `updated_at`.
8. Feed items carry `extraction_status`; runs reconcile submitted batches first.
9. Pipeline never modifies seed items; "New" group; `aliases.json`; `retired` flag.
10. Countdown `aria-live="off"`, daily polite announcement, reduced-motion behaviour.
11. Confidence labels are text plus icon, never colour-only.
12. Self-hosted fonts; Cloudflare Web Analytics at launch.
13. Export file contents stated exactly.
14. PlayStation token never persisted or logged.
15. Fetcher hardening rules.
16. API same-origin, GET-only except `/api/report`.
17. Atomic import.
18. Rockstar-tier items bypass the batch.
19. Unknown language route serves the English 404 with language links.
20. Switcher, progress bar, offline and install-prompt accessibility rules.
21. Tests added for corroboration tiers, `updated_at` merge, reconciliation idempotency, and the countdown live-region behaviour.

All 21 folded into the spec on 2026-09-09.
