# Rookdex — brand and visual design spec

Written 2026-09-21 from the brand brainstorm (three sessions, same day). It replaces the placeholder accent in `src/styles/tokens.css` and the placeholder rook mark in `public/icon.svg` with the final brand. The product design lives in `2026-09-09-rookdex-design.md`; the tracker in `2026-09-16-rookdex-phase-1b-design.md`. This spec changes how things look, not what they do.

## 1. What this spec covers

- The direction: what the brand borrows from the setting and what it never borrows from Rockstar.
- The palette as semantic tokens, and the rules for the one accent, the gradient and cyan.
- The mark (M2), with final geometry, the maskable safe zone and every generated icon.
- Type: wordmark, display number, headings, body. Self-hosting and precache.
- Lockups: header, hub, OG banner, GitHub avatar.
- Copy and tone rules in English and Norwegian.
- Theme architecture so a phase-2 Pro theme is one CSS block.
- Component impact, accessibility, performance budget, tests.

### Non-goals

- No light mode at launch. Light is a later `[data-theme]` theme with its own palette (section 10).
- No SEO work here: `og:image`, `twitter:card`, descriptions, sitemap and structured data belong to the SEO spec. This spec ships the banner file and hands over one note (section 8).
- No Content Security Policy here. It belongs to the SEO/security spec; section 12 lists what this spec leaves CSP-clean.
- No Norwegian banner. One English OG image for both locales.
- No store listing art. Phase 2 gets its own asset.
- No visual redesign of layouts. Spacing, radius, measure and breakpoints stay as built in 1a/1b.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Direction | The Leonida sunset in my own hand: Florida dusk, neon, palms, water | The setting is fair game; Rockstar's expression is not |
| Never used | Rockstar logo style, "VI" lettering, key-art poses, trailer frames, leak material | Take-Two enforcement and my own legal posture |
| Secondary flavour | Art-deco stepped dividers, ledger-style tabular numbers in stats, a louder hero in launch week | Liked in the brainstorm, kept small |
| "Rook" | Just a name. No rook object anywhere. Copy may wink at "rookie" | The old rook mark is retired |
| Palette | A3, dusk on black plus neon: black canvas, one pink accent, orange as gradient partner only, cyan for three jobs | Malin called the neon necessary for this project |
| Mark | M2: sun disc with three blind cuts, cyan horizon bar, black palm silhouette in front, offset right | Reads as "sun with a bite" at 16 px |
| Wordmark | ROOKDEX in Bebas Neue caps, always plain white next to the mark | The mark carries the colour |
| Display number | Countdown number in Bebas Neue ("59 DAYS") | The one place caps earn their space |
| Headings and stats | DM Sans 600 with tabular figures | Bebas for headings rejected: caps hurt guide pages |
| Body | Inter (already self-hosted) | No change |
| Rejected type | Outfit 800 (too heavy), Space Grotesk (in use by another project of mine) | |
| Tokens | Flat semantic tokens on `:root`, no primitive layer; a theme overrides the same names | Two layers rejected as ceremony |
| Light mode | Dark only at launch | Pink on white 3.37:1 and cyan on white 1.59:1 both fail |
| OG banner | Layout 2 lockup, tagline "The open-source GTA VI companion.", English only | Section 8 |
| Fonts | `@fontsource/bebas-neue` and `@fontsource-variable/dm-sans`, latin woff2 precached only | Closes the 1b "seven Inter subsets" follow-up |
| Glow | Decorative only: marks, fills, hero number. Never on body text, never on the tracker list, off under reduced motion | |

## 3. Direction and what it means in practice

The mood is the last minute of a Florida sunset seen from a dark room: black, one saturated pink, a strip of cyan where the water meets the sky. Everything else is quiet. Structure over decoration, as before.

Allowed: sun, horizon, palms, water, neon signage as a feeling, dusk gradients, the words Leonida and Vice City in guide and news text.

Not allowed, anywhere: Rockstar or Take-Two logos and logo styling, the "VI" numeral as a design element, poses or silhouettes lifted from key art, frames or stills from trailers, fan-map imagery, anything sourced from a leak. The brand-token rule for seed ids (no `gta`, `rockstar`, `leonida`, `vice` as a whole segment) already runs in CI and stays.

