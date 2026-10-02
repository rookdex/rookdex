# Rookdex Locale Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rookdex speaks `en` and `nb` the way the Workbench locale standard says: flat JSON bundles through the vendored i18n library, `nb` in every URL and tag, a root page that picks the language in the browser, a picker with a System row and a stored `lang`, and prices rendered from numbers.

**Architecture:** Three PRs in order. PR 1 adds `money(..., { stripWhole })` to the Workbench i18n library (2.1.0). PR 2 vendors that library into `src/lib/i18n/`, turns the nested TypeScript string objects into flat `src/locales/*.json` bundles behind a thin typed layer (`translator(locale)` in `src/i18n/index.ts`), and moves prices into `src/model/prices.ts` plus a `{price:<id>}` Markdown token for guides (a Sätteri plugin). PR 3 renames `no` to `nb`, adds the 301s, the root page with its hashed inline resolver, the vendored DS `picker.js`, the System row, the stored `lang` and its removal on Delete all.

**Tech Stack:** Astro 7.3 (static output, i18n routing, CSP hashes, Container API in tests), React 19 islands, Vitest 5 (node for `.astro`, jsdom for islands and scripts), Workbench i18n 2.1.0 (vanilla JS + `index.d.ts`), DS 3.8.0 `components/picker.js`, Cloudflare Workers static assets (`_redirects`). One package pin, `@astrojs/markdown-satteri` 0.4.1 (already in the tree through Astro).

**Spec:** `docs/superpowers/specs/2026-10-02-rookdex-locale-standard-design.md`. The Workbench standard it applies is `../workbench/docs/specs/2026-10-01-locale-standard.md` (§5 preference model, §6 picker, §7 language). Read the Rookdex spec before Task 1.

## Global Constraints

- English is the layout baseline. Measured targets are met in English, and `nb` adapts.
- Nothing on the page looks different apart from: the switcher trigger loses its "EN" text, "Norsk" becomes "Norsk bokmål", and prices render through `Intl.NumberFormat` (`en` with NOK gives "NOK 949", `nb` gives "949 kr").
- Vendored files (`src/lib/i18n/*`, `src/lib/picker.js`) are copied from Workbench and never edited in Rookdex. A gap gets fixed upstream, then re-copied. Biome ignores `src/lib`.
- `money()` always gets `{ stripWhole: true }` in Rookdex. No bundle value and no guide Markdown contains a price.
- Bundle values are plain text. Nothing renders them with `set:html` or `innerHTML`.
- The storage key is exactly `lang`. It holds a configured tag or is absent. System is absence, never a stored `"system"`. Every read and write of storage sits in `try`.
- A language page never redirects based on `lang`. Only the root page reads it.
- The CSP directives in `astro.config.mjs` do not change. New page scripts are bundled modules; the one exception is the root resolver, whose hash is inserted with `Astro.csp.insertScriptHash`.
- Controls are at least 44 px tall (`--tap`). Mobile-first CSS, only `min-width: 768px` and `min-width: 1024px` queries. No raw hex outside `src/styles/tokens.css`, except the literal `theme-color` line in `Base.astro` and `pages/index.astro`.
- Copy rules (`copy.test.ts`): no `!`, no "leak"/"lekk…", no "ROOKDEX" in strings, soft hyphen only in the Norwegian Settings tab label.
- Commits: no `Co-Authored-By`, no AI attribution. No em dashes in code comments, copy, commits or PR text.
- Gates before every commit: `npm test` and `npm run check`. Before every push: also `npx biome ci .` and `npm run build`.

## Review Focus

1. **The resolver's CSP hash drifts from the shipped script.** Today Astro writes the meta CSP after the resolver, so browsers run it either way (a meta policy doesn't cover earlier content). The hash keeps it valid if the policy ever moves to a header. Expected: the build fails. Pinned by seo-check rule 8 in Task 9.
2. **A price token in an unusual spot** (inside `**bold**`, two tokens in one sentence, a token in frontmatter `title`/`summary` that the Markdown plugin never sees). Expected: body tokens all format, frontmatter tokens fail a test. Pinned in Task 6.
3. **An empty `navigator.languages` and an undefined `navigator.language`** (some embedded browsers and privacy modes). Expected: the root lands on `/en/`, no exception. Pinned in Task 9.
4. **A stored `lang=nb` and a shared `/en/` link.** Expected: the page stays English (D10). Pinned in Task 12 (`language-choice` never navigates on load).
5. **Deleting `language-menu.test.ts` drops the keyboard coverage.** Expected: arrows wrap, Home/End jump, Escape refocuses, still tested in Rookdex against the vendored `picker.js`. Pinned in Task 11.

## Rulings made while planning (deviations from the spec's letter)

