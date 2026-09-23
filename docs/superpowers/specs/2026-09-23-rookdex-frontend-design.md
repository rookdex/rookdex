# Rookdex — frontend and navigation design spec

Written 2026-09-23 from the frontend brainstorm (sessions 9–12). It adds app-style navigation (four tabs, back and forward in the installed app, a language dropdown), two new pages (Settings and News) and tidies the guide sources and the footer. The product design lives in `2026-09-09-rookdex-design.md`, the tracker in `2026-09-16-rookdex-phase-1b-design.md` and the look in `2026-09-21-rookdex-brand-design.md`. This spec changes how you move around the site. It does not change the tracker's data or the brand.

## 1. What this spec covers

- The route map: four tabs, one moved page, one new page, one redirect.
- The header: back and forward in the installed app, when the wordmark hides.
- The tab bar: bottom bar on phones, text row on desktop.
- The language picker as a dropdown.
- The Settings page and the News page.
- Guide sources and the footer.
- Copy in English and Norwegian, accessibility, performance, security, tests.

### Non-goals

- No light theme and no theme setting. Dark-only is locked (brand spec §10).
- No facts feed on News. Phase 1c adds it; this spec ships no placeholder for it.
- No display names for outlets. Sources show the domain (section 9).
- No client-side router (`ClientRouter`, view transitions). Deferred until the nav is measured in use.
- No change to the Tracker island's data model, profile menu or delete flow. The one exception: a new "closed" state when another tab deletes all data (section 7.2).
- No Playwright or other browser test runner (section 14).
- No SEO work. `og:image` and friends stay with the SEO spec.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Tabs | Home / Tracker / News / Settings | Four is the most a phone bar holds with labels; guides stay link-only |
| Rumours page | Promoted from `/tracker/rumours/` to top-level `/news/` | One tab's content should not live under another tab's URL |
| Build order | Build in Rookdex first, promote the proven patterns to the Workbench design system later | Rookdex is not a design-system consumer; it carries its own tokens |
| Rendering | Plain `.astro` plus small `<script>` modules. No new islands | Nav never changes after render; a React island would hydrate on every page for static links |
| Astro ladder | Plain `.astro` → `<script>` in `.astro` → framework island → server island/Actions → `ClientRouter`. Take the lowest rung that does the job | Escalate only when real state appears |
| Back/forward | Bare 44 px icon buttons left of the mark, only in `display: standalone` | A browser tab already has back and forward |
| Wordmark | Hides only at phone width *and* standalone together | Measured: the full row overflows above 130 % text (section 4) |
| Tab bar marker | 2 px pink line on the bar's top edge, pink icon, bright label | Mirrors the desktop underline; no pill |
| Language | Globe + code button, dropdown under it at every size | One pattern everywhere; no bottom sheet |
| Profile data | Export, import and delete stay per profile in the Tracker's profile menu | They act on one profile; Settings acts on the whole device |
| Settings layout | Grouped rows, muted label left, value or action right | The pattern phone settings screens use |
| Sources | Domains, 12 px, label and links on one line | Quiet under the guide; a duplicate outlet is a build error |
| Footer | Disclaimer sentence, hairline, grid of four label/value pairs | Even columns in both languages, measured |
| Testing | Logic in plain modules + jsdom, rendered markup via Astro's Container API | Covers the accessibility contracts without a browser runner |

## 3. Routes

| Route | Tab | Status |
|---|---|---|
| `/{locale}/` | Home | Existing hub |
| `/{locale}/tracker/` | Tracker | Existing |
| `/{locale}/news/` | News | New file; content moved from `tracker/rumours.astro` |
| `/{locale}/settings/` | Settings | New |
| `/{locale}/guides/{slug}/` | none | Existing, link-only |

`public/_redirects` gains two lines, above the existing root line so they match first (`trailingSlash` is `"always"`, so the old URL always ends in a slash):

```
/en/tracker/rumours/ /en/news/ 301
/no/tracker/rumours/ /no/news/ 301
/ /en/ 302
```

Removed: `src/pages/[locale]/tracker/rumours.astro`, the `rumoursHref` prop the tracker page passes to the Tracker island, and the rumours link plus its `rumoursHref` / `rumoursLabel` props in `src/islands/tracker/CategoryNav.tsx`. The precache list is generated at build, so the new pages are cached and the old one drops out on its own.

## 4. Header