Secondary flavour, each used in one place at most: a stepped art-deco divider between hub sections; tabular ledger numbers in the stats rail (already `tabular-nums`); a louder hero on the hub during launch week (larger countdown number, one gradient stripe). None of these appear in the tracker list or in guide bodies.

## 4. Palette and tokens

### 4.1 The final `src/styles/tokens.css`

```css
:root {
	color-scheme: dark;

	/* Surfaces: true black content, lifted chrome. */
	--bg: #000000;
	--bg-raised: #0d0d0d;
	--border: #262626;

	/* Text hierarchy by brightness, not hue. */
	--text: #f2f2f2;
	--text-muted: #a3a3a3;

	/* One accent. Buttons, checks, focus, the confirmed tier. */
	--accent: #ff3d81;
	--accent-text: #2a0010;

	/* Gradient partner only. Never used alone for text or UI. */
	--accent-2: #ff8a3d;
	--gradient: linear-gradient(90deg, var(--accent), var(--accent-2));

	/* Cyan has three jobs: links, the expected tier, the horizon in the mark. */
	--link: #22e0ff;

	--tier-confirmed: var(--accent);
	--tier-expected: var(--link);

	/* Decorative glow. Removed under reduced motion (see below). */
	--glow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);

	--font-sans: "Inter Variable", system-ui, sans-serif;
	--font-heading: "DM Sans Variable", var(--font-sans);
	--font-display: "Bebas Neue", "Impact", var(--font-heading);

	--space-1: 0.25rem;
	--space-2: 0.5rem;
	--space-3: 1rem;
	--space-4: 1.5rem;
	--space-5: 2rem;
	--space-6: 3rem;

	--radius: 0.5rem;
	--measure: 65ch;
	--tap: 44px;
}

@media (prefers-reduced-motion: reduce) {
	:root {
		--glow: none;
	}
}
```

Spacing, radius, measure and tap are unchanged from 1a. The vertical gradient used in the mark is drawn inside the SVG, not a token; `--gradient` is the horizontal page version.

### 4.2 Usage rules

- **Pink** (`--accent`) is the only interactive colour: primary buttons, checked boxes, focus rings, active chips, the "confirmed" tier label, the tracker alert. Text on a pink surface is `--accent-text`.
- **Orange** (`--accent-2`) never appears alone. It is the far end of `--gradient`, which is used for: the progress bar fill, one hero stripe on the hub, the stripe on the OG banner. Not for buttons, not for text.
- **Cyan** (`--link`) is for links (always underlined, `text-underline-offset: 0.15em`), the "expected" tier label, and the horizon bar inside the mark. Nothing else. A link inside a pink button does not exist; buttons are buttons.
- **Tier labels** read from `--tier-confirmed` and `--tier-expected` so a theme can swap them without touching the accent. Rumours have no tier colour; they use `--text-muted`.
- **Glow** is applied only through `var(--glow)` on: the mark in the site header, the progress bar fill, the hub countdown number. It is never applied inside `.item-list`, `.menu`, `.modal` or guide bodies.
- **No raw hex outside `tokens.css`**, `public/icon.svg`, `public/og.svg` and the manifest. A CI test enforces this (section 13).
- Components never hardcode black or white. The tracker's "black" is `--bg`; the wordmark's white is `--text`.

### 4.3 Contrast (measured 2026-09-21, WCAG 2.x relative luminance)

| Pair | Ratio | Passes |
|---|---|---|
| `--text` on `--bg` | 18.76:1 | AAA |
| `--text-muted` on `--bg` | 8.33:1 | AAA |
| `--accent` on `--bg` | 6.24:1 | AA text, AAA large |
| `--accent` on `--bg-raised` | 5.77:1 | AA text |
| `--accent-text` on `--accent` | 5.64:1 | AA text |
| `--accent` on `--border` (focus ring edge) | 4.49:1 | AA non-text (3:1) |
| `--link` on `--bg` | 13.17:1 | AAA |
| `--accent-2` on `--bg` | 8.95:1 | AAA (decorative anyway) |

Pink on white is 3.37:1 and cyan on white is 1.59:1, which is why light mode needs its own palette.

## 5. The mark