1. **`footer-countdown.ts` does not call the library's `plural()`.** The script ships no bundles by design (it reads its templates from data attributes). It picks between the `.one` and `.other` templates with `Intl.PluralRules`, the same rule the library uses. `Countdown.tsx` does call `plural()`.
2. **Plural templates use `{count}`, not `{n}`.** The library always passes `{count}`. `hub.daySince` is not a plural and keeps `{n}`. `DaysLine` now wraps the number it finds in the filled sentence instead of splitting the raw template, so it works for both.
3. **Seed category and group labels go through `seedLabel()`, not template literal types.** Seed ids are runtime strings, so a `` `category.${string}` `` key can't be checked by `astro check`. `seedLabel` falls back to the id, as today, and the seed test keeps every id keyed in both bundles. Typed template keys are used where the id is a literal union (`nav.${Tab}`, `tracker.errors.${TrackerError}`).
4. **`src/i18n/locales.ts` holds `locales`, `Locale`, `defaultLocale`, `isLocale` and `LANG_KEY`** without importing any bundle, so client scripts can use them without shipping every string. `src/i18n/index.ts` re-exports it.
5. **The System row's per-language URLs ship as a `data-hrefs` JSON attribute.** Settings renders the current language as a `<span>`, so a sibling `href` can't be copied. The script reads the map and picks the resolved language.
6. **The trigger is the globe alone, 44 × 44, with a "Language" / "Språk" tooltip** (Malin's call, 2026-10-02). The chevron goes with the "EN" text, matching spec §8 and the standard's one-icon trigger, and the tooltip follows the feedback spec's rule for icon-only controls. Task 13 measures 44 × 44.
7. **The root page has its own `<head>`, not `Base.astro`.** Base brings the header, tab bar, footer and service-worker registration. The root copies only the head lines it needs.
8. **The Settings current-language row stays a `<span>`.** Picking the current language explicitly is possible from the header picker. Changing Settings rows to links is a visible change the spec doesn't ask for.
9. **Guide prices use a Sätteri mdast plugin, not a remark plugin** (Malin's call, 2026-10-02). Astro 7.3.2 renders Markdown with Sätteri and rejects `markdown.remarkPlugins` unless `@astrojs/markdown-remark` is installed, which would change every guide's HTML. `@astrojs/markdown-satteri` 0.4.1 (MIT) becomes a direct dependency at the version Astro already installs, so no new code enters the tree.

---

## PR 1: Workbench i18n 2.1.0

Repo: `C:\Users\Nugget\Documents\Development\GitHub\repos\workbench`. Workbench CI runs `node --test "tools/*.test.mjs"`, which includes `scaffold-sync.test.mjs`: both web scaffolds must carry the current i18n copy.

### Task 1: `money()` gains `{ stripWhole }`

**Files:**
- Modify: `libraries/i18n/index.js` (the `money` function at the end of `createTranslator`)
- Modify: `libraries/i18n/index.d.ts`
- Modify: `libraries/i18n/README.md`
- Modify: `libraries/i18n/VERSION` (`2.0.0` to `2.1.0`)
- Modify: `tools/i18n.test.mjs`
- Re-extract: `scaffolds/web-vite/i18n/*`, `scaffolds/web-react-ts/i18n/*`

**Interfaces:**
- Produces: `money(lang, amount, currency, options?: { stripWhole?: boolean }): string`. `stripWhole: true` adds `trailingZeroDisplay: "stripIfInteger"`. Default unchanged.

- [ ] **Step 1: Branch**

```bash
cd ../workbench && git switch main && git pull && git switch -c i18n-2.1.0
```

- [ ] **Step 2: Write the failing tests** (append to `tools/i18n.test.mjs`, after the existing money test, which stays unchanged)

```js
test("money drops .00 from a whole amount with stripWhole, and keeps a real fraction", () => {
  assert.equal(i18n.money("nb", 949, "NOK", { stripWhole: true }), "949\u00a0kr");
  assert.equal(i18n.money("nb", 949.5, "NOK", { stripWhole: true }), "949,50\u00a0kr");
  assert.equal(i18n.money("en", 949, "NOK", { stripWhole: true }), "NOK\u00a0949");
});

test("money without options still shows the fraction digits", () => {
  assert.equal(i18n.money("nb", 949, "NOK", {}), "949,00\u00a0kr");
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `node --test tools/i18n.test.mjs`
Expected: FAIL on the stripWhole test ("949,00 kr" !== "949 kr").

- [ ] **Step 4: Implement** (replace the `money` function and its comment in `libraries/i18n/index.js`)

```js
	// The language chooses separators and symbol placement, the currency the
	// symbol. "symbol" gives "kr" at home and "NOK" abroad; narrowSymbol would
	// collapse NOK, SEK and DKK to "kr" the moment two of them meet.
	// stripWhole drops ",00" from a whole amount ("949 kr") and keeps a real
	// fraction ("949,50 kr"). Nothing is rounded.
	function money(lang, amount, currency, { stripWhole = false } = {}) {
		const options = { style: "currency", currency, currencyDisplay: "symbol" }
		if (stripWhole) options.trailingZeroDisplay = "stripIfInteger"
		return new Intl.NumberFormat(lang, options).format(amount)
	}
```

In `index.d.ts`, add above `export interface Translator`:

```ts
export interface MoneyOptions {
	/** Drop the fraction digits from a whole amount: "949 kr", while 949.5 stays "949,50 kr". Chrome 106, Firefox 116, Safari 15.4. */
	stripWhole?: boolean
}
```

and replace the `money` member:

```ts
	/** `amount` in `currency` (ISO 4217) by `lang`'s rules, full symbol: "949,00 kr" for nb, "NOK 949.00" for en. `{ stripWhole: true }` gives "949 kr". */
	money(lang: Lang, amount: number, currency: string, options?: MoneyOptions): string
```

- [ ] **Step 5: Docs and version**

In `libraries/i18n/README.md`, after the line `i18n.money("en", 949, "NOK")                    // "NOK 949.00"` add:

```js
i18n.money("nb", 949, "NOK", { stripWhole: true }) // "949 kr" (949.5 stays "949,50 kr")
```

and add this bullet after the `displayName` and `money` bullet:

```md
- `money(lang, amount, currency, { stripWhole: true })` drops the fraction digits from a whole
  amount and keeps a real fraction. Nothing is rounded. It needs Chrome 106, Firefox 116 or
  Safari 15.4.
```

Set `libraries/i18n/VERSION` to `2.1.0`. In `docs/specs/2026-10-01-locale-standard.md` §7.1's code block, add `i18n.money("nb", 949, "NOK", { stripWhole: true }) // "949 kr" (2.1.0)`, so consumers following the standard see the option.

- [ ] **Step 6: Re-sync the scaffolds**

```bash
node tools/extract.mjs i18n scaffolds/web-vite --force
node tools/extract.mjs i18n scaffolds/web-react-ts --force
```

- [ ] **Step 7: Run the whole suite**

Run: `node --test "tools/*.test.mjs"`
Expected: PASS, including `scaffolds/web-vite bundles the current i18n` and the `web-react-ts` twin.

- [ ] **Step 8: Commit, push, open the PR**

```bash
git add libraries/i18n tools/i18n.test.mjs scaffolds/web-vite/i18n scaffolds/web-react-ts/i18n docs/specs/2026-10-01-locale-standard.md
git commit -m "Add stripWhole to i18n money() (2.1.0)"
git push -u origin i18n-2.1.0
gh pr create --title "i18n 2.1.0: money() can drop .00 from whole amounts" --body-file -
```

PR body:

```md
Rookdex is the first consumer of the locale standard, and its prices are whole kroner. `money("nb", 949, "NOK")` gives "949,00 kr", which reads wrong in Norwegian copy.

- `money(lang, amount, currency, { stripWhole: true })` adds `trailingZeroDisplay: "stripIfInteger"`: "949 kr", while 949.5 stays "949,50 kr". Nothing is rounded.
- The default and the existing "949,00 kr" test are unchanged.
- `MoneyOptions` in `index.d.ts`, README documents the option and its browser floor (Chrome 106, Firefox 116, Safari 15.4).
- Both web scaffolds re-synced, so `scaffold-sync` stays green.
```

**Gate:** merging this PR is Malin's call. PR 2 needs it merged, because Task 2 copies the library from Workbench `main`.

---

## PR 2: Rookdex strings

Branch `locale-strings`, created from `locale-spec` so the spec and this plan ride along. No URL changes. The built pages match `main` except for price text and the footer's template attributes (Task 7 diffs them).

### Task 2: Vendored library, flat bundles and the typed layer

**Files:**
- Create: `src/lib/i18n/index.js`, `src/lib/i18n/index.d.ts`, `src/lib/i18n/VERSION` (extracted), `src/lib/i18n/README.md`
- Create: `src/locales/en.json`, `src/locales/no.json`
- Create: `src/i18n/locales.ts`
- Modify: `src/i18n/index.ts` (adds the layer; the old `t()`/`fill()` stay until Task 5)
- Create: `src/model/prices.ts`, `src/config/preferences.ts`
- Create: `src/test/price-patterns.ts`
- Test: `src/i18n/bundles.test.ts`, `src/i18n/translator.test.ts`
- Modify: `biome.json` (ignore `src/lib`)

**Interfaces:**
- Produces (from `src/i18n/index.ts`, used by every later task):

```ts
export const locales: readonly ["en", "no"]          // "nb" from Task 8
export type Locale = "en" | "no"
export const defaultLocale: Locale
export function isLocale(value: string | undefined): value is Locale
export type Key                                       // every key in en.json
export type PluralKey                                 // "hub.daysToGo" | "footer.daysToLaunch"
export type Vars = Record<string, string | number>
export interface Translator {
	readonly locale: Locale
	t(key: Key, vars?: Vars): string
	plural(key: PluralKey, count: number): string
	money(price: Price): string
	displayName(tag: Locale): string
}
export type Translate = Translator["t"]
export function translator(locale: Locale): Translator
export function hasKey(key: string): key is Key
export function seedLabel(t: Translate, kind: "category" | "group", id: string): string
```

- From `src/model/prices.ts`: `interface Price { readonly amount: number; readonly currency: string }` and `const prices: { standard: Price; ultimate: Price }` (literal `as const`).
- From `src/test/price-patterns.ts`: `PRICE_PATTERNS: RegExp[]`, `hasPrice(text: string): boolean`.

- [ ] **Step 1: Branch and vendor the library**

```bash
git switch locale-spec && git pull && git switch -c locale-strings
git -C ../workbench switch main && git -C ../workbench pull
node ../workbench/tools/extract.mjs i18n src/lib
cat src/lib/i18n/VERSION
```

Expected: `src/lib/i18n/index.js`, `index.d.ts`, `VERSION` exist, and `VERSION` prints `2.1.0`.

Create `src/lib/i18n/README.md`:

```md
Copied from workbench/libraries/i18n, do not edit here. Refresh with `node ../workbench/tools/extract.mjs i18n src/lib --force`.
```

In `biome.json`, change `files.includes` to:

```json
"includes": ["**", "!dist", "!node_modules", "!.astro", "!.wrangler", "!src/lib"]
```

- [ ] **Step 2: Flatten the string objects into JSON**

Save this one-off script as `.superpowers/flatten.ts` (git-ignored folder) and run it with `node .superpowers/flatten.ts` (Node strips the types; `no.ts` only has an `import type`, which is erased).

```ts
import { writeFileSync } from "node:fs"
import { en } from "../src/i18n/en.ts"
import { no } from "../src/i18n/no.ts"

function flat(value: unknown, path: string[] = [], out: Record<string, string> = {}) {
	if (typeof value === "string") out[path.join(".")] = value
	else if (value && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) flat(child, [...path, key], out)
	}
	return out
}

for (const [name, strings] of [["en", en], ["no", no]] as const) {
	writeFileSync(`src/locales/${name}.json`, `${JSON.stringify(flat(strings), null, "\t")}\n`)
}
```

Create the folder first: `mkdir -p src/locales`. Then run `npx biome format --write src/locales`.

- [ ] **Step 3: Hand edits in both bundles**

In `src/locales/en.json`:
- Delete `"languageNames.en"` and `"languageNames.no"`.
- Replace `"hub.daysToGo"` and `"hub.oneDayToGo"` with:
  `"hub.daysToGo.one": "{count} day to go"`, `"hub.daysToGo.other": "{count} days to go"`.
- Replace `"footer.daysToLaunch"` and `"footer.oneDayToLaunch"` with:
  `"footer.daysToLaunch.one": "{count} day to launch"`, `"footer.daysToLaunch.other": "{count} days to launch"`.
- Set `"hub.buyBody"` to: `"Digital editions unlock at midnight CET on 19 November on PlayStation 5 and Xbox Series X|S. The standard digital edition is {standard}. There is no PC version at launch."`

In `src/locales/no.json`:
- Delete `"languageNames.en"` and `"languageNames.no"`.
- `"hub.daysToGo.one": "{count} dag igjen"`, `"hub.daysToGo.other": "{count} dager igjen"` (replacing `hub.daysToGo` and `hub.oneDayToGo`).
- `"footer.daysToLaunch.one": "{count} dag til lansering"`, `"footer.daysToLaunch.other": "{count} dager til lansering"` (replacing the two footer keys).
- `"hub.buyBody": "Digitale utgaver låses opp ved midnatt norsk tid 19. november på PlayStation 5 og Xbox Series X|S. Standard digital utgave koster {standard}. Det kommer ingen PC-versjon ved lansering."`

Keep the plural pairs where the old keys were, so the files read in the same order as before.

- [ ] **Step 4: Write the price patterns helper**

`src/test/price-patterns.ts`:

```ts
// Price strings that must never sit in copy (locale spec §5.5). A price is a number from
// src/model/prices.ts, formatted at render. Both orders are caught: "949 kr" and "NOK 949".
const CURRENCY = String.raw`(?:kr(?:oner)?\.?(?![a-zæøå])|(?:NOK|SEK|DKK|EUR|USD|GBP)(?![a-zæøå])|[€$£])`
// A plain space, a no-break space or a narrow no-break space, as Intl writes them.
const GAP = String.raw`[\s\u00a0\u202f]*`

export const PRICE_PATTERNS = [
	new RegExp(String.raw`\d${GAP}${CURRENCY}`, "i"),
	new RegExp(String.raw`${CURRENCY}${GAP}\d`, "i"),
	// "949,-", the Norwegian whole-krone form.
	/\d,[-–]/,
]

export function hasPrice(text: string): boolean {
	return PRICE_PATTERNS.some((pattern) => pattern.test(text))
}
```

- [ ] **Step 5: Write the failing bundle tests**

`src/i18n/bundles.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import no from "../locales/no.json"
import { hasPrice } from "../test/price-patterns"

type Bundle = Record<string, string>

/** Every way a set of bundles breaks the standard's §7.2 rules, as readable messages. */
function bundleProblems(bundles: Record<string, Bundle>): string[] {
	const problems: string[] = []
	const all = new Set(Object.values(bundles).flatMap((bundle) => Object.keys(bundle)))
	for (const [lang, bundle] of Object.entries(bundles)) {
		for (const key of all) {
			if (!Object.hasOwn(bundle, key)) problems.push(`${lang} is missing ${key}`)
			else if (!bundle[key].trim()) problems.push(`${lang}.${key} is empty`)
		}
		for (const key of Object.keys(bundle)) {
			const base = key.replace(/\.(one|other)$/, "")
			if (base === key) continue
			for (const form of ["one", "other"]) {
				if (!Object.hasOwn(bundle, `${base}.${form}`)) {
					problems.push(`${lang} has ${key} without ${base}.${form}`)
				}
			}
		}
	}
	return problems
}

describe("bundle parity (locale spec §5.5)", () => {
	it("en and no carry the same keys, none empty, plurals complete", () => {
		expect(bundleProblems({ en, no })).toEqual([])
	})

	it("goes red on a missing key, an empty value and a half plural", () => {
		expect(bundleProblems({ en: { a: "A", b: "B" }, no: { a: "A" } })).toEqual(["no is missing b"])
		expect(bundleProblems({ en: { a: "A" }, no: { a: " " } })).toEqual(["no.a is empty"])
		expect(bundleProblems({ en: { "x.one": "1" }, no: { "x.one": "1" } })).toEqual([
			"en has x.one without x.other",
			"no has x.one without x.other",
		])
	})
})

describe("no prices in copy (locale spec §5.5, standard §13)", () => {
	it.each([
		"949 kr",
		"1 189 kr",
		"949\u00a0kr",
		"949 NOK",
		"NOK 949",
		"NOK\u00a0949",
		"€5",
		"5 kroner",
		"kr. 949",
		"949,-",
	])("flags %s", (text) => {
		expect(hasPrice(text)).toBe(true)
	})

	it.each([
		"{price}",
		"{price:standard}",
		"The standard digital edition is {standard}.",
		"19 Nov 2026",
		"That file is larger than 5 MB.",
		"Give the profile a name of 1 to 40 characters.",
		"30 sekunder",
		"2 europeiske land",
	])("passes %s", (text) => {
		expect(hasPrice(text)).toBe(false)
	})

	it.each([
		["en", en],
		["no", no],
	] as const)("%s has no price in any value", (_lang, bundle) => {
		const priced = Object.entries(bundle).filter(([, value]) => hasPrice(value))
		expect(priced).toEqual([])
	})
})
```

- [ ] **Step 6: Run them**

Run: `npx vitest run src/i18n/bundles.test.ts`
Expected: PASS if Step 3 was done right. If "no prices" fails, a bundle value still has a price; fix the bundle, not the pattern. To prove the price check bites, temporarily put "949 kr" back into `hub.buyBody` in `en.json`, see it fail, then revert.

- [ ] **Step 7: Prices and preferences**

`src/model/prices.ts`:

```ts
// Every price Rookdex shows, as a number (locale spec §5.1). Copy never carries a price: the hub
// passes these to translator().money(), and guides write {price:<id>} (integrations/markdown-price.mjs).
export interface Price {
	readonly amount: number
	/** ISO 4217. */
	readonly currency: string
}

export const prices = {
	standard: { amount: 949, currency: "NOK" },
	ultimate: { amount: 1189, currency: "NOK" },
} as const satisfies Record<string, Price>
```

`src/config/preferences.ts`:

```ts
// The project's currencies (locale standard §8), shaped like the React scaffold's config. One
// currency, so no currency picker. Languages are not configured here: the bundles in src/locales/
// are the language list.
export interface PreferencesConfig {
	/** ISO 4217 codes the project has prices for. One entry hides the currency picker. */
	readonly currencies: readonly string[]
	/** Used when no navigator.languages entry carries a mapped region. */
	readonly baseCurrency: string
	/** ISO 3166 region to currency. Every value is in `currencies`. */
	readonly regionCurrency: Readonly<Record<string, string>>
}

export const PREFERENCES: PreferencesConfig = {
	currencies: ["NOK"],
	baseCurrency: "NOK",
	regionCurrency: { NO: "NOK" },
}
```

- [ ] **Step 8: Write the failing translator tests**

`src/i18n/translator.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createTranslator } from "../lib/i18n/index.js"
import { prices } from "../model/prices"
import { hasKey, seedLabel, translator } from "./index"

const en = translator("en")
const no = translator("no")

describe("translator (locale spec §5.2)", () => {
	it("fills placeholders and leaves unknown ones visible", () => {
		expect(en.t("tracker.count", { done: 3, total: 9 })).toBe("3 of 9")
		expect(en.t("tracker.count")).toBe("{done} of {total}")
	})

	it("picks one and other by each language's plural rules", () => {
		expect(en.plural("hub.daysToGo", 1)).toBe("1 day to go")
		expect(en.plural("hub.daysToGo", 70)).toBe("70 days to go")
		expect(no.plural("footer.daysToLaunch", 1)).toBe("1 dag til lansering")
		expect(no.plural("footer.daysToLaunch", 0)).toBe("0 dager til lansering")
	})

	it("falls back to English for a key a bundle lacks (library contract)", () => {
		const fixture = createTranslator({ en: { a: "A" }, no: {} })
		expect(fixture.t("no", "a" as never)).toBe("A")
	})

	it("formats prices without .00, by language", () => {
		expect(no.money(prices.standard)).toBe("949\u00a0kr")
		expect(no.money(prices.ultimate)).toBe("1\u00a0189\u00a0kr")
		expect(no.money({ amount: 949.5, currency: "NOK" })).toBe("949,50\u00a0kr")
		// Read off Node's Intl on 2026-10-02: "symbol" display shows the code abroad.
		expect(en.money(prices.standard)).toBe("NOK\u00a0949")
	})

	it("names languages by their autonym", () => {
		expect(en.displayName("en")).toBe("English")
		expect(en.displayName("no")).toBe("Norsk")
		expect(no.displayName("en")).toBe("English")
	})

	it("labels seed ids and shows an unknown id as itself", () => {
		expect(seedLabel(en.t, "category", "wildlife")).toBe("Wildlife")
		expect(seedLabel(no.t, "group", "hidden-items")).toBe(no.t("group.hidden-items"))
		expect(seedLabel(en.t, "group", "dragons")).toBe("dragons")
	})

	it("knows its keys", () => {
		expect(hasKey("hub.buyBody")).toBe(true)
		expect(hasKey("hub.nope")).toBe(false)
		expect(hasKey("constructor")).toBe(false)
	})

	it("types plural keys", () => {
		// @ts-expect-error hub.days has no .one/.other pair
		expect(en.plural("hub.days", 2)).toBe("hub.days.other")
	})
})
```

Run: `npx vitest run src/i18n/translator.test.ts`
Expected: FAIL, `translator` is not exported.

- [ ] **Step 9: Implement `locales.ts` and the layer**

`src/i18n/locales.ts`:

```ts
// The language list, with no bundle imports, so client scripts can use it without shipping every
// string. The bundles in src/locales/ must match it (bundles.test.ts, and `satisfies` in index.ts).
export const locales = ["en", "no"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale)
}
```

Replace `src/i18n/index.ts` with:

```ts
import { createTranslator } from "../lib/i18n/index.js"
import en from "../locales/en.json"
import no from "../locales/no.json"
import type { Price } from "../model/prices"
import { en as legacyEn, type Strings } from "./en"
import type { Locale } from "./locales"
import { no as legacyNo } from "./no"

export * from "./locales"

/** Every UI string key. en.json is the source; `satisfies` below makes a key missing from another
 *  bundle a type error, and bundles.test.ts catches extra or empty ones. */
export type Key = keyof typeof en
/** A key plural() accepts: `<key>.one` and `<key>.other` both exist. */
export type PluralKey = {
	[K in Key]: K extends `${infer Base}.other` ? (`${Base}.one` extends Key ? Base : never) : never
}[Key]
export type Vars = Record<string, string | number>

const bundles = { en, no } satisfies Record<Locale, Record<Key, string>>
const i18n = createTranslator(bundles, { fallback: "en" })

/** The vendored library bound to one locale, with Rookdex's money rule (whole kroner, no ",00"). */
export interface Translator {
	readonly locale: Locale
	t(key: Key, vars?: Vars): string
	plural(key: PluralKey, count: number): string
	money(price: Price): string
	displayName(tag: Locale): string
}
export type Translate = Translator["t"]

export function translator(locale: Locale): Translator {
	return {
		locale,
		t: (key, vars) => i18n.t(locale, key, vars),
		plural: (key, count) => i18n.plural(locale, key, count),
		money: (price) => i18n.money(locale, price.amount, price.currency, { stripWhole: true }),
		displayName: (tag) => i18n.displayName(tag),
	}
}

export function hasKey(key: string): key is Key {
	return Object.hasOwn(en, key)
}

/** A seed category or group label. Seed ids are runtime strings, so an id without a key shows
 *  itself; seed.test.ts keeps every id keyed in both bundles. */
export function seedLabel(t: Translate, kind: "category" | "group", id: string): string {
	const key = `${kind}.${id}`
	return hasKey(key) ? t(key) : id
}

// The old API, removed in Task 5 once every caller has moved.
export type { Strings }
export function t(locale: Locale): Strings {
	return { en: legacyEn, no: legacyNo }[locale]
}

/** Fills `{name}` placeholders. Unknown names stay visible on purpose. */
export function fill(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in vars ? String(vars[key]) : match
	)
}
```

- [ ] **Step 10: Run the tests and the type check**

Run: `npx vitest run src/i18n && npm run check`
Expected: all PASS, `astro check` 0 errors. If the `@ts-expect-error` line reports "unused directive", `PluralKey` is too wide; fix the type, not the test.

- [ ] **Step 11: Full suite and commit**

Run: `npm test`
Expected: PASS (nothing reads the bundles yet apart from the new tests).

```bash
git add biome.json src/lib src/locales src/i18n src/model/prices.ts src/config/preferences.ts src/test/price-patterns.ts
git commit -m "Vendor i18n 2.1.0 and add flat bundles behind a typed translator"
```

### Task 3: Astro components and pages use the translator

**Files:**
- Modify: `src/components/ExternalLink.astro`, `Footer.astro`, `HistoryButtons.astro`, `LanguageSwitch.astro`, `TabBar.astro`
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/404.astro`, `src/pages/[locale]/index.astro`, `news.astro`, `settings.astro`, `tracker/index.astro`, `tracker/sources.astro`, `guides/[slug].astro`
- Modify: `src/scripts/footer-countdown.ts`
- Test: `src/scripts/footer-countdown.test.ts`, `src/components/Footer.test.ts`, and any `.astro` test whose import of `t` breaks

**Interfaces:**
- Consumes: `translator`, `seedLabel`, `Key`, `Translate` from Task 2.
- Produces: the footer chip's data attributes are now `data-one`, `data-other`, `data-out`. `footerStatus(now: Date, templates: { one: string; other: string; out: string }, lang: string): string`.

**Conversion rules** (apply to every file in this task; the type checker catches a wrong key):

| Before | After |
|---|---|
| `import { ..., t } from "../i18n"` | `import { ..., translator } from "../i18n"` |
| `const s = t(locale)` | `const { t, displayName } = translator(locale)` (destructure only what the file uses) |
| `s.hub.buyBody` | `t("hub.buyBody")` |
| `fill(s.guides.updated, { date })` | `t("guides.updated", { date })` |
| `s.nav[id]` (id is a `Tab`) | ``t(`nav.${id}`)`` |
| `s.languageNames[l]` | `displayName(l)` |
| `s.category[category] ?? category` | `seedLabel(t, "category", category)` |

The 404 page keeps English: `const { t, displayName } = translator("en")`.

- [ ] **Step 1: Write the failing footer tests**

Replace `src/scripts/footer-countdown.test.ts` content's template fixtures and expectations so they read:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { footerStatus, wireFooterStatus } from "./footer-countdown"

const templates = { one: "{count} day to launch", other: "{count} days to launch", out: "Out now" }

describe("footerStatus (feedback spec §6, locale spec §5.2)", () => {
	it("counts down with the language's plural rules", () => {
		expect(footerStatus(new Date("2026-09-10T10:00:00Z"), templates, "en")).toBe("70 days to launch")
		expect(footerStatus(new Date("2026-11-18T10:00:00Z"), templates, "en")).toBe("1 day to launch")
	})

	it("says out now after launch", () => {
		expect(footerStatus(new Date("2026-11-20T10:00:00Z"), templates, "en")).toBe("Out now")
	})
})

describe("wireFooterStatus", () => {
	afterEach(() => {
		document.body.innerHTML = ""
		document.documentElement.lang = ""
	})

	it("swaps in the live state from the data attributes, in the page's language", () => {
		document.documentElement.lang = "no"
		document.body.innerHTML = `<a data-footer-status data-one="{count} dag til lansering" data-other="{count} dager til lansering" data-out="Ute nå"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]")
		if (!chip) throw new Error("no chip")
		wireFooterStatus(chip, new Date("2026-11-18T10:00:00Z"))
		expect(chip.textContent).toBe("1 dag til lansering")
	})

	it("leaves the date alone when a template is missing", () => {
		document.body.innerHTML = `<a data-footer-status data-other="{count} days"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]")
		if (!chip) throw new Error("no chip")
		wireFooterStatus(chip, new Date("2026-09-10T10:00:00Z"))
		expect(chip.textContent).toBe("19 Nov 2026")
	})
})
```

Before replacing, read the old file and keep any case it had that the new one lacks (the "2 days" and "evening before" cases), adapted to `{count}` and the new attribute names. The dates were checked against `LAUNCH_AT`: they give 70, 1 and "Out now".

In `src/components/Footer.test.ts`, change the data-attribute expectations to:

```ts
expect(chip?.dataset.one).toBe(translator(locale).t("footer.daysToLaunch.one"))
expect(chip?.dataset.other).toBe(translator(locale).t("footer.daysToLaunch.other"))
expect(chip?.dataset.out).toBe(translator(locale).t("footer.outNow"))
```

The file runs `describe.each(["en", "no"])`, so use its `locale`, never a hard-coded `"en"`.

(import `translator` from `../i18n` and drop the old `t`/`s` lines that only fed these.)

Run: `npx vitest run src/scripts/footer-countdown.test.ts src/components/Footer.test.ts`
Expected: FAIL (old signature and attribute names).

- [ ] **Step 2: Implement `footer-countdown.ts`**

```ts
// The footer's launch chip (feedback spec §6). The page ships the launch date; this swaps in the
// live state once, at load. The templates come from data attributes, so no copy is bundled here,
// which is why the choice between them uses Intl.PluralRules directly (the rule the i18n library's
// plural() uses) instead of importing the bundles.
import { daysToGo, hubPhase } from "../model/launch"

export interface StatusTemplates {
	one: string
	other: string
	out: string
}

export function footerStatus(now: Date, templates: StatusTemplates, lang: string): string {
	if (hubPhase(now) === "after") return templates.out
	const count = daysToGo(now)
	const form = new Intl.PluralRules(lang).select(count) === "one" ? templates.one : templates.other
	return form.replace("{count}", String(count))
}

export function wireFooterStatus(chip: HTMLElement, now: Date): void {
	const text = chip.querySelector<HTMLElement>("[data-status-text]")
	const { one, other, out } = chip.dataset
	if (!text || !one || !other || !out) return
	const lang = chip.ownerDocument.documentElement.lang || "en"
	text.textContent = footerStatus(now, { one, other, out }, lang)
}
```

In `Footer.astro`, the chip's attributes become:

```astro
data-one={t("footer.daysToLaunch.one")}
data-other={t("footer.daysToLaunch.other")}
data-out={t("footer.outNow")}
```

(`t()` with no vars returns the template with `{count}` intact.)

- [ ] **Step 3: Convert the remaining components, the layout and the pages**

Apply the conversion rules to every file in the Files list. `LanguageSwitch.astro` keeps its markup and the visible `{locale.toUpperCase()}` in this PR; only `s.languageSwitch.label`, `s.languageSwitch.current` and `s.languageNames[l]` change. `settings.astro` uses `displayName(l)` in both language rows. `sources.astro` uses `seedLabel(t, "category", category)`. `[slug].astro` uses `t("guides.updated", { date: updated })` and drops `fill`.

Then confirm nothing outside the islands still reads the old API:

```bash
grep -rnE "\bs\.[a-zA-Z]|fill\(|languageNames|= t\(" src/components src/layouts src/pages src/scripts --include=*.astro --include=*.ts --exclude=*.test.ts
```

Expected: no output (test files may still use the old `t`; they move in Task 5).

- [ ] **Step 4: Run tests and the type check**

Run: `npm test && npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components src/layouts src/pages src/scripts
git commit -m "Read page and component copy through the translator"
```

### Task 4: Islands use the translator

**Files:**
- Modify: `src/islands/Countdown.tsx`, `InstallPrompt.tsx`, `Tracker.tsx`
- Modify: `src/islands/tracker/DeleteDialog.tsx`, `DeletedDialog.tsx`, `ImportDialog.tsx`, `ItemList.tsx`, `NameDialog.tsx`, `ProfileMenu.tsx`, `StatsRail.tsx`
- Test: `src/islands/Countdown.test.tsx`, `src/islands/tracker/ProfileMenu.test.tsx`, `src/islands/tracker/StatsRail.test.tsx`, and any island test that imports `t`

**Interfaces:**
- Consumes: `translator`, `Translate`, `seedLabel`, `prices`.
- Produces: tracker children take `t: Translate` instead of `strings: Strings["profile" | "tracker"]`. Islands still take `locale` as their only i18n prop (Astro serialises island props, so a translator can't be passed in).

**Conversion rules** (in addition to Task 3's):

| Before | After |
|---|---|
| `strings: Strings["profile"]` prop | `t: Translate` prop |
| `strings.deleteTitle` inside a profile child | `t("profile.deleteTitle")` |
| `strings.empty` inside a tracker child | `t("tracker.empty")` |
| `strings={s.profile}` at the call site | `t={t}` |
| `label(s.category, id)` / `label(s.group, id)` | `seedLabel(t, "category", id)` / `seedLabel(t, "group", id)`; delete the local `label` helper |
| `s.tracker.errors[state.error]` | ``t(`tracker.errors.${state.error}`)`` |

- [ ] **Step 1: Write the failing Countdown test**

Add to `src/islands/Countdown.test.tsx` (reuse its existing render helper and the `before` timestamp, 70 days out):

```tsx
it("states the price from the price model, formatted for the language", () => {
	vi.setSystemTime(new Date(before))
	render(<Countdown locale="en" initialNow={before} guideHref="#" trackerHref="/en/tracker/" />)
	// textContent, not getByText: Testing Library folds the no-break space into a plain one.
	expect(document.querySelector(".hub-state")?.textContent).toContain(
		"The standard digital edition is NOK\u00a0949."
	)
})

it("wraps the day count in its own span in both phrasings", () => {
	vi.setSystemTime(new Date(before))
	render(<Countdown locale="no" initialNow={before} guideHref="#" trackerHref="/no/tracker/" />)
	expect(daysLine().querySelector(".days-number")?.textContent).toBe("70")
	expect(daysLine()).toHaveTextContent("70 dager igjen")
})
```

The file already uses fake timers, `render(<Countdown …/>)` and a `daysLine()` helper. `useCountdown` ticks from `new Date()` on mount, so `setSystemTime` is what makes the count 70.

Run: `npx vitest run src/islands/Countdown.test.tsx`
Expected: FAIL (the English copy still says "949 kr").

- [ ] **Step 2: Implement Countdown**

Replace `DaysLine` and the top of `Countdown` with:

```tsx
/**
 * The sentence with its number in its own span, so CSS can give the number the display face
 * while the words stay in Inter (spec §7). The sentence comes filled from the translator, and the
 * number is found in it, so the translation stays in charge of word order ("70 days to go",
 * "Dag 3 etter lansering"). Countdown templates carry no other digits (copy.test.ts).
 */
function DaysLine({ text, n }: { text: string; n: number }) {
	const digits = String(n)
	const at = text.indexOf(digits)
	if (at === -1) return <>{text}</>
	return (
		<>
			{text.slice(0, at)}
			<span className="days-number">{digits}</span>
			{text.slice(at + digits.length)}
		</>
	)
}

export function Countdown({ locale, initialNow, guideHref, trackerHref }: Props) {
	const { t, plural, money } = translator(locale)
	const state = useCountdown(new Date(initialNow))
	const after = state.phase === "after"

	const n = after ? state.daysSince : state.daysToGo
	const text = after ? t("hub.daySince", { n }) : plural("hub.daysToGo", n)
```

Then replace each `s.<name>` in the JSX with `t("hub.<name>")`, `{template}`/`n` props with `<DaysLine text={text} n={n} />`, and the buy paragraph with:

```tsx
<p>{t("hub.buyBody", { standard: money(prices.standard) })}</p>
```

Imports: `import { type Locale, translator } from "../i18n"` and `import { prices } from "../model/prices"`.

- [ ] **Step 3: Convert InstallPrompt, Tracker and the tracker children**

Apply the rules. In each child, the props interface gets `t: Translate` (import `type Translate` from `../../i18n`) and drops `Strings`. `Tracker.tsx` does `const { t } = translator(locale)` and passes `t={t}`; `buildTracker(t("profile.defaultName"))` replaces `buildTracker(s.profile.defaultName)`. `fill(x, vars)` becomes `t("<key>", vars)`.

In `ProfileMenu.test.tsx` and `StatsRail.test.tsx`, replace `strings={en.profile}` / `strings={en.tracker}` (or whatever fixture they pass) with `t={translator("en").t}`.

```bash
grep -rnE "Strings|strings\.|fill\(|\bs\.[a-zA-Z]" src/islands
```

Expected: no output.

- [ ] **Step 4: Run tests and the type check**

Run: `npm test && npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/islands
git commit -m "Read island copy through the translator; the hub price comes from the price model"
```

### Task 5: Remove the old string objects and port their tests

**Files:**
- Delete: `src/i18n/en.ts`, `src/i18n/no.ts`
- Modify: `src/i18n/index.ts` (drop the legacy block), `src/i18n/index.test.ts`, `src/i18n/copy.test.ts`, `src/model/seed.test.ts`
- Modify: any test still importing `t`, `fill` or `Strings` (find with the grep in Step 1)

**Interfaces:**
- Produces: `src/i18n/index.ts` exports only the layer from Task 2 plus `locales.ts`.

- [ ] **Step 1: Find every remaining old-API user**

```bash
grep -rnE "from \"(\.\./)*i18n(/index)?\"" src integrations | grep -vE "translator|seedLabel|hasKey|type (Key|Translate|Locale)|locales|isLocale|defaultLocale"
grep -rnE "i18n/(en|no)\"|\bfill\(|Strings" src integrations
```

Each hit gets rewritten with the Task 3 and 4 rules.

- [ ] **Step 2: Port `copy.test.ts` to the bundles**

Replace the top of the file (imports and the `strings`/`all` helpers) with:

```ts
import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import no from "../locales/no.json"

const bundles = { en, no } as const
const all: [string, string][] = Object.entries(bundles).flatMap(([lang, bundle]) =>
	Object.entries(bundle).map(([key, value]): [string, string] => [`${lang}.${key}`, value])
)
const titles = (bundle: Record<string, string>) =>
	Object.entries(bundle).filter(([key]) => key.startsWith("seo.titles.")).map(([, v]) => v)
```

Then adapt each existing case:
- "walks a real number of strings": unchanged (`all.length > 150`).
- Soft hyphens: `expect(withShy).toEqual(["no.nav.settings"])`; `expect(no["settings.title"]).toBe("Innstillinger")`; `expect(no["nav.settings"].replace("\u00ad", "")).toBe(no["settings.title"])`.
- Search titles: iterate `titles(bundle)`; home description reads `bundle["seo.homeDescription"]`; headings read `en["tracker.title"]`, `no["tracker.title"]`, `en["seo.titles.home"]`.
- Countdown templates become:

```ts
describe("countdown templates (brand Task 5, locale spec §5.2)", () => {
	it.each([
		["en", en],
		["no", no],
	] as const)("%s keeps its placeholder and no other digit", (_lang, s) => {
		const plurals = [
			s["hub.daysToGo.one"],
			s["hub.daysToGo.other"],
			s["footer.daysToLaunch.one"],
			s["footer.daysToLaunch.other"],
		]
		for (const template of plurals) expect(template).toContain("{count}")
		expect(s["hub.daySince"]).toContain("{n}")
		for (const template of [...plurals, s["hub.daySince"]]) {
			// DaysLine finds the number in the filled sentence, so no other digit may appear.
			expect(template.replace(/\{\w+\}/g, "")).not.toMatch(/\d/)
		}
	})
})
```

- [ ] **Step 3: Port `seed.test.ts` and `index.test.ts`**

In `seed.test.ts`, replace the `en.category[...]` / `no.group[...]` block with:

```ts
for (const [lang, bundle] of [
	["en", en],
	["no", no],
] as const) {
	const keys = bundle as Record<string, string>
	expect(keys[`category.${item.category}`], `${lang} category ${item.category}`).toBeTruthy()
	expect(keys[`group.${item.group}`], `${lang} group ${item.group}`).toBeTruthy()
}
```

with `import en from "../locales/en.json"` and `import no from "../locales/no.json"`.

Replace `src/i18n/index.test.ts` with:

```ts
import { describe, expect, it } from "vitest"
import { isLocale, locales } from "./index"

describe("locales", () => {
	it("lists en and no, en first", () => {
		expect([...locales]).toEqual(["en", "no"])
	})

	it("isLocale guards unknown prefixes", () => {
		expect(isLocale("no")).toBe(true)
		expect(isLocale("xx")).toBe(false)
		expect(isLocale(undefined)).toBe(false)
	})
})
```

- [ ] **Step 4: Delete the old files and the legacy block**

```bash
git rm src/i18n/en.ts src/i18n/no.ts
```

In `src/i18n/index.ts`, delete the imports of `./en` and `./no` and everything under `// The old API, removed in Task 5`.

- [ ] **Step 5: Run tests and the type check**

Run: `npm test && npm run check`
Expected: PASS, 0 errors. `grep -rn "i18n/en\|i18n/no\|Strings\b\|fill(" src integrations` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add -A src/i18n src/model/seed.test.ts src
git commit -m "Remove the TypeScript string objects; copy tests read the bundles"
```

### Task 6: Guide prices through a Markdown token

Astro 7.3.2 renders Markdown with Sätteri, and a non-empty `markdown.remarkPlugins` throws on config load (it wants `@astrojs/markdown-remark`, which would swap the renderer for every guide). So the token is a Sätteri mdast plugin, and the processor is set explicitly with the same defaults (ruling 9).

**Files:**
- Modify: `package.json`, `package-lock.json` (pin `@astrojs/markdown-satteri` 0.4.1)
- Create: `integrations/markdown-price.mjs`
- Test: `integrations/markdown-price.test.ts`
- Modify: `astro.config.mjs`
- Modify: `src/model/prices.ts` (header comment)
- Modify: `src/content/guides/en/before-you-start.md`, `src/content/guides/no/before-you-start.md`
- Modify: `src/test/guide-content.test.ts`

**Interfaces:**
- Consumes: `prices` (`src/model/prices.ts`), `createTranslator` (`src/lib/i18n/index.js`), `hasPrice` (`src/test/price-patterns.ts`).
- Produces: `pricePlugin({ locales: string[] })`, a Sätteri mdast plugin factory. Tokens look like `{price:<id>}` with `<id>` a key of `prices`.

- [ ] **Step 1: Pin the processor package**

```bash
npm ls @astrojs/markdown-satteri
npm install --save-exact @astrojs/markdown-satteri@0.4.1
```

Expected: the first command shows 0.4.1 under `astro` (it is already in the tree); after the install it is a direct dependency at the same version, and `package-lock.json` gains no new packages (`git diff --stat package-lock.json` is a few lines). If `npm ls` shows another version, pin that one instead: the point is to match what Astro already uses.

- [ ] **Step 2: Write the failing plugin tests**

`integrations/markdown-price.test.ts` (drives the real Sätteri pipeline, so a wrong plugin shape fails here, not in the build):

```ts
import { pathToFileURL } from "node:url"
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri"
import { describe, expect, it } from "vitest"
import pricePlugin from "./markdown-price.mjs"

const guide = (folder: string) => pathToFileURL(`/repo/src/content/guides/${folder}/x.md`)

async function render(markdown: string, fileURL?: URL) {
	const processor = await createSatteriMarkdownProcessor({
		mdastPlugins: [pricePlugin({ locales: ["en", "no"] })],
	})
	return (await processor.render(markdown, { fileURL })).code
}

describe("markdown-price (locale spec §5.4)", () => {
	it("swaps tokens for the formatted price, per locale folder", async () => {
		expect(await render("Standard at {price:standard} and {price:ultimate}.", guide("en"))).toContain(
			"Standard at NOK 949 and NOK 1,189."
		)
		expect(await render("koster {price:standard}", guide("no"))).toContain("koster 949 kr")
	})

	it("reaches text inside emphasis and leaves inline code alone", async () => {
		const html = await render("**{price:standard}** and `{price:standard}`", guide("en"))
		expect(html).toContain("<strong>NOK 949</strong>")
		expect(html).toContain("<code>{price:standard}</code>")
	})

	it("fails the build on an unknown id", async () => {
		await expect(render("{price:deluxe}", guide("en"))).rejects.toThrow(/deluxe/)
	})

	it("fails on a token outside a locale folder, and ignores files without tokens", async () => {
		const notes = pathToFileURL("/repo/src/content/notes/x.md")
		await expect(render("{price:standard}", notes)).rejects.toThrow(/locale folder/)
		await expect(render("{price:standard}", guide("xx"))).rejects.toThrow(/locale folder/)
		await expect(render("{price:standard}")).rejects.toThrow(/locale folder/)
		await expect(render("No price here.")).resolves.toContain("No price here.")
	})
})
```

If `render()` returns its HTML under another field than `code`, read `MarkdownRenderer` in `node_modules/@astrojs/markdown-satteri/dist/satteri-processor.d.ts` and use that field.

Run: `npx vitest run integrations/markdown-price.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the plugin**

`integrations/markdown-price.mjs`:

```js
// Sätteri mdast plugin (locale spec §5.4). Guides write {price:<id>}; this swaps each token for the
// price from src/model/prices.ts, formatted for the guide's language by the vendored i18n library.
// It only replaces text nodes with text nodes, so a price stays plain text whatever Intl returns.
import { fileURLToPath } from "node:url"
import { createTranslator } from "../src/lib/i18n/index.js"
import { prices } from "../src/model/prices.ts"

const TOKEN = /\{price:([a-z0-9-]+)\}/g
const FOLDER = /[\\/]content[\\/]guides[\\/]([^\\/]+)[\\/]/

/** @param {{ locales: string[] }} options The configured locale tags, default first. */
export default function pricePlugin({ locales }) {
	const i18n = createTranslator(Object.fromEntries(locales.map((tag) => [tag, {}])), {
		fallback: locales[0],
	})

	// Called once per file; returning null skips files without a token.
	return (file) =>
		file.source.includes("{price:")
			? {
					name: "rookdex-price",
					text(node, ctx) {
						if (!node.value.includes("{price:")) return
						const path = ctx.fileURL ? fileURLToPath(ctx.fileURL) : ""
						const folder = FOLDER.exec(path)?.[1]
						if (!folder || !locales.includes(folder)) {
							throw new Error(`{price:…} is only allowed in a guide's locale folder; found in "${path}"`)
						}
						const lang = i18n.resolveLang(folder)
						const value = node.value.replace(TOKEN, (_match, id) => {
							if (!Object.hasOwn(prices, id)) {
								throw new Error(`Unknown price id "${id}" in ${path}; add it to src/model/prices.ts`)
							}
							const { amount, currency } = prices[id]
							return i18n.money(lang, amount, currency, { stripWhole: true })
						})
						ctx.replaceNode(node, { type: "text", value })
					},
				}
			: null
}
```

A reviewer's scratch prototype of this shape is in `.superpowers/review-s37/sat.mjs` (git-ignored) if the visitor API needs checking.

Run: `npx vitest run integrations/markdown-price.test.ts`
Expected: PASS.

Add to the header comment in `src/model/prices.ts`: `// After changing a price, build with \`npx astro build --force\`: the content cache doesn't see this file.`

