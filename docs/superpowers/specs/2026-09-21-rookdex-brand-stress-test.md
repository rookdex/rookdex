# Rookdex brand spec — stress test

Run 2026-09-21 against `2026-09-21-rookdex-brand-design.md` (four lenses: security, privacy, accessibility, loopholes) in a fresh-context review that read the spec and the code it changes. All 17 proposed changes were folded into the spec the same day. Where a finding offered a choice, the choice taken is noted in the spec section it names.

## Findings

### 🟠 Security — the CSP already exists and ships today; §1, §11 and §15 are written as if it does not

`astro.config.mjs` sets `security.csp`, and the built page carries a real `<meta http-equiv="content-security-policy">`: `default-src 'self'; … script-src 'self' <8 sha256 hashes>; style-src 'self' <3 sha256 hashes>` with no `'unsafe-inline'`. §1's non-goal "No Content Security Policy here", §12's "a future CSP", and §15's handover of "CSP" to a security spec are all based on a false premise. Anything the brand adds is already governed: an inline `<style>` in an Astro component is auto-hashed (fine), a literal `style=` attribute in markup is not (blocked), and `font-src 'self'` already covers the self-hosted faces. The product spec §9 also locks "No `unsafe-inline`".

**Fix:** Replace the §1 non-goal and the §12 bullet with the live policy and the one rule the brand must respect: brand CSS ships in `src/styles/*.css` or Astro `<style>` blocks; no `style=` attribute is written into markup. Move "CSP" out of §15.

### 🟠 Security — §10's phase-2 theme script is under-specified in exactly the two ways that will bite

A plain `<script>` in `Base.astro` is bundled by Astro into an external module and runs after first paint. It must be `<script is:inline>`, which Astro's CSP support hashes into `script-src`. Second, §10 reads `rookdex:theme` from `localStorage` and sets `data-theme` with no validation.

**Fix:** Specify `<script is:inline>` and require the script to set the attribute only when the stored value is one of a hardcoded list of shipped theme names, otherwise remove it.

### 🟠 Accessibility — §7's `.days` rule puts a whole localised sentence into a caps-only display face

`.days` is not a number: `Countdown.tsx:34` renders the full string (`"{n} days to go"`, `"{n} dager igjen"`, `"Day {n} since launch"`). Setting it in Bebas Neue at 4rem/6rem renders "DAG 12 ETTER LANSERING" in caps at hero size, wraps on a 375 px phone, and it is the `aria-live` region. §2, §6.1, §9.1 and §11 collide.

**Fix:** Split the number out in `Countdown.tsx`; only the number is in `--font-display`. Say so in §11 so the plan budgets a component change.

### 🟠 Accessibility — the palette gives pink and cyan non-interactive jobs, against §4.2's own rules

§4.2 declares pink "the only interactive colour" and cyan "links", then assigns them to tier labels, which are non-interactive text. Existing code also has pink on `.unit .value` and `.tracker-alert`. Contrast is fine; the problem is that colour no longer teaches anything.

**Fix:** Restate the rule (pink and cyan carry status as well as interaction; interaction is always additionally marked by a control shape or an underline) and list the non-interactive pink uses explicitly.

### 🟠 Loopholes — §13's first test fails on day one, and `Mark.astro` cannot satisfy it

`Base.astro:29` has `<meta name="theme-color" content="#000000" />`, and `Mark.astro` under `src/` needs the brand hex values.

**Fix:** Allowlist `tokens.css` plus the `theme-color` meta line, and require `Mark.astro` to use `var(--accent)`, `var(--accent-2)` and `var(--link)` as fills so the in-page mark follows a theme while `icon.svg` and `og.svg` stay fixed; the parity test compares `d` attributes only.

### 🟠 Loopholes — §5.3's padding table is wrong; `padding: 0.05` would break the safe zone