### 5.1 Geometry (512 × 512 viewBox)

The drawing is built from four groups, in paint order:

1. **Background.** `rect 0 0 512 512 rx 96 fill --bg (#000000)`. Only the app icon has this rect; the in-page mark and the OG banner draw the mark on the page's own black.
2. **Sun.** Circle `cx 256 cy 236 r 150`, filled with a vertical gradient from `#ff3d81` at the top to `#ff8a3d` at the bottom, clipped to the circle. Three black blind cuts, full width, clipped to the same circle: `y 262 h 12`, `y 298 h 18`, `y 342 h 26`.
3. **Horizon.** `rect x 96 y 398 w 320 h 14 rx 7 fill #22e0ff`.
4. **Palm** in solid black, in front of sun and horizon. Trunk: cubic path from the foot at `352,404` to the crown at `312,214` (`M352 404 C 344 340, 334 280, 312 214`), stroke 24, round caps. Seven lens-shaped fronds from the crown, each a closed quadratic pair:

```
M312 214 Q 236 156 178 190 Q 244 192 312 214 z
M312 214 Q 208 208 168 262 Q 250 228 312 214 z
M312 214 Q 386 152 446 184 Q 380 190 312 214 z
M312 214 Q 412 206 452 262 Q 372 228 312 214 z
M312 214 Q 236 246 224 316 Q 276 248 312 214 z
M312 214 Q 386 246 398 316 Q 346 248 312 214 z
M312 214 Q 300 140 332 104 Q 316 160 312 214 z
```

These are the curves from the final brainstorm screen and are the final geometry. The implementer may tidy control points by a few units for symmetry but must not move the crown, the foot, the frond count or the sun.

**No glow filter inside the SVG file.** Glow on the in-page mark comes from CSS: `filter: drop-shadow(0 0 12px color-mix(in srgb, var(--accent) 45%, transparent))` on the header mark, set to `none` under reduced motion in the same media block that clears `--glow`. (`drop-shadow()` takes its own arguments, so it cannot reuse the `--glow` box-shadow value.)

### 5.2 Files

- `public/icon.svg`: the app icon as above, `<title id="t">Rookdex</title>` kept, `role="img"` kept.
- `src/components/Mark.astro`: the same drawing without the background rect, `aria-hidden="true"`, sized by a `size` prop (default 24). Used in the header and the hub lockup. One source of truth for the in-page mark; the icon file is a copy with the rect. A test asserts that the path data in the two files is identical (section 13).

### 5.3 Maskable safe zone and generated icons

The maskable safe zone is a circle of radius 0.4 × 512 = 204.8 from the centre. The horizon bar's outer corners sit 213.9 to 223.5 from the centre, so the raw drawing does not fit. The farthest frond tip is 203.2, the trunk foot 176.4, the sun top 170.0.

Measured scaling of the generator's `padding`:

| padding | scale | farthest corner after scaling | fits 204.8 |
|---|---|---|---|
| 0.3 (current) | 0.4 | 89.4 | yes, but the mark is tiny |
| 0.1 | 0.8 | 178.8 | yes |
| 0.05 | 0.9 | 201.2 | yes, 3.6 px of margin |

`pwa-assets.config.ts` changes to maskable `padding: 0.1` and apple `padding: 0`. Apple gets 0 because the source already is a black rounded square and iOS masks its own corners. Manifest `background_color` and `theme_color` stay `#000000`.

Generated set, unchanged in names and sizes: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. All regenerated with `npm run icons` (the existing script). After generating, the implementer overlays a 204.8 px circle on the maskable PNG in the Browser pane and screenshots it; the screenshot goes in the PR.

**Favicon at 16 and 32 px.** The palm stays unless it turns to noise. The check is a screenshot of `favicon.ico` rendered at 16 and 32 px in the Browser pane. If the palm is noise, `favicon.ico` alone is generated from a second source without the palm group, and `icon.svg` keeps the palm. Decided at implementation time from the screenshot, not in advance.

**GitHub org avatar.** The same `pwa-512x512.png` is uploaded as the `rookdex` org avatar. Manual step for Malin, listed in the plan.

## 6. Type

### 6.1 Roles

