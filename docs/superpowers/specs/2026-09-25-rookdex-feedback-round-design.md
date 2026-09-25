# Rookdex — feedback round design spec (Spec A)

Written 2026-09-25 from the feedback-round brainstorm (sessions 17–20). It answers the feedback I gave after the frontend shipped (PR #21): a compact footer, tracker cards that line up, a Sources page, hover and focus everywhere, external links in a new tab, a clearer "Before you start" guide and a notice when a new version is ready. The product design lives in `2026-09-09-rookdex-design.md`, the tracker in `2026-09-16-rookdex-phase-1b-design.md`, the look in `2026-09-21-rookdex-brand-design.md` and navigation in `2026-09-23-rookdex-frontend-design.md`. Where this spec contradicts one of them, this spec wins and says so.

## 1. What this spec covers

- Shared building blocks: one external-link component, a hover token, one tooltip pattern.
- Tracker cards in an even grid, with a Sources link and a Report flag in the corners.
- A static Sources page under the tracker.
- The footer as a compact "HUD strip".
- Settings: the About group, the language row, the delete-all copy.
- The install prompt in the installed app.
- The "Before you start" guide: editions, pre-order bonus, GTA+, and cross-links.
- The update notice and the service worker changes behind it.
- A build check that fails on any unsafe external link.
- Copy, accessibility, performance, security, tests.

### Non-goals

- The profile dashboard. That is Spec B, brainstormed after this ships.
- SEO (`robots.txt`, sitemap, `og:`/`twitter:` tags, Search Console). That is its own spec, shipped before this one.
- Reporting a wrong item. The flag is a placeholder until phase 1c.
- Periodic update checks. The browser already checks `sw.js` on every navigation.
- Linking category headings to the Sources page, or News to the Tracker. There is no data link between them yet (1c).

## 2. Locked decisions

| Decision | Choice | Session |
|---|---|---|
| Split | Spec A = feedback items 1–5, 7–10 plus the install finding. Spec B = profile dashboard (item 6), later. | s17 |
| Install flag | Delete-all keeps `rookdex.install-prompt-seen` and `rookdex.persist-hint-seen`. The install prompt never mounts in the installed app. **Overturns frontend spec §7.** | s17 |
| Card grid | Group heading full width, item cards in `repeat(auto-fill, minmax(16rem, 1fr))`, equal row heights. | s17 |
| Whole card toggles | Real checkbox and label; the label's click area covers the card. | s17 |
| Corner icons | Book top-right (Sources), flag bottom-right (Report, coming soon). Tooltips on both. | s17 |
| Sources | Static page `/[locale]/tracker/sources/`, zero JavaScript, precached. | s17 |
| Footer | "HUD strip": three icon links, © line, launch status chip. No text links. | s18 |
| Settings language | The language link fills its row. | s18 |
| Hover and focus | "Lift and preview": hover lifts to `--bg-hover`, selectable things preview their selected marker. **Card focus is pink, overturning s17's cyan.** | s18 |
| External links | One `ExternalLink.astro`, ↗ on every external text link, a build check over `dist/`. | s19 |
| Update notice | The new worker waits; a notice offers Reload and Later. Placement: above the tab bar on phone, bottom right on desktop. | s19 |
| Guide | New sections Editions, Pre-order bonus and GTA+. Facts verified 2026-09-24. | s19 |
| Cross-links | Guide "install the site" → Settings install row; "the home page" → Home; Settings version → the GitHub commit. | s19 |
| Version guard | Responses carry `X-Rookdex-Version`; the worker never stores a page from another version. | s20 |
| Build check | Runs in an Astro integration after the build, not in `npm test`. | s20 |
| Update reload | Every open tab reloads once when the new version takes over. | s20 |
| Later | Hides the notice for the rest of that tab's session. | s20 |
| After launch | The footer chip reads "OUT NOW" / "UTE NÅ". | s20 |

## 3. Shared building blocks

### 3.1 `ExternalLink.astro`

`src/components/ExternalLink.astro` renders every link that leaves rookdex.app.

- Props: `href`, optional `class`, optional `icon` (default `true`), and a default slot for the link text.
- Output: `<a href target="_blank" rel="noopener noreferrer">`, the slot, an `aria-hidden="true"` ↗ SVG at 0.8em when `icon` is true, and `<span class="visually-hidden"> (opens in a new tab)</span>` in the page's language.
- `icon={false}` is for icon-only links such as the footer GitHub link. Its tooltip carries the ↗ instead, and the hidden suffix stays in the accessible name.
- `mailto:` links and links inside the app do not use it.

Every external link in the app is rendered by Astro (footer, guide sources, Settings, Sources page), so there is no React twin.

### 3.2 Hover token and rules

- New token `--bg-hover: #161616` in `tokens.css`. It replaces every hover colour mixed by hand today.
- All hover rules sit inside `@media (hover: hover)`. Touch gets an `:active` press state instead. Transitions are 120 ms and switch off under `prefers-reduced-motion`.
- **Lift:** hover raises the background to `--bg-hover` and brightens muted text to `--text`.
- **Preview:** things that can be selected (tabs, chips, cards) also show a faint version of their selected marker. The phone tab shows a 2 px top line at 45 % pink; the desktop tab shows a 2 px bottom line at 45 % pink; chips and cards get a border at 50 % pink.
- Plain buttons lift only. Primary buttons get `filter: brightness(1.12)` plus `--glow`.
- Links: the underline goes from 40 % cyan to solid cyan at 2 px.
- **Focus** is the hover lift plus the existing 2 px pink outline at 2 px offset (inset −2 px for tabs and icon buttons). On pink-filled surfaces the outline is white.

### 3.3 Tooltips

- Icon-only controls get a tooltip: 12 px text, padding 4 × 8 px, background `#1f1f1f`, border `#333`, placed above the icon.
- Pure CSS shows the tooltip on `:hover` and `:focus-visible`. The tooltip text is also in the control's accessible name, so it is never the only label.
- `src/scripts/tooltip.ts` adds one document-level `keydown` listener. Escape hides the visible tooltip until the pointer leaves or focus moves (WCAG 1.4.13). It covers the footer and the tracker without per-component code.

## 4. Tracker cards

`src/islands/tracker/ItemList.tsx`.

**Grid.** Each group heading spans the full width. Inside a group, the item list is a grid: `repeat(auto-fill, minmax(16rem, 1fr))`, gap 12 px. That gives two columns in the 640 px content column and one on phones. Rows stretch, so cards in one row share one height and one bottom edge.

**Card.** One `<li>` per item: padding 12 px 12 px 12 px 16 px, radius 8 px, 1 px `--border`, background `--bg-raised`. Contents top to bottom: checkbox and name, tier badge, description. The source list leaves the card.

- Checkbox 20 × 20 px, 2 px border, radius 4 px; done = pink fill with a white check.
- Name 15 px / 600. Tier badge 12 px, radius 999 px, padding 1 × 8 px. Description 14 px / 1.5, muted.

**Whole card toggles.** The card is `position: relative`. The label's `::after` covers the card (`position: absolute; inset: 0`), so a click anywhere on the card toggles the checkbox. The corner icons sit above it (`position: relative; z-index: 1`). A disabled tracker shows the default cursor.

**Corner icons.** Both are 44 × 44 px, radius 8 px, with a 22 px SVG. Measured insets: 13 px top and bottom, 7 px right.

- **Book, top right:** a link to `sources/#<item id>`. Tooltip and accessible name "Sources" / "Kilder". Rest muted; hover and focus cyan on 12 % cyan.
- **Flag, bottom right:** `<button aria-disabled="true">`, not `disabled`, so it stays focusable and its tooltip is reachable. Tooltip "Report: coming soon" / "Rapporter: kommer snart". A click does nothing.

**Hover and focus.** Hover lifts the card to `--bg-hover` and warms the border to 50 % pink. A faint glow is added, and it goes away under reduced motion. Focus is `.item:has(input:focus-visible)` with the 2 px pink outline.

**Arriving from the Sources page.** When the URL hash is `#item-<id>`, `Tracker.tsx` finds that checkbox after its first render, scrolls it into view and focuses it. An unknown or retired id does nothing. Links from the Sources page carry no `?show=`, so the tracker opens on All and the item is always visible.

## 5. Sources page

`src/pages/[locale]/tracker/sources.astro`, built from the seed. Zero JavaScript, precached like every page, crawlable. The Tracker tab stays active.

- **Header:** `<h1>` "Sources" / "Kilder" (28 px / 700), and a lede "Where every item in the tracker comes from." / "Hvor hvert element i trackeren kommer fra." (14 px / 1.5, muted).
- **Category chips:** anchor links to each category section, in the tracker's order, each with its count of live items. 44 px min height, padding 0 16 px, radius 999 px, 15 px text, count 12 px muted.
- **Sections:** one per category, `<h2>` with the category name. Entries follow in the tracker's group order, with no group headings.
- **Entry:** `<article id="<item id>">` (the seed id contains one slash, valid in an id and a fragment), padding 12 px 12 px 12 px 16 px, `--bg-raised`, radius 8 px. `<h3>` item name (15 px / 600). A list of its sources, each one an `ExternalLink` with the source title in cyan and the outlet domain (`outletOf`) in 12 px muted under it, 44 px min height. Then "Back to the item in the tracker" / "Tilbake til elementet i trackeren", linking to `../#item-<id>`, 13 px muted, 44 px min height.
- **`:target`:** the entry arrived at from a book icon gets a cyan border and a faint cyan shadow.
- Retired items are left out, as in the tracker. The schema requires at least one source per item, so no entry is empty.

**Tracker chip row.** After the category chips (alphabetical from the seed, so after Wildlife) comes a Sources chip: an `<a>` to `sources/`, cyan outline, book icon, "Sources" / "Kilder". It is a link, not a toggle, so it has no `aria-pressed`.

## 6. Footer

`src/components/Footer.astro`, rewritten.

- **Disclaimer,** one sentence: "Unofficial fan project. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive." / "Uoffisielt fanprosjekt. Ikke tilknyttet eller godkjent av Rockstar Games eller Take-Two Interactive."
- **Icon links,** each 44 × 44 px, radius 8 px, muted, lifting to `--text` on `--bg-hover`:
  - GitHub: `ExternalLink` with `icon={false}`, name "Source code on GitHub" / "Kildekode på GitHub", tooltip with ↗.
  - Envelope: `mailto:legal@rookdex.app`, name "Takedown and legal: email" / "Fjerning og juridisk: e-post".
  - ⓘ: Settings About, name "About and licences" / "Om og lisenser".
- **© line:** "© ROOKDEX {build year}" in Bebas Neue 400, uppercase, letter-spacing 0.14em.
- **Status chip,** a link to Home: 44 px min height, padding 0 14 px, radius 999 px, border 55 % pink. An 8 × 8 px pink dot with a 10 px glow pulses every 2 s (35 % opacity at the midpoint) and is static under reduced motion.
  - Without JavaScript: "19 NOV 2026".
  - `src/scripts/footer-countdown.ts` replaces it with "{n} DAYS TO LAUNCH" / "{n} DAGER TIL LANSERING" from `daysToGo`, singular "1 DAY TO LAUNCH" / "1 DAG TIL LANSERING".
  - From launch day (`hubPhase` = `after`): "OUT NOW" / "UTE NÅ".
- **Layout:** icons, chip and © share one centre line. Measured targets: 169 px tall on a phone (was 258 px), one row of 77 px on desktop, no overflow at 320 px.

The label and value pairs that were in the footer move to Settings About (§7.1).

## 7. Settings

### 7.1 About (was "App")

The group heading becomes "About" / "Om". Rows, in order:

1. Install (unchanged behaviour). The row gets `id="install"` for the guide's cross-link. If the row is hidden, because the browser offers no install, the link lands at the top of Settings.
2. Version. The commit part links to `https://github.com/rookdex/rookdex/commit/<full sha>` through `ExternalLink`. A dev build without a sha stays plain text.
3. Source code: `ExternalLink` to the repository.
4. Code licence: MIT.
5. Guide licence: CC BY-SA 4.0, an `ExternalLink` to `https://creativecommons.org/licenses/by-sa/4.0/`.
6. Takedown and legal: `mailto:legal@rookdex.app`.

Row labels: "Takedown and legal", "Code licence", "Guide licence", "Source code" / "Fjerning og juridisk", "Kodelisens", "Guidelisens", "Kildekode". Under the rows, a muted note: "All trademarks belong to their owners." / "Alle varemerker tilhører sine eiere."

### 7.2 Language row

The link to the other language fills its row (`flex: 1`, stretched to the row's height; no pseudo-element). The row lifts to `--bg-hover` on hover and focus. The current language stays plain text with a check mark.

### 7.3 Delete all

`src/scripts/delete-all.ts` no longer removes `INSTALL_SEEN_KEY` or `HINT_SEEN_KEY`. The confirmation copy adds: "Your choices about the install prompt and hints stay, so they do not return." / "Valgene dine om installering og tips blir liggende, så de ikke kommer tilbake."

## 8. Install prompt

`InstallPrompt.tsx` returns nothing when `isStandalone(window)` is true (`src/scripts/standalone.ts`), before reading any flag. Together with §7.3, the prompt no longer comes back after delete-all, and it never appears inside the installed app.

## 9. "Before you start" guide

Both `src/content/guides/{en,no}/before-you-start.md`. The copy summarises in my own words and never copies Rockstar's or the store's lists. Facts verified on 2026-09-24 against the Rockstar Newswire pre-order article and the PlayStation Store page (concept 10000730). Re-check both on the day the content is written, and bump `updated`.

Sections, in order:

1. **The date,** unchanged.
2. **Editions (new):** Standard 949 kr, Ultimate 1 189 kr. An Ultimate Upgrade can be bought later.
3. **Pre-order bonus (new):** pre-ordering or buying before 20 November gives the Vintage Vice City Pack (a car with a garage, outfits, a weapon pattern).
4. **GTA+ (new):** a digital pre-order includes one month of GTA+. On PlayStation it renews automatically until it is cancelled, and must be redeemed by 31 March 2027. GTA+ perks apply to GTA Online and the games library, not GTA VI's single-player. A plain warning: cancel before it renews if you don't want to pay. No buying advice.
5. **Preload,** plus: a physical box contains a download code and is sold from 12 November. This replaces the wrong "check that they ship for release day" line.
6. **Buying in Norway,** plus: the PlayStation Store charges at pre-order.
7. **What Rookdex does on launch night:** "install the site" links to `/{locale}/settings/#install`; "the home page" links to `/{locale}/`.

**Sources front matter:** the Newswire pre-order article replaces the Newswire index (the build rejects two sources from one outlet), and the PlayStation Store page is added.

**Sources line wrap fix,** `src/components/Sources.astro`: today the links are `nowrap` with no whitespace between the `<li>`s, so two or more sources overflow at 320 px. Fix: `li { display: inline-block }`, and the separator moves to `li:not(:last-child)::after`. The links render through `ExternalLink`. Measured: two lines, no overflow at 320 px.

## 10. Update notice

### 10.1 Service worker, `src/sw/sw.js`

- **Install** precaches as today but no longer calls `skipWaiting()`. The new worker waits.
- **Message:** `{ type: "SKIP_WAITING" }` calls `self.skipWaiting()`.
- **Activate** is unchanged: delete the other caches, then `clients.claim()`.
- **Version guard,** in stale-while-revalidate: a page response is stored only if its `X-Rookdex-Version` header equals the worker's `VERSION`, or the header is missing. A mismatched page is still returned to the screen. Without the guard, the old worker would store new pages in its old cache while the new one waits, and an offline page could ask for a script that was never cached.
- `cacheFirst` for assets is unchanged: hashed names cannot collide across versions.

**First update after this ships.** The worker that is live now has no guard. During the first wait, it can still store new pages in its old cache, until Reload or until every tab closes. The guard protects every update after that.

### 10.2 Version header

`integrations/precache.mjs` already computes `version` after the build. It also writes `X-Rookdex-Version: <version>` into the `/*` block of `dist/_headers`. `_headers` is already excluded from the hash, so the version does not change. The version is already public in `sw.js`.

### 10.3 The notice

- `register-sw.ts` hands its registration to `src/scripts/update-notice.ts`. No island; about 1 KB.
- **Shows** when `registration.waiting` exists at load, or when an installing worker reaches `installed` while `navigator.serviceWorker.controller` is set. Never on a first visit (no controller).
- **Markup** in `Base.astro`, right after `<main>`: a container with `hidden`, holding a live region `role="status"` that gets its text only when the notice shows, so screen readers announce it once. Copy: "A new version is ready" / "En ny versjon er klar". Buttons: "Reload" / "Oppdater" (primary) and "Later" / "Senere".
- **Reload** posts `SKIP_WAITING` to the waiting worker. If there is no waiting worker any more, because another tab already switched it, it calls `location.reload()`.
- **Every tab reloads once** on `controllerchange`, but only if it had a controller when it loaded. That keeps a first install's `clients.claim()` from reloading. An old page left running under the new worker could ask for a script chunk that no longer exists. Tracker ticks are already in IndexedDB, so a reload only loses text typed into an open dialog.
- **Later** hides the notice and sets a `sessionStorage` flag, so it stays hidden for the rest of that tab's session. Storage access is wrapped in try/catch; blocked storage means the notice can return on the next page.
- The notice never takes focus.

### 10.4 Placement

- Phone: fixed, left and right 16 px, bottom `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 8px)`.
- Desktop (≥ 1024 px): fixed bottom right, 16 px in, width 22rem.
- It overlays and never shifts content (no CLS). It sits below dialogs in stacking order. It fades in, with no fade under reduced motion.
- Measured targets: the English card is 62 px tall with 44 px buttons sharing one bottom edge. "Last inn på nytt" was rejected because it pushed the text to three lines at 320 px.

## 11. External-link build check

`integrations/external-links.mjs`, registered after `precache` in `astro.config.mjs`.

- A pure `findUnsafeLinks(html, site)` returns every `<a>` whose `href` is absolute `http(s)` on a host other than rookdex.app and that lacks `target="_blank"`, a `rel` containing both `noopener` and `noreferrer`, or a `.visually-hidden` descendant.
- The `astro:build:done` hook runs it over every `dist/**/*.html` and fails the build with a list of page and `href` pairs.
- `mailto:`, relative and same-origin links pass. `<link>` elements (canonical, hreflang) are not `<a>` and are not checked.

It runs locally and in CI without changing `ci.yml`, where tests run before the build.

## 12. Copy

New and changed strings go in `src/i18n/en.ts` and `no.ts`, and `copy.test.ts` covers both. Everything quoted in §§4–10 is final. The old footer label and value strings move to Settings. `reportSoon` becomes the tooltip text. The item-card `sources` label is removed.

## 13. Accessibility

- Every control stays at least 44 × 44 px.
- Tooltips never hold the only label; Escape hides them (§3.3).
- The flag uses `aria-disabled`, so it stays focusable and explains itself.
- The whole-card toggle keeps one real checkbox with a real label. Screen readers hear the item name and state, not "clickable".
- The Sources chip is a link, the category chips stay toggle buttons.
- The update notice announces once through `role="status"` and never moves focus.
- Every animation (pulse, fade, glow, transitions) stops under `prefers-reduced-motion`.
- External links say "(opens in a new tab)" to screen readers.
- Arriving at `#item-<id>` moves focus to the checkbox, so keyboard and screen-reader users land where sighted users do.

## 14. Performance and security

- New JavaScript: `tooltip.ts`, `footer-countdown.ts` and `update-notice.ts`, all small bundled module scripts. The Sources page ships none.
- No new packages.
- The precache grows by two pages (the Sources page in both languages).
- The CSP is unchanged. The scripts are bundled files served from `'self'`.
- `rel="noopener noreferrer"` on every external link. `X-Rookdex-Version` exposes only the hash already visible in `sw.js`.

## 15. Tests

**Vitest,** following the existing patterns (node environment with `renderDoc` for `.astro`, jsdom for islands and scripts):

1. `findUnsafeLinks`: missing `target`, missing `rel` token, missing suffix, and passes for `mailto:`, relative and same-origin links.
2. `ExternalLink.astro`: attributes, `aria-hidden` icon, hidden suffix in both locales, `icon={false}`.
3. `sw.js`, loaded in a `node:vm` context with fake `self`, `caches` and `fetch`. Install does not call `skipWaiting`; `SKIP_WAITING` does; a mismatched version is returned but not stored; a missing header is stored.
4. Precache integration: `_headers` gains the version line inside `/*`, and the hash is unchanged.
5. `update-notice.ts`:
   - no notice without a controller
   - shows for a waiting worker
   - Reload posts `SKIP_WAITING`
   - one reload on `controllerchange`
   - Later sets and respects the session flag, and survives blocked storage
6. `ItemList`: one card per item, no source links, the book `href`, the flag's `aria-disabled`, a click on the card toggles it.
7. Sources page: every live item with its links, anchors equal seed ids, counts per category derived from the seed.
8. `Tracker`: `#item-<id>` focuses that checkbox; an unknown hash does nothing.
9. Footer: three icon links with accessible names, the no-JS fallback. The countdown at a date before launch, on launch day and after launch.
10. Settings and delete-all: the two flags survive, the About rows are present. `InstallPrompt` does not mount in standalone.
11. Copy keys in both locales. One test that the countdown templates contain `{n}` (closes brand Task 5's untested branch).

**Measured in the Browser pane at 320 and 1024 px,** numbers go in the PR:

- cards in a row share height and bottom edge
- corner insets are symmetric
- footer heights and one centre line
- the language link's box equals its row's box
- the update card's buttons are 44 px on one bottom edge, with no layout shift
- the guide sources line wraps at 320 px with no overflow
- hover and focus states at both widths

**The real update flow,** locally with `npm run preview`:
1. Build, load and install.
2. Rebuild with a visible change and load again. The notice appears, responses carry `X-Rookdex-Version`, and pages stay on the old version.
3. Reload. Both open tabs switch.

Version previews cannot test this, because every version has its own origin.

## 16. Follow-ups outside this spec

- Spec B: the profile dashboard, with the Progress title linking to it.
- SEO spec, before this one ships.
- Phase 1c: reporting behind the flag, the `preview` job posting its URL on the PR.