- [ ] **Step 4: Register it and write the tokens into the guides**

In `astro.config.mjs`: add `import { satteri } from "@astrojs/markdown-satteri"` and `import pricePlugin from "./integrations/markdown-price.mjs"`, a module-level `const locales = ["en", "no"]` with the comment `// One list for routing and the price plugin. src/i18n/locales.ts must match it (bundles.test.ts).`, use `locales` in `i18n.locales`, and add:

```js
	markdown: {
		// Explicit satteri() uses the same features as Astro's implicit default, so guide HTML is unchanged.
		processor: satteri({ mdastPlugins: [pricePlugin({ locales })] }),
	},
```

Run `npx vitest run src/i18n` right away: `vitest.config.ts` loads `astro.config.mjs`, so a config that fails validation turns every test red.

Guide edits, `en/before-you-start.md`:
- Line 17: `Two editions are on sale: Standard at {price:standard} and Ultimate at {price:ultimate}. Ultimate is …` (rest unchanged)
- Line 33: `The standard digital edition is {price:standard} on the PlayStation Store and the Xbox Store. …`

`no/before-you-start.md`:
- Line 17: `To utgaver er i salg: Standard til {price:standard} og Ultimate til {price:ultimate}. Ultimate er …`
- Line 33: `Standard digital utgave koster {price:standard} i PlayStation Store og Xbox Store. …`

