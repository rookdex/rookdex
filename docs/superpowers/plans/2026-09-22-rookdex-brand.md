# Rookdex brand implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder accent and rook mark with the final Rookdex brand: tokens, the M2 mark, Bebas Neue wordmark and display number, DM Sans headings, the regenerated icon set, the OG banner, the precache trim, and the tests that keep all of it honest.

**Architecture:** Everything visual flows from `src/styles/tokens.css`; components read tokens and never hex. The mark exists twice on purpose: `public/icon.svg` with literal hex (icon generator input) and `src/components/Mark.astro` with tokens (in-page, theme-able), kept in step by a parity test. The banner is an HTML source under `docs/brand/` rendered to `public/og.png` through a tiny dev-only server. No markup gets a `style=` attribute, because the shipped CSP has no `'unsafe-inline'`.

**Tech Stack:** Astro 7 static, React 19 islands, Vitest 5 (jsdom for islands, node for file tests), Biome 2, `@vite-pwa/assets-generator` 1.0.2, Fontsource 5.3.0 packages, Node 26.

**Spec:** `docs/superpowers/specs/2026-09-21-rookdex-brand-design.md` (sections cited as §N below). Stress test: `docs/superpowers/specs/2026-09-21-rookdex-brand-stress-test.md`.

## Global Constraints

- **No raw hex** (`#[0-9a-fA-F]{3,8}`) in any `.css`, `.astro` or `.tsx` under `src/` except `src/styles/tokens.css` and the one line `<meta name="theme-color" content="#000000" />` in `src/layouts/Base.astro` (§4.2, §13.1). `public/` and `docs/` are not scanned.
- **Components never hardcode black or white.** Black is `var(--bg)`, white is `var(--text)` (§4.2).
- **No `style=` attribute in any markup.** Brand CSS lives in `src/styles/*.css` or an Astro `<style>` block (§12). The one existing inline style is React's `style={{ width }}` in `StatsRail.tsx`, which goes through the CSSOM and stays.
- **No `text-transform` anywhere for the wordmark or display number.** The wordmark is the literal string `ROOKDEX` in markup, never `s.siteName` uppercased (§6.1).
- **Wordmark letter-spacing `0.04em`; wordmark always `--text`, never glows.** The mark carries the colour (§7).
- **Glow only on three things:** the header mark (`filter: var(--glow-filter)`), the overall progress bar's `.bar` (`box-shadow: var(--glow)`), the countdown number (`text-shadow: var(--glow)`). Never inside `.item-list`, `.menu`, `.modal` or guide bodies (§4.2). Both tokens become `none` under `prefers-reduced-motion: reduce` in `tokens.css`, so no component repeats the media query.
- **Cyan `--link` has three jobs only:** links (always underlined, `text-underline-offset: 0.15em`), the "expected" tier label, the horizon bar in the mark (§4.2).
- **Orange `--accent-2` never alone.** Only as the far end of `--gradient` (progress fill, one hero stripe, the banner stripe) (§4.2).
- **Focus ring** stays `2px solid var(--accent)` with `2px` offset; on the three pink surfaces `.skip`, `.actions .primary`, `.chips button[aria-pressed="true"]` it is `var(--text)` (§12).
- **Copy:** tier words `confirmed` / `expected` / `rumour`; never "leak", "leaked", "lekk"; no exclamation marks; "Rookdex" with one capital in prose; "GTA VI" in prose (§9).
- **Nothing from Rockstar:** no logo styling, no "VI" numeral as a design element, no key-art poses, no trailer frames, no leak material (§3).
- **Class names stay.** The tracker tests do not change (§11).
- **Font packages pinned exact** like Inter: `@fontsource/bebas-neue@5.3.0`, `@fontsource-variable/dm-sans@5.3.0` (§6.2). `npm install` is gated by Malin's "ask before installing packages" rule: the controller asks once before Task 2 unless she has already said "do all the tasks".
- **Budgets (§6.3, §8):** the three precached latin `.woff2` together under 120 KB; the two new faces together under 70 KB; `public/og.png` under 300 KB on disk. All measured in Task 11 and written into the PR.
- **Tooling traps (from the project memory):** run tests with `npx vitest run` (the harness refuses `npm test`); format only the files you touched with `npx biome check --write <files>` (never `.`, it rewrites the line endings of unrelated CRLF-checked-out files); `core.autocrlf` is `true`, so a file Biome refuses to format is usually CRLF and needs `LF` first; the Browser pane cannot register the service worker, so never judge offline behaviour in it.
- **Commits:** imperative subject, no body needed, no `Co-Authored-By` or AI attribution trailer.

## Plan decisions (not spelled out in the spec)