| Role | Face | Weight | Where |
|---|---|---|---|
| Wordmark | Bebas Neue | 400 | `ROOKDEX` next to the mark; header, hub lockup, OG banner |
| Display number | Bebas Neue | 400 | The hub countdown number and its unit ("59 DAYS"). Nothing else |
| Headings | DM Sans | 600 | `h1`–`h3` everywhere, including guide pages |
| Stats digits | DM Sans | 600, `font-variant-numeric: tabular-nums` | Stats rail totals and percentages |
| Body and UI | Inter | 400 and 600 | Unchanged |

Bebas Neue is a caps face; the wordmark and display number are written in caps in the source string and rendered as-is. No `text-transform` on other elements. Letter-spacing on the wordmark is `0.04em`.

The hub `h1` becomes the lockup (mark plus wordmark) with the accessible name "Rookdex"; that is the only heading in the display face, because it is the wordmark, not a heading.

### 6.2 Self-hosting

Two new dependencies, pinned like Inter: `@fontsource/bebas-neue` (400 only) and `@fontsource-variable/dm-sans`. `Base.astro` imports both package CSS files the way it imports Inter; the package CSS carries `unicode-range`, so the browser only downloads the subsets a page uses.

`<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Bebas Neue latin file only, because the wordmark is in every header. DM Sans and Inter load through the CSS as now.

**DM Sans tabular figures** must be verified at build: render `0123456789` twice in DM Sans 600 with `tabular-nums` on and off and compare widths in the Browser pane. If the face has no `tnum` table, stats digits fall back to Inter (which has it) and the spec's stats row uses `--font-sans`. The plan includes this check as a task with a recorded result.

### 6.3 Precache trim

`integrations/precache.mjs` today lists every file in `dist/`, so all Inter subsets are precached. New rule in `precacheUrls`: a `.woff2` under `_astro/` is precached only if its file name contains `-latin-` and not `-latin-ext-`. That keeps three files: Inter latin variable (48 KB), DM Sans latin variable and Bebas Neue latin 400. The other subsets stay in the build and load on demand online. This closes the 1b follow-up about the seven Inter subsets. The precache test gains a case for the filter.

Budget: the three latin files together stay under 120 KB; the two new faces together under 70 KB. Measured in the PR.

## 7. Lockups

- **Site header.** `Mark` at 24 px, then `ROOKDEX` in the display face at 1.25rem, `--text`, letter-spacing `0.04em`, gap `--space-2`. The whole lockup is the existing `.brand` link. Minimum height stays `--tap`. The mark carries the header glow; the wordmark never glows.
- **Hub `h1`.** The same lockup at mark 48 px and wordmark 2.5rem on phones, mark 64 px and 3.5rem from 768 px. Text alternative "Rookdex".
- **Countdown.** `.days` in the display face at 4rem on phones, 6rem from 768 px, `--text`, with `text-shadow: var(--glow)`. The units row below stays in Inter. Under reduced motion the seconds unit is hidden (1b follow-up, done here because it is the same component).
- **Progress bar.** `.bar-fill` background becomes `var(--gradient)`; `box-shadow: var(--glow)` only on the hub's overall bar, not the per-category bars in the stats rail.
- **Footer.** Unchanged: the disclaimer, contact and licence lines stay as built; no logo in the footer.

## 8. OG banner and social preview

One file, `public/og.png`, 1200 × 630, PNG, under 300 KB. Its source is `public/og.svg`, committed with text as text so it can be edited; the PNG is rendered from the SVG in the Browser pane at device pixel ratio 1 and saved. The recipe (open the SVG in the pane, screenshot at 1200 × 630) is in the plan; the PNG is regenerated whenever the SVG changes and the PR shows both.

Geometry, from the final brainstorm screen:

| Element | Spec |
|---|---|
| Canvas | 1200 × 630, `#000000` |
| Mark | Full M2 without the background rect, `translate(50 85) scale(0.9)` (461 px), glow filter allowed here (static image) |
| Wordmark | `ROOKDEX`, Bebas Neue 176 px, letter-spacing 6, `#f2f2f2`, x 540, baseline 284 |
| Tagline | "The open-source GTA VI companion.", DM Sans 600 32 px, `#f2f2f2`, x 542, baseline 350 |
| Muted line | "rookdex.app · track your progress · works offline · unofficial", DM Sans 500 20 px, `#a3a3a3`, x 542, baseline 412 |
| Stripe | `rect 0 606 1200 24`, horizontal pink to orange gradient |