`@vite-pwa/assets-generator` computes `Math.round(width * (1 - padding))`: the scale is 1 − padding, not 1 − 2·padding. Farthest extent of the raw drawing is the horizon bar's rounded end at 220.6 (arc centre 213.6 plus `rx` 7); trunk foot with round cap 188.4; farthest frond tip 203.2; sun top 170.0. Safe radius 204.8 needs scale ≤ 0.928, so `padding ≥ 0.072`.

| padding | scale | farthest point after scaling | fits 204.8 |
|---|---|---|---|
| 0.3 (current) | 0.7 | 154.4 | yes, with 50 px wasted |
| 0.1 | 0.9 | 198.5 | yes, 6.3 px of margin |
| 0.05 | 0.95 | 209.6 | no, overflows by 4.8 px |

### 🟠 Loopholes — §8's OG render recipe cannot execute as written

Built faces live at `dist/_astro/<name>.<hash>.woff2`; `public/og.svg` is copied verbatim and can never learn the hashed URL. The Browser pane scales an emulated viewport wider than the pane, and a bare SVG document gets the UA page margin, so the screenshot is not reliably 1200 × 630.

**Fix:** Render from an HTML page that loads the site's own stylesheet; `resize_window` to exactly 1200 × 630; assert the returned image is 1200 × 630 before saving; move `og.svg` out of `public/`.

### 🟠 Loopholes — `public/og.png` gets precached, cancelling the font trim

`precacheUrls` skips only `404.html`, `sw.js`, `_headers` and `_redirects`. `dist` is 639,718 B today; the §6.3 trim removes 170,256 B; a ≤300 KB `og.png` adds it straight back for a file only crawlers fetch.

**Fix:** Add `og.*` to `SKIP` and add an image budget line.

### 🟠 Loopholes — §7's "the hub's overall bar" does not exist, and §11 omits the component change tier tokens need

`.bar-fill` appears only in `StatsRail.tsx:36`. `ItemList.tsx:92` renders one undifferentiated `<span className="tier">`, so the tier tokens need a TSX change.

**Fix:** Name `#progress-overall` in the stats rail; add an `ItemList.tsx` row with `data-status={item.status}`.

### 🟠 Loopholes — the Bebas preload URL is unspecified, and the obvious guess 404s and double-downloads

Astro emits `_astro/<name>.<hash>.woff2`; a hardcoded path gives a 404 preload plus the real download.

**Fix:** `import bebasLatin from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url"` and `href={bebasLatin}`; verify one request in the network panel.

### 🟡 Loopholes — three statements in the spec do not match the code

(a) Hiding the seconds unit under reduced motion is already implemented at `Countdown.tsx:28`. (b) The `StatsRail` inline `width` is written through the CSSOM after mount, which CSP does not govern; the CSP is live today with the island working. (c) `.bar { overflow: hidden }` (`global.css:472`) clips any shadow on `.bar-fill`.

**Fix:** Restate (a) as verified, not re-done; delete the CSP claim; move the glow to the `.bar` wrapper.

### 🟡 Accessibility — the contrast table skips the pairs the UI actually uses on raised chrome

`--text-muted` on `--bg-raised` is 7.70:1 and `--link` on `--bg-raised` is 12.19:1; both pass but are unguarded by test 5. §12's focus-ring exception does not say which surfaces are pink (`.skip`, `.actions .primary`, `.chips button[aria-pressed="true"]`).

### 🟡 Accessibility — the wordmark's fallback face is unaddressed, so the header reflows on load

Fontsource ships `font-display: swap`; Impact does not exist on Android, so first paint of `ROOKDEX` is DM Sans or Inter at `0.04em`, then snaps.

**Fix:** Decide: accept and measure, or a metric-adjusted fallback.

### 🟡 Loopholes — tests 2, 4 and 6 are imprecise enough to pass or fail for the wrong reason

Test 6 scans code files where `!` is syntax and `leak` hits `bleak`. Test 4's substring rule can be satisfied by a base64url hash containing `-`. Test 2 expects `--glow` once but §4.1 declares it twice.