Order in the row: back, forward, mark, wordmark, flexible space, language button. `Base.astro` keeps rendering it; the history buttons are a new component.

- **Back and forward.** Two `<button>` elements, 44 × 44 px, no border, 8 px radius, 24 px stroke chevrons (`M15 5l-7 7 7 7` and `M9 5l7 7-7 7`). Hover fills them lightly; focus shows the pink ring from `global.css`. Their group sits in the server HTML with `hidden` and an `aria-label` per button ("Back" / "Tilbake", "Forward" / "Fremover").
- **Reveal.** A module script (about 1 KB) removes `hidden` when `matchMedia("(display-mode: standalone)")` matches, or when iOS reports `navigator.standalone`. A browser tab never shows the buttons. `global.css` gains `[hidden] { display: none !important; }`: it has no such rule today and sets `display: flex` in a dozen places, so a flex rule on the group would otherwise override `hidden` and show the buttons in every browser tab.
- **State.** Back is disabled when `navigation.canGoBack` is false (the first page of the session); forward is disabled when `navigation.canGoForward` is false. Disabled buttons stay in place, dimmed (`opacity: .45`, muted colour), so the mark never shifts. Where the Navigation API is missing, both stay enabled and call `history.back()` / `history.forward()`. The state is read on load and again on `pageshow`, because a page restored from the back/forward cache keeps the state it had when it was left (forward disabled although a forward entry now exists). The script keeps no history of its own and stores nothing.
- **Wordmark rule.** `.wordmark` is hidden under `(max-width: 767px) and (display-mode: standalone)` only. It stays visually hidden, not removed, so the header's accessible name keeps "Rookdex". Measured on a 320 px installed row with the language button: 294 of 318 px at 100 % text, 307 at 115 %, exactly 318 at 130 %, overflow above that. Browser tabs and every width from 768 px keep the full lockup.
- **Header box.** Unchanged from the brand build: raised background, bottom hairline, 8 px × 16 px padding on phones, 24 px inline padding from 768 px.

## 5. Tab bar

One `<nav aria-label="Main">` (Norwegian: "Hoved") placed after the header and before `<main>`, holding `<ul>` › `<li>` › `<a>`. The current tab gets `aria-current="page"`, computed at build from the first segment of the `path` prop `Base.astro` already takes: `""` is Home, `tracker` is Tracker, `news` is News, `settings` is Settings, and anything else (guides) marks no tab. `Base.astro` also takes an optional `tab` prop that overrides the path: `404.astro` passes `path=""` (for its canonical link), which would otherwise mark Home as the current page on a missing page, so it passes `tab={null}`. Zero JavaScript; it works on a cold cache and with scripts off.

**Phone (below 768 px): fixed bottom bar.**

- Four equal columns (`repeat(4, 1fr)`), each link a column of icon over label, at least 56 px tall, 4 px gap, label 12 px / 500, line-height 1. No `white-space: nowrap`: it suppresses every soft wrap opportunity, the soft hyphen included, so "Inn­stillinger" would clip instead of wrapping. No label contains a space, so nothing else can wrap.
- Bar `min-height: 56px` plus `env(safe-area-inset-bottom)`; it grows when the Norwegian Settings label wraps. The viewport meta becomes `width=device-width, initial-scale=1, viewport-fit=cover`.
- One custom property, `--tabbar-h: 4.25rem` (68 px at a 16 px root, the measured two-line bar; `rem` so it scales with the text setting), feeds both `body { padding-bottom }` and `html { scroll-padding-bottom }`, each plus `env(safe-area-inset-bottom)`, below 768 px. The padding keeps the footer clear of the bar in both languages. The scroll padding keeps a focused control from scrolling in behind the bar when you Tab through the page (WCAG 2.4.11, Focus Not Obscured).
- Inactive: muted icon and label. Active: pink icon, bright label, and a 32 × 2 px pink line centred on the bar's top edge (`top: -1px`, radius `0 0 2px 2px`).
- Icons: four hand-drawn inline SVGs as `.astro` components, 24 px grid, 2 px stroke, round caps and joins, `aria-hidden="true"`: a house, a checked box, a folded paper, two sliders. No icon dependency.
- Norwegian "Innstillinger" measures 66.7 px in an 80 px cell at 100 % but about 87 px at 130 %. Its copy string carries a soft hyphen (`Inn­stillinger`) so it breaks onto a second line instead of clipping; the bar grows (measured 65 → 68 px) rather than cutting text. This is the one label allowed to wrap. The soft hyphen lives only in `nav.settings`; the page's `<h1>` and `<title>` use `settings.title` without it.