Measured right edges in the mockup: wordmark 1074, tagline 1108, muted line 1091, all inside the 1200 canvas with the 92 px right margin the layout wants. The rendered PNG is checked against these numbers.

Fonts in the SVG: the SVG references the same self-hosted fonts through a `<style>` block with `@font-face` pointing at the built woff2 files, so the render in the Browser pane matches the site. No Google Fonts import anywhere in the repo; the mockup's import was mockup-only.

The same PNG is uploaded as the GitHub repository social preview (manual, Malin).

**Note handed to the SEO spec:** use `twitter:card=summary_large_image`. The centre-square crop of `summary` slices the wordmark. Both locales point `og:image` at the one English banner.

## 9. Copy and tone

### 9.1 Rules for both languages

- Plain, present tense, second person. No hype, no exclamation marks, no emoji.
- Tier vocabulary is fixed and used everywhere the same way: **confirmed**, **expected**, **rumour**. Never "leaked", never a leak source, never "rumoured to be confirmed".
- "Rookdex" with one capital in prose. All caps only inside the wordmark.
- "GTA VI" in prose. "GTA 6" appears once, in meta, for search (SEO spec).
- Leonida, Vice City and character names are fine in guide and news text. Never in brand elements: not in the wordmark, tagline, mark, banner, manifest or icon.
- The rookie wink is allowed in exactly two places: the tracker's empty state and the hub hero during launch week. Nowhere else, and never as a label for the user.
- "Unofficial" stays in the banner and in the footer disclaimer.
- The brand line is "The open-source GTA VI companion." (full stop kept). The `tagline` string in `src/i18n/*.ts` stays the meta description and hub intro line; it is not replaced by the brand line.
- Item names in the tracker stay English in both locales (1b decision).

### 9.2 Norwegian

- Bokmål, "du", never "De" or "man" where "du" works.
- Fixed words: **oversikten** (the tracker), **bekreftet**, **ventet**, **rykte**, **fremdrift** (progress), **profil**.
- "Rookdex" and "GTA VI" unchanged. The brand line is not translated (no Norwegian banner); Norwegian pages use the existing Norwegian `tagline` as their intro line.
- No English words where a plain Norwegian one exists ("last ned", not "download"), except product names and item names.

## 10. Theme architecture

`:root` is the brand. A theme is one block on `<html>` that overrides the same token names and nothing else:

```css
[data-theme="ledger"] {
	--accent: …;
	--accent-text: …;
	--accent-2: …;
	--link: …;
	--glow: …;
}
```

Rules:

- A theme may override any token in section 4.1 and only those. It may not add selectors, change fonts or touch layout tokens; if a theme needs that, it is not a theme.
- `--tier-confirmed` and `--tier-expected` are overridable separately so a theme can keep the accent and still swap tier colours.
- Each theme ships with its own contrast table like 4.3 in its PR. Light mode is such a theme and needs a new pink and a new cyan.
- **Applying the attribute.** The profile store is IndexedDB and asynchronous, so it cannot set the attribute before first paint. The store mirrors the active theme name into `localStorage` under `rookdex:theme` whenever it changes, and a small inline script at the top of `<head>` in `Base.astro` reads that key and sets `data-theme` synchronously. No key means the brand. This is phase 2 work; at launch there is no theme, no key and no script. The design is recorded here so phase 2 does not have to rediscover it.

## 11. Component impact

Files this spec changes, so the plan can be written against them:

