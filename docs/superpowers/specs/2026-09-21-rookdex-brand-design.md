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
- No change to the Content Security Policy. One already ships: `astro.config.mjs` sets `security.csp` with `default-src 'self'`, `font-src 'self'`, `object-src 'none'` and both `scriptDirective` and `styleDirective` limited to `'self'` plus the hashes Astro adds for its own inline blocks, so there is no `'unsafe-inline'` anywhere. Section 12 has the one rule the brand has to follow to stay inside it.
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
| Display number | The countdown number in Bebas Neue; the sentence around it stays in Inter | The one place caps earn their space |
| Headings and stats | DM Sans 600 with tabular figures | Bebas for headings rejected: caps hurt guide pages |
| Body | Inter (already self-hosted) | No change |
| Rejected type | Outfit 800 (too heavy), Space Grotesk (in use by another project of mine) | |
| Tokens | Flat semantic tokens on `:root`, no primitive layer; a theme overrides the same names | Two layers rejected as ceremony |
| Light mode | Dark only at launch | Pink on white 3.37:1 and cyan on white 1.59:1 both fail |
| OG banner | Layout 2 lockup, tagline "The open-source GTA VI companion.", English only | Section 8 |
| Fonts | `@fontsource/bebas-neue` and `@fontsource-variable/dm-sans`, latin woff2 precached only | Closes the 1b "seven Inter subsets" follow-up |
| Glow | Decorative only: the header mark, the overall progress bar, the countdown number. Never on body text, never on the tracker list, off under reduced motion | Two tokens, because a filter and a shadow cannot share a value |

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

	/* Decorative glow. Both are cleared under reduced motion (see below). */
	--glow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
	--glow-filter: drop-shadow(0 0 12px color-mix(in srgb, var(--accent) 45%, transparent));

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
		--glow-filter: none;
	}
}
```

Spacing, radius, measure and tap are unchanged from 1a. The vertical gradient used in the mark is drawn inside the SVG, not a token; `--gradient` is the horizontal page version.

### 4.2 Usage rules

- **Pink and cyan carry status as well as interaction.** Pink (`--accent`) is interaction (primary buttons, checked boxes, focus rings, active chips) and the "confirmed" status; cyan (`--link`) is links and the "expected" status. Because the two jobs share a hue, interaction is always marked a second time by the shape of a control (button, checkbox, chip) or by an underline. Colour is the accent, never the affordance. Text on a pink surface is `--accent-text`.
- **Non-interactive pink**, listed so the rule stays honest: the "confirmed" tier label in the tracker list, `.tracker-alert`, the countdown unit values (`.unit .value`) and the glow on the countdown number. Nothing in that list is clickable and nothing in it is underlined.
- **Orange** (`--accent-2`) never appears alone. It is the far end of `--gradient`, which is used for: the progress bar fill, one hero stripe on the hub, the stripe on the OG banner. Not for buttons, not for text.
- **Cyan** (`--link`) is for links (always underlined, `text-underline-offset: 0.15em`), the "expected" tier label, and the horizon bar inside the mark. Nothing else. The underline is what tells a link apart from a tier label. A link inside a pink button does not exist; buttons are buttons.
- **Tier labels** read from `--tier-confirmed` and `--tier-expected` so a theme can swap them without touching the accent. Rumours have no tier colour; they use `--text-muted`.
- **Glow** is applied only through `var(--glow)` (shadows) and `var(--glow-filter)` (the header mark) on: the mark in the site header, the overall progress bar, the hub countdown number. It is never applied inside `.item-list`, `.menu`, `.modal` or guide bodies.
- **No raw hex outside** `src/styles/tokens.css`, the `theme-color` meta line in `src/layouts/Base.astro`, `public/icon.svg`, `docs/brand/og.html` and the manifest. A CI test enforces this (section 13).
- Components never hardcode black or white. The tracker's "black" is `--bg`; the wordmark's white is `--text`.

### 4.3 Contrast (measured 2026-09-21, WCAG 2.x relative luminance)

| Pair | Ratio | Passes |
|---|---|---|
| `--text` on `--bg` | 18.76:1 | AAA |
| `--text-muted` on `--bg` | 8.33:1 | AAA |
| `--text-muted` on `--bg-raised` | 7.70:1 | AAA |
| `--accent` on `--bg` | 6.24:1 | AA text, AAA large |
| `--accent` on `--bg-raised` | 5.77:1 | AA text |
| `--accent-text` on `--accent` | 5.64:1 | AA text |
| `--accent` on `--border` (focus ring edge) | 4.49:1 | AA non-text (3:1) |
| `--link` on `--bg` | 13.17:1 | AAA |
| `--link` on `--bg-raised` | 12.19:1 | AAA |
| `--accent-2` on `--bg` | 8.95:1 | AAA (decorative anyway) |

Pink on white is 3.37:1 and cyan on white is 1.59:1, which is why light mode needs its own palette.

## 5. The mark

### 5.1 Geometry (512 × 512 viewBox)

The drawing is built from four groups, in paint order:

1. **Background.** `rect 0 0 512 512 rx 96 fill --bg (#000000)`. Only the app icon has this rect; the in-page mark and the OG banner draw the mark on the page's own black.
2. **Sun.** Circle `cx 256 cy 236 r 150`, filled with a vertical gradient from pink at the top to orange at the bottom, clipped to the circle. Three black blind cuts, full width, clipped to the same circle: `y 262 h 12`, `y 298 h 18`, `y 342 h 26`.
3. **Horizon.** `rect x 96 y 398 w 320 h 14 rx 7`, cyan.
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

The colours are the brand ones: sun gradient pink `#ff3d81` to orange `#ff8a3d`, horizon cyan `#22e0ff`, cuts and palm black. Which files write them as hex and which as tokens is in 5.2.

**No glow filter inside the SVG file.** Glow on the in-page mark comes from CSS: `filter: var(--glow-filter)` on the header mark. `drop-shadow()` takes its own arguments and cannot reuse the `--glow` box-shadow value, which is why 4.1 declares two glow tokens; both are cleared in the same reduced-motion block, so no component has to repeat the media query.

### 5.2 Files

- `public/icon.svg`: the app icon as above, `<title id="t">Rookdex</title>` kept, `role="img"` kept. It is copied to the build verbatim and is the input to the icon generator, so its fills are the literal hex values from 5.1. The OG source keeps literal hex for the same reason.
- `src/components/Mark.astro`: the same drawing without the background rect, `aria-hidden="true"`, sized by a `size` prop (default 24). Used in the header and the hub lockup. Its fills are `var(--accent)`, `var(--accent-2)` and `var(--link)`, with the sun's vertical gradient built from the two accent tokens inside the SVG, so the in-page mark follows a phase-2 theme while the icon file and the banner stay fixed. This is why the hex test (section 13) can scan `src/` without an exception for this file.
- The two drawings are kept in step by a test that compares the `d` attributes of their paths after whitespace normalisation, and nothing else: fills differ by design, and the icon file has a background rect the component does not (section 13).

### 5.3 Maskable safe zone and generated icons

The maskable safe zone is a circle of radius 0.4 × 512 = 204.8 from the centre. `@vite-pwa/assets-generator` resizes the source to `Math.round(width * (1 - padding))` and centres it on the background, so the scale is `1 − padding`. Measured from the centre of the raw drawing, the farthest points are the horizon bar's rounded end at 220.6 (arc centre 213.6 plus `rx` 7), the trunk foot with its round cap at 188.4, the farthest frond tip at 203.2 and the sun top at 170.0. The drawing therefore does not fit as it is: 204.8 / 220.6 gives a maximum scale of 0.928, so `padding` has to be at least 0.072.

Measured scaling of the generator's `padding`:

| padding | scale | farthest point after scaling | fits 204.8 |
|---|---|---|---|
| 0.3 (current) | 0.7 | 154.4 | yes, with 50 px wasted |
| 0.1 | 0.9 | 198.5 | yes, 6.3 px of margin |
| 0.05 | 0.95 | 209.6 | no, overflows by 4.8 px |

`pwa-assets.config.ts` changes to maskable `padding: 0.1` and apple `padding: 0`. Apple gets 0 because the source already is a black rounded square and iOS masks its own corners. Manifest `background_color` and `theme_color` stay `#000000`.

Generated set, unchanged in names and sizes: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. All regenerated with `npm run icons` (the existing script). After generating, the implementer overlays a 204.8 px circle on the maskable PNG in the Browser pane and screenshots it; the screenshot goes in the PR.

**Favicon at 16 and 32 px.** The palm stays unless it turns to noise. The check is a screenshot of `favicon.ico` rendered at 16 and 32 px in the Browser pane. If the palm is noise, the fallback is a second generator config: `pwa-assets.config.favicon.ts` pointing at `assets/favicon-source.svg` (a copy of the drawing with the palm group removed, kept outside `public/` so it is never served), run by a second npm script that emits `favicon.ico` only. `icon.svg` and every PNG keep the palm. Decided at implementation time from the screenshot, not in advance; if the 16 px check passes, neither file is created.

**GitHub org avatar.** The same `pwa-512x512.png` is uploaded as the `rookdex` org avatar. Manual step for Malin, listed in the plan.

## 6. Type

### 6.1 Roles

| Role | Face | Weight | Where |
|---|---|---|---|
| Wordmark | Bebas Neue | 400 | `ROOKDEX` next to the mark; header, hub lockup, OG banner |
| Display number | Bebas Neue | 400 | The hub countdown number alone, inside `.days-number` (section 7). Nothing else |
| Headings | DM Sans | 600 | `h1`–`h6` everywhere, including guide pages |
| Stats digits | DM Sans | 600, `font-variant-numeric: tabular-nums` | Stats rail totals and percentages |
| Body and UI | Inter | 400 and 600 | Unchanged |

Bebas Neue is a caps face; the wordmark is written in caps in the source and rendered as-is, and the display number has no letters to transform. No `text-transform` anywhere. Letter-spacing on the wordmark is `0.04em`.

The wordmark is the literal string `ROOKDEX` in the markup, not `s.siteName` uppercased. The site name is prose ("Rookdex", one capital) and the wordmark is a brand element; deriving one from the other would tie a translated string to a drawing. This is the one place all caps is allowed, and section 9.1's caps rule reads that way.

The hub `h1` becomes the lockup (mark plus wordmark) with the accessible name "Rookdex"; that is the only heading in the display face, because it is the wordmark, not a heading.

### 6.2 Self-hosting

Two new dependencies, pinned like Inter: `@fontsource/bebas-neue` (400 only) and `@fontsource-variable/dm-sans`. `Base.astro` imports both package CSS files the way it imports Inter; the package CSS carries `unicode-range`, so the browser only downloads the subsets a page uses.

`<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Bebas Neue latin file only, because the wordmark is in every header. DM Sans and Inter load through the CSS as now.

The preload `href` is never written by hand. Astro emits the face as `_astro/<name>.<hash>.woff2`, so `Base.astro` imports the URL and uses it:

```astro
import bebasLatin from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url"
…
<link rel="preload" as="font" type="font/woff2" crossorigin href={bebasLatin} />
```

A hardcoded path would give a 404 on the preload and a second, real download of the same file. The check is the network panel on a cold load of the hub: exactly one request for the Bebas file, and no 404.

**First paint of the wordmark.** Fontsource ships `font-display: swap` and the `Impact` fallback does not exist on Android, so the first paint of `ROOKDEX` is DM Sans or Inter at `0.04em` and then snaps to Bebas Neue. I accept the swap rather than add a metric-adjusted fallback face; the lockup is 24 px in the header and the shift is small. The size of the shift is measured once in the Browser pane and the numbers go in the PR, so a later decision has something to argue from.

**DM Sans tabular figures** must be verified at build: render `0123456789` twice in DM Sans 600 with `tabular-nums` on and off and compare widths in the Browser pane. If the face has no `tnum` table, the whole `.progress-label` row reverts to `--font-sans` (Inter has `tnum`), label and count together, so a DM Sans label never sits beside Inter digits on one line. The plan includes this check as a task with a recorded result.

### 6.3 Precache trim

`integrations/precache.mjs` today lists every file in `dist/`, so all Inter subsets are precached. New rule in `precacheUrls`: a `.woff2` under `_astro/` is precached only if its file name contains `-latin-` and not `-latin-ext-`. That keeps three files: Inter latin variable (48 KB), DM Sans latin variable and Bebas Neue latin 400. The other subsets stay in the build and load on demand online. This closes the 1b follow-up about the seven Inter subsets. The precache test gains a case for the filter.

Second rule in the same place: `og.*` joins the `SKIP` list next to `404.html`, `sw.js`, `_headers` and `_redirects`. The banner is fetched by crawlers, never by the app, so precaching it would put back most of what the font filter just saved. The precache test gains a case for that too.

Budget: the three latin files together stay under 120 KB; the two new faces together under 70 KB. The font filter removes 170,256 B from today's 639,718 B build, and no brand image is allowed to give that back: nothing this spec adds to the precache is an image, and `og.png` stays under 300 KB on disk. All four numbers are measured in the PR.

## 7. Lockups

- **Site header.** `Mark` at 24 px, then `ROOKDEX` in the display face at 1.25rem, `--text`, letter-spacing `0.04em`, gap `--space-2`. The whole lockup is the existing `.brand` link. Minimum height stays `--tap`. The mark carries the header glow through `filter: var(--glow-filter)`; the wordmark never glows.
- **Hub `h1`.** The same lockup at mark 48 px and wordmark 2.5rem on phones, mark 64 px and 3.5rem from 768 px. Text alternative "Rookdex".
- **Countdown.** `.days` is a whole localised sentence ("12 days to go", "Dag 12 etter lansering"), so it does not go into the display face: set in caps at hero size it would shout a full sentence and wrap on a 375 px phone. `Countdown.tsx` splits the number out into `<span className="days-number">`, built from the same `fill()` call so the translation keeps control of word order. Only `.days-number` uses `--font-display`, at 4rem on phones and 6rem from 768 px, `--text`, with `text-shadow: var(--glow)`. The rest of the sentence and the units row below stay in Inter at the current size. The `aria-live="polite"` region stays exactly where it is, on the `<p class="days">` that holds both parts, so the launch flip is still announced as one sentence. Hiding the seconds unit under reduced motion was listed as a 1b follow-up; it is already in `Countdown.tsx` and only needs verifying in the reduced-motion screenshot, not building again.
- **Progress bar.** `.bar-fill` background becomes `var(--gradient)`. The glow is `box-shadow: var(--glow)` on the `.bar` wrapper of the overall bar only, selected as `.progress:has(> .progress-label > #progress-overall) .bar`, not on `.bar-fill`: `.bar` has `overflow: hidden` so that it can clip the fill's rounded end, and that clips a shadow on the fill too. The per-category bars in the stats rail have no glow. There is no separate hub progress bar; `#progress-overall` in the stats rail is the overall one.
- **Footer.** Unchanged: the disclaimer, contact and licence lines stay as built; no logo in the footer.

## 8. OG banner and social preview

One shipped file, `public/og.png`, 1200 × 630, PNG, under 300 KB. Its source is `docs/brand/og.html`: an HTML page with the banner as an inline 1200 × 630 SVG, text as text so it can be edited. The source lives under `docs/` and not in `public/`, because a file in `public/` is copied to the build verbatim and would be served, precached and crawlable for no reason.

It has to be an HTML page rather than a bare SVG file for two reasons. The built faces live at `dist/_astro/<name>.<hash>.woff2` and the hash changes on every build, so nothing may hardcode that path; the page instead loads the site's own built stylesheet (or, running against `astro dev`, the fontsource package CSS), which brings the `@font-face` rules with it. And a bare SVG document gets the browser's default page margin, which puts the render off by a few pixels in both axes.

The render recipe, which goes in the plan step by step: start the dev server, open `docs/brand/og.html` through the server URL in the Browser pane (never `file://`), `resize_window` to exactly 1200 × 630 with the page's own margin zeroed, screenshot at device pixel ratio 1, assert the returned image is 1200 × 630 before saving it as `public/og.png`. The PNG is regenerated whenever the source changes and the PR shows both.

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

Fonts: the page picks up Bebas Neue and DM Sans from the stylesheet it loads, so the render matches the site without any path being written into the source. No Google Fonts import anywhere in the repo; the mockup's import was mockup-only.

The same PNG is uploaded as the GitHub repository social preview (manual, Malin).

**Note handed to the SEO spec:** use `twitter:card=summary_large_image`. The centre-square crop of `summary` slices the wordmark. Both locales point `og:image` at the one English banner.

## 9. Copy and tone

### 9.1 Rules for both languages

- Plain, present tense, second person. No hype, no exclamation marks, no emoji.
- Tier vocabulary is fixed and used everywhere the same way: **confirmed**, **expected**, **rumour**. Never "leaked", never a leak source, never "rumoured to be confirmed".
- "Rookdex" with one capital in prose. All caps only inside the wordmark.
- "GTA VI" in prose. "GTA 6" appears once, in meta, for search (SEO spec).
- Leonida, Vice City and character names are fine in guide and news text. None of them ever appear in a brand element: not in the wordmark, the mark, the banner, the manifest or the icon. "GTA VI" is the exception and is deliberate: it is descriptive use, it is what the brand line says ("The open-source GTA VI companion."), and it is what tells a reader what the site is for.
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
	--glow-filter: …;
}
```

Rules:

- A theme may override any token in section 4.1 and only those. It may not add selectors, change fonts or touch layout tokens; if a theme needs that, it is not a theme.
- `--tier-confirmed` and `--tier-expected` are overridable separately so a theme can keep the accent and still swap tier colours.
- Each theme ships with its own contrast table like 4.3 in its PR. Light mode is such a theme and needs a new pink and a new cyan.
- **Applying the attribute.** The profile store is IndexedDB and asynchronous, so it cannot set the attribute before first paint. The store mirrors the active theme name into `localStorage` under `rookdex:theme` whenever it changes, and a small script at the top of `<head>` in `Base.astro` reads that key and sets `data-theme` synchronously. It must be `<script is:inline>`: a plain `<script>` is bundled by Astro into an external module and runs after first paint, which is exactly the flash the script exists to prevent. Astro's CSP support hashes an `is:inline` script into `script-src`, so the live policy stays intact and no `'unsafe-inline'` is needed.
- **The script validates before it trusts.** `localStorage` is writable by anything running on the origin, so the script compares the stored value against a hardcoded array of shipped theme names and sets `data-theme` only on an exact match; anything else, including a missing key, removes the attribute and leaves the brand. No string from storage is ever written into the DOM unchecked.
- **Lifecycle of `rookdex:theme`.** It is a device preference, not profile data: one key, the active theme name, written by the store when the theme changes. It is not part of an export and is ignored on import, so moving profiles between devices never drags a theme along. It is removed when the last profile is deleted, in the same purge that clears the rest of the device state.
- This is phase 2 work; at launch there is no theme, no key and no script. The design is recorded here so phase 2 does not have to rediscover it.

## 11. Component impact

Files this spec changes, so the plan can be written against them:

| File | Change |
|---|---|
| `src/styles/tokens.css` | Section 4.1 verbatim |
| `src/styles/global.css` | `a` uses `--link` and is underlined; headings use `--font-heading` 600; `.brand` becomes the lockup; `.bar-fill` uses `--gradient` and the overall `.bar` gets the glow; `.days-number` uses `--font-display`; `.tier[data-status]` uses the tier tokens; glow hooks per section 4.2 |
| `src/layouts/Base.astro` | Font imports and the Bebas preload through the `?url` import (section 6.2); the `Mark` component in `.brand` |
| `src/components/Mark.astro` | New, section 5.2 |
| `src/pages/[locale]/index.astro` | `h1` becomes the lockup |
| `src/islands/Countdown.tsx` | Component change, not just styling: the number is split out of the sentence into `<span className="days-number">`, the live region unchanged (section 7) |
| `src/islands/tracker/ItemList.tsx` | The tier `<span>` gains `data-status={item.status}` so the two tier tokens can reach it; the text it renders is unchanged |
| `src/islands/tracker/StatsRail.tsx` | No change. The inline `width` is written through the CSSOM after mount, so no `style` attribute is ever served and the live policy does not govern it |
| `public/icon.svg` | Section 5.1 |
| `pwa-assets.config.ts` | Section 5.3 |
| `public/*.png`, `favicon.ico` | Regenerated |
| `docs/brand/og.html`, `public/og.png` | New, section 8 |
| `public/manifest.webmanifest` | No change (colours stay black) |
| `integrations/precache.mjs` | Section 6.3: the latin-only font filter and the `og.*` skip |
| `package.json` | Two font packages |
| `README.md` | A short brand paragraph: the licence of the mark and banner (see 14) and where the tokens live |
| `LICENSE` | A scope line above the MIT grant naming the excluded brand paths (see 14) |

Everything with a class name keeps its class name; the tracker tests do not change. Snapshot-free: the visual result is checked in the Browser pane per the loadout's visual-correctness rules (same height and bottom edge on control rows, labels distinct from values), with screenshots in the PR.

## 12. Accessibility, motion and CSP hygiene

- Every text pair in 4.3 meets AA; the pairs used for body text meet AAA. That includes the pairs on raised chrome, because menus, modals and cards sit on `--bg-raised`, not on `--bg`.
- Focus rings stay 2 px pink with 2 px offset on every background. On a pink surface the ring is `--text` instead, so it stays visible. The pink surfaces are exactly three: `.skip`, `.actions .primary` and `.chips button[aria-pressed="true"]`. That list is the whole exception to "pink is focus"; a fourth pink surface means editing this line.
- `prefers-reduced-motion: reduce` clears both glow tokens (`--glow` and `--glow-filter`, which together cover the header mark, the overall bar and the countdown number) and the progress-bar transition. The countdown seconds unit is already hidden under reduced motion and stays that way; it is verified in the screenshot, not rebuilt.
- The mark is `aria-hidden` in-page. The visible wordmark string is `ROOKDEX`; some screen readers spell an all-caps word letter by letter, so the header link and the hub `h1` carry `aria-label="Rookdex"`. The label matches the visible text case-insensitively, which satisfies the label-in-name rule.
- The CSP is live today (section 1), so the brand has to stay inside it rather than plan for it. The rule: brand CSS ships in `src/styles/*.css` or in an Astro `<style>` block, which Astro hashes into `style-src`; no `style=` attribute is ever written into markup, because the policy has no `'unsafe-inline'`. The two self-hosted faces are already covered by `font-src 'self'`, and this spec adds no script at all. The one script the brand will eventually need is the phase-2 theme script, and section 10 says how it stays policy-clean.
- Links are underlined everywhere, so colour is never the only cue.

## 13. Testing

Automated, in the existing Vitest run:

1. **No raw hex outside the allowlist.** A test reads every file under `src/` and fails on `#[0-9a-fA-F]{3,8}` in CSS, Astro and TSX files. The allowlist is `src/styles/tokens.css` and the single `<meta name="theme-color" content="#000000" />` line in `src/layouts/Base.astro`, which has to be a literal because a browser chrome colour cannot read a custom property. `Mark.astro` needs no exception: its fills are tokens (5.2). `public/` and `docs/` are not scanned.
2. **Token set.** A test parses `tokens.css` and asserts the exact token names from 4.1 exist on `:root`, and that no other file declares a `--` custom property on `:root`. Counts, not presence: every name appears once, except `--glow` and `--glow-filter`, which appear twice each because the reduced-motion block redeclares them.
3. **Mark parity.** The `d` attributes of the paths in `public/icon.svg` and `src/components/Mark.astro`, in order, are identical after whitespace normalisation. Fills are not compared: they differ by design (5.2), and the icon file has a background rect the component does not.
4. **Precache filter.** The rule matches on the basename, not on a substring of the whole URL, because Astro's base64url hashes can themselves contain `-`: the pattern is `/^[^.]*-latin-(?!ext-)/` against the part before the first dot. `precacheUrls` keeps `_astro/inter-latin-wght-normal.HASH.woff2`, drops `_astro/inter-cyrillic-wght-normal.HASH.woff2` and `_astro/inter-latin-ext-wght-normal.HASH.woff2`, and drops `og.png`.
5. **Contrast.** A test computes every ratio in 4.3 from the token values, raised-surface pairs included, and fails below the stated thresholds, so a future theme PR that edits `:root` by mistake is caught.
6. **Copy rules.** The existing brand-token id test stays. A new test imports `src/i18n/*.ts` and walks the exported string values rather than scanning the file text, so code and comments are out of scope, and matches with word boundaries so "bleak" does not count as "leak". It fails on "leak", "leaked" or "lekk" as whole words, and on an exclamation mark in any string.

Manual, screenshots in the PR: maskable overlay circle; favicon at 16 and 32; header lockup on phone and desktop; hub hero at 375 and 1024 px; `docs/brand/og.html` rendered and asserted at 1200 × 630, then the saved PNG against the right-edge numbers; the Bebas preload showing one request and no 404; reduced-motion emulation showing no glow and no seconds; DM Sans `tnum` width comparison; the wordmark's first-paint swap measured once.

## 14. Licence of the brand assets

Code is MIT and guides are CC BY-SA (product spec). The mark, wordmark lockup and banner are **not** under either: the README states that the Rookdex name, mark and banner may be used to link to or talk about Rookdex, and not to present another project as Rookdex. This matches how most open-source projects treat their logo and keeps the neutral-brand posture from the product spec meaningful.

The README alone is not enough, because `LICENSE` today is a plain MIT grant over "the Software" with nothing carved out, and a plain reading of it hands the mark to anyone. `LICENSE` gains a scope line above the MIT text naming the excluded paths: `public/icon.svg`, `src/components/Mark.astro`, `docs/brand/og.html`, `public/og.png` and the generated icons (`public/pwa-*.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`). Everything else in the repo stays MIT, unchanged. The README paragraph then explains in plain words what that scope line means in practice.

## 15. Handed to other specs

- SEO spec: `og:image`, `twitter:card=summary_large_image`, "GTA 6" once in meta, descriptions.
- Security spec: `_headers` additions. The CSP is not handed over: it already ships (section 1) and the brand stays inside it (section 12).
- Phase 2: themes (section 10), light mode, store listing art, `rookdex:theme` mirror and the inline script.
- Workbench: once this ships, the token set and `Mark` pattern go into the `web-astro-react` scaffold extraction.