Add to `bundles.test.ts`'s first `describe` a check that `astro.config.mjs` and `locales.ts` agree, with `import { readFileSync } from "node:fs"` and `import { locales } from "./locales"` at the top:

```ts
	it("matches the locale list in astro.config.mjs", () => {
		const config = readFileSync(new URL("../../astro.config.mjs", import.meta.url), "utf8")
		expect(config).toContain(`const locales = ${JSON.stringify([...locales]).replace(",", ", ")}`)
	})
```

The config line must read exactly `const locales = ["en", "no"]` (Biome's format) for this to pass.

- [ ] **Step 5: Copy test over guide files, frontmatter included**

Add to `src/test/guide-content.test.ts`:

```ts
import { hasPrice } from "./price-patterns"

describe.each(["en", "no"])("%s guide prices (locale spec §5.5)", (locale) => {
	const file = read(locale)
	const frontmatter = file.slice(0, file.indexOf("\n---\n", 4))

	it("has no price string anywhere in the file", () => {
		const priced = file.split("\n").filter((line) => hasPrice(line))
		expect(priced).toEqual([])
	})

	it("uses the price tokens in the body", () => {
		expect(body(file)).toContain("{price:standard}")
		expect(body(file)).toContain("{price:ultimate}")
	})

	it("keeps tokens out of frontmatter, where the Markdown plugin never runs", () => {
		expect(frontmatter).not.toContain("{price:")
	})
})
```

- [ ] **Step 6: Run everything, including a build**

Run: `npm test && npm run check && npm run build`
Expected: PASS, and the build log shows `seo check passed`. Then:

```bash
grep -o "Standard at [^.]*\." dist/en/guides/before-you-start/index.html
grep -o "Standard til [^.]*\." dist/no/guides/before-you-start/index.html
```

Expected: `Standard at NOK 949 and Ultimate at NOK 1,189.` and `Standard til 949 kr og Ultimate til 1 189 kr.` (the spaces are no-break spaces).

If Astro fails to load `astro.config.mjs` because of the `.ts` import, stop and report. Don't work around it with a second price file: prices must have one source, so the fix is a decision for Malin.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json integrations/markdown-price.mjs integrations/markdown-price.test.ts astro.config.mjs src/model/prices.ts src/content/guides src/test/guide-content.test.ts src/i18n/bundles.test.ts
git commit -m "Format guide prices from the price model with a {price:id} Markdown token"
```

### Task 7: Prove the pages match `main`, then open PR 2

**Files:**
- Create (git-ignored, not committed): `.superpowers/dist-diff.mjs`

- [ ] **Step 1: Build `main` in the LF worktree**

The worktree `../rookdex-lf` already exists (detached).

```bash
git fetch origin
git -C ../rookdex-lf checkout --detach origin/main
(cd ../rookdex-lf && npm ci && npm run build)
```

- [ ] **Step 2: Write the normaliser**

`.superpowers/dist-diff.mjs`:

```js
// Writes every built page of a dist/ as normalised text into an output folder, so two builds can be
// compared with `git diff --no-index`. Build noise is dropped: scripts, styles, the CSP meta, build
// stamps, island attributes and hashed /_astro/ URLs. No-break spaces become plain spaces.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"
import { JSDOM } from "jsdom"

const [dist, out] = process.argv.slice(2)
const entries = await readdir(dist, { recursive: true, withFileTypes: true })
const pages = entries
	.filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
	.map((entry) => relative(dist, join(entry.parentPath, entry.name)).split(sep).join("/"))

const clean = (text) => text.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim()

for (const page of pages) {
	const doc = new JSDOM(await readFile(join(dist, page), "utf8")).window.document
	for (const el of doc.querySelectorAll(
		'script:not([type="application/ld+json"]), style, meta[http-equiv]'
	)) {
		el.remove()
	}
	// The hub's Countdown sits inside a build stamp; keep its text but drop what changes per build.
	for (const el of doc.querySelectorAll("[data-build-stamp]:not(.build-stamp)")) el.replaceChildren()
	for (const el of doc.querySelectorAll('[data-testid="countdown-digits"]')) el.remove()
	for (const el of doc.querySelectorAll(".days")) el.textContent = el.textContent.replace(/\d+/g, "#")
	const lines = []
	const walker = doc.createTreeWalker(doc.documentElement, 1 | 4)
	for (let node = walker.currentNode; node; node = walker.nextNode()) {
		if (node.nodeType === 3) {
			const text = clean(node.textContent)
			if (text) lines.push(`  "${text}"`)
			continue
		}
		const attrs =
			node.tagName === "ASTRO-ISLAND"
				? []
				: [...node.attributes]
						.filter((attr) => !attr.value.includes("/_astro/"))
						.map((attr) => `${attr.name}="${clean(attr.value)}"`)
		lines.push(`<${node.tagName.toLowerCase()}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`)
	}
	const target = join(out, `${page}.txt`)
	await mkdir(dirname(target), { recursive: true })
	await writeFile(target, `${lines.join("\n")}\n`)
}
console.log(`${pages.length} pages written to ${out}`)
```

- [ ] **Step 3: Diff the two builds**

```bash
npm run build
rm -rf .superpowers/diff && mkdir -p .superpowers/diff
node .superpowers/dist-diff.mjs ../rookdex-lf/dist .superpowers/diff/main
node .superpowers/dist-diff.mjs dist .superpowers/diff/branch
git diff --no-index --stat .superpowers/diff/main .superpowers/diff/branch
git diff --no-index .superpowers/diff/main .superpowers/diff/branch
```

Expected: both runs report the same page count, and the diff holds only these changes:

1. Every page: the footer chip's `data-days="{n} days to launch"` and `data-one-day="{n} day to launch"` become `data-one="{count} day to launch"` and `data-other="{count} days to launch"` (Norwegian pages likewise), and their order may differ.
2. `en/index.html`: "The standard digital edition is 949 kr." becomes "… is NOK 949."
3. `en/guides/before-you-start/index.html`: "Standard at 949 kr and Ultimate at 1 189 kr." becomes "Standard at NOK 949 and Ultimate at NOK 1,189.", and "is 949 kr on the PlayStation Store" becomes "is NOK 949 on the PlayStation Store".
4. No Norwegian page text changes (the no-break spaces are normalised away), `no/index.html` included.
5. The Norwegian language switch's hidden name stays "Språk: norsk" and the row stays "Norsk" (`displayName("no")`).

Any other difference is a defect from Tasks 3 to 6: find the key, fix it, rebuild, re-diff.

- [ ] **Step 4: Gates and push**

```bash
npx biome ci .
npm test && npm run check && npm run build
git push -u origin locale-strings
```

Memory trap: local `biome ci` on a CRLF checkout reports format noise. If it does, run it in `../rookdex-lf` on this branch (`git -C ../rookdex-lf -c core.autocrlf=false checkout --detach locale-strings && (cd ../rookdex-lf && npm ci && npx biome ci .)`; `core.autocrlf` is `true` on this machine, so without `-c` the new files come out CRLF), which is what CI sees.

- [ ] **Step 5: Open the PR**

```bash
gh pr create --title "Locale standard, part 1: strings through the i18n library" --body-file -
```

Body:

```md
First of three PRs that move Rookdex onto the Workbench locale standard (spec in `docs/superpowers/specs/2026-10-02-rookdex-locale-standard-design.md`, plan beside it). No URL changes here.

- The i18n library (2.1.0) is vendored untouched in `src/lib/i18n/`. Biome skips `src/lib`.
- `src/i18n/en.ts` and `no.ts` became flat bundles in `src/locales/*.json`. `translator(locale)` wraps the library with typed keys, so a typo fails `astro check`.
- Plurals use the library's `.one`/`.other`. The footer chip picks its template with `Intl.PluralRules`, because it ships no bundles.
- Prices live in `src/model/prices.ts`. The hub passes them to `money()`, and guides write `{price:standard}`, swapped at build time by `integrations/markdown-price.mjs` (a Sätteri plugin; `@astrojs/markdown-satteri` is pinned at the version Astro already installs).
- New tests: key parity, a copy test that rejects price strings in bundles and guides, translator and plugin tests.

**What changes on the page:** English prices read "NOK 949" and "NOK 1,189" instead of "949 kr" and "1 189 kr". That's `currencyDisplay: "symbol"`, which the standard picks on purpose. Norwegian text is unchanged. I diffed every built page against `main` to check this.
```

Then bind the PR in the app (`get_status`, `bind_pr`) and read CI. **Gate:** merge is Malin's call. PR 3 branches from `main` after it merges.

---

## PR 3: `nb`, the root page and the picker

Branch `locale-nb`, from `main` after PR 2 merges: `git switch main && git pull && git switch -c locale-nb`. This is the visible PR, checked on the phone against the preview.

### Task 8: `no` becomes `nb`, with 301s for old URLs

**Files:**
- Modify: `astro.config.mjs` (`const locales = ["en", "nb"]`)
- Rename: `src/locales/no.json` to `src/locales/nb.json`; `src/content/guides/no/` to `src/content/guides/nb/`
- Modify: `src/i18n/locales.ts`, `src/i18n/index.ts` (import `nb`, `bundles = { en, nb }`)
- Modify: `src/layouts/Base.astro` (`ogLocale`, `inLanguage`)
- Modify: `src/pages/[locale]/guides/[slug].astro` (`dateLocale`)
- Modify: `integrations/seo-check.mjs` (`LOCALES`, `PAGE`)
- Modify: `src/content/guides/nb/before-you-start.md` (internal links), `src/content.config.ts` (comment)
- Modify: `public/_redirects`, `src/test/redirects.test.ts`
- Modify: every test that pins the `no` locale (Step 4 finds them)

**Interfaces:**
- Produces: `locales = ["en", "nb"] as const`, `Locale = "en" | "nb"`. `translator("nb").displayName("nb")` is "Norsk bokmål".

- [ ] **Step 1: Write the failing redirects test**

Replace `src/test/redirects.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const lines = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim().replace(/\s+/g, " "))
	.filter(Boolean)