**Desktop (768 px and up): text row in the flow.**

- Icons hidden. Links 44 px tall, 0 × 12 px padding, 14 px / 500, 4 px gap, left edge aligned with the header's brand, not the content column.
- Active link: bright text and a 2 px pink underline via `::after` (12 px in from each side, `bottom: -1px`).
- The row scrolls with the page; it is not sticky.

## 6. Language picker

Replaces `src/components/LanguageSwitch.astro` in place.

- Markup: `<nav aria-label="Language">` › `<details>` › `<summary>` plus a list of plain links. No `role="menu"`; these are links.
- Summary: 18 px globe (muted, `aria-hidden`), the code ("EN" / "NO"), a 16 px chevron, and a visually hidden full label ("Language: English" / "Språk: norsk") using the existing `.visually-hidden` utility (`global.css:189`). 44 px tall, `0 8px 0 10px` padding, 1 px border, 8 px radius, 14 px / 500. Open state: border `#3a3a3a`, background `#161616`.
- Panel: anchored under the button, right-aligned to the header's inline padding, `min-width: 176px`, raised background, 1 px border, 8 px radius, 4 px padding, shadow `0 8px 24px rgba(0,0,0,.6)`. Each link 44 px tall, 0 × 12 px padding, 6 px radius, 14 px; the current language gets `aria-current="page"`, a `#161616` background and a pink check.
- Links keep today's targets (same page in the other language) with `lang` and `hreflang`.
- Script (about 1 KB, progressive): Escape closes and returns focus to the summary; a tap outside closes; focus leaving the menu (Tab past the last link) closes it, so an open panel never stays over the page; up and down arrows move between links; opening moves focus to the current language. Without the script, `<details>` still opens and closes.
- Nothing is stored. The URL is the language; no cookie, no consent question.

## 7. Settings page

`src/pages/[locale]/settings.astro`, plain Astro plus one small script. Heading "Settings" / "Innstillinger". Three groups, each an `<h2>` (13 px, DM Sans 600, uppercase, 0.06em tracking, muted) over a bordered box of rows. Rows: 48 px minimum, 0 × 14 px padding, hairline between rows, label 14 px muted on the left, value or action 14 px on the right.

Group headings: "Language" / "Språk", "Your data" / "Dine data", "App" / "App".

### 7.1 Language

Two rows, one per language, each showing the language's own name ("English", "Norsk"). The current one shows a pink check and carries `aria-current="page"`; the other is a link to the settings page in that language.

### 7.2 Your data

| Label | Value |
|---|---|
| Stored / Lagret | In this browser only / Bare i denne nettleseren |
| Protected from clearing / Beskyttet mot sletting | Yes / Ja, No / Nei — from `navigator.storage.persisted()`; the row is left out when the API is missing or the call rejects |
| Export or import / Eksport eller import | Link: Profile menu in Tracker / Profilmenyen i Oversikt |

Below the rows, a danger box: "Removes every profile and all progress on this device. It can't be undone. Export first if you want a copy." / "Fjerner alle profiler og all fremdrift på denne enheten. Det kan ikke angres. Eksporter først hvis du vil ha en kopi." and a danger-styled button "Delete all data on this device" / "Slett alle data på denne enheten".