- **`Mark.astro` colours go through a scoped `<style>` block with class selectors** (`.top`, `.bottom`, `.horizon`, `.ink`, `.trunk`), not through `fill="var(--accent)"` presentation attributes. Both are CSP-clean; the `<style>` route is the one every browser handles identically and keeps the hex test trivially clean.
- **`Mark.astro` takes an `id` prop** used as the prefix for its `<linearGradient>` and `<clipPath>` ids, because the header and the hub render two marks on one page and duplicate ids are invalid HTML.
- **The countdown number is split on the `{n}` placeholder** of the template string, not by a `fill()` call: `template.split("{n}")` gives the text before and after the number, so the translation still owns word order (§7 wants exactly that guarantee). `oneDayToGo` gains the placeholder (`"{n} day to go"`, `"{n} dag igjen"`) so the evening-before line also gets the display number.
- **`.progress-label` label span is `--text-muted`, the count stays `--text`.** §11 asks the Browser-pane check to confirm "labels distinct from values" (the loadout rule); without this the label and the count are the same ink on one line. The whole row is one face (DM Sans 600) as §6.2 requires.
- **The banner glow filter sits on the sun disc only**, not on the whole mark group: `feDropShadow` follows the alpha of its input, and a filter on the group would put a pink halo around the black palm where the trunk leaves the disc.
- **The banner is rendered in-page** (fonts embedded as data URLs into a copy of the SVG, drawn on a 1200 × 630 canvas, posted to a dev-only Node server that writes `public/og.png`). Reason: the Browser pane returns screenshots to the model, it cannot save them to disk, and an SVG drawn into a canvas cannot see page fonts unless they are embedded.
- **Screenshots in the PR (§13 manual list):** the Browser pane cannot save a screenshot to disk, so every manual check records its measured numbers in the PR body and the implementer's screenshot is reviewed in-session. Malin can attach images from her own browser if she wants them on the PR.
- **Reduced motion cannot be emulated in the Browser pane** (it emulates colour scheme only). The reduced-motion behaviour is covered by the token test (Task 1) and a human check on the OS setting (Task 11's list for Malin).
- **Not built here, by choice:** §3's optional secondary flavour (a stepped art-deco divider between hub sections, a louder launch-week hero with a gradient stripe). §11's file table does not list them and they are one-place flavour; add them in a follow-up if wanted.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/styles/tokens.css` | 1 | The brand: every token, the reduced-motion glow reset |
| `src/styles/tokens.test.ts` | 1 | Token set, contrast, no-raw-hex tests (§13.1, .2, .5) |
| `package.json`, `package-lock.json` | 2 | Two font packages |
| `src/layouts/Base.astro` | 2, 4 | Font imports, Bebas preload via `?url`, header lockup |
| `integrations/precache.mjs`, `precache.test.ts` | 2 | Latin-only font filter, `og.*` skip (§6.3, §13.4) |
| `public/icon.svg` | 3 | App icon, literal hex, background rect (§5.1, §5.2) |
| `src/components/Mark.astro` | 3 | In-page mark, tokens, no background (§5.2) |
| `src/components/Mark.test.ts` | 3 | Path parity with the icon (§13.3) |
| `src/styles/global.css` | 4, 5, 6 | Links, headings, lockups, focus exceptions, display number, tiers, progress bar |
| `src/pages/[locale]/index.astro` | 4 | Hub `h1` becomes the lockup |
| `src/islands/Countdown.tsx`, `Countdown.test.tsx` | 5 | Display number split out of the sentence |
| `src/i18n/en.ts`, `src/i18n/no.ts` | 5 | `oneDayToGo` gets `{n}` |
| `src/islands/tracker/ItemList.tsx` | 6 | `data-status` on the tier span |
| `pwa-assets.config.ts`, `public/*.png`, `public/favicon.ico` | 7 | Maskable padding 0.1, apple 0, regenerated set |
| `docs/brand/og.html`, `docs/brand/serve.mjs`, `public/og.png` | 8 | Banner source, render server, shipped banner |
| `src/i18n/copy.test.ts` | 9 | Copy rules over the exported strings (§13.6) |
| `README.md`, `LICENSE` | 10 | Brand paragraph, licence scope line (§14) |

---

### Task 1: Tokens and the three token tests

**Files:**
- Modify: `src/styles/tokens.css` (whole file)
- Create: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: the token names every later task uses: `--bg --bg-raised --border --text --text-muted --accent --accent-text --accent-2 --gradient --link --tier-confirmed --tier-expected --glow --glow-filter --font-sans --font-heading --font-display --space-1..6 --radius --measure --tap`.

- [ ] **Step 1: Write the failing tests**

Create `src/styles/tokens.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const srcDir = fileURLToPath(new URL("../", import.meta.url))
const tokensCss = readFileSync(join(srcDir, "styles/tokens.css"), "utf8")

/** Files under src/ with one of the extensions, as posix paths relative to src/. */
function srcFiles(extensions: string[]): string[] {
	return readdirSync(srcDir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
		.map((entry) => relative(srcDir, join(entry.parentPath, entry.name)).split(sep).join("/"))
		.sort()
}

function tokenValue(name: string): string {
	const match = tokensCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6});`))
	if (!match) throw new Error(`${name} is not a hex token in tokens.css`)
	return match[1]
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
	const channel = (offset: number) => {
		const v = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

describe("token set (spec §4.1)", () => {
	it("declares exactly the brand tokens, each once, the glow pair twice", () => {
		const counts: Record<string, number> = {}
		for (const match of tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) {
			counts[match[1]] = (counts[match[1]] ?? 0) + 1
		}
		expect(counts).toEqual({
			"--bg": 1,
			"--bg-raised": 1,
			"--border": 1,
			"--text": 1,
			"--text-muted": 1,
			"--accent": 1,
			"--accent-text": 1,
			"--accent-2": 1,
			"--gradient": 1,
			"--link": 1,
			"--tier-confirmed": 1,
			"--tier-expected": 1,
			"--glow": 2,
			"--glow-filter": 2,
			"--font-sans": 1,
			"--font-heading": 1,
			"--font-display": 1,
			"--space-1": 1,
			"--space-2": 1,
			"--space-3": 1,
			"--space-4": 1,
			"--space-5": 1,
			"--space-6": 1,
			"--radius": 1,
			"--measure": 1,
			"--tap": 1,
		})
	})

	it("clears both glow tokens under reduced motion", () => {
		expect(tokensCss).toMatch(
			/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{\s*--glow: none;\s*--glow-filter: none;\s*\}\s*\}/
		)
	})

	it("is the only file that declares tokens on :root", () => {
		const others = srcFiles([".css", ".astro"]).filter((f) => f !== "styles/tokens.css")
		for (const file of others) {
			expect(readFileSync(join(srcDir, file), "utf8"), file).not.toContain(":root")
		}
	})
})

describe("no raw hex outside tokens.css (spec §13.1)", () => {
	const themeColorLine = '<meta name="theme-color" content="#000000" />'

	it("scans css, astro and tsx under src/", () => {
		const files = srcFiles([".css", ".astro", ".tsx"]).filter((f) => f !== "styles/tokens.css")
		expect(files.length).toBeGreaterThan(10)
		for (const file of files) {
			let text = readFileSync(join(srcDir, file), "utf8")
			if (file === "layouts/Base.astro") {
				expect(text, "the theme-color line must stay literal").toContain(themeColorLine)
				text = text.replace(themeColorLine, "")
			}
			expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
		}
	})
})

describe("contrast (spec §4.3)", () => {
	it.each([
		["--text", "--bg", 7],
		["--text-muted", "--bg", 7],
		["--text-muted", "--bg-raised", 7],
		["--accent", "--bg", 4.5],
		["--accent", "--bg-raised", 4.5],
		["--accent-text", "--accent", 4.5],
		["--accent", "--border", 3],
		["--link", "--bg", 7],
		["--link", "--bg-raised", 7],
		["--accent-2", "--bg", 4.5],
	])("%s on %s is at least %s:1", (fg, bg, minimum) => {
		expect(contrast(tokenValue(fg), tokenValue(bg))).toBeGreaterThanOrEqual(minimum)
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: the token-set test fails (no `--gradient`, `--link`, glow or font tokens yet), the reduced-motion test fails, the contrast rows for `--accent-2`, `--link` and the accent pairs fail with "is not a hex token". The hex scan and the `:root` test pass already.

- [ ] **Step 3: Replace `src/styles/tokens.css` with §4.1 verbatim**

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

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: all pass. The measured ratios (for the PR, from `node -e` if you want to print them) are text 18.76, muted 8.33 / 7.70, accent 6.24 / 5.77, accent-text 5.64, accent-on-border 4.49, link 13.17 / 12.19, accent-2 8.95.

- [ ] **Step 5: Format, run the whole suite, commit**

Run: `npx biome check --write src/styles/tokens.css src/styles/tokens.test.ts && npx vitest run`
Expected: Biome clean, every existing test still green (the old accent was only ever read through `var(--accent)`).

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts
git commit -m "Land the brand tokens with token, hex and contrast tests"
```

---

### Task 2: Fonts, the Bebas preload and the precache trim

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Modify: `src/layouts/Base.astro:1-2` (imports) and `:34` (head, preload)
- Modify: `integrations/precache.mjs`
- Modify: `integrations/precache.test.ts`

**Interfaces:**
- Produces: `shouldPrecache(file: string): boolean` exported from `integrations/precache.mjs`; the `@font-face` families `"Bebas Neue"` and `"DM Sans Variable"` available on every page.

- [ ] **Step 1: Install the two faces (gated: ask Malin first unless already authorised)**

Run: `npm install --save-exact @fontsource/bebas-neue@5.3.0 @fontsource-variable/dm-sans@5.3.0`
Expected: `package.json` `dependencies` gains both lines, exact versions, sorted by Biome later. Verify the files the plan relies on exist:

```bash
ls -la node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2 node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2
```
Expected: two files, 13.8 KB and 36.9 KB. Together with Inter latin (48 KB in `dist/_astro/`) that is 98.7 KB, inside the 120 KB budget; the two new ones are 50.7 KB, inside 70 KB.

- [ ] **Step 2: Write the failing precache tests**

Append to `integrations/precache.test.ts` inside `describe("precacheUrls", …)`:

```ts
	it("precaches only the latin subset of each face, matched on the basename (spec §13.4)", () => {
		expect(
			precacheUrls([
				"_astro/inter-latin-wght-normal.Dx4kXJAl.woff2",
				"_astro/inter-cyrillic-wght-normal.DqGufNeO.woff2",
				"_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2",
				"_astro/bebas-neue-latin-400-normal.Ab-12cd_.woff2",
				"_astro/bebas-neue-latin-ext-400-normal.Ef34ghI-.woff2",
				"_astro/dm-sans-latin-wght-normal.Jk56lmN_.woff2",
			])
		).toEqual([
			"/_astro/bebas-neue-latin-400-normal.Ab-12cd_.woff2",
			"/_astro/dm-sans-latin-wght-normal.Jk56lmN_.woff2",
			"/_astro/inter-latin-wght-normal.Dx4kXJAl.woff2",
		])
	})

	it("never precaches the OG banner", () => {
		expect(precacheUrls(["og.png", "en/index.html"])).toEqual(["/en/"])
	})
```

Add a second describe block at the end of the file:

```ts
describe("shouldPrecache", () => {
	it("is the one predicate both the URL list and the version hash use", () => {
		expect(shouldPrecache("index.html")).toBe(true)
		expect(shouldPrecache("sw.js")).toBe(false)
		expect(shouldPrecache("og.png")).toBe(false)
		expect(shouldPrecache("_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2")).toBe(false)
	})
})
```

Update the import line to `import { precacheUrls, shouldPrecache } from "./precache.mjs"`.

- [ ] **Step 3: Run to see them fail**

Run: `npx vitest run integrations/precache.test.ts`
Expected: FAIL. `shouldPrecache` is not exported; the font case returns all six URLs; `og.png` is kept.

- [ ] **Step 4: Implement the filter in `integrations/precache.mjs`**

Replace the `SKIP` line and `precacheUrls`, and use the predicate in the hash loop:

```js
const SKIP = new Set(["404.html", "sw.js", "_headers", "_redirects"])
/** A face's latin subset, matched on the part of the basename before the first dot, because
 *  Astro's base64url hashes can contain "-" themselves. "-latin-ext-" is not "-latin-". */
const LATIN_FONT = /^[^.]*-latin-(?!ext-)/

/** Which built files the worker precaches: pages and assets, minus the worker's own files, the
 *  OG banner (crawlers only) and every non-latin font subset (they load on demand online). */
export function shouldPrecache(file) {
	if (SKIP.has(file)) return false
	if (/^og\./.test(file)) return false
	if (file.startsWith("_astro/") && file.endsWith(".woff2")) {
		return LATIN_FONT.test(file.slice("_astro/".length))
	}
	return true
}

/** Posix-relative file paths from dist/ → URLs the worker precaches. */
export function precacheUrls(files) {
	return files
		.filter(shouldPrecache)
		.map((file) => {
			if (file === "index.html") return "/"
			if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`
			return `/${file}`
		})
		.sort()
}
```

In `astro:build:done`, change `for (const file of files.filter((f) => !SKIP.has(f))) {` to `for (const file of files.filter(shouldPrecache)) {` so the version hash tracks exactly the precached set.

- [ ] **Step 5: Run to see them pass**

Run: `npx vitest run integrations/precache.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Wire the faces into `src/layouts/Base.astro`**

Frontmatter imports become:

```astro
---
import "@fontsource-variable/inter"
import "@fontsource-variable/dm-sans"
import "@fontsource/bebas-neue"
import bebasLatin from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url"
import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from "astro:i18n"
```

(Biome may reorder the side-effect imports; accept its order.) In `<head>`, directly after the `theme-color` meta line, add:

```astro
		<link rel="preload" as="font" type="font/woff2" crossorigin href={bebasLatin} />
```

The `?url` import is the whole point (§6.2): Astro emits the file as `_astro/bebas-neue-latin-400-normal.<hash>.woff2` and the same emitted asset serves both the `@font-face` in the package CSS and this preload. A hand-written path would 404.

- [ ] **Step 7: Type-check and build**

Run: `npm run check && npm run build`
Expected: `astro check` clean (Vite's client types declare `*?url`); the build log from `rookdex-precache` shows the URL count dropped by the non-latin Inter subsets (7 before, 3 fonts now: `inter-latin`, `dm-sans-latin`, `bebas-neue-latin-400`). Confirm:

```bash
ls dist/_astro | grep woff2
grep -o '"/_astro/[a-z-]*latin[^"]*woff2"' dist/sw.js
```
Expected: the `ls` shows every subset (they are still built and load on demand); the `grep` shows exactly three URLs, none with `latin-ext`.

- [ ] **Step 8: Check the preload in the Browser pane**

`preview_start` with `{name: "dev"}`, then `navigate` to `http://localhost:4321/en/`. Run `read_network_requests` with `urlPattern: "bebas"`. Expected: exactly one request for `bebas-neue-latin-400-normal…woff2`, status 200, no 404 anywhere with "bebas" in the URL. (In `astro dev` the URL is `/@fs/…` or `/node_modules/…` rather than `/_astro/…`; the count and status are what matter. Task 11 repeats this on the built site through `npm run preview`.)

- [ ] **Step 9: Format, run the suite, commit**

Run: `npx biome check --write integrations/precache.mjs integrations/precache.test.ts package.json && npx vitest run`
Expected: green.

```bash
git add package.json package-lock.json src/layouts/Base.astro integrations/precache.mjs integrations/precache.test.ts
git commit -m "Self-host Bebas Neue and DM Sans and precache only the latin subsets"
```

---

### Task 3: The mark, twice, and the parity test

**Files:**
- Modify: `public/icon.svg` (whole file)
- Create: `src/components/Mark.astro`
- Create: `src/components/Mark.test.ts`

**Interfaces:**
- Produces: `<Mark size={number} id={string} />` (`size` default 24, `id` default `"mark"`), rendering `<svg class="mark" aria-hidden="true">`. Task 4 uses `.mark` in CSS and passes `id="header"` / `id="hub"`.

- [ ] **Step 1: Write the failing parity test**

Create `src/components/Mark.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const icon = readFileSync(new URL("../../public/icon.svg", import.meta.url), "utf8")
const mark = readFileSync(new URL("./Mark.astro", import.meta.url), "utf8")

/** Every path `d` attribute in document order, whitespace-normalised (spec §13.3). */
function paths(svg: string): string[] {
	return [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, " ").trim())
}

describe("mark parity (spec §5)", () => {
	it("draws the same eight paths in the icon file and the component", () => {
		expect(paths(icon)).toHaveLength(8) // trunk + seven fronds
		expect(paths(mark)).toEqual(paths(icon))
	})

	it("keeps the crown at 312,214 and the foot at 352,404", () => {
		const [trunk, ...fronds] = paths(icon)
		expect(trunk).toBe("M352 404 C 344 340, 334 280, 312 214")
		for (const frond of fronds) expect(frond).toMatch(/^M312 214 Q .* 312 214 z$/)
	})

	it("keeps the icon file's title, role and background, and has no glow filter anywhere", () => {
		expect(icon).toContain('<title id="t">Rookdex</title>')
		expect(icon).toContain('role="img"')
		expect(icon).toContain('<rect width="512" height="512" rx="96" fill="#000000"')
		expect(icon).not.toContain("<filter")
		expect(mark).not.toContain("<filter")
		expect(mark).not.toContain("<rect width=\"512\"")
		expect(mark).toContain('aria-hidden="true"')
	})
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/components/Mark.test.ts`
Expected: FAIL. `Mark.astro` does not exist; the icon has one rook path, not eight.

- [ ] **Step 3: Replace `public/icon.svg`**

Literal hex on purpose (§5.2): this file is served verbatim and is the generator input.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="t">
	<title id="t">Rookdex</title>
	<defs>
		<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ff3d81"/>
			<stop offset="1" stop-color="#ff8a3d"/>
		</linearGradient>
		<clipPath id="disc"><circle cx="256" cy="236" r="150"/></clipPath>
	</defs>
	<rect width="512" height="512" rx="96" fill="#000000"/>
	<circle cx="256" cy="236" r="150" fill="url(#sun)"/>
	<g fill="#000000" clip-path="url(#disc)">
		<rect x="0" y="262" width="512" height="12"/>
		<rect x="0" y="298" width="512" height="18"/>
		<rect x="0" y="342" width="512" height="26"/>
	</g>
	<rect x="96" y="398" width="320" height="14" rx="7" fill="#22e0ff"/>
	<g fill="#000000">
		<path d="M352 404 C 344 340, 334 280, 312 214" fill="none" stroke="#000000" stroke-width="24" stroke-linecap="round"/>
		<path d="M312 214 Q 236 156 178 190 Q 244 192 312 214 z"/>
		<path d="M312 214 Q 208 208 168 262 Q 250 228 312 214 z"/>
		<path d="M312 214 Q 386 152 446 184 Q 380 190 312 214 z"/>
		<path d="M312 214 Q 412 206 452 262 Q 372 228 312 214 z"/>
		<path d="M312 214 Q 236 246 224 316 Q 276 248 312 214 z"/>
		<path d="M312 214 Q 386 246 398 316 Q 346 248 312 214 z"/>
		<path d="M312 214 Q 300 140 332 104 Q 316 160 312 214 z"/>
	</g>
</svg>
```

- [ ] **Step 4: Create `src/components/Mark.astro`**

Same drawing, no background rect, tokens through a scoped `<style>`:

```astro
---
/**
 * The in-page mark (spec §5.2): the icon drawing without its background, coloured by tokens so a
 * theme can recolour it. public/icon.svg is the same drawing in literal hex; Mark.test.ts keeps
 * the two in step. No glow here: the header adds it with `filter: var(--glow-filter)`.
 */
interface Props {
	/** Rendered width and height in CSS pixels. */
	size?: number
	/** Prefix for the gradient and clip-path ids; unique per instance on a page. */
	id?: string
}
const { size = 24, id = "mark" } = Astro.props
const sun = `${id}-sun`
const disc = `${id}-disc`
---

<svg
	class="mark"
	width={size}
	height={size}
	viewBox="0 0 512 512"
	aria-hidden="true"
	focusable="false"
>
	<defs>
		<linearGradient id={sun} x1="0" y1="0" x2="0" y2="1">
			<stop class="top" offset="0"></stop>
			<stop class="bottom" offset="1"></stop>
		</linearGradient>
		<clipPath id={disc}><circle cx="256" cy="236" r="150"></circle></clipPath>
	</defs>
	<circle cx="256" cy="236" r="150" fill={`url(#${sun})`}></circle>
	<g class="ink" clip-path={`url(#${disc})`}>
		<rect x="0" y="262" width="512" height="12"></rect>
		<rect x="0" y="298" width="512" height="18"></rect>
		<rect x="0" y="342" width="512" height="26"></rect>
	</g>
	<rect class="horizon" x="96" y="398" width="320" height="14" rx="7"></rect>
	<g class="ink">
		<path class="trunk" d="M352 404 C 344 340, 334 280, 312 214"></path>
		<path d="M312 214 Q 236 156 178 190 Q 244 192 312 214 z"></path>
		<path d="M312 214 Q 208 208 168 262 Q 250 228 312 214 z"></path>
		<path d="M312 214 Q 386 152 446 184 Q 380 190 312 214 z"></path>
		<path d="M312 214 Q 412 206 452 262 Q 372 228 312 214 z"></path>
		<path d="M312 214 Q 236 246 224 316 Q 276 248 312 214 z"></path>
		<path d="M312 214 Q 386 246 398 316 Q 346 248 312 214 z"></path>
		<path d="M312 214 Q 300 140 332 104 Q 316 160 312 214 z"></path>
	</g>
</svg>

<style>
	.top {
		stop-color: var(--accent);
	}
	.bottom {
		stop-color: var(--accent-2);
	}
	.horizon {
		fill: var(--link);
	}
	.ink {
		fill: var(--bg);
	}
	.trunk {
		fill: none;
		stroke: var(--bg);
		stroke-width: 24;
		stroke-linecap: round;
	}
</style>
```

Why `.ink` is `--bg` and not "black": §4.2, components never hardcode black. On the raised header chrome the parts of the palm outside the sun disappear into the chrome, exactly as they disappear into the icon's black square.

- [ ] **Step 5: Run to see it pass**

Run: `npx vitest run src/components/Mark.test.ts src/styles/tokens.test.ts`
Expected: PASS. The hex scan stays green because `Mark.astro` carries no hex.

- [ ] **Step 6: Look at both drawings once**

`navigate` the Browser pane to `http://localhost:4321/icon.svg` and `computer` screenshot: a pink-to-orange sun with three black blinds, a cyan bar, a black palm offset right whose trunk reaches down past the bar. Then `zoom` on a 32 × 32 region after setting the image small with `javascript_tool`:

```js
document.querySelector("img").style.width = "16px"; document.querySelector("img").style.height = "16px"; "ok"
```
Expected at 16 px: a pink disc with a dark bite and a cyan line ("sun with a bite", §2). Note what you see for Task 7's favicon decision.

- [ ] **Step 7: Format and commit**

Run: `npx biome check --write src/components/Mark.test.ts` (Biome does not format `.astro` or `.svg`; check the Astro file by eye for tabs and double quotes.)

```bash
git add public/icon.svg src/components/Mark.astro src/components/Mark.test.ts
git commit -m "Draw the M2 mark as the app icon and as a token-coloured component"
```

---

### Task 4: Header lockup, hub lockup, links, headings and focus

**Files:**
- Modify: `src/layouts/Base.astro` (import `Mark`; the `.brand` link)
- Modify: `src/pages/[locale]/index.astro:3-5, 19` (import `Mark`; the `h1`)
- Modify: `src/styles/global.css:30-43` (`a`, headings), `:71-77` (`.brand`), plus new rules and the 768 px block

**Interfaces:**
- Consumes: `<Mark size id />` from Task 3; tokens from Task 1.
- Produces: classes `.wordmark` and `.lockup` used nowhere else; the `.brand .mark` glow hook.

- [ ] **Step 1: The header lockup in `src/layouts/Base.astro`**

Add to the frontmatter, next to the other component imports:

```astro
import Mark from "../components/Mark.astro"
```

Replace the `.brand` line in `<header class="site-header">` with:

```astro
			<a class="brand" href={getRelativeLocaleUrl(locale, "")} aria-label="Rookdex">
				<Mark id="header" />
				<span class="wordmark">ROOKDEX</span>
			</a>
```

`aria-label="Rookdex"` because some screen readers spell an all-caps word letter by letter; the label matches the visible text case-insensitively, which is what the label-in-name rule needs (§12). `s.siteName` is no longer used in the header; it is still used for `<title>`, leave the import alone.

- [ ] **Step 2: The hub `h1` in `src/pages/[locale]/index.astro`**

Add to the frontmatter:

```astro
import Mark from "../../components/Mark.astro"
```

Replace `<h1>{s.siteName}</h1>` with:

```astro
			<h1 class="lockup" aria-label="Rookdex">
				<Mark id="hub" size={48} />
				<span class="wordmark">ROOKDEX</span>
			</h1>
```

- [ ] **Step 3: Base CSS in `src/styles/global.css`**

Replace the `a`, `:focus-visible` and `h1, h2, h3` rules (lines 30–43) with:

```css
a {
	color: var(--link);
	text-decoration: underline;
	text-underline-offset: 0.15em;
}

:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

/* Pink is focus everywhere except on the three pink surfaces (spec §12). */
.skip:focus-visible,
.actions .primary:focus-visible,
.chips button[aria-pressed="true"]:focus-visible {
	outline-color: var(--text);
}

h1,
h2,
h3 {
	line-height: 1.2;
	margin: 0 0 var(--space-3);
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-family: var(--font-heading);
	font-weight: 600;
}
```

Replace the `.brand` rule (lines 71–77) with:

```css
.brand {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	color: var(--text);
	text-decoration: none;
}

/* The header mark is one of the three glow sites (spec §4.2). The wordmark never glows. */
.brand .mark {
	filter: var(--glow-filter);
}

.wordmark {
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 1.25rem;
	line-height: 1;
	letter-spacing: 0.04em;
	color: var(--text);
}

/* Hub h1: the same lockup, larger. It is the wordmark, not a heading, so the display face is right. */
.lockup {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin: 0 0 var(--space-3);
}

.lockup .wordmark {
	font-size: 2.5rem;
}
```

Inside the existing `@media (min-width: 768px)` block add:

```css
	.lockup .mark {
		width: 64px;
		height: 64px;
	}

	.lockup .wordmark {
		font-size: 3.5rem;
	}
```

- [ ] **Step 4: Build and type-check**

Run: `npm run check && npm run build && npx vitest run`
Expected: all clean. The hex test still passes (no hex added).

- [ ] **Step 5: Measure the header lockup in the Browser pane**

Reload `http://localhost:4321/en/` (dev server from Task 2). Run with `javascript_tool`:

```js
const svg = document.querySelector(".brand .mark").getBoundingClientRect()
const word = document.querySelector(".brand .wordmark")
const range = document.createRange(); range.selectNodeContents(word)
const glyphs = range.getBoundingClientRect()
const brand = document.querySelector(".brand").getBoundingClientRect()
;({ brandHeight: brand.height, markCentre: svg.top + svg.height / 2, glyphCentre: glyphs.top + glyphs.height / 2, markSize: svg.width, wordFont: getComputedStyle(word).fontFamily })
```
Expected: `brandHeight` ≥ 44; `markSize` 24; `wordFont` starts with `"Bebas Neue"`; `markCentre` and `glyphCentre` within 2 px of each other. If they are further apart, Bebas Neue's line box is sitting off its glyphs: add `padding-top` (in `em`, start at `0.05em`) to `.wordmark` until the two centres agree within 1 px, and record the final numbers for the PR. Then `resize_window` `{preset: "mobile"}`, reload, run the same snippet again (same expectations), and `computer` screenshot both sizes. Reset with `{preset: "desktop"}`.

- [ ] **Step 6: Measure the hub lockup**

Still on `/en/`, at mobile width and at `{width: 1024, height: 800}`:

```js
const m = document.querySelector(".lockup .mark").getBoundingClientRect()
const w = document.querySelector(".lockup .wordmark")
;({ mark: m.width, wordSize: getComputedStyle(w).fontSize, family: getComputedStyle(w).fontFamily, headingName: document.querySelector("h1").getAttribute("aria-label") })
```
Expected: mobile `mark` 48, `wordSize` 40px; 1024 `mark` 64, `wordSize` 56px; `headingName` "Rookdex". Also check one link (`.tap-links a`) is cyan and underlined: `getComputedStyle(document.querySelector(".tap-links a")).textDecorationLine` is `underline`, `color` is `rgb(34, 224, 255)`. Check one heading (`h2`) has `fontFamily` starting with `"DM Sans Variable"`.

- [ ] **Step 7: Format, commit**

Run: `npx biome check --write src/styles/global.css`

```bash
git add src/layouts/Base.astro "src/pages/[locale]/index.astro" src/styles/global.css
git commit -m "Set the header and hub lockups, cyan links and DM Sans headings"
```

---

### Task 5: The countdown display number

**Files:**
- Modify: `src/islands/Countdown.tsx`
- Modify: `src/islands/Countdown.test.tsx`
- Modify: `src/i18n/en.ts:13` and `src/i18n/no.ts:13` (`oneDayToGo`)
- Modify: `src/styles/global.css` (`.days`, new `.days-number`, 768 px block)

**Interfaces:**
- Consumes: `fill` is no longer needed in `Countdown.tsx`; `t`, `Locale`, `useCountdown` unchanged.
- Produces: `<span className="days-number">` inside `<p className="days" aria-live="polite">`.

- [ ] **Step 1: Update the tests to see through the span**

Testing Library's `getByText` only reads an element's own text nodes, so once the number sits in a span the sentence is no longer one text node. Edit `src/islands/Countdown.test.tsx`:

Add after the `after` constant:

```tsx
/** The one live region. getByText cannot see the whole sentence once the number is in its own span. */
function daysLine(): HTMLElement {
	const el = document.querySelector<HTMLElement>(".days")
	if (!el) throw new Error("no .days element")
	return el
}
```

Then replace, one by one:

- In "renders the digits…": `expect(screen.getByText("70 days to go")).toHaveAttribute("aria-live", "polite")` becomes
  ```tsx
  expect(daysLine()).toHaveAttribute("aria-live", "polite")
  expect(daysLine()).toHaveTextContent("70 days to go")
  expect(daysLine().querySelector(".days-number")).toHaveTextContent("70")
  ```
- In "says 1 day the evening before": `expect(screen.getByText("1 day to go")).toBeInTheDocument()` becomes
  ```tsx
  expect(daysLine()).toHaveTextContent("1 day to go")
  expect(daysLine().querySelector(".days-number")).toHaveTextContent("1")
  ```
- In "uses Norwegian strings": `expect(screen.getByText("70 dager igjen")).toBeInTheDocument()` becomes `expect(daysLine()).toHaveTextContent("70 dager igjen")`.
- In "flips to the launched state…": `expect(screen.getByText("Day 3 since launch")).toBeInTheDocument()` becomes
  ```tsx
  expect(daysLine()).toHaveTextContent("Day 3 since launch")
  expect(daysLine().querySelector(".days-number")).toHaveTextContent("3")
  ```
- In "keeps the same live region across the flip": `const region = screen.getByText("1 day to go")` becomes `const region = daysLine()` followed by `expect(region).toHaveTextContent("1 day to go")`; and `expect(screen.getByText("Day 0 since launch")).toBe(region)` becomes
  ```tsx
  expect(daysLine()).toBe(region)
  expect(region).toHaveTextContent("Day 0 since launch")
  ```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/islands/Countdown.test.tsx`
Expected: the `.days-number` assertions fail (`null` has no text content); the rest pass.

- [ ] **Step 3: Give `oneDayToGo` its placeholder**

`src/i18n/en.ts`: `oneDayToGo: "{n} day to go",`
`src/i18n/no.ts`: `oneDayToGo: "{n} dag igjen",`

- [ ] **Step 4: Split the number out in `src/islands/Countdown.tsx`**

Change the import to `import { type Locale, t } from "../i18n"` (`fill` is no longer used here). Replace the `daysLine` block and the `<p className="days">` with:

```tsx
	const template = after ? s.daySince : state.daysToGo === 1 ? s.oneDayToGo : s.daysToGo
	const n = after ? state.daysSince : state.daysToGo
```

```tsx
			{/* One live region for both phases, so the flip itself is announced as one sentence. */}
			<p className="days" aria-live="polite">
				<DaysLine template={template} n={n} />
			</p>
```

and add above `export function Countdown`:

```tsx
/**
 * The sentence with its number in its own span, so CSS can give the number the display face
 * while the words stay in Inter (spec §7). Splitting on the placeholder keeps the translation
 * in charge of word order ("{n} days to go", "Dag {n} etter lansering").
 */
function DaysLine({ template, n }: { template: string; n: number }) {
	const [before, after] = template.split("{n}")
	if (after === undefined) return <>{template}</>
	return (
		<>
			{before}
			<span className="days-number">{n}</span>
			{after}
		</>
	)
}
```

- [ ] **Step 5: Run to see them pass**

Run: `npx vitest run src/islands/Countdown.test.tsx src/i18n`
Expected: PASS, including the axe test and the live-region test (the `<p>` element is the same object across the flip).

- [ ] **Step 6: Style the number in `src/styles/global.css`**

Replace the `.days` rule with:

```css
.days {
	font-size: 1.25rem;
	font-weight: 600;
}

/* The one display number (spec §6.1). Third glow site; the token is `none` under reduced motion. */
.days-number {
	font-family: var(--font-display);
	font-weight: 400;
	font-size: 4rem;
	line-height: 1;
	color: var(--text);
	text-shadow: var(--glow);
}
```

In the `@media (min-width: 768px)` block, next to `.unit .value`:

```css
	.days-number {
		font-size: 6rem;
	}
```

- [ ] **Step 7: Check it in the Browser pane**

Reload `/en/`, `javascript_tool`:

```js
const p = document.querySelector(".days"), n = p.querySelector(".days-number")
const cs = getComputedStyle(n)
;({ text: p.textContent, family: cs.fontFamily, size: cs.fontSize, shadow: cs.textShadow, live: p.getAttribute("aria-live"), sentenceFamily: getComputedStyle(p).fontFamily })
```
Expected: `family` starts with `"Bebas Neue"`, `size` `96px` at desktop width and `64px` under `{preset: "mobile"}`, `shadow` non-`none`, `live` `polite`, `sentenceFamily` starts with `"Inter Variable"`. Screenshot at 375 wide: the sentence fits on one line or wraps after the number, never mid-word. Reset the viewport.

- [ ] **Step 8: Format, run the suite, commit**

Run: `npx biome check --write src/islands/Countdown.tsx src/islands/Countdown.test.tsx src/i18n/en.ts src/i18n/no.ts src/styles/global.css && npx vitest run`

```bash
git add src/islands/Countdown.tsx src/islands/Countdown.test.tsx src/i18n/en.ts src/i18n/no.ts src/styles/global.css
git commit -m "Set the countdown number in the display face"
```

---

### Task 6: Tracker tiers, stats digits and the progress bar

**Files:**
- Modify: `src/islands/tracker/ItemList.tsx:92` (the tier span)
- Modify: `src/styles/global.css` (`.tier`, `.progress-label`, `.bar-fill`, new overall-bar glow)

**Interfaces:**
- Consumes: `--tier-confirmed`, `--tier-expected`, `--gradient`, `--glow`, `--font-heading` from Task 1; the faces from Task 2.
- Produces: `.tier[data-status]` attribute contract; nothing else changes shape. `StatsRail.tsx` is untouched (§11).

- [ ] **Step 1: Verify DM Sans has tabular figures (§6.2, recorded result)**

On `http://localhost:4321/en/tracker/` (dev server running), `javascript_tool`:

```js
await document.fonts.load('600 16px "DM Sans Variable"')
const w = (variant) => { const s = document.createElement("span"); s.textContent = "1111111111"; s.style.font = '600 32px "DM Sans Variable"'; s.style.fontVariantNumeric = variant; document.body.append(s); const r = s.getBoundingClientRect().width; s.remove(); return r }
const w9 = (variant) => { const s = document.createElement("span"); s.textContent = "9999999999"; s.style.font = '600 32px "DM Sans Variable"'; s.style.fontVariantNumeric = variant; document.body.append(s); const r = s.getBoundingClientRect().width; s.remove(); return r }
;({ ones: w("tabular-nums"), nines: w9("tabular-nums"), onesProportional: w("normal"), ninesProportional: w9("normal") })
```
Expected if the face has `tnum`: `ones === nines` with `tabular-nums` and `ones !== nines` without. Write the four numbers into the ledger and the PR. **If `ones !== nines` with `tabular-nums`**, DM Sans has no `tnum` and Step 3 uses `font-family: var(--font-sans)` on `.progress-label` (the whole row, label and count) instead of `var(--font-heading)`.

- [ ] **Step 2: Add `data-status` in `src/islands/tracker/ItemList.tsx`**

Line 92: `<span className="tier">{tier}</span>` becomes

```tsx
				<span className="tier" data-status={item.status}>
					{tier}
				</span>
```

The rendered text is unchanged, so `Tracker.test.tsx` keeps passing. Run: `npx vitest run src/islands` — expected green.

- [ ] **Step 3: CSS in `src/styles/global.css`**

After the `.tier` rule add:

```css
/* Tier colours come from their own tokens so a theme can swap them without touching the accent. */
.tier[data-status="confirmed"] {
	color: var(--tier-confirmed);
}

.tier[data-status="expected"] {
	color: var(--tier-expected);
}
```

Replace `.progress-label`, `.bar` and `.bar-fill` with:

```css
/* Ledger numbers (spec §3, §6.1): one face for the whole row so a DM Sans label never sits
   beside Inter digits. Task 6 Step 1 decides the face; the label is muted so it reads as a label. */
.progress-label {
	display: flex;
	justify-content: space-between;
	gap: var(--space-2);
	font-family: var(--font-heading);
	font-weight: 600;
	font-size: 0.875rem;
	font-variant-numeric: tabular-nums;
}

.progress-label > span:first-child {
	color: var(--text-muted);
}

.bar {
	height: 0.5rem;
	border-radius: 999px;
	background: var(--border);
	overflow: hidden;
}

/* Second glow site: only the overall bar, and on the wrapper, because `.bar` clips the fill. */
.progress:has(> .progress-label > #progress-overall) .bar {
	box-shadow: var(--glow);
}

.bar-fill {
	display: block;
	height: 100%;
	background: var(--gradient);
	transition: width 300ms ease;
}
```

(If Step 1 found no `tnum`, write `font-family: var(--font-sans);` in `.progress-label` instead and say so in the commit message.)

- [ ] **Step 4: Check in the Browser pane**

Reload `/en/tracker/`, tick one item so the bars have a fill, then `javascript_tool`:

```js
const overall = document.querySelector(".progress:has(> .progress-label > #progress-overall) .bar")
const other = document.querySelectorAll(".progress .bar")[1]
const fill = overall.querySelector(".bar-fill")
const confirmed = document.querySelector('.tier[data-status="confirmed"]')
const expected = document.querySelector('.tier[data-status="expected"]')
const label = document.querySelector(".progress-label > span:first-child"), count = document.querySelector(".progress-label > span:last-child")
;({ overallShadow: getComputedStyle(overall).boxShadow, otherShadow: getComputedStyle(other).boxShadow, fillImage: getComputedStyle(fill).backgroundImage, confirmed: confirmed && getComputedStyle(confirmed).color, expected: expected && getComputedStyle(expected).color, labelColor: getComputedStyle(label).color, countColor: getComputedStyle(count).color, rowFont: getComputedStyle(label).fontFamily })
```
Expected: `overallShadow` is a pink shadow, `otherShadow` is `none`, `fillImage` starts with `linear-gradient`, `confirmed` `rgb(255, 61, 129)`, `expected` `rgb(34, 224, 255)` (open `?show=wildlife` or scroll until one of each is in the DOM), `labelColor` `rgb(163, 163, 163)`, `countColor` `rgb(242, 242, 242)`. Screenshot the stats rail at desktop width for the review; the label and the count sit on one baseline (measure `getBoundingClientRect().bottom` of both spans: equal within 1 px).

- [ ] **Step 5: Format, run the suite, commit**

Run: `npx biome check --write src/islands/tracker/ItemList.tsx src/styles/global.css && npx vitest run`

```bash
git add src/islands/tracker/ItemList.tsx src/styles/global.css
git commit -m "Colour the tiers from their tokens and draw the progress bar in the gradient"
```

---

### Task 7: Regenerate the icon set

**Files:**
- Modify: `pwa-assets.config.ts:9-15`
- Regenerate: `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`
- Maybe create (only if the 16 px check fails): `assets/favicon-source.svg`, `pwa-assets.config.favicon.ts`, one npm script

- [ ] **Step 1: Change the padding**

`pwa-assets.config.ts`: `maskable.padding` `0.3` → `0.1`; `apple.padding` `0.3` → `0`. Update the comment above `defineConfig`:

```ts
// Generates pwa-64/192/512, maskable-icon-512, apple-touch-icon-180 and favicon.ico from the M2
// mark. The generator scales the source by (1 - padding): 0.1 keeps the horizon bar's far corner
// (220.6 from centre) inside the 204.8 maskable safe radius (spec §5.3). Apple gets 0 because the
// source is already a black rounded square and iOS masks its own corners.
```

- [ ] **Step 2: Regenerate and check the files**

Run: `npm run icons`
Expected: six files rewritten under `public/`. Verify sizes with a PNG header read:

```bash
node -e '
for (const f of ["pwa-64x64","pwa-192x192","pwa-512x512","maskable-icon-512x512","apple-touch-icon-180x180"]) {
  const b = require("node:fs").readFileSync(`public/${f}.png`)
  console.log(f, b.readUInt32BE(16), "x", b.readUInt32BE(20), b.length, "bytes")
}
console.log("favicon.ico", require("node:fs").statSync("public/favicon.ico").size, "bytes")'
```
Expected: the dimensions in the names; each PNG well under 50 KB (they were 0.3–2 KB before; expect a few KB now, the gradient costs more than the flat rook).

- [ ] **Step 3: Maskable safe-zone check, measured (§5.3)**

`navigate` to `http://localhost:4321/maskable-icon-512x512.png`, then `javascript_tool`:

```js
const img = document.querySelector("img")
const c = document.createElement("canvas"); c.width = c.height = 512
const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0)
const d = ctx.getImageData(0, 0, 512, 512).data
let max = 0
for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
  const i = (y * 512 + x) * 4
  if (d[i] + d[i + 1] + d[i + 2] > 30) { const r = Math.hypot(x + 0.5 - 256, y + 0.5 - 256); if (r > max) max = r }
}
const ring = document.createElement("div")
Object.assign(ring.style, { position: "absolute", left: `${img.offsetLeft + img.width / 2 - 204.8 * img.width / 512}px`, top: `${img.offsetTop + img.height / 2 - 204.8 * img.height / 512}px`, width: `${409.6 * img.width / 512}px`, height: `${409.6 * img.height / 512}px`, border: "2px solid lime", borderRadius: "50%", boxSizing: "border-box" })
document.body.append(ring)
;({ farthestLitPixel: max, safeRadius: 204.8, fits: max <= 204.8 })
```
Expected: `farthestLitPixel` about 198.5 (the spec's number for padding 0.1) and `fits` `true`. `computer` screenshot with the lime ring: every coloured pixel inside the ring. Record the number for the PR.

- [ ] **Step 4: Favicon at 16 and 32 px (§5.3)**

`navigate` to `http://localhost:4321/favicon.ico`, `javascript_tool`:

```js
const img = document.querySelector("img"); img.style.imageRendering = "auto"
const make = (px) => { const i = img.cloneNode(); i.style.width = i.style.height = `${px}px`; i.style.display = "block"; i.style.margin = "16px"; document.body.append(i) }
make(16); make(32); "ok"
```
`zoom` on the region holding the two copies. Decide: does the 16 px copy still read as a pink disc with a dark bite and a cyan line, or has the palm turned it to noise? Write the verdict in the ledger.

**Only if it is noise**, do the fallback: create `assets/favicon-source.svg` (copy of `public/icon.svg` with the whole `<g fill="#000000">` palm group deleted, nothing else changed), create `pwa-assets.config.favicon.ts`:

```ts
import { defineConfig } from "@vite-pwa/assets-generator/config"

// favicon.ico only, from the drawing without the palm: at 16 px the palm is noise (spec §5.3).
// The source lives outside public/ so it is never served. icon.svg and every PNG keep the palm.
export default defineConfig({
	preset: {
		transparent: { sizes: [], favicons: [[48, "favicon.ico"]] },
		maskable: { sizes: [] },
		apple: { sizes: [] },
	},
	images: ["assets/favicon-source.svg"],
})
```

add `"icons:favicon": "pwa-assets-generator --config pwa-assets.config.favicon.ts"` to `package.json` scripts, run it, and re-check at 16 px. If the check passes, none of these files exist.

- [ ] **Step 5: Format, commit**

Run: `npx biome check --write pwa-assets.config.ts` (and the favicon config if created).

```bash
git add pwa-assets.config.ts public/*.png public/favicon.ico
git commit -m "Regenerate the icon set from the M2 mark with a 0.1 maskable padding"
```

(Add `assets/favicon-source.svg pwa-assets.config.favicon.ts package.json` to the `git add` if the fallback was needed.)

---

### Task 8: The OG banner

**Files:**
- Create: `docs/brand/og.html`
- Create: `docs/brand/serve.mjs`
- Create: `public/og.png` (rendered)
- Modify (local, untracked, gitignored): `.claude/launch.json` gains one configuration

**Interfaces:**
- Consumes: the Fontsource packages from Task 2 (served straight from `node_modules`).
- Produces: `public/og.png`, 1200 × 630, under 300 KB. The SEO spec points `og:image` at it.

- [ ] **Step 1: The render server `docs/brand/serve.mjs`**

```js
// Dev-only helper for the banner (spec §8). Serves the repository over HTTP so og.html can load
// the self-hosted faces from node_modules, and accepts the rendered PNG at POST /og.png, which it
// writes to public/og.png. Never deployed: docs/ is not part of the build.
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const port = 4400
const types = {
	".html": "text/html; charset=utf-8",
	".css": "text/css",
	".woff2": "font/woff2",
	".png": "image/png",
	".svg": "image/svg+xml",
}

createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://localhost:${port}`)

	if (req.method === "POST" && url.pathname === "/og.png") {
		const chunks = []
		for await (const chunk of req) chunks.push(chunk)
		const png = Buffer.concat(chunks)
		await writeFile(join(root, "public/og.png"), png)
		res.writeHead(200, { "content-type": "application/json" })
		res.end(JSON.stringify({ bytes: png.length }))
		return
	}

	const file = normalize(join(root, decodeURIComponent(url.pathname)))
	if (!file.startsWith(root)) {
		res.writeHead(403)
		res.end()
		return
	}
	try {
		const body = await readFile(file)
		res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" })
		res.end(body)
	} catch {
		res.writeHead(404)
		res.end()
	}
}).listen(port, "127.0.0.1", () => {
	console.log(`banner source: http://localhost:${port}/docs/brand/og.html`)
})
```

- [ ] **Step 2: The banner source `docs/brand/og.html`**

Literal hex on purpose (§4.2 allows it here). Text is text so it can be edited.

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Rookdex OG banner source</title>
		<link rel="stylesheet" href="/node_modules/@fontsource/bebas-neue/latin-400.css" />
		<link rel="stylesheet" href="/node_modules/@fontsource-variable/dm-sans/index.css" />
		<style>
			html,
			body {
				margin: 0;
				background: #000000;
			}
			svg {
				display: block;
			}
			#status {
				font: 14px system-ui, sans-serif;
				color: #a3a3a3;
				padding: 8px;
			}
		</style>
	</head>
	<body>
		<!-- 1200 × 630, Layout 2 lockup (spec §8). Geometry is the table in §8; the mark is §5.1 at scale 0.9. -->
		<svg id="og" xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
			<defs>
				<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#ff3d81" />
					<stop offset="1" stop-color="#ff8a3d" />
				</linearGradient>
				<linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#ff3d81" />
					<stop offset="1" stop-color="#ff8a3d" />
				</linearGradient>
				<clipPath id="disc"><circle cx="256" cy="236" r="150" /></clipPath>
				<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
					<feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ff3d81" flood-opacity="0.45" />
				</filter>
			</defs>
			<rect width="1200" height="630" fill="#000000" />
			<g transform="translate(50 85) scale(0.9)">
				<circle cx="256" cy="236" r="150" fill="url(#sun)" filter="url(#glow)" />
				<g fill="#000000" clip-path="url(#disc)">
					<rect x="0" y="262" width="512" height="12" />
					<rect x="0" y="298" width="512" height="18" />
					<rect x="0" y="342" width="512" height="26" />
				</g>
				<rect x="96" y="398" width="320" height="14" rx="7" fill="#22e0ff" />
				<g fill="#000000">
					<path d="M352 404 C 344 340, 334 280, 312 214" fill="none" stroke="#000000" stroke-width="24" stroke-linecap="round" />
					<path d="M312 214 Q 236 156 178 190 Q 244 192 312 214 z" />
					<path d="M312 214 Q 208 208 168 262 Q 250 228 312 214 z" />
					<path d="M312 214 Q 386 152 446 184 Q 380 190 312 214 z" />
					<path d="M312 214 Q 412 206 452 262 Q 372 228 312 214 z" />
					<path d="M312 214 Q 236 246 224 316 Q 276 248 312 214 z" />
					<path d="M312 214 Q 386 246 398 316 Q 346 248 312 214 z" />
					<path d="M312 214 Q 300 140 332 104 Q 316 160 312 214 z" />
				</g>
			</g>
			<text id="wordmark" x="540" y="284" font-family="Bebas Neue" font-size="176" letter-spacing="6" fill="#f2f2f2">ROOKDEX</text>
			<text id="tagline" x="542" y="350" font-family="DM Sans Variable" font-weight="600" font-size="32" fill="#f2f2f2">The open-source GTA VI companion.</text>
			<text id="muted" x="542" y="412" font-family="DM Sans Variable" font-weight="500" font-size="20" fill="#a3a3a3">rookdex.app · track your progress · works offline · unofficial</text>
			<rect x="0" y="606" width="1200" height="24" fill="url(#stripe)" />
		</svg>
		<p id="status">Fonts loading…</p>
		<script>
			// render(): copies the SVG, embeds the two faces as data URLs (an SVG drawn into a canvas
			// cannot see page fonts), rasterises at exactly 1200 × 630 and posts the PNG to serve.mjs.
			const faces = [
				["Bebas Neue", "/node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2", "400"],
				["DM Sans Variable", "/node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2", "100 1000"],
			]

			async function toDataUrl(url) {
				const blob = await (await fetch(url)).blob()
				return new Promise((resolve) => {
					const reader = new FileReader()
					reader.onload = () => resolve(reader.result)
					reader.readAsDataURL(blob)
				})
			}

			/** Right edge of each text element in SVG units, to compare with spec §8. */
			function edges() {
				const edge = (id) => {
					const box = document.getElementById(id).getBBox()
					return Math.round(box.x + box.width)
				}
				return { wordmark: edge("wordmark"), tagline: edge("tagline"), muted: edge("muted") }
			}

			async function render() {
				await document.fonts.ready
				const svg = document.getElementById("og").cloneNode(true)
				const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
				const rules = await Promise.all(
					faces.map(async ([family, url, weight]) =>
						`@font-face{font-family:"${family}";font-weight:${weight};src:url(${await toDataUrl(url)}) format("woff2")}`
					)
				)
				style.textContent = rules.join("")
				svg.insertBefore(style, svg.firstChild)
				const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" })
				const img = new Image()
				await new Promise((resolve, reject) => {
					img.onload = resolve
					img.onerror = reject
					img.src = URL.createObjectURL(blob)
				})
				const canvas = document.createElement("canvas")
				canvas.width = 1200
				canvas.height = 630
				canvas.getContext("2d").drawImage(img, 0, 0, 1200, 630)
				const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
				const saved = await (await fetch("/og.png", { method: "POST", body: png })).json()
				const result = { width: canvas.width, height: canvas.height, bytes: saved.bytes, edges: edges() }
				document.getElementById("status").textContent = JSON.stringify(result)
				return result
			}

			document.fonts.ready.then(() => {
				document.getElementById("status").textContent = `Fonts ready. ${JSON.stringify(edges())}`
			})
		</script>
	</body>
</html>
```

- [ ] **Step 3: Start the server and open the source**

Add to `.claude/launch.json` `configurations` (local file, gitignored):

```json
{ "name": "og", "runtimeExecutable": "node", "runtimeArgs": ["docs/brand/serve.mjs"], "port": 4400 }
```

`preview_start` `{name: "og"}`, then `navigate` to `http://localhost:4400/docs/brand/og.html`. `read_console_messages` must show no errors, and `read_network_requests` with `urlPattern: "woff2"` shows both faces at 200. `get_page_text` shows "Fonts ready." with the three edges.

- [ ] **Step 4: Check the edges, render, check the file**

`javascript_tool`: `await render()`
Expected: `{ width: 1200, height: 630, bytes: <n>, edges: { wordmark: ~1074, tagline: ~1108, muted: ~1091 } }`, each edge within 4 of the spec's number and none above 1108 (the 92 px right margin). If an edge is off by more, the face did not load (check the network panel) or a size/spacing attribute is wrong; fix the source, reload, render again.

Then on disk:

```bash
node -e 'const b=require("node:fs").readFileSync("public/og.png"); console.log(b.readUInt32BE(16), "x", b.readUInt32BE(20), b.length, "bytes")'
```
Expected: `1200 x 630`, under 300 000 bytes. If it is over 300 KB, the glow's `stdDeviation` or `flood-opacity` is the lever (§8 fixes the geometry, not the filter): lower `flood-opacity` in steps of 0.05, re-render, re-measure, and note the final value in the PR.

`computer` screenshot of the page for the review: black canvas, sun with palm on the left, `ROOKDEX` large, the tagline and muted line under it, a pink-to-orange stripe along the bottom.

- [ ] **Step 5: Confirm the precache skips it**

Run: `npm run build && grep -c '"/og.png"' dist/sw.js`
Expected: `0` (the `og.*` rule from Task 2). `ls -la dist/og.png` exists (it is still served for crawlers).

- [ ] **Step 6: Format, commit**

Run: `npx biome check --write docs/brand/serve.mjs` (Biome does not format `.html`; check the file by eye for tabs.)

```bash
git add docs/brand/og.html docs/brand/serve.mjs public/og.png
git commit -m "Add the OG banner source and the rendered 1200x630 banner"
```

---

### Task 9: The copy-rules test

**Files:**
- Create: `src/i18n/copy.test.ts`

**Interfaces:**
- Consumes: the exported `en` and `no` objects from `src/i18n/en.ts` and `src/i18n/no.ts`.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest"
import { en } from "./en"
import { no } from "./no"

/** Every string value with its path, walking nested objects (spec §13.6: values, not file text). */
function strings(value: unknown, path: string): [string, string][] {
	if (typeof value === "string") return [[path, value]]
	if (value && typeof value === "object") {
		return Object.entries(value).flatMap(([key, v]) => strings(v, `${path}.${key}`))
	}
	return []
}

const all = [...strings(en, "en"), ...strings(no, "no")]

describe("copy rules (spec §9)", () => {
	it("walks a real number of strings", () => {
		expect(all.length).toBeGreaterThan(150)
	})

	it.each(all)("%s keeps the tier vocabulary and the tone", (_path, text) => {
		// Word boundaries: "bleak" is fine, "leak" is not. "lekk" covers lekk/lekket in Norwegian.
		expect(text).not.toMatch(/\b(leak|leaked|lekk)\b/i)
		expect(text).not.toContain("!")
		// One capital in prose; all caps belongs to the wordmark only, and that is markup, not a string.
		expect(text).not.toContain("ROOKDEX")
	})
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/i18n/copy.test.ts`
Expected: PASS on the first run (the strings were written under these rules). Confirm the count line prints more than 150 cases in the summary. If any string fails, fix the string, not the test.

- [ ] **Step 3: Prove the test bites**

Temporarily change `en.hub.launched` to `"It is out!"`, run again, expect one failure naming `en.hub.launched`, then revert the string.

- [ ] **Step 4: Format, commit**

Run: `npx biome check --write src/i18n/copy.test.ts`

```bash
git add src/i18n/copy.test.ts
git commit -m "Test the copy rules over the exported strings"
```

---

### Task 10: README and LICENSE

**Files:**
- Modify: `README.md` (new `## Brand` section before `## Licence`, and one line in `## Licence`)
- Modify: `LICENSE` (scope paragraph above the MIT text)

- [ ] **Step 1: LICENSE scope line (§14)**

Prepend to `LICENSE`, before `MIT License`:

```
Scope

The Rookdex name, mark, wordmark lockup and banner are not covered by the
licence below. That is these files: public/icon.svg, src/components/Mark.astro,
docs/brand/og.html, public/og.png and the generated icons (public/pwa-*.png,
public/maskable-icon-512x512.png, public/apple-touch-icon-180x180.png,
public/favicon.ico). Everything else in this repository is under the MIT
License that follows.

```

- [ ] **Step 2: README brand section**

Insert before `## Licence`:

```markdown
## Brand

Colours and type are tokens in `src/styles/tokens.css`; components read tokens and never write a colour of their own. The mark is `public/icon.svg` (the app icon) and `src/components/Mark.astro` (in-page, token-coloured); the social banner is rendered from `docs/brand/og.html` to `public/og.png`. The brand spec is `docs/superpowers/specs/2026-09-21-rookdex-brand-design.md`.

The Rookdex name, mark and banner are not under the MIT licence (`LICENSE` names the files). Use them to link to or talk about Rookdex, not to present another project as Rookdex.
```

In `## Licence`, change `Code is MIT (see `LICENSE`).` to `Code is MIT (see `LICENSE`; the brand files listed there are excluded).`

- [ ] **Step 3: Read both files once, then commit**

Check: no third party named, first person voice, no marketing. Run `npx biome check README.md` is not needed (Markdown is not formatted by Biome).

```bash
git add README.md LICENSE
git commit -m "Scope the licence around the brand files and describe them in the README"
```

---

### Task 11: Whole-branch verification, the numbers, the PR

**Files:** none new. This task produces the PR body.

- [ ] **Step 1: The automated gates**

Run, in this order, and paste each summary line into the ledger:

```bash
npx vitest run
npm run check
npx biome check src integrations docs/brand pwa-assets.config.ts package.json
npm run build
```
Expected: every test green (about 150 more cases than the 136 at the start of the branch, mostly `it.each` rows), `astro check` 0 errors, Biome clean on the touched trees, build clean with the precache line.

- [ ] **Step 2: The budget numbers (§6.3, §8)**

```bash
node -e '
const fs = require("node:fs"), path = require("node:path")
const sw = fs.readFileSync("dist/sw.js", "utf8")
const urls = JSON.parse(sw.match(/const PRECACHE = (\[.*?\])/s)[1])
const size = (u) => fs.statSync(path.join("dist", u.endsWith("/") ? u + "index.html" : u)).size
const fonts = urls.filter((u) => u.endsWith(".woff2"))
const total = urls.reduce((n, u) => n + size(u), 0)
console.log("precached URLs:", urls.length)
console.log("precached fonts:", fonts.map((u) => `${u} ${size(u)} B`))
console.log("three latin fonts total:", fonts.reduce((n, u) => n + size(u), 0), "B (budget 120000)")
console.log("new faces total:", fonts.filter((u) => !u.includes("inter-")).reduce((n, u) => n + size(u), 0), "B (budget 70000)")
console.log("precache total:", total, "B (was 639718 before the branch)")
console.log("og.png:", fs.statSync("public/og.png").size, "B (budget 300000)")
console.log("images in precache added by this branch:", urls.filter((u) => /og\./.test(u)))'
```
Expected: three fonts, totals inside every budget, `og` list empty, precache total at least 170 KB below 639 718 minus whatever the regenerated PNGs grew by (say the exact delta).

- [ ] **Step 3: The built site in the Browser pane**

`npm run build` is done; `preview_start` needs a launch entry for `npm run preview` (wrangler dev, port 8787): add `{ "name": "preview", "runtimeExecutable": "npm", "runtimeArgs": ["run", "preview"], "port": 8787 }` to `.claude/launch.json` (local). Open `http://localhost:8787/en/`.

- Preload (§6.2): `read_network_requests` `urlPattern: "bebas"`: one request, `/_astro/bebas-neue-latin-400-normal.<hash>.woff2`, 200. No 404 in the whole list (`read_network_requests` without a filter, scan the statuses). Record the URL.
- CSP: `read_console_messages` `onlyErrors: true`: nothing about "Content Security Policy" or "refused to apply".
- Header lockup at `{preset: "mobile"}` and desktop: the Task 4 Step 5 snippet; record centre lines and `brandHeight`.
- Hub hero at 375 and 1024: the Task 5 Step 7 snippet; record the number's font size and that the sentence family is Inter.
- Swap measurement (§6.2, once):
  ```js
  const c = document.createElement("canvas").getContext("2d")
  const w = (font) => { c.font = font; c.letterSpacing = "0.8px"; return c.measureText("ROOKDEX").width }
  ;({ bebas: w('400 20px "Bebas Neue"'), dmSans: w('400 20px "DM Sans Variable"'), inter: w('400 20px "Inter Variable"') })
  ```
  Record the three widths; the difference between `bebas` and the fallback that paints first is the shift.
- Tracker: `/en/tracker/?show=wildlife`, the Task 6 Step 4 snippet; record the tier colours and the overall-bar shadow.
- Reset the viewport with `{preset: "desktop"}`.

- [ ] **Step 4: Open the PR**

Branch pushed, then:

```bash
gh pr create --base main --head brand --title "Land the brand: tokens, mark, type, icons and banner" --body-file <the body below, written to the scratchpad>
```

PR body (fill every `<…>` from the ledger; keep it first person):

```markdown
Implements `docs/superpowers/specs/2026-09-21-rookdex-brand-design.md`.

## What changed

- Tokens (§4.1) with three tests: token set, no raw hex outside the allowlist, contrast from the token values.
- The M2 mark as `public/icon.svg` (hex, icon input) and `src/components/Mark.astro` (tokens); a parity test over the eight paths.
- Bebas Neue wordmark in the header and hub lockups; the countdown number in the display face; DM Sans 600 headings and stats digits; cyan underlined links; tier colours from their own tokens; gradient progress fill with the glow on the overall bar only.
- Fonts self-hosted through Fontsource, Bebas latin preloaded through a `?url` import, precache trimmed to the three latin files, `og.*` never precached.
- Icon set regenerated (maskable padding 0.1, apple 0). Favicon at 16 px: <kept the palm | fallback config without the palm>.
- OG banner source `docs/brand/og.html` rendered to `public/og.png` by `docs/brand/serve.mjs`.
- Copy-rules test over the exported strings; README brand section; LICENSE scope line.

## Measured

| Check | Result | Budget or target |
|---|---|---|
| Precached fonts | <3 files, list> | latin only |
| Three latin fonts | <n> B | < 120 000 |
| Two new faces | <n> B | < 70 000 |
| Precache total | <n> B (was 639 718) | at least 170 KB smaller |
| og.png | 1200 × 630, <n> B | < 300 000 |
| Banner right edges | wordmark <n>, tagline <n>, muted <n> | 1074 / 1108 / 1091 (±4) |
| Maskable farthest lit pixel | <n> | ≤ 204.8 |
| Bebas preload | 1 request, 200, `<url>` | one request, no 404 |
| Header lockup | mark centre <n>, glyph centre <n>, height <n> | within 2 px, ≥ 44 |
| Hub number | 64 px at 375, 96 px at 1024, sentence in Inter | §7 |
| DM Sans tnum | ones <n> = nines <n> with tabular-nums | equal |
| Wordmark swap | Bebas <n> vs fallback <n> at 20 px | recorded once |
| Contrast | all ten pairs at or above threshold (test) | §4.3 |

## Not in this PR

- §3 optional flavour (stepped divider, launch-week hero): follow-up if wanted.
- Reduced motion: covered by the token test; the Browser pane cannot emulate it, so the OS-level check is in the list below.

## For Malin before merge

- [ ] Reduced motion on (Windows: Settings → Accessibility → Visual effects → Animation effects off): no glow on the header mark, the overall bar or the countdown number; no seconds unit.
- [ ] Phone: header and hub lockups, one tick in the tracker, the tier colours.
- [ ] Upload `public/pwa-512x512.png` as the `rookdex` org avatar (§5.3).
- [ ] Upload `public/og.png` as the repository social preview (§8).
```

- [ ] **Step 5: Hand the numbers to the SEO spec**

Nothing to do in this repo. Note in the ledger: `twitter:card=summary_large_image`, both locales point `og:image` at `/og.png` (§8).

---

## Self-review against the spec

- **§1–3:** direction and the not-allowed list are constraints, not tasks; the optional flavour is listed under "Not built" with a follow-up. ✓
- **§4:** Task 1 (tokens verbatim, contrast test, hex test), Task 4 (links, focus exceptions), Task 6 (tiers, gradient, glow sites). The three glow sites are Task 4 (header mark), Task 6 (overall bar), Task 5 (number). ✓
- **§5:** Task 3 (geometry, both files, parity), Task 7 (padding, regeneration, maskable measurement, favicon decision with fallback, org avatar handed to Malin). ✓
- **§6:** Task 2 (packages, preload via `?url`, precache filter and `og.*` skip, budgets), Task 6 Step 1 (tnum check with the fallback), Task 11 (swap measurement, network check on the built site). ✓
- **§7:** Task 4 (header and hub lockups with `aria-label`), Task 5 (number split, live region untouched), Task 6 (progress bar), footer unchanged. ✓
- **§8:** Task 8 (source, server, render recipe, edges, size, precache skip), social preview handed to Malin, SEO note in Task 11. ✓
- **§9:** Task 9 test; the `oneDayToGo` edit in Task 5 keeps the rules. ✓
- **§10:** phase 2, nothing built; no `data-theme` script, no `rookdex:theme` key. ✓
- **§11:** every file in the table has a task; `StatsRail.tsx` and `manifest.webmanifest` untouched. ✓
- **§12:** focus exceptions Task 4; reduced motion via tokens Task 1 and Malin's list; `aria-hidden` mark and `aria-label` lockups Task 3–4; no `style=` anywhere in the plan's markup. ✓
- **§13:** tests 1, 2, 5 in Task 1; 3 in Task 3; 4 in Task 2; 6 in Task 9. Manual list in Tasks 4–8 and 11. ✓
- **§14:** Task 10. ✓
- **Type consistency:** `shouldPrecache` (Task 2) is the only new export; `Mark` props `size`/`id` are used with those names in Task 4; `.days-number`, `.wordmark`, `.lockup`, `.mark` are spelled the same in Tasks 3–6 and 11; `data-status` values are the schema's `"confirmed"` / `"expected"`.