describe("_redirects (locale spec §6.2)", () => {
	it("sends every old Norwegian URL to /nb/ in one 301, the specific rumours rule first", () => {
		expect(lines).toEqual([
			"/no/tracker/rumours/ /nb/news/ 301",
			"/en/tracker/rumours/ /en/news/ 301",
			"/no /nb/ 301",
			"/no/* /nb/:splat 301",
		])
	})

	it("has no rule for the root, which is a real page now", () => {
		expect(lines.filter((line) => line.split(" ")[0] === "/")).toEqual([])
	})
})
```

Run: `npx vitest run src/test/redirects.test.ts`
Expected: FAIL.

- [ ] **Step 2: Write `public/_redirects`**

```
/no/tracker/rumours/ /nb/news/ 301
/en/tracker/rumours/ /en/news/ 301
/no /nb/ 301
/no/* /nb/:splat 301
```

Run: `npx vitest run src/test/redirects.test.ts`
Expected: PASS.

- [ ] **Step 3: Rename in source**

```bash
git mv src/locales/no.json src/locales/nb.json
git mv src/content/guides/no src/content/guides/nb
```

- `astro.config.mjs`: `const locales = ["en", "nb"]`.
- `src/i18n/locales.ts`: `export const locales = ["en", "nb"] as const`.
- `src/i18n/index.ts`: `import nb from "../locales/nb.json"`, `const bundles = { en, nb } satisfies …`.
- `Base.astro`: `const ogLocale: Record<Locale, string> = { en: "en_US", nb: "nb_NO" }` and `inLanguage: locale` in the JSON-LD block.
- `[slug].astro`: `const dateLocale = locale === "nb" ? "nb-NO" : "en-GB"`.
- `seo-check.mjs`: `const LOCALES = ["en", "nb"]` and `const PAGE = /^(en|nb)\/(.+\/)?index\.html$/`.
- `nb/before-you-start.md` line 37: `[Forsiden](/nb/)` and `[Installer siden](/nb/settings/#about)`.
- `content.config.ts` comment: `"en/before-you-start", "nb/before-you-start"`.

- [ ] **Step 4: Switch the tests**

```bash
grep -rnE "\"no\"|'no'|/no/|\bno/|no\.json|\"no\." src integrations .github
```

Every hit that means the Norwegian locale becomes `nb`: locale props (`locale: "no"`), `it.each` rows (`["no", …]`), fixture paths (`"no/index.html"`, `` `${SITE}/no/` ``), bundle imports (`import no from "../locales/no.json"` becomes `import nb from "../locales/nb.json"` and the variable follows), the soft-hyphen path `"nb.nav.settings"`, `index.test.ts` (`["en", "nb"]`, `isLocale("nb")`), `translator.test.ts` (`translator("nb")`, and `displayName("nb")` is `"Norsk bokmål"`). Base.test's JSON-LD case becomes `["nb", "nb"]`.

These are not locale codes and stay: the yes/no strings (`settings.no`, `data-no`, `dataset.no`), the markdown-price test's own fixture list, the `/no` sources in `_redirects`, and external URLs. In particular the PlayStation Store source `https://store.playstation.com/no-no/concept/10000730` in both guides and in `guide-content.test.ts` is the store's region path, not ours. After this step, `grep -rn "store.playstation.com/no-no/concept/10000730" src` still prints three lines.

The grep also covers `.github/workflows/deploy.yml` (IndexNow) and `src/model/guides.ts`; fix any hard-coded `no` there the same way.

- [ ] **Step 5: Run tests, check and build**

Run: `npm test && npm run check && npm run build`
Expected: PASS and `seo check passed`. Then:

```bash
ls dist | sort
grep -o '<html lang="[a-z]*"' dist/nb/index.html
grep -o 'Standard til [^.]*\.' dist/nb/guides/before-you-start/index.html
```

Expected: `en` and `nb` folders and no `no`; `<html lang="nb"`; the guide price as in Task 6.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Use nb instead of no in URLs, tags and bundles; 301 the old /no/ paths"
```

### Task 9: The root page resolves the language in the browser

**Files:**
- Create: `src/model/root-resolver.ts`, `src/model/root-resolver.test.ts`
- Create: `src/pages/index.astro`, `src/test/root-page.test.ts`
- Modify: `src/i18n/locales.ts` (`LANG_KEY`)
- Modify: `src/layouts/Base.astro` (x-default, JSON-LD comment), `src/layouts/Base.test.ts`
- Modify: `integrations/seo-check.mjs` (rules 8 and 9), `integrations/seo-check.test.ts`
- Modify: `src/styles/tokens.test.ts` (second `theme-color` exemption)

**Interfaces:**
- Consumes: `createTranslator` (vendored), `locales`, `defaultLocale`, `translator`, `jsonLd`, `SITE`.
- Produces: `LANG_KEY = "lang"` in `src/i18n/locales.ts`. In `src/model/root-resolver.ts`: `rootScript(tags: readonly string[], fallback: string, key: string): string` and ``scriptHash(source: string): `sha256-${string}` `` (Astro's `CspHash` type).

- [ ] **Step 1: Write the failing resolver tests**

`src/model/root-resolver.test.ts`:

```ts
import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"
import { createTranslator } from "../lib/i18n/index.js"
import { rootScript, scriptHash } from "./root-resolver"

const TAGS = ["en", "nb"]
const source = rootScript(TAGS, "en", "lang")

interface Env {
	stored?: string
	languages?: string[]
	language?: string
	blocked?: boolean
}

/** Runs the shipped script text with fake storage, navigator and location. */
function run({ stored, languages, language, blocked }: Env) {
	const store = new Map<string, string>(stored === undefined ? [] : [["lang", stored]])
	const fail = () => {
		throw new Error("SecurityError")
	}
	const localStorage = blocked
		? { getItem: fail, removeItem: fail }
		: { getItem: (k: string) => store.get(k) ?? null, removeItem: (k: string) => store.delete(k) }
	const location = { replace: vi.fn() }
	vm.runInNewContext(source, { localStorage, navigator: { languages, language }, location })
	expect(location.replace).toHaveBeenCalledOnce()
	return { target: location.replace.mock.calls[0][0] as string, store }
}

describe("root resolver (locale spec §6.4, §7.4)", () => {
	it("follows a stored choice over the browser", () => {
		expect(run({ stored: "nb", languages: ["en-US"] }).target).toBe("/nb/")
		expect(run({ stored: "en", languages: ["nb-NO"] }).target).toBe("/en/")
	})

	it("reads navigator.languages when nothing is stored", () => {
		expect(run({ languages: ["nb-NO", "en"] }).target).toBe("/nb/")
		expect(run({ languages: ["sv-SE"] }).target).toBe("/en/")
		expect(run({ languages: ["nn-NO"] }).target).toBe("/nb/")
		expect(run({ languages: ["xx", "no"] }).target).toBe("/nb/")
	})

	it("removes a stored value that is not a configured language, then falls through", () => {
		for (const stale of ["no", "system", "", "NB", "<script>"]) {
			const { target, store } = run({ stored: stale, languages: ["nb-NO"] })
			expect(target, stale).toBe("/nb/")
			expect(store.has("lang"), stale).toBe(false)
		}
	})

	it("treats blocked storage as nothing stored", () => {
		expect(run({ blocked: true, languages: ["nb"] }).target).toBe("/nb/")
	})

	it("survives an empty languages list and a missing navigator.language", () => {
		expect(run({ languages: [], language: undefined }).target).toBe("/en/")
		expect(run({ languages: undefined, language: "nb-NO" }).target).toBe("/nb/")
	})

	it("agrees with the i18n library's resolveLang on every case", () => {
		const lib = createTranslator({ en: {}, nb: {} })
		const cases: Env[] = [
			{ languages: ["nb-NO", "en"] },
			{ languages: ["sv-SE"] },
			{ stored: "nb", languages: ["en-US"] },
			{ stored: "no", languages: ["no"] },
			{ stored: "system", languages: ["sv"] },
			{ languages: ["nn-NO"] },
			{ languages: ["EN-gb"] },
			{ languages: ["xx", "no"] },
			{ languages: [] },
			{ stored: "", languages: ["nb"] },
		]
		for (const env of cases) {
			const stored = env.stored !== undefined && TAGS.includes(env.stored) ? env.stored : null
			const wanted = env.languages?.length ? env.languages : [env.language]
			expect(run(env).target, JSON.stringify(env)).toBe(`/${lib.resolveLang(stored, wanted)}/`)
		}
	})

	it("hashes the exact text for the CSP", () => {
		expect(scriptHash("a")).toBe("sha256-ypeBEsobvcr6wjGzmiPcTaeG7/gUfE5yuYB3ha/uSLs=")
	})
})
```

Run: `npx vitest run src/model/root-resolver.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the resolver**

Add to `src/i18n/locales.ts`:

```ts
/** The localStorage key for an explicit language choice (locale standard §5). Absent means System. */
export const LANG_KEY = "lang"
```

`src/model/root-resolver.ts`:

```ts
import { createHash } from "node:crypto"

/**
 * The root page's inline script (locale spec §6.4). A classic script in <head>, so it runs before
 * first paint; a bundled module is deferred and would flash the link page. It mirrors the i18n
 * library's resolveLang for one stored value plus navigator.languages, and root-resolver.test.ts runs
 * both on the same inputs. ES5 on purpose: it ships exactly as written. It jumps to a configured tag,
 * never to the stored string itself.
 */
export function rootScript(tags: readonly string[], fallback: string, key: string): string {
	return [
		"(function () {",
		`  var tags = ${JSON.stringify(tags)};`,
		'  var aliases = { no: "nb", nn: "nb" };',
		"  function pick(tag) {",
		'    if (typeof tag !== "string") return null;',
		'    var short = tag.toLowerCase().split("-")[0];',
		"    if (tags.indexOf(short) !== -1) return short;",
		"    var alias = aliases.hasOwnProperty(short) ? aliases[short] : null;",
		"    return alias && tags.indexOf(alias) !== -1 ? alias : null;",
		"  }",
		"  var lang = null;",
		"  try {",
		`    var stored = localStorage.getItem(${JSON.stringify(key)});`,
		"    if (stored !== null && tags.indexOf(stored) === -1) {",
		`      localStorage.removeItem(${JSON.stringify(key)});`,
		"    } else {",
		"      lang = stored;",
		"    }",
		"  } catch (e) {}",
		"  var wanted = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];",
		"  for (var i = 0; !lang && i < wanted.length; i++) lang = pick(wanted[i]);",
		`  location.replace("/" + (lang || ${JSON.stringify(fallback)}) + "/");`,
		"})();",
	].join("\n")
}

/** The CSP source for an inline script: sha256 of its exact text, base64. */
export function scriptHash(source: string): `sha256-${string}` {
	return `sha256-${createHash("sha256").update(source, "utf8").digest("base64")}`
}
```

Run: `npx vitest run src/model/root-resolver.test.ts`
Expected: PASS. If only the `"a"` hash case fails, the test constant is wrong, not the function: print the real one with `node -e "console.log(require('crypto').createHash('sha256').update('a').digest('base64'))"` and pin that.

- [ ] **Step 3: Write the failing root page test**

`src/test/root-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import RootPage from "../pages/index.astro"
import { renderDoc } from "./render"

describe("root page (locale spec §6.4)", () => {
	it("is English, named Rookdex, with the canonical root and the full hreflang set", async () => {
		const doc = await renderDoc(RootPage)
		expect(doc.documentElement.lang).toBe("en")
		expect(doc.title).toBe("Rookdex")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/"
		)
		const alternates = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
			l.getAttribute("hreflang"),
			l.getAttribute("href"),
		])
		expect(alternates).toEqual([
			["en", "https://rookdex.app/en/"],
			["nb", "https://rookdex.app/nb/"],
			["x-default", "https://rookdex.app/"],
		])
	})

	it("carries the language-neutral WebSite JSON-LD", async () => {
		const doc = await renderDoc(RootPage)
		const blocks = doc.querySelectorAll('script[type="application/ld+json"]')
		expect(blocks).toHaveLength(1)
		expect(JSON.parse(blocks[0].textContent ?? "")).toEqual({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "Rookdex",
			url: "https://rookdex.app/",
		})
	})

	it("puts the resolver first in head, right after the charset (stylesheet order is seo-check rule 8)", async () => {
		const doc = await renderDoc(RootPage)
		const head = [...doc.head.children]
		expect(head[0].matches("meta[charset]")).toBe(true)
		expect(head[1].tagName).toBe("SCRIPT")
		expect(head[1].hasAttribute("type")).toBe(false)
		expect(head[1].textContent).toContain("location.replace")
	})

	it("keeps the link preview for the bare domain, which unfurlers fetch without JavaScript", async () => {
		const doc = await renderDoc(RootPage)
		const meta = (selector: string) => doc.querySelector(selector)?.getAttribute("content")
		expect(meta('meta[property="og:image"]')).toBe("https://rookdex.app/og.png")
		expect(meta('meta[property="og:url"]')).toBe("https://rookdex.app/")
		expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image")
	})

	it("works without JavaScript: one plain link per language, by autonym", async () => {
		const doc = await renderDoc(RootPage)
		expect(doc.querySelector("main h1")).not.toBeNull()
		const links = [...doc.querySelectorAll("main a")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
			a.textContent?.trim(),
		])
		expect(links).toEqual([
			["/en/", "en", "en", "English"],
			["/nb/", "nb", "nb", "Norsk bokmål"],
		])
	})
})
```

Run: `npx vitest run src/test/root-page.test.ts`
Expected: FAIL, the page doesn't exist.

- [ ] **Step 4: Write the root page**

`src/pages/index.astro`:

```astro
---
import "@fontsource-variable/inter"
import "@fontsource-variable/dm-sans"
import "@fontsource/bebas-neue"
import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from "astro:i18n"
import Mark from "../components/Mark.astro"
import { defaultLocale, LANG_KEY, locales, translator } from "../i18n"
import { rootScript, scriptHash } from "../model/root-resolver"
import { jsonLd, SITE } from "../model/seo"
import "../styles/global.css"

// The language-neutral root (locale spec §6.4). With JavaScript, the inline resolver jumps to the
// stored or browser language before first paint. Without it, and for crawlers, the page is one plain
// link per language. Astro's CSP hashes only the scripts it bundles, so this one's hash is inserted by
// hand, and seo-check rule 8 fails the build if the two drift, so a move of the CSP into a header
// can't block it. The og tags are here because link unfurlers fetch the bare domain without JavaScript.
const { t, displayName } = translator(defaultLocale)
const resolver = rootScript(locales, defaultLocale, LANG_KEY)
Astro.csp?.insertScriptHash(scriptHash(resolver))
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<script is:inline set:html={resolver}></script>
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<title>Rookdex</title>
		<meta name="description" content={t("seo.homeDescription")} />
		<meta name="color-scheme" content="dark" />
		<meta name="theme-color" content="#000000" />
		<link rel="manifest" href="/manifest.webmanifest" />
		<link rel="icon" href="/favicon.ico" sizes="48x48" />
		<link rel="icon" href="/icon.svg" type="image/svg+xml" />
		<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
		<link rel="canonical" href={`${SITE}/`} />
		{locales.map((l) => <link rel="alternate" hreflang={l} href={getAbsoluteLocaleUrl(l, "")} />)}
		<link rel="alternate" hreflang="x-default" href={`${SITE}/`} />
		<meta property="og:url" content={`${SITE}/`} />
		<meta property="og:site_name" content="Rookdex" />
		<meta property="og:type" content="website" />
		<meta property="og:title" content="Rookdex" />
		<meta property="og:description" content={t("seo.homeDescription")} />
		<meta property="og:image" content={`${SITE}/og.png`} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content={t("seo.ogImageAlt")} />
		<meta name="twitter:card" content="summary_large_image" />
		<script
			type="application/ld+json"
			is:inline
			set:html={jsonLd({
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: "Rookdex",
				url: `${SITE}/`,
			})}
		></script>
	</head>
	<body class="root">
		<main class="root-main">
			<h1 class="lockup" aria-label="Rookdex">
				<Mark id="root" size={48} />
				<span class="wordmark">ROOKDEX</span>
			</h1>
			<ul class="root-links">
				{
					locales.map((l) => (
						<li>
							<a href={getRelativeLocaleUrl(l, "")} hreflang={l} lang={l}>
								{displayName(l)}
							</a>
						</li>
					))
				}
			</ul>
		</main>
	</body>
</html>

<style>
	/* No tab bar here, so none of the body's bottom padding for it. */
	:global(body.root) {
		justify-content: center;
		padding-bottom: env(safe-area-inset-bottom);
	}
	.root-main {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		padding: var(--space-5) var(--space-3);
	}
	.root-links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.root-links a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
		padding: 0 var(--space-3);
	}
</style>
```

`src/styles/tokens.test.ts` exempts only `layouts/Base.astro` from the raw-hex rule, so it fails on this page's `theme-color`. Change `if (file === "layouts/Base.astro")` to `if (file === "layouts/Base.astro" || file === "pages/index.astro")`; the literal-line assertion then holds for both.