**Fix:** Scan exported string values with word boundaries; match `/^[^.]*-latin-(?!ext-)/` on the basename; expect `--glow` twice.

### 🟡 Security — the MIT LICENSE file currently covers the mark; §14's README-only wording is not enough

`LICENSE` is a plain MIT grant over "the Software". §9.1's brand-element bullet can also be read as banning "GTA VI" from the brand line.

**Fix:** `LICENSE` gains a scope line naming the excluded paths; §9.1 reworded to cover Leonida/Vice City/characters and permit "GTA VI" in the brand line as descriptive use.

### 🟡 Loopholes — five small choices left open

(1) Is the wordmark string a literal `ROOKDEX` or `s.siteName` uppercased? (2) `h4`+ would stay Inter 700. (3) The favicon-without-palm fallback has no mechanism. (4) The `tnum` fallback leaves a DM Sans label beside Inter numbers on one line. (5) The header `drop-shadow` cannot be cleared from `tokens.css`, which only declares custom properties.

### 🟡 Privacy — the `rookdex:theme` mirror has no stated lifecycle

**Fix:** Device preference, not profile data; not exported or imported; removed when the last profile is deleted.

### ✅ Privacy (data flow) — otherwise clean

No new network calls; both faces self-hosted; Google Fonts banned and `font-src 'self'` enforces it.

## Considered and rejected

- `color-mix()` without a fallback: unsupported browsers substitute `none`, which is correct. Baseline since 2023.
- `--glow: none` in `text-shadow` and `box-shadow` contexts: valid in both.
- `aria-label` on the hub `h1`: headings support author naming; case difference satisfies Label in Name.
- `#main`-style anchors as hex false positives: none match today.
- Tying glow to `prefers-reduced-motion` rather than `prefers-contrast`: accepted simplification, consistent with the codebase.
- `og.png` drifting from its source: PR discipline; a hash test would be ceremony.
- Installed PWAs keep the old home-screen icon until reinstall: no platform can force it; one line in the PR body.
- `resizeOptions` dropping the preset's `fit: "contain"`: the source is square, so `cover` and `contain` are identical.
- DM Sans `opsz` possibly emitting extra `-latin-` files: the precache test catches it.

## Proposed changes (all folded)

1. §1 and §12: replace the "future CSP" framing with the live policy and the no-`style=`-attribute rule; remove CSP from §15.
2. §10: `<script is:inline>` and a hardcoded theme-name allowlist.
3. §7, §6.1, §11: split the countdown number from its sentence; `Countdown.tsx` is a component change.
4. §4.2: pink and cyan carry status as well as interaction; list the non-interactive pink uses.
5. §13.1 and §5.2: hex-test allowlist; `Mark.astro` uses token fills and is themeable.
6. §5.3: corrected padding table (scale = 1 − padding).
7. §8: render from an HTML page with the site stylesheet; exact 1200 × 630 asserted.
8. §6.3: exclude `og.*` from the precache; image budget line.
9. §7 and §11: `#progress-overall`; `ItemList.tsx` `data-status` row.
10. §6.2: preload URL via the `?url` import; one-request check.
11. §7 and §12: seconds rule already implemented; glow on `.bar`, not `.bar-fill`.
12. §4.3, §13.5, §12: raised-surface pairs; enumerated pink surfaces for the focus-ring exception.
13. §6.2: wordmark first paint: accept the swap and measure it in the PR.
14. §13.2, §13.4, §13.6: tightened tests.
15. §14 and §9.1: `LICENSE` scope line; brand-element bullet reworded.
16. §5.1, §5.3, §6.1, §6.2: literal `ROOKDEX` exempt from the caps rule; headings `h1`–`h6`; favicon fallback = a second generator config over a palm-less source, only if the 16 px check fails; the whole `.progress-label` reverts to Inter in the `tnum` fallback; a `--glow-filter` token cleared in the same media block.
17. §10: `rookdex:theme` lifecycle line.