The button opens a native `<dialog>` that repeats the consequence, with "Cancel" / "Avbryt" and "Delete everything" / "Slett alt". **Cancel comes first in DOM order**, so `showModal()` focuses it and a stray Enter cancels instead of wiping the device (the same rule as the Tracker's `DeleteDialog`, which puts "Export first" first). No type-to-confirm. The dialog holds a `role="alert"` element for its messages. On confirm the script:

1. Disables "Delete everything" until the request settles, so a double tap sends one request.
2. Calls `indexedDB.deleteDatabase("rookdex")`. If `indexedDB` is missing or the call throws, it goes to step 7.
3. Removes `rookdex.install-prompt-seen` and `rookdex.persist-hint-seen` from `localStorage`, after the database is gone.
4. Leaves the service worker cache alone, so the app still opens offline.
5. On `success`, closes the dialog (focus returns to the button that opened it) and announces "All data on this device is deleted." / "Alle data på denne enheten er slettet." in a polite live region that is in the page, empty, from the start.
6. On `blocked`, keeps the dialog open and says "Close other Rookdex tabs to finish." / "Lukk andre Rookdex-faner for å fullføre." `blocked` is not a failure: the request stays pending and fires `success` on its own once the other connections close, so the script keeps listening and goes to step 5 when it does. It never sends a second request. In practice this is rare, because the Tracker's store closes its connection on `versionchange` (`src/model/store.ts:54`).
7. On `error`, keeps the dialog open, re-enables the button and says "Something went wrong. Nothing was deleted." / "Noe gikk galt. Ingenting ble slettet."

**Other open Tracker tabs.** Because the store closes its connection on `versionchange`, a Tracker open in another tab lets the delete through and then keeps the deleted data on screen; every later toggle fails with today's storage message ("Saving failed. Your browser may be blocking storage."), which is wrong, and nothing recovers without a reload. `openStore` takes an `onClosed` callback that the `versionchange` handler calls after `close()`, and the tracker moves to a new error, `closed`: "Your data changed in another tab. Reload to continue." / "Dataene dine ble endret i en annen fane. Last inn siden på nytt for å fortsette." Writes stop until the reload. This is the only change to the Tracker island in this spec.

### 7.3 App

| Label | Value |
|---|---|
| Install / Installer | Button "Install Rookdex" / "Installer Rookdex", shown only after `beforeinstallprompt`. "Installed" / "Installert" in standalone. On iOS Safari (detected by `navigator.standalone` being defined and false, no user-agent sniffing): "Share, then Add to Home Screen" / "Del, deretter Legg til på Hjem-skjerm". The row is left out when none applies. The prompt event works once: after `prompt()` the button is removed whatever the outcome, and `appinstalled` switches the row to "Installed" |
| Version / Versjon | `0.1.0 · 3b4dd8e`: `package.json` version plus the short commit, injected at build through Vite `define` in `astro.config.mjs` from `GITHUB_SHA` (first 7 characters; GitHub Actions sets it on every run, and on a PR preview it is the temporary merge commit, which is fine for a preview); `dev` when the variable is missing, as in local builds |
| Source code / Kildekode | Link: GitHub |

Legal lines stay in the footer on every page; Settings repeats only the source link.

## 8. News page

`src/pages/[locale]/news.astro`, built from what `tracker/rumours.astro` renders today:

- `<h1>` "News" / "Nyheter".
- Lead: the existing `rumours.intro` ("Reported by press, not confirmed by Rockstar. Rumours move to the tracker when confirmed." / "Meldt av pressen, ikke bekreftet av Rockstar. Rykter flyttes til oversikten når de bekreftes."). Page description: a new `news.description`, since the tab will hold more than rumours in 1c.
- `<h2>` "Rumours" / "Rykter" (the existing `rumours.title`), then the rumour list: name as `<h3>` (17 px, DM Sans 700), summary (14 px muted), "Reported by {outlet}" link (14 px cyan), each item under a hairline with 12 px vertical padding. The empty state keeps `rumours.empty`.
- The old "back to tracker" link is dropped; the tab bar does that job.

## 9. Guide sources

In `src/pages/[locale]/guides/[slug].astro`, the section keeps `aria-labelledby` pointing at its `<h2>`. Only its presentation changes:

- The `<h2>` "Sources" / "Kilder" displays inline as a small label: 12 px, Inter 500, muted, no uppercase, 8 px after it.
- Links show `outletOf(url)` (the domain without `www.`) instead of the full URL. The `<ul>` and `<li>` display inline so label and links flow like one sentence, with grey `·` separators (CSS `::before`, 8 px each side).
- Links 12 px, cyan, `white-space: nowrap`, `line-height: 44px` for the tap height. The underline is 1 px at 40 % cyan and turns full cyan on hover and focus.
- Measured: no overflow at 320 or 360 px. One source (today's guide) takes one 44 px line, down from roughly 110 px. Three full domains need about 352 px against 326 px of content width on a 360 px phone, so they take two lines. Accepted.
- **Duplicate outlets are a build error.** The guide collection schema in `src/content.config.ts` refines `sources`: if two URLs share an outlet, the build fails naming the guide and the outlet. Identical link text to different pages fails WCAG 2.4.4, and one best page per outlet is the better citation anyway. `outletOf` and `normalizeHost` move out of `src/model/seed.ts` into a small module both files import, so the content config does not pull in the allowlist.

## 10. Footer

`src/components/Footer.astro`:

1. The disclaimer, the only full sentence (unchanged copy).
2. A 1 px hairline, 16 px above and below.
3. A `<dl>` grid: `repeat(auto-fit, minmax(150px, 1fr))`, 16 px row gap, 24 px column gap. Each pair is a `<div>` with `<dt>` (12 px / 500, muted) over `<dd>` (13 px, bright). Each `<dd>` is `display: flex; align-items: center; min-height: 20px` so link and text values share one baseline; without it the link values sat 0.9 px low (measured).

| Label | Value |
|---|---|
| Takedown and legal / Fjerning og juridisk | `legal@rookdex.app` (mailto link) |
| Code licence / Kodelisens | MIT |
| Guide licence / Guidelisens | CC BY-SA 4.0 |
| Source code / Kildekode | GitHub (link) |

Four pairs, not the three first planned: a single licence value ("MIT (code) · CC BY-SA 4.0 (guides)") wrapped to two lines in the grid at every width. Measured with four: 2 × 2 on a 360 px phone and four across at 720 px, every label and value on one line in both languages, labels on a shared top edge, values on a shared baseline. Links in the footer keep a 44 px tap area through padding with negative margins, so the grid rows stay compact.

## 11. Copy changes

All strings exist in both `en.ts` and `no.ts`. New groups: `nav` (tab labels, "Main", "Back", "Forward"), `settings` (headings, row labels, values, dialog, live messages), `news` (title, description). The `rumours` group stays for the list itself (`title`, `intro`, `reportedBy`, `empty`); its `description` moves to `news.description` with wording that covers the whole tab. Changed: `footer.contact` becomes `footer.legalLabel`; `footer.licence` splits into `footer.codeLicenceLabel`, `footer.codeLicence`, `footer.guideLicenceLabel`, `footer.guideLicence`; `footer.source` becomes `footer.sourceLabel` with the value "GitHub". `languageSwitch` gains the visually hidden label. `tracker.errors` gains `closed` (section 7.2). Removed: `rumours.backToTracker`, `tracker.rumours`.

Tab labels: Home / Hjem, Tracker / Oversikt, News / Nyheter, Settings / Inn­stillinger. The soft hyphen (U+00AD) appears in `nav.settings` and nowhere else. The copy-rule tests from `cb92d88` keep running over every string (no "leak", no "!", no "ROOKDEX" in prose).

## 12. Accessibility

- Landmarks in order: skip link, `header`, `nav "Main"`, `main`, `footer`. The language `nav` sits inside the header with its own label.
- The skip link still targets `main`, so it jumps past both navs.
- Every interactive control is at least 44 px tall; tab-bar cells are 56 px.
- `aria-current="page"` on the current tab and the current language; the visual marker is never colour alone (the line and weight change too).
- History buttons have text labels. When disabled they are real `disabled` buttons, so Tab skips them, and they never move the mark.
- The tab bar and footer are tested at 130 % text; no label clips.
- On phones, `scroll-padding-bottom` keeps focused controls clear of the fixed bar (WCAG 2.4.11).
- The delete dialog uses native `<dialog>` with `showModal()`, so focus is trapped and Escape cancels without extra code. Cancel is first, so it takes the initial focus. Its messages sit in a `role="alert"` element, so a screen reader hears why nothing happened.
- Reduced motion: nothing in this spec animates.

## 13. Performance and security

- No new dependency and no new island. New JavaScript is three small module scripts (history, language, settings), each bundled by Astro and loaded as a module only on pages that include them. The history and language scripts ship on every page; together they stay under 3 KB unminified.
- The CSP stays as it is. Astro inlines small processed scripts and adds a `sha256` hash for each to `script-src` (today's built pages already carry four), so a new `<script>` is allowed whether it ships as a file or inline. The rule that keeps this safe: every script is a processed `<script>` in an `.astro` file. No `is:inline`, no `on*` attributes, no `javascript:` URLs, no `'unsafe-inline'`.
- The Settings script reads `navigator.storage.persisted()` and listens for `beforeinstallprompt`; it makes no network calls. `connect-src` stays `'self'`.
- Deleting data touches only this origin's IndexedDB database and two named `localStorage` keys.
- All pages stay static (`output: "static"`), served from the CDN; nothing in this spec adds per-user server load, so traffic scales with the CDN.

## 14. Tests

Vitest, following the repo's pattern: logic lives in plain TypeScript modules, and DOM wiring is a `wire*` function tested in jsdom.

| Unit | Checks |
|---|---|
| `currentTab(path, tab?)` | `""` → home, `tracker` → tracker, `news` → news, `settings` → settings, `guides/x` → none, `tab: null` → none whatever the path |
| `wireHistoryButtons(group, win)` | Hidden unless standalone; back follows `canGoBack`; forward follows `canGoForward`; state recomputed on `pageshow`; without the Navigation API both stay enabled and call `history` |
| `wireLanguageMenu(details)` | Escape closes and refocuses the summary; outside click closes; focus leaving closes; arrows move; open focuses the current link |
| `deleteAllData(idb, storage)` | Deletes the `rookdex` database and both keys, leaves others; `blocked` reports once and then resolves as success when the other connection closes, without a second request; `error` and a missing `indexedDB` report distinctly (uses `fake-indexeddb`) |
| Delete dialog | Cancel is the first focusable element; the confirm button is disabled while the request is pending |
| Store and tracker | Another connection deleting the database calls `onClosed`; the tracker moves to `closed` and makes no further writes |
| Settings rows | Storage row omitted without the API and when `persisted()` rejects; install row states (prompt, installed, iOS how-to, none); button removed after `prompt()`; `appinstalled` switches to "Installed" |
| Rendered markup (Container API) | One `nav[aria-label]` for Main with `aria-current` on the right link per route type; footer `<dl>` has four pairs in both locales; sources section labelled by its `<h2>`; no rumours link in the tracker page |
| Content | A guide with two sources from one outlet fails the schema |
| `_redirects` | Both 301 lines exist and sit above the root 302 |
| Copy | New keys exist in both locales; no string other than `nav.settings` contains a soft hyphen |

Rendering `.astro` files needs Astro's Container API (`experimental_AstroContainer` from `astro/container`), which means `vitest.config.ts` moves to `getViteConfig()` from `astro/config`, keeping today's `environment`, `setupFiles` and `include`. The API is marked experimental and may change in any Astro release; Astro is pinned to `7.3.2`, so a break only arrives with a deliberate upgrade and shows up as failing tests.

**Measured before merge.** A Browser-pane script at 320, 360, 768 and 1024 px, each at 100 % and 130 % text: header row width, history buttons absent in a browser tab, tab-bar label fit (Norwegian Settings wraps at the soft hyphen at 130 %), the footer's last line clear of the bar, footer grid (one line per value, shared baselines), sources line. Then my phone check on the version preview: back and forward in the installed app, the safe-area gap under the bar, and the delete-all flow.

**Not now: Playwright.** A browser runner in CI would assert layout automatically but adds a dependency, a browser download per run and flake risk for a one-person project. Revisit in phase 1c when real user flows arrive.

## 15. Follow-ups outside this spec

- Promote the tab bar, history buttons and language dropdown into the Workbench design system once they have run in production.
- Outlet display names (`{ domain, name }` in `allowlist.json`) when a guide gets three or more sources.
- Phase 1c: the facts feed on News, and the `preview` job posting its URL as a PR comment.

## 16. Stress test: considered and rejected

Reviewed 2026-09-23 across security, privacy, accessibility and loopholes; the fixes are folded into the sections above. These were looked at and left as they are:

- **Tab bar before `main` in the DOM but at the bottom on phones.** Focus order differs from visual order on phones. It is the same on every page, and the skip link jumps past it, so it stays.
- **Type-to-confirm on "Delete all data".** A second modal step with Cancel focused first is enough for a device-local wipe; typing a word adds friction without adding safety.
- **The old rumours page in installed apps' caches.** The new service worker's `activate` drops the old cache. Online, a navigation to the old URL gets the 301: the redirect response is not `ok`, so the worker never caches it. Offline, it falls back to the home page like any uncached URL.
- **Two `beforeinstallprompt` listeners.** The hub's `InstallPrompt` island and the Settings script never run on the same page, so one event is never claimed twice.
- **Commit hash in Settings.** The repository is public; the hash reveals nothing that isn't there already.
- **The language code in the summary's accessible name.** The name reads "EN Language: English", which contains the visible text (WCAG 2.5.3) at the cost of a little redundancy.
- **Privacy.** Nothing in this spec sends data anywhere. Outlet and GitHub links go out under the existing `Referrer-Policy: strict-origin-when-cross-origin`, and `persisted()` shows no prompt.