Run: `npx vitest run src/test/root-page.test.ts src/styles/tokens.test.ts && npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 5: x-default on the home pages**

Add to `src/layouts/Base.test.ts`:

```ts
	it.each(["en", "nb"] as const)("points the %s home page's x-default at the root", async (locale) => {
		const home = await page("", { locale })
		expect(home.querySelector('link[hreflang="x-default"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/"
		)
		const tracker = await page("tracker", { locale })
		expect(tracker.querySelector('link[hreflang="x-default"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/en/tracker/"
		)
	})
```

In `Base.astro`, the x-default line becomes:

```astro
<link
	rel="alternate"
	hreflang="x-default"
	href={path === "" ? `${SITE}/` : getAbsoluteLocaleUrl(defaultLocale, path)}
/>
```

and the JSON-LD comment becomes:

```astro
/* Site name (SEO spec D7, locale spec §6.4). Google reads it at the domain root, and the root page
   carries it. Googlebot may treat the root's jump as a redirect and land here, so the home pages
   keep their copy. The block is data, never runs, and needs no CSP hash; jsonLd escapes "<". */
```

Run: `npx vitest run src/layouts/Base.test.ts`
Expected: PASS.

- [ ] **Step 6: seo-check learns the root (rules 8 and 9)**

Write the failing tests first. In `integrations/seo-check.test.ts`, add a root fixture and put it, plus x-default links on the home pages, into `good()`:

```ts
import { createHash } from "node:crypto"

const RESOLVER = 'location.replace("/en/")'
const RESOLVER_HASH = `sha256-${createHash("sha256").update(RESOLVER).digest("base64")}`
const XDEFAULT = `<link rel="alternate" hreflang="x-default" href="${SITE}/">`

function root({ hash = RESOLVER_HASH, sheetFirst = false, xDefault = `${SITE}/` } = {}) {
	const sheet = '<link rel="stylesheet" href="/_astro/a.css">'
	return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="content-security-policy" content="script-src 'self' '${hash}'">${sheetFirst ? sheet : ""}<script>${RESOLVER}</script>${sheetFirst ? "" : sheet}<title>Rookdex</title><link rel="canonical" href="${SITE}/"><link rel="alternate" hreflang="en" href="${SITE}/en/"><link rel="alternate" hreflang="nb" href="${SITE}/nb/"><link rel="alternate" hreflang="x-default" href="${xDefault}"><meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image">${LD}</head><body></body></html>`
}
```

In `good()`: add `"index.html": root()`, and the two home pages become `` page(`${SITE}/en/`, LD + XDEFAULT) `` and `` page(`${SITE}/nb/`, LD + XDEFAULT) ``.

New cases:

```ts
	it("rule 8: the root page is missing, or its canonical, hreflang or JSON-LD is wrong", () => {
		const missing = good()
		delete missing["index.html"]
		expect(rules(missing)).toContain("[seo 8]")
		for (const html of [
			root().replace(`rel="canonical" href="${SITE}/"`, `rel="canonical" href="${SITE}/en/"`),
			root().replace(`hreflang="nb" href="${SITE}/nb/"`, `hreflang="nb" href="${SITE}/en/"`),
			root({ xDefault: `${SITE}/en/` }),
			root().replace(LD, ""),
		]) {
			expect(rules({ ...good(), "index.html": html })).toContain("[seo 8]")
		}
	})

	it("rule 8: the resolver's hash is missing from the CSP, or a stylesheet loads first", () => {
		expect(rules({ ...good(), "index.html": root({ hash: "sha256-stale" }) })).toContain("[seo 8]")
		expect(rules({ ...good(), "index.html": root({ sheetFirst: true }) })).toContain("[seo 8]")
	})

	it("rule 8: the root has no og:image or twitter:card", () => {
		for (const html of [
			root().replace(/<meta property="og:image" [^>]*>/, ""),
			root().replace(/<meta name="twitter:card" [^>]*>/, ""),
		]) {
			expect(rules({ ...good(), "index.html": html })).toContain("[seo 8]")
		}
	})

	it("rule 8: the root is never a sitemap URL", () => {
		const files = good()
		files["sitemap.xml"] = sitemap(["", "en/", "nb/", "en/news/", "nb/news/"])
		expect(rules(files)).toContain("[seo 8]")
	})

	it("rule 9: a home page whose x-default is not the root", () => {
		const html = page(`${SITE}/en/`, LD + XDEFAULT.replace(`${SITE}/"`, `${SITE}/en/"`))
		expect(rules({ ...good(), "en/index.html": html })).toContain("[seo 9]")
	})
```

Run: `npx vitest run integrations/seo-check.test.ts`
Expected: the new cases FAIL. Then implement in `seo-check.mjs`:

- `import { createHash } from "node:crypto"` at the top.
- `const ROOT_FILES = ["index.html", "404.html", "sitemap.xml", "robots.txt", "indexnow-key.txt"]`.
- The `seoErrors` doc comment's file list gains "index.html (the root page)".
- Append before `return errors`:

```js
	// Rule 8: the root page (locale spec §6.4). It names itself, both languages and x-default, carries
	// the site-name block, and its resolver runs first among scripts and stylesheets, with its exact
	// hash in the CSP. A stale hash would leave every JavaScript visitor on the link page.
	const rootHtml = files["index.html"]
	if (rootHtml === undefined) {
		errors.push("[seo 8] index.html (the root page) is missing")
	} else {
		const rootHead = head(rootHtml)
		const links = tags(rootHead, "link")
		const canonical = links.filter((tag) => attr(tag, "rel") === "canonical")
		if (canonical.length !== 1 || attr(canonical[0], "href") !== `${base}/`) {
			errors.push(`[seo 8] index.html needs exactly one canonical link, to ${base}/`)
		}
		const alternates = new Map(
			links
				.filter((tag) => attr(tag, "rel") === "alternate")
				.map((tag) => [attr(tag, "hreflang"), attr(tag, "href")])
		)
		for (const locale of LOCALES) {
			if (alternates.get(locale) !== `${base}/${locale}/`) {
				errors.push(`[seo 8] index.html needs hreflang ${locale} pointing at ${base}/${locale}/`)
			}
		}
		if (alternates.get("x-default") !== `${base}/`) {
			errors.push(`[seo 8] index.html needs hreflang x-default pointing at ${base}/`)
		}
		const blocks = [...rootHtml.matchAll(LD_BLOCK)]
		let url
		try {
			url = blocks.length === 1 ? JSON.parse(blocks[0][1]).url : undefined
		} catch {
			url = undefined
		}
		if (url !== `${base}/`) errors.push(`[seo 8] index.html needs one JSON-LD block with url ${base}/`)
		// Unfurlers fetch the bare domain without JavaScript, so the root carries the link preview.
		const image = metas(rootHead, "property", "og:image")
		if (image.length !== 1 || attr(image[0], "content") !== `${base}/og.png`) {
			errors.push(`[seo 8] index.html needs one og:image at ${base}/og.png`)
		}
		if (metas(rootHead, "name", "twitter:card").length !== 1) {
			errors.push("[seo 8] index.html needs one twitter:card")
		}
		const resolver = /<script>([\s\S]*?)<\/script>/.exec(rootHead)
		if (!resolver) {
			errors.push("[seo 8] index.html has no inline resolver script")
		} else {
			const hash = `'sha256-${createHash("sha256").update(resolver[1], "utf8").digest("base64")}'`
			const csp = metas(rootHead, "http-equiv", "content-security-policy")[0]
			if (!decode(attr(csp ?? "", "content") ?? "").includes(hash)) {
				errors.push("[seo 8] index.html's CSP lacks the resolver's hash")
			}
			const sheet = rootHead.search(/<link\b[^>]*rel="stylesheet"|<style\b/)
			if (sheet !== -1 && sheet < resolver.index) {
				errors.push("[seo 8] index.html loads a stylesheet before the resolver, so the link page can flash")
			}
		}
	}
	if (listed.includes(`${base}/`)) {
		errors.push("[seo 8] the root is in the sitemap; Google treats its jump as a redirect")
	}

	// Rule 9: each home page names the root as x-default (locale spec §6.3).
	for (const locale of LOCALES) {
		const file = `${locale}/index.html`
		const xDefault = tags(head(files[file] ?? ""), "link").filter(
			(tag) => attr(tag, "rel") === "alternate" && attr(tag, "hreflang") === "x-default"
		)
		if (xDefault.length !== 1 || attr(xDefault[0], "href") !== `${base}/`) {
			errors.push(`[seo 9] ${file} needs one hreflang x-default pointing at ${base}/`)
		}
	}
```

The sitemap case also trips rule 1 (`${base}/` has no entry in `pages`); that's fine, the test only asks for rule 8.

Run: `npx vitest run integrations/seo-check.test.ts`
Expected: PASS, the good build included.

- [ ] **Step 7: Build and read the real root**

Run: `npm test && npm run check && npm run build`
Expected: PASS, and `seo check passed: <n> files` with n one higher than in Task 8 (the root). Then:

```bash
grep -c "<loc>" dist/sitemap.xml
grep -o "<loc>https://rookdex.app/</loc>" dist/sitemap.xml
```

Expected: 10, as on `main`, and the second grep prints nothing.

- [ ] **Step 8: Commit**

```bash
git add src/model/root-resolver.ts src/model/root-resolver.test.ts src/pages/index.astro src/test/root-page.test.ts src/i18n/locales.ts src/layouts integrations/seo-check.mjs integrations/seo-check.test.ts src/styles/tokens.test.ts
git status --short
git commit -m "Add a root page that picks the language in the browser, with a hashed resolver"
```

### Task 10: The installed app opens at the root, online and offline

**Files:**
- Modify: `public/manifest.webmanifest` (`start_url`)
- Modify: `src/sw/sw.js` (offline fallback)
- Test: `src/sw/sw.test.ts`, `integrations/precache.test.ts`, `src/test/public-files.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/sw/sw.test.ts`, add:

```ts
async function navigateTo(worker: ReturnType<typeof loadWorker>, url: string) {
	let responded: Promise<Response> | undefined
	const pending: Promise<unknown>[] = []
	worker.listeners.get("fetch")?.({
		request: { method: "GET", url, mode: "navigate" },
		respondWith: (p: Promise<Response>) => {
			responded = p
		},
		waitUntil: (p: Promise<unknown>) => pending.push(p),
	})
	const response = await responded
	await Promise.all(pending)
	return response
}

describe("offline fallback (locale spec §6.5)", () => {
	const offline = () => Promise.reject(new TypeError("offline"))

	it("answers an old /no/ page with the cached root, which resolves the language itself", async () => {
		const worker = loadWorker(offline)
		await worker.put("/en/", new Response("english home"))
		await worker.put("/", new Response("root"))
		const response = await navigateTo(worker, "https://rookdex.app/no/x/")
		expect(await response?.text()).toBe("root")
	})

	it("still prefers the same language's home when it is cached", async () => {
		const worker = loadWorker(offline)
		await worker.put("/nb/", new Response("norsk"))
		await worker.put("/", new Response("root"))
		const response = await navigateTo(worker, "https://rookdex.app/nb/unknown/")
		expect(await response?.text()).toBe("norsk")
	})
})
```

In `integrations/precache.test.ts`, add:

```ts
	it("precaches the root page, so the installed app resolves offline", () => {
		expect(precacheUrls(["index.html", "en/index.html", "nb/index.html"])).toContain("/")
	})
```

Read `src/test/public-files.test.ts`. If it asserts `start_url`, change the expectation to `"/"`. If not, add (importing `readFileSync` from `node:fs` if needed):

```ts
	it("starts the installed app at the root and keeps its identity", () => {
		const manifest = JSON.parse(
			readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8")
		)
		expect(manifest.start_url).toBe("/")
		expect(manifest.id).toBe("/")
	})
```

Run: `npx vitest run src/sw/sw.test.ts integrations/precache.test.ts src/test/public-files.test.ts`
Expected: the `/no/x/` case and the manifest case FAIL. The precache case passes already (the mapping exists); it stays as a pin.

- [ ] **Step 2: Implement**

`public/manifest.webmanifest`: `"start_url": "/",` (nothing else changes).

`src/sw/sw.js`, the last lines of `staleWhileRevalidate`:

```js
	// Unknown page while offline: the same language's home, else the root, which resolves the language
	// itself (an old /no/ bookmark has no /no/ home in the cache any more).
	const localeHome = `/${url.pathname.split("/")[1] || "en"}/`
	return (await cache.match(localeHome)) ?? (await cache.match("/")) ?? Response.error()
```

- [ ] **Step 3: Run tests, build, check the worker**

Run: `npm test && npm run build`
Expected: PASS. Then check the precache list itself (a plain grep for `"/"` also hits `split("/")`):

```bash
node -e "const s=require('fs').readFileSync('dist/sw.js','utf8');const l=JSON.parse(s.match(/const PRECACHE = (\[.*?\])/s)[1]);if(!l.includes('/'))process.exit(1);console.log('root precached')"
```

Expected: `root precached`. If the regex finds nothing, read how `fillWorker` names the list in `src/sw/sw.js` and match that name.

- [ ] **Step 4: Commit**

```bash
git add public/manifest.webmanifest src/sw integrations/precache.test.ts src/test/public-files.test.ts
git commit -m "Start the installed app at the root and fall back to it offline"
```

### Task 11: The header picker becomes the DS picker

**Files:**
- Create: `src/lib/picker.js` (copied from `../workbench/libraries/design-system/components/picker.js`, DS 3.8.0), `src/lib/README.md`
- Modify: `src/components/LanguageSwitch.astro`
- Modify: `src/layouts/Base.astro` (import `picker.js`)
- Modify: `src/styles/global.css` (picker selectors, list max height)
- Modify: `src/locales/en.json`, `src/locales/nb.json` (add `picker.*`, remove `languageSwitch.*`)
- Delete: `src/scripts/language-menu.ts`, `src/scripts/language-menu.test.ts`
- Test: `src/components/LanguageSwitch.test.ts`, `src/scripts/picker.test.ts` (new)

**Interfaces:**
- Produces markup Task 12 relies on: language rows are `a.picker-row[data-picker-row="<tag>"]`. The System item is `li[data-system-item][hidden]` holding `a[data-picker-row=""][data-hrefs]` (a JSON map of tag to this page's URL) and an empty `span[data-system-name]`. The System link has no `picker-row` class until Task 12's script shows it, so `picker.js` never moves focus to a hidden row.

- [ ] **Step 1: Vendor the picker**

```bash
cp ../workbench/libraries/design-system/components/picker.js src/lib/picker.js
cat ../workbench/libraries/design-system/VERSION
```

Expected: `3.8.0`. Create `src/lib/README.md`:

```md
Vendored from Workbench. Do not edit here: fix upstream, then re-copy.

- `i18n/`: workbench/libraries/i18n (version in `i18n/VERSION`).
- `picker.js`: workbench/libraries/design-system/components/picker.js, DS 3.8.0.
```

- [ ] **Step 2: Bundle keys**

`en.json`: remove `languageSwitch.label` and `languageSwitch.current`; add `"picker.language": "Language"` and `"picker.system": "System ({value})"`.
`nb.json`: remove the same two; add `"picker.language": "Språk"` and `"picker.system": "System ({value})"`.

- [ ] **Step 3: Write the failing markup tests**

Replace `src/components/LanguageSwitch.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import LanguageSwitch from "./LanguageSwitch.astro"

describe("language picker markup (locale spec §7.1, standard §6.1)", () => {
	it("is a labelled nav holding a picker disclosure, with no menu roles", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "nb", path: "tracker" } })
		expect(
			doc.querySelector('nav[aria-label="Språk"] > details[data-picker="lang"] > summary')
		).not.toBeNull()
		expect(doc.querySelector('ul.picker-list[aria-label="Språk"]')).not.toBeNull()
		expect(doc.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
	})

	it("names the trigger with hidden text only, no visible code", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "" } })
		const summary = doc.querySelector("summary")
		const tip = summary?.querySelector(".tip")
		expect(tip?.getAttribute("aria-hidden")).toBe("true")
		expect(tip?.textContent).toBe("Language")
		tip?.remove()
		expect(summary?.querySelector(".lang-chevron")).toBeNull()
		expect(summary?.textContent?.replace(/\s+/g, " ").trim()).toBe("Language: English")
		expect(summary?.querySelector(".visually-hidden")?.textContent).toBe("Language: English")
		expect(summary?.hasAttribute("aria-label")).toBe(false)
	})

	it("links the same page in each language and marks the current one", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "nb", path: "tracker" } })
		const rows = [...doc.querySelectorAll("a.picker-row")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
			a.getAttribute("data-picker-row"),
		])
		expect(rows).toEqual([
			["/en/tracker/", "en", "en", "en"],
			["/nb/tracker/", "nb", "nb", "nb"],
		])
		const current = doc.querySelectorAll('a.picker-row[aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe("Norsk bokmål")
	})

	it("ships the System row first and hidden, with every language's URL for this page", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "news" } })
		const first = doc.querySelector(".picker-list > li")
		expect(first?.hasAttribute("data-system-item")).toBe(true)
		expect(first?.hasAttribute("hidden")).toBe(true)
		const link = first?.querySelector("a")
		expect(link?.getAttribute("data-picker-row")).toBe("")
		expect(link?.classList.contains("picker-row")).toBe(false)
		expect(JSON.parse(link?.getAttribute("data-hrefs") ?? "")).toEqual({
			en: "/en/news/",
			nb: "/nb/news/",
		})
		expect(link?.textContent?.replace(/\s+/g, " ").trim()).toBe("System ()")
		expect(link?.querySelector("[data-system-name]")).not.toBeNull()
	})
})
```

Run: `npx vitest run src/components/LanguageSwitch.test.ts`
Expected: FAIL.

- [ ] **Step 4: Rewrite `LanguageSwitch.astro`**

Frontmatter:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { defaultLocale, type Locale, locales, translator } from "../i18n"

interface Props {
	locale: Locale
	path: string
}

// A disclosure of plain links, not an ARIA menu (spec §6, standard §6.1). The URL is the language.
// Behaviour comes from the vendored DS picker.js, imported once in Base. The System row ships hidden:
// only the browser knows navigator.languages, so src/scripts/language-choice.ts fills it in.
const { locale, path } = Astro.props
const { t, displayName } = translator(locale)
const name = `${t("picker.language")}: ${displayName(locale)}`
const hrefs = Object.fromEntries(locales.map((l) => [l, getRelativeLocaleUrl(l, path)]))
const [systemBefore, systemAfter = ""] = t("picker.system").split("{value}")
---
```