| File | Change |
|---|---|
| `src/styles/tokens.css` | Section 4.1 verbatim |
| `src/styles/global.css` | `a` uses `--link` and is underlined; headings use `--font-heading` 600; `.brand` becomes the lockup; `.bar-fill` uses `--gradient`; `.days` uses `--font-display`; tier labels use the tier tokens; glow hooks per section 4.2 |
| `src/layouts/Base.astro` | Font imports and the Bebas preload; the `Mark` component in `.brand` |
| `src/components/Mark.astro` | New, section 5.2 |
| `src/pages/[locale]/index.astro` | `h1` becomes the lockup |
| `src/islands/Countdown.tsx` | `.days` styling hook; seconds hidden under reduced motion |
| `src/islands/tracker/StatsRail.tsx` | No change to the inline `width` style (a CSP with `style-src 'unsafe-inline'`-free policy will trip on it; that is the security spec's problem to solve, noted there) |
| `public/icon.svg` | Section 5.1 |
| `pwa-assets.config.ts` | Section 5.3 |
| `public/*.png`, `favicon.ico` | Regenerated |
| `public/og.svg`, `public/og.png` | New, section 8 |
| `public/manifest.webmanifest` | No change (colours stay black) |
| `integrations/precache.mjs` | Section 6.3 filter |
| `package.json` | Two font packages |
| `README.md` | A short brand paragraph: the licence of the mark and banner (see 14) and where the tokens live |

Everything with a class name keeps its class name; the tracker tests do not change. Snapshot-free: the visual result is checked in the Browser pane per the loadout's visual-correctness rules (same height and bottom edge on control rows, labels distinct from values), with screenshots in the PR.

## 12. Accessibility, motion and CSP hygiene

- Every text pair in 4.3 meets AA; the pairs used for body text meet AAA.
- Focus rings stay 2 px pink with 2 px offset on every background. On a pink button the focus ring is `--text` so it is visible (the only exception to "pink is focus").
- `prefers-reduced-motion: reduce` removes glow (`--glow: none`, the header drop-shadow), the progress-bar transition (already done) and the countdown seconds unit.
- The mark is `aria-hidden` in-page. The visible wordmark string is `ROOKDEX`; some screen readers spell an all-caps word letter by letter, so the header link and the hub `h1` carry `aria-label="Rookdex"`. The label matches the visible text case-insensitively, which satisfies the label-in-name rule.
- No inline `style=` is added by this spec and no inline `<script>` before phase 2, so a future CSP does not get harder because of the brand.
- Links are underlined everywhere, so colour is never the only cue.

## 13. Testing

Automated, in the existing Vitest run:

1. **No raw hex outside the allowlist.** A test reads every file under `src/` and fails on `#[0-9a-fA-F]{3,8}` in CSS, Astro and TSX files except `src/styles/tokens.css`. (`public/` is not scanned.)
2. **Token set.** A test parses `tokens.css` and asserts the exact token names from 4.1 exist on `:root`, and that no other file declares a `--` custom property on `:root`.
3. **Mark parity.** The path data of `public/icon.svg` and `src/components/Mark.astro` is identical after whitespace normalisation.
4. **Precache filter.** `precacheUrls` keeps `_astro/inter-latin-wght-normal.HASH.woff2` and drops `_astro/inter-cyrillic-wght-normal.HASH.woff2` and `_astro/inter-latin-ext-wght-normal.HASH.woff2`.
5. **Contrast.** A test computes the ratios in 4.3 from the token values and fails below the stated thresholds, so a future theme PR that edits `:root` by mistake is caught.
6. **Copy rules.** The existing brand-token id test stays; a new test asserts no string in `src/i18n/*.ts` contains "leak", "leaked", "lekk" or an exclamation mark.

Manual, screenshots in the PR: maskable overlay circle; favicon at 16 and 32; header lockup on phone and desktop; hub hero at 375 and 1024 px; the OG PNG against the right-edge numbers; reduced-motion emulation showing no glow and no seconds; DM Sans `tnum` width comparison.

## 14. Licence of the brand assets

Code is MIT and guides are CC BY-SA (product spec). The mark, wordmark lockup and banner are **not** under either: the README states that the Rookdex name, mark and banner may be used to link to or talk about Rookdex, and not to present another project as Rookdex. This matches how most open-source projects treat their logo and keeps the neutral-brand posture from the product spec meaningful.

## 15. Handed to other specs

- SEO spec: `og:image`, `twitter:card=summary_large_image`, "GTA 6" once in meta, descriptions.
- Security spec: CSP; the `StatsRail` inline width style; `_headers` additions.
- Phase 2: themes (section 10), light mode, store listing art, `rookdex:theme` mirror and the inline script.
- Workbench: once this ships, the token set and `Mark` pattern go into the `web-astro-react` scaffold extraction.