Markup changes, keeping the globe and check SVGs exactly as they are:
- `<nav class="lang" aria-label={t("picker.language")}>`.
- `<details data-picker="lang">` replaces `<details data-language-menu>`.
- In `<summary>` (which gains `class="has-tip tip-end"`): the globe SVG, then `<span class="visually-hidden">{name}</span>`, then `<span class="tip" aria-hidden="true">{t("picker.language")}</span>` (the footer's tooltip pattern, anchored to the right edge with `tip-end`; check `global.css` around `.tip-end` for the exact class it expects on the parent). The `{locale.toUpperCase()}` span, the `{" "}` and the chevron SVG go (ruling 6).
- `<ul class="picker-list" aria-label={t("picker.language")}>`, whose first item is:

```astro
<li data-system-item hidden>
	<a href={hrefs[defaultLocale]} data-picker-row="" data-hrefs={JSON.stringify(hrefs)}>
		<span>{systemBefore}<span data-system-name></span>{systemAfter}</span>
	</a>
</li>
```

- Each language row's `<a>` gains `class="picker-row"` and `data-picker-row={l}`, and uses `href={hrefs[l]}`. Its text is `{displayName(l)}`; the check SVG stays on the current row.
- Delete the component's `<script>` block.

In `Base.astro`'s existing `<script>`, add `import "../lib/picker.js"` as the first import.

```bash
git rm src/scripts/language-menu.ts src/scripts/language-menu.test.ts
```

- [ ] **Step 5: Styles**

In `src/styles/global.css`:
- `.lang ul {` becomes `.lang .picker-list {`, and that rule gains `max-block-size: calc(100dvh - var(--tap) - var(--space-3));` and `overflow-y: auto;` (standard §6.4: scroll, never clip, at 200 % text). It also gains `inline-size: max-content;` and `max-inline-size: min(22rem, 100vw - 2 * var(--space-4));` (DS `picker.css`'s values; `min-width: 176px` stays). Without them the absolutely positioned list shrinks to 176 px and "System (Norsk bokmål)" wraps at 100 % text; with `max-content` alone it reaches 327 px at 200 %, wider than a 320 px viewport.
- Every `.lang a` selector (the row rule, `[aria-current="page"]`, the transition list, hover, `:active`, `:focus-visible`) becomes `.lang .picker-row`.
- `.lang summary` becomes a 44 × 44 icon button: `inline-size: var(--tap); min-height: var(--tap); padding: 0; justify-content: center; position: relative;` (drop the `gap` and the old padding). Delete the `.lang-chevron` selector from the `.lang-globe, .lang-chevron` rule.
- Forced colours (standard §6.4: the active row uses `Highlight`). System colours, not hex:

```css
@media (forced-colors: active) {
	.lang .picker-row[aria-current] {
		forced-color-adjust: none;
		background: Highlight;
		color: HighlightText;
	}
}
```

```bash
grep -nE "\.lang (a|ul)\b" src/styles/global.css
```

Expected: no output.

- [ ] **Step 6: Behaviour test for the vendored picker**

`src/scripts/picker.test.ts` (the test lives outside `src/lib` so Biome lints it):

```ts
// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

const markup = `
	<details data-picker="lang">
		<summary>Language</summary>
		<ul class="picker-list">
			<li><a class="picker-row" href="#en">English</a></li>
			<li><a class="picker-row" href="#nb" aria-current="page">Norsk bokmål</a></li>
		</ul>
	</details>
	<button id="outside">x</button>`

const details = () => document.querySelector("details") as HTMLDetailsElement
const rows = () => [...document.querySelectorAll<HTMLAnchorElement>(".picker-row")]
const key = (name: string) =>
	document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }))

function open() {
	details().open = true
	// picker.js listens for toggle in the capture phase on document.
	details().dispatchEvent(new Event("toggle"))
}

beforeAll(async () => {
	await import("../lib/picker.js")
})

beforeEach(() => {
	document.body.innerHTML = markup
})

describe("vendored picker.js (standard §6.2)", () => {
	it("opens on the current row", () => {
		open()
		expect(document.activeElement).toBe(rows()[1])
	})

	it("wraps with the arrows and jumps with Home and End", () => {
		open()
		key("ArrowDown")
		expect(document.activeElement).toBe(rows()[0])
		key("ArrowUp")
		expect(document.activeElement).toBe(rows()[1])
		key("Home")
		expect(document.activeElement).toBe(rows()[0])
		key("End")
		expect(document.activeElement).toBe(rows()[1])
	})

	it("closes on Escape and gives focus back to the trigger", () => {
		open()
		key("Escape")
		expect(details().open).toBe(false)
		expect(document.activeElement).toBe(document.querySelector("summary"))
	})

	it("closes when focus leaves", () => {
		open()
		rows()[1].dispatchEvent(
			new FocusEvent("focusout", {
				bubbles: true,
				relatedTarget: document.getElementById("outside"),
			})
		)
		expect(details().open).toBe(false)
	})
})
```

Add one more case that pins the Task 11/12 contract for the System row:

```ts
	it("skips a hidden row without the picker class, and takes it in once it is shown", () => {
		document.body.innerHTML = markup.replace(
			'<ul class="picker-list">',
			'<ul class="picker-list"><li id="system" hidden><a href="#sys">System</a></li>'
		)
		open()
		key("ArrowDown")
		expect(document.activeElement).toBe(rows()[0])
		const item = document.getElementById("system") as HTMLElement
		item.querySelector("a")?.classList.add("picker-row")
		item.hidden = false
		key("Home")
		expect(document.activeElement?.textContent).toBe("System")
	})
```

jsdom 30 fires its own `toggle` with `setTimeout(0)` when `open` is set, after the synchronous assertions; it is harmless.

Run: `npx vitest run src/components/LanguageSwitch.test.ts src/scripts/picker.test.ts`
Expected: PASS.

- [ ] **Step 7: Full gates and commit**

Run: `npm test && npm run check && npm run build`
Expected: PASS.

```bash
git add -A src/lib src/components src/layouts src/styles src/locales src/scripts
git commit -m "Use the DS picker for the language switch; drop the visible code"
```

### Task 12: The stored language, the System row and Delete all

**Files:**
- Create: `src/scripts/language-choice.ts`, `src/scripts/language-choice.test.ts`
- Modify: `src/layouts/Base.astro` (wire it)
- Modify: `src/pages/[locale]/settings.astro` (System row, `data-picker-row`, language-choice row)
- Modify: `src/scripts/delete-all.ts`, `src/scripts/delete-all.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json` (delete-all copy, new row)
- Test: `src/test/settings-page.test.ts`

**Interfaces:**
- Consumes: Task 11's markup hooks, `LANG_KEY`, `locales`, `createTranslator`.
- Produces (in `src/scripts/language-choice.ts`): `systemLanguage(nav: Pick<Navigator, "languages" | "language">): string`, `remember(storage: Storage | undefined, tag: string): void`, `fillSystemRows(doc: Document, nav: Pick<Navigator, "languages" | "language">): void`, `wireLanguageChoice(doc: Document, storage: () => Storage | undefined): () => void`.

- [ ] **Step 1: Write the failing tests**

`src/scripts/language-choice.test.ts`:

```ts
// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fillSystemRows, remember, systemLanguage, wireLanguageChoice } from "./language-choice"

const nav = (languages: string[] | undefined, language?: string) =>
	({ languages, language }) as unknown as Pick<Navigator, "languages" | "language">

function fakeStorage() {
	const store = new Map<string, string>()
	const storage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: vi.fn((k: string, v: string) => store.set(k, v)),
		removeItem: vi.fn((k: string) => store.delete(k)),
	}
	return { store, storage: storage as unknown as Storage, setItem: storage.setItem }
}

const header = `
	<details data-picker="lang"><summary>x</summary><ul class="picker-list">
		<li data-system-item hidden><a href="/en/news/" data-picker-row="" data-hrefs='{"en":"/en/news/","nb":"/nb/news/"}'><span>System (<span data-system-name></span>)</span></a></li>
		<li><a class="picker-row" href="/en/news/" data-picker-row="en">English</a></li>
		<li><a class="picker-row" href="/nb/news/" data-picker-row="nb">Norsk bokmål</a></li>
	</ul></details>`

afterEach(() => {
	document.body.innerHTML = ""
})

describe("systemLanguage", () => {
	it("resolves the browser languages, ignoring any stored choice", () => {
		expect(systemLanguage(nav(["nb-NO", "en"]))).toBe("nb")
		expect(systemLanguage(nav(["sv-SE"]))).toBe("en")
		expect(systemLanguage(nav([], undefined))).toBe("en")
		expect(systemLanguage(nav(undefined, "nn-NO"))).toBe("nb")
	})
})

describe("remember (locale spec §7.2)", () => {
	it("stores a language row's tag and removes the key for System", () => {
		const { store, storage } = fakeStorage()
		remember(storage, "nb")
		expect(store.get("lang")).toBe("nb")
		remember(storage, "")
		expect(store.has("lang")).toBe(false)
	})

	it("never stores something that is not a configured language", () => {
		const { storage, setItem } = fakeStorage()
		remember(storage, "no")
		remember(storage, "system")
		expect(setItem).not.toHaveBeenCalled()
	})

	it("swallows storage errors and missing storage", () => {
		const throwing = {
			setItem: () => {
				throw new Error("QuotaExceededError")
			},
			removeItem: () => {
				throw new Error("SecurityError")
			},
		} as unknown as Storage
		expect(() => remember(throwing, "nb")).not.toThrow()
		expect(() => remember(throwing, "")).not.toThrow()
		expect(() => remember(undefined, "nb")).not.toThrow()
	})
})

describe("fillSystemRows (locale spec §7.1)", () => {
	it("shows the System row with the resolved autonym, its lang and the matching URL", () => {
		document.body.innerHTML = header
		fillSystemRows(document, nav(["nb-NO"]))
		const item = document.querySelector<HTMLElement>("[data-system-item]")
		const link = item?.querySelector("a")
		const name = item?.querySelector<HTMLElement>("[data-system-name]")
		expect(item?.hidden).toBe(false)
		expect(link?.getAttribute("href")).toBe("/nb/news/")
		expect(link?.classList.contains("picker-row")).toBe(true)
		expect(name?.textContent).toBe("Norsk bokmål")
		expect(name?.lang).toBe("nb")
	})

	it("leaves the row hidden when the URL map is broken", () => {
		document.body.innerHTML = header.replace(/data-hrefs='[^']*'/, "data-hrefs='{nope'")
		fillSystemRows(document, nav(["nb-NO"]))
		expect(document.querySelector<HTMLElement>("[data-system-item]")?.hidden).toBe(true)
	})

	it("does not add the picker class outside a picker (Settings rows)", () => {
		document.body.innerHTML = `<ul><li data-system-item hidden><a href="/en/settings/" data-picker-row="" data-hrefs='{"en":"/en/settings/","nb":"/nb/settings/"}'><span>System (<span data-system-name></span>)</span></a></li></ul>`
		fillSystemRows(document, nav(["en-GB"]))
		expect(document.querySelector("a")?.classList.contains("picker-row")).toBe(false)
		expect(document.querySelector<HTMLElement>("[data-system-item]")?.hidden).toBe(false)
	})
})

describe("wireLanguageChoice", () => {
	it("stores on a row click and lets the link navigate", () => {
		document.body.innerHTML = header
		const { store, storage } = fakeStorage()
		wireLanguageChoice(document, () => storage)
		const event = new MouseEvent("click", { bubbles: true, cancelable: true })
		document.querySelector<HTMLElement>('[data-picker-row="nb"]')?.dispatchEvent(event)
		expect(store.get("lang")).toBe("nb")
		expect(event.defaultPrevented).toBe(false)
	})

	// jsdom ignores cross-document navigation, so comparing location.href could never go red. The real
	// D10 property is that language pages never read the key, so that is what this pins.
	it("never reads the stored choice, so it cannot act on it (D10)", () => {
		document.body.innerHTML = header
		const { storage } = fakeStorage()
		const getItem = vi.spyOn(storage, "getItem")
		wireLanguageChoice(document, () => storage)
		fillSystemRows(document, nav(["en"]))
		document.querySelector<HTMLElement>('[data-picker-row="nb"]')?.click()
		expect(getItem).not.toHaveBeenCalled()
		const source = readFileSync(new URL("./language-choice.ts", import.meta.url), "utf8")
		expect(source).not.toMatch(/\blocation\b|getItem/)
	})
})
```

In `src/scripts/delete-all.test.ts`, replace the first case with:

```ts
	it("deletes the rookdex database and the language choice, and keeps the one-shot flags", async () => {
		const storage = { removeItem: vi.fn(), clear: vi.fn(), setItem: vi.fn() }
		vi.stubGlobal("localStorage", storage)
		const factory = new IDBFactory()
		const store = await openStore(factory)
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-23T10:00:00.000Z" })
		const onBlocked = vi.fn()
		await expect(deleteAllData(factory, onBlocked)).resolves.toBe("deleted")
		expect(await exists(factory)).toBe(false)
		expect(onBlocked).not.toHaveBeenCalled()
		expect(storage.removeItem.mock.calls).toEqual([["lang"]])
		expect(storage.clear).not.toHaveBeenCalled()
	})

	it("still reports deleted when removing the language choice throws", async () => {
		vi.stubGlobal("localStorage", {
			removeItem: () => {
				throw new Error("SecurityError")
			},
		})
		await expect(deleteAllData(new IDBFactory(), vi.fn())).resolves.toBe("deleted")
	})
```

If the file has a case that resolves `"failed"`, stub `localStorage` there too and add `expect(storage.removeItem).not.toHaveBeenCalled()`.

Run: `npx vitest run src/scripts/language-choice.test.ts src/scripts/delete-all.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement Delete all**

In `src/scripts/delete-all.ts`, add `import { LANG_KEY } from "../i18n/locales"`. In the doc comment, replace the localStorage sentence with: "The language choice (`lang`) goes too, because all data means all (locale spec D9). The install and hint flags stay, so the prompt and the hint don't come back (feedback spec §7.3)." Change the success handler:

```ts
		request.onsuccess = () => {
			try {
				localStorage.removeItem(LANG_KEY)
			} catch {
				// Blocked storage holds no choice to remove.
			}
			resolve("deleted")
		}
```

- [ ] **Step 3: Implement `language-choice.ts`**

```ts
// The stored language (locale spec §7.2, standard §5). Picking a language row stores its tag, picking
// System removes the key, and the link then navigates as normal. Language pages never read the key:
// only the root page does (D10). Imports the language list, not the bundles, to stay small.
import { LANG_KEY, locales } from "../i18n/locales"
import { createTranslator } from "../lib/i18n/index.js"

const resolver = createTranslator(
	Object.fromEntries(locales.map((tag) => [tag, {}])) as Record<string, Record<string, string>>
)

type Nav = Pick<Navigator, "languages" | "language">

/** What System means right now: the browser's languages, never the stored choice. */
export function systemLanguage(nav: Nav): string {
	return resolver.resolveLang(nav.languages?.length ? nav.languages : [nav.language])
}

/** Stores a row's tag, or removes the key for System (""). Errors are swallowed: the link still goes. */
export function remember(storage: Storage | undefined, tag: string): void {
	try {
		if (tag === "") storage?.removeItem(LANG_KEY)
		else if ((locales as readonly string[]).includes(tag)) storage?.setItem(LANG_KEY, tag)
	} catch {
		// Private mode or blocked storage: the choice holds for this navigation only.
	}
}

/** Shows every System row with the resolved autonym (in its own lang) and that language's URL. */
export function fillSystemRows(doc: Document, nav: Nav): void {
	const tag = systemLanguage(nav)
	for (const item of doc.querySelectorAll<HTMLElement>("[data-system-item]")) {
		const link = item.querySelector<HTMLAnchorElement>("a[data-hrefs]")
		const name = item.querySelector<HTMLElement>("[data-system-name]")
		if (!link || !name) continue
		let hrefs: unknown
		try {
			hrefs = JSON.parse(link.dataset.hrefs ?? "")
		} catch {
			continue
		}
		const href = (hrefs as Record<string, unknown> | null)?.[tag]
		if (typeof href !== "string") continue
		link.setAttribute("href", href)
		name.lang = tag
		name.textContent = resolver.displayName(tag)
		// Only inside a picker does the row join picker.js's arrow-key list.
		if (link.closest("details[data-picker]")) link.classList.add("picker-row")
		item.hidden = false
	}
}

/** One delegated listener for every language row on the page, header and Settings alike. */
export function wireLanguageChoice(doc: Document, storage: () => Storage | undefined): () => void {
	const onClick = (event: MouseEvent) => {
		const target = event.target instanceof Element ? event.target : null
		const row = target?.closest<HTMLElement>("a[data-picker-row]")
		if (row) remember(storage(), row.dataset.pickerRow ?? "")
	}
	doc.addEventListener("click", onClick)
	return () => doc.removeEventListener("click", onClick)
}
```

In `Base.astro`'s `<script>`, add:

```ts
import { fillSystemRows, wireLanguageChoice } from "../scripts/language-choice"

fillSystemRows(document, navigator)
wireLanguageChoice(document, () => {
	// Reading window.localStorage itself throws when site data is blocked.
	try {
		return window.localStorage
	} catch {
		return undefined
	}
})
```

Run: `npx vitest run src/scripts/language-choice.test.ts src/scripts/delete-all.test.ts`
Expected: PASS.

- [ ] **Step 4: Settings: System row, hooks and copy**

Bundle changes:
- `en.json` `settings.dangerBody`: `"Removes every profile, all progress and your language choice on this device. It can't be undone. Export first if you want a copy."`
- `nb.json` `settings.dangerBody`: `"Fjerner alle profiler, all fremgang og språkvalget ditt på denne enheten. Det kan ikke angres. Eksporter først hvis du vil ha en kopi."`
- New keys after `settings.storedValue`. `en`: `"settings.languageChoice": "Language choice"`, `"settings.languageChoiceValue": "Saved here when you pick one"`. `nb`: `"settings.languageChoice": "Språkvalg"`, `"settings.languageChoiceValue": "Lagres her når du velger et"`. This copy goes to Malin for review in the PR.

Add to `src/test/settings-page.test.ts`, using the render helper the file already has (called `settings(locale)` here):

```ts
	it("puts a hidden System row first and hooks the other language's link", async () => {
		const doc = await settings("en")
		const rows = doc.querySelectorAll('section[aria-labelledby="settings-language"] li')
		expect(rows[0].hasAttribute("data-system-item")).toBe(true)
		expect(rows[0].hasAttribute("hidden")).toBe(true)
		const system = rows[0].querySelector("a")
		expect(system?.getAttribute("data-picker-row")).toBe("")
		expect(JSON.parse(system?.getAttribute("data-hrefs") ?? "")).toEqual({
			en: "/en/settings/",
			nb: "/nb/settings/",
		})
		expect(doc.querySelector('a[data-picker-row="nb"]')?.getAttribute("href")).toBe("/nb/settings/")
		// One wrapping span, so the flex link holds one sentence, not three flex items (reflow at 200 %).
		expect(system?.children).toHaveLength(1)
		expect(system?.firstElementChild?.tagName).toBe("SPAN")
	})

	it("names the language choice among what this browser keeps", async () => {
		const doc = await settings("en")
		const terms = [
			...doc.querySelectorAll('section[aria-labelledby="settings-data"] dt'),
		].map((dt) => dt.textContent?.trim())
		expect(terms).toContain("Language choice")
	})
```

In `settings.astro`:
- Frontmatter: import `defaultLocale` too; `const { t, displayName } = translator(locale as Locale)`; `const hrefs = Object.fromEntries(locales.map((l) => [l, getRelativeLocaleUrl(l, "settings")]))`; `const [systemBefore, systemAfter = ""] = t("picker.system").split("{value}")`.
- First item in the language `<ul class="rows">`:

```astro
<li class="row row-has-link" data-system-item hidden>
	<a href={hrefs[defaultLocale]} class="row-link" data-picker-row="" data-hrefs={JSON.stringify(hrefs)}>
		<span>{systemBefore}<span data-system-name></span>{systemAfter}</span>
	</a>
</li>
```

- The other-language link gains `data-picker-row={l}`. The current-language `<span>` stays as it is (ruling 8).
- Two existing tests in `settings-page.test.ts` ("marks the current language and links the other…" and "lets the other language's link fill its row") take the first `a` in the language section, which is now the hidden System link. Retarget both to `a[data-picker-row]:not([data-picker-row=""])`.
- `[hidden]` is already forced to `display: none` (`global.css:45`), so the hidden row stays hidden. But `.row + .row` still draws a top border on the first visible row after it (a double line without JavaScript). Change `.row + .row` to `.row:not([hidden]) ~ .row` in the page's style.
- In the data `<dl>`, after the "Stored" row:

```astro
<div class="row">
	<dt>{t("settings.languageChoice")}</dt>
	<dd>{t("settings.languageChoiceValue")}</dd>
</div>
```

- [ ] **Step 5: Gates and commit**

Run: `npm test && npm run check && npm run build`
Expected: PASS.

```bash
git add src/scripts src/layouts src/pages src/locales src/test/settings-page.test.ts
git commit -m "Store the picked language, add the System row, and clear the choice on Delete all"
```

### Task 13: Measure, walk, push and open PR 3

No repo files. Measure against `npm run build` plus `npm run preview` locally, then against the CI version preview. Memory traps: the Browser pane reports `document.hasFocus()` false while the app window is hidden, so keyboard and focus checks run in headless Brave over CDP (`Emulation.setFocusEmulationEnabled`; rebuild the helper from the `tools/html-to-pdf` memory file if needed). Rebuilding `dist/` while `npm run preview` runs serves empty documents, so stop the preview first.

- [ ] **Step 1: Picker measurements (English, 320 px, 100 % and 200 % text)**

Set Accept-Language to `nb-NO,nb` (CDP `Emulation.setUserAgentOverride` with `acceptLanguage`) and stay on `/en/tracker/`, so the System row reads "System (Norsk bokmål)", the longest row (spec §8). At 320 × 800, run this in the page, then again after `document.documentElement.style.fontSize = "200%"`:

```js
const picker = document.querySelector('details[data-picker="lang"]')
const box = (el) => {
	const r = el.getBoundingClientRect()
	return { w: r.width, h: r.height, l: r.left, r: r.right }
}
picker.open = true
;({
	trigger: box(picker.querySelector("summary")),
	rows: [...picker.querySelectorAll(".picker-row")].map((row) => ({ text: row.textContent.trim(), ...box(row) })),
	list: box(picker.querySelector(".picker-list")),
	viewport: document.documentElement.clientWidth,
	scrollWidth: document.documentElement.scrollWidth,
})
```

Pass: the trigger is 44 × 44 (ruling 6) and its tooltip shows on hover and focus without leaving the viewport; every row height ≥ 44, the System row included; at 100 % text every row is one line (`row.firstElementChild.getClientRects().length === 1`); `list.l ≥ 0` and `list.r ≤ viewport`; `scrollWidth === viewport`. With JavaScript off, the System `<li>` has `getComputedStyle(li).display === "none"` in both the header and Settings, and the first visible Settings language row has `border-top-width: 0px`. Also record the CLS on `/en/settings/` (a `PerformanceObserver` for `layout-shift` with `buffered: true`), since the System row unhides there. With `Emulation.setEmulatedMedia` `forced-colors: active`, the current row's computed `background-color` equals `Highlight`. Record the numbers for the PR.

- [ ] **Step 2: Keyboard walk (headless Brave over CDP)**

On `/en/news/` (rows: System, English, Norsk bokmål): Tab to the trigger; Enter opens with focus on "English" (the current row); ArrowDown moves to "Norsk bokmål"; ArrowDown again wraps to the System row; ArrowUp from System wraps to "Norsk bokmål"; Home lands on System and End on "Norsk bokmål"; Escape closes with focus on the trigger; Tab out of an open list closes it. Record pass or fail per item.

- [ ] **Step 3: Root behaviour on a fresh profile**

Headless Brave, a new `--user-data-dir` for each run:
- Accept-Language `nb-NO,nb` (CDP `Emulation.setUserAgentOverride` with `acceptLanguage`), open `/`: lands on `/nb/`.
- Same profile, pick English in the picker, then open `/`: lands on `/en/`.
- JavaScript off (`Emulation.setScriptExecutionDisabled`): `/` shows the two links and stays.
- First paint: record `/` with `Tracing.start` (category `devtools.timeline`) and confirm no `firstContentfulPaint` event belongs to the root document before the navigation to `/nb/`. `location.replace` only queues the navigation, so a flash is possible online without the service worker. If the trace shows one: the resolver sets `document.documentElement.className = "jumping"` before `replace`, and the root `<style>` gets `:global(.jumping) .root-main { visibility: hidden; }`. The trade-off is a blank page if someone presses Stop mid-jump; no-JS visitors and crawlers are unaffected, and the hash and rule 8 follow automatically. Commit that as its own fix with a resolver test asserting the class.
- Link preview: paste the preview's bare URL into a link-preview tool (or Discord) and confirm the banner shows.

- [ ] **Step 4: Gates, push, preview checks**

```bash
npm test && npm run check && npm run build
npx biome ci .
git push -u origin locale-nb
```

(Run `biome ci` in `../rookdex-lf` on this branch if the local checkout shows CRLF noise, as in Task 7.) Once CI's `preview` job finishes, get its URL (`gh run view <id> --log | grep workers.dev`), then:

```bash
curl -sI https://<preview>/ | head -1
for p in /no /no/ /no/tracker/ /no/tracker/rumours/ /no/guides/before-you-start/; do curl -sI "https://<preview>$p" | grep -iE "^(HTTP|location)"; done
```

Expected: `/` gives 200. Each `/no…` path gives one 301 whose `location` is the `/nb/` equivalent (`/no/tracker/rumours/` goes straight to `/nb/news/`). Repeat Steps 1 and 3 on the preview, since the CSP only applies to built pages.

- [ ] **Step 5: Open the PR**

```bash
gh pr create --title "Locale standard, part 2: nb, the root page and the language picker" --body-file -
```

Body (fill the angle brackets with the numbers from Steps 1 to 4 first):

```md
Second and last part of the locale standard (spec `docs/superpowers/specs/2026-10-02-rookdex-locale-standard-design.md`). This closes the standard's Rookdex acceptance (§13).

- **`nb` replaces `no`** in URLs, `<html lang>`, hreflang, bundles and the guide folder. Old `/no/` URLs get one 301 each to `/nb/` (`public/_redirects`, pinned by a test).
- **The root `/` is a real page.** A small inline script picks the stored language, else the browser's, and replaces the location before first paint. Without JavaScript, and for crawlers, it shows one link per language. Its CSP hash is inserted at build time, and seo-check fails the build if it drifts. `/` stays out of the sitemap; the home pages name it as `x-default`.
- **The installed app starts at `/`**, so it opens in the stored language. Offline, an unknown page falls back to the root instead of `/en/`.
- **The language picker** uses the DS `picker.js` (vendored, DS 3.8.0). The trigger is the globe alone, with "Language: English" as hidden text. A System row comes first. Picking a language stores `lang`; picking System removes it. Language pages never redirect on it.
- **Delete all data** removes the language choice too, and Settings says so.

**Measured** (English, 320 px): <trigger and row sizes at 100 % and 200 % text>. Keyboard walk: <result>. Root: <results>. Redirects: <curl results>.

**For me to check on the phone after merge:** with Norwegian picked, the installed app opens `/nb/`, offline too. Copy to review: the Settings row "Language choice / Saved here when you pick one" and "Språkvalg / Lagres her når du velger et".
```

Bind the PR in the app (`get_status`, `bind_pr`), read CI and offer Auto-fix.

**Gate:** merge is Malin's call. After merge: confirm the production deploy is green, `curl -sI https://rookdex.app/` gives 200, and `https://rookdex.app/no/` gives a 301 to `/nb/`.

---

## Stress test (2026-10-02)

Three fresh reviewers, one per PR slice, checked the plan against the real code. 25 findings: 21 applied, 2 adapted, 2 decided by Malin (rulings 6 and 9). Adapted: the CSP hash stays and rule 8 keeps it honest, but the wording no longer claims a stale hash blocks the jump (Astro writes the meta CSP after the resolver); a first-paint flash gets a conditional fix in Task 13 instead of a hidden root for everyone.

Considered and rejected:
- **Installing `@astrojs/markdown-remark`.** It swaps every guide onto the unified renderer, so the HTML stops matching `main` and Task 7's proof fails.
- **The resolver drops `?query` and `#hash` from `/`.** No analytics, and nothing links into the root with a hash.
- **`/no/tracker/rumours` without the slash 404s.** Same as today; the old rule needed the slash too.
- **Pinging old `/no/` URLs to IndexNow.** Spec §9 keeps search-engine steps out of scope; the 301s carry the signal.
- **The old service worker serves English at `/` offline until it updates.** Spec §11; the update notice already asks for a reload.
- **`resolveLang("no")` returns `"no"` in PR 2, not `"nb"`.** `Intl` output is identical, and PR 3 renames the folder.
- **Server and client `Intl` differ and Countdown mismatches on hydration.** CLDR output for en/nb NOK is stable, and the island re-renders on its first tick.
- **Ctrl-click on a row stores the language.** The person did pick it; middle-click fires `auxclick`, which stores nothing.
- **`Intl.DisplayNames` missing makes `fillSystemRows` throw.** The CSS already needs `:has()`, so every supported browser has it.
- **The Settings row unhiding shifts the page by 48 px.** Measured and recorded in Task 13; a reserved hidden row would show an empty line without JavaScript.

> Stress-tested 2026-10-02 (skill 0b01b4c): 21 applied, 2 adapted, 2 decided by me.
