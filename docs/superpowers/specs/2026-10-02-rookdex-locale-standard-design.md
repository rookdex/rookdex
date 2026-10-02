# Rookdex locale standard: design

Date: 2026-10-02. Status: approved in brainstorm, awaiting spec review.

Rookdex adopts the Workbench locale standard (`workbench/docs/specs/2026-10-01-locale-standard.md`,
called "the standard" below) before the 1 November freeze. Rookdex is the first project to
migrate (standard §12), so it also proves the standard works outside a scaffold.

## 1. Goal and success

**Goal:** Rookdex speaks `en` and `nb` the way the standard says every project should. The
strings come from flat JSON through the Workbench i18n library, `nb` replaces `no` in every URL
and tag, the root picks a language in the browser instead of a hard redirect, and prices are
numbers instead of copy.

**Done when** the standard's Rookdex acceptance (§13) passes:

- `/no/` returns 301 to `/nb/`.
- Every indexable page carries `hreflang` for `en`, `nb` and `x-default`.
- The root `/` resolves in the browser with no 3xx.
- A copy test rejects price strings.

Plus the checks in §8 of this spec.

**Constraints**

- English is the layout baseline. Measured targets are met in English, and `nb` adapts.
- Nothing on the page looks different apart from three things: the switcher trigger loses its
  "EN" text, the language name "Norsk" becomes the browser's autonym "Norsk bokmål", and prices
  render through `Intl.NumberFormat`.
- The vendored files are copied from Workbench and never edited in Rookdex. A gap gets fixed
  upstream, then re-copied.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Vendor the i18n library untouched in `src/lib/i18n/`. `src/i18n/index.ts` is a thin Rookdex layer on top. | It keeps Rookdex an honest consumer of the standard, and the folder no longer collides with the library's extract target. |
| D2 | `money()` gains an optional fourth argument `{ stripWhole: true }` in i18n 2.1.0 (Workbench). It maps to Intl's `trailingZeroDisplay: "stripIfInteger"`. | "949 kr" instead of "949,00 kr", and "949,50 kr" stays exact. Nothing gets rounded, and the default and the §13 test are unchanged. |
| D3 | The full preference model now: a System row first, picking a language stores `lang`, and picking System removes it. | Someone whose phone is in English but who reads Rookdex in Norwegian lands in Norwegian from rookdex.app and from the installed app. |
| D4 | One price file plus a `{price:<id>}` token in guide Markdown, swapped at build time by a remark plugin. | Each price lives in one line. The hub and both guides follow it. |
| D5 | The root `/` is a real page: language links, hreflang, the site-name JSON-LD, and a hashed inline resolver. The manifest's `start_url` becomes `/`. | Google reads the site name from the domain root itself, and the installed app opens in the stored language. |
| D6 | Vendor the DS `picker.js` (DS 3.8.0) untouched. It replaces `language-menu.ts`. Rookdex keeps its own picker CSS. | `picker.js` was ported from Rookdex and has since gained Home/End and one-open-at-a-time. `picker.css` uses DS token names Rookdex doesn't have. |
| D7 | Keyed calls with typed keys: `t("hub.buyBody")`, with `Key` derived from `en.json`. | It's the standard's API, and a typo fails `astro check`. |
| D8 | `translate.mjs` stays out for now. | It exempts `nb` by design, so with only `en` and `nb` it checks nothing. The key parity test proves `nb` complete. Vendor it when a third language arrives. |
| D9 | "Delete all data" also clears `lang`. | "All data" means all. The install and hint flags still stay (feedback spec §7.3), because they're one-shot notices, not a preference. |
| D10 | A language page never redirects based on `lang`. Only the root reads it. | The URL is the language. A shared `/nb/` link must open in Norwegian for everyone. |

## 3. Delivery: three PRs, in order

1. **Workbench: i18n 2.1.0** (the Workbench repo). Covered in §4.
2. **Rookdex: strings.** No URL changes. Covered in §5.
3. **Rookdex: `nb` and the root.** Covered in §6 and §7.

Each PR merges green on its own. PR 2 renders the same pages as `main` except for the price
formatting. PR 3 is the visible change, checked on the phone against the preview.

## 4. PR 1: Workbench i18n 2.1.0

- `money(lang, amount, currency, options?)`, where `options.stripWhole` (boolean, default
  false) adds `trailingZeroDisplay: "stripIfInteger"`.
- `index.d.ts` adds `interface MoneyOptions { stripWhole?: boolean }`.
- `tools/i18n.test.mjs` adds three tests:
  - `money("nb", 949, "NOK", { stripWhole: true })` gives "949 kr".
  - `money("nb", 949.5, "NOK", { stripWhole: true })` gives "949,50 kr".
  - The existing "949,00 kr" assertion stays unchanged.
- The library README documents the option. `VERSION` becomes 2.1.0.
- Browser floor for the option: Chrome 106, Firefox 116, Safari 15.4. Rookdex already targets
  newer browsers.

## 5. PR 2: strings

### 5.1 Files

| Path | What |
|---|---|
| `src/lib/i18n/` | `index.js`, `index.d.ts` and `VERSION`, copied from Workbench 2.1.0, plus a one-line `README.md` saying "copied from workbench/libraries/i18n, do not edit here". |
| `src/locales/en.json`, `src/locales/no.json` | Flat bundles. Today's nesting becomes dots (`hub.buyBody`, `seo.titles.settings`), and the same keys exist in both. Renamed to `nb.json` in PR 3. |
| `src/i18n/index.ts` | Keeps `locales`, `Locale`, `defaultLocale` and `isLocale`. Adds `translator(locale)` and the `Key` type. `t(locale)` and `fill()` go. |
| `src/model/prices.ts` | `export const prices = { standard: { amount: 949, currency: "NOK" }, ultimate: { amount: 1189, currency: "NOK" } } as const`. |
| `src/config/preferences.ts` | Same shape as the React scaffold: `currencies: ["NOK"]`, `baseCurrency: "NOK"`, `regionCurrency: { NO: "NOK" }`. With one currency, there's no currency picker. |
| `integrations/remark-price.mjs` | The guide token plugin (§5.4). |
| removed | `src/i18n/en.ts`, `src/i18n/no.ts`. |

### 5.2 The Rookdex layer

```ts
translator(locale) => {
  t(key: Key, vars?)            // the library's t(locale, key, vars)
  plural(key: PluralKey, count) // picks key.one / key.other
  money(price: Price)           // money(locale, amount, currency, { stripWhole: true })
  displayName(tag)              // autonym, replaces languageNames
}
```

- `Key` is `keyof typeof en` from `en.json` (`resolveJsonModule`). `PluralKey` is a key whose
  `.one` and `.other` both exist.
- Computed keys get template literal types: `` t(`category.${id}`) ``, `` t(`group.${id}`) ``.
  A missing combination fails `astro check`.
- Hand-made plural pairs become library plurals:
  - `hub.daysToGo` and `hub.oneDayToGo` become `hub.daysToGo.one` and `.other`.
  - `footer.daysToLaunch` and `oneDayToLaunch` become `footer.daysToLaunch.one` and `.other`.
  - Countdown and `footer-countdown.ts` call `plural()`. `footer-countdown.ts` gets its two
    templates the same way it does today, from data attributes rendered by `Footer.astro`.
- `languageNames` is deleted, and every caller uses `displayName()`.
- Islands (`Countdown.tsx`, `Tracker.tsx`, `InstallPrompt.tsx`) take a translator built from
  their `locale` prop, the same way they take the strings object today.
- Bundle values stay plain text. Nothing is rendered with `set:html` or `innerHTML`.

### 5.3 Prices in bundles

`hub.buyBody` takes `{standard}` and `{ultimate}` (or whichever prices it names) as variables.
The caller passes `money(prices.standard)`. No bundle value contains a price.

### 5.4 Prices in guides

- The guides write `{price:standard}` and `{price:ultimate}` in the prose.
- `integrations/remark-price.mjs` runs on guide Markdown (registered in
  `astro.config` → `markdown.remarkPlugins`). It visits text nodes and swaps each token for
  `money(lang, amount, currency, { stripWhole: true })`.
- `lang` comes from the entry's folder (`guides/en/`, `guides/no/`, later `guides/nb/`),
  passed through `resolveLang` so `no` formats as `nb`.
- An unknown id, or a token in a file outside a locale folder, throws and fails the build.
- The plugin imports `src/model/prices.ts` and the vendored library, so it shares one source
  with the pages.

### 5.5 Tests

- **Key parity:** both bundles have the same key set and no empty values. A plural key has
  both `.one` and `.other`.
- **Copy test:** every value in `src/locales/*.json` and every guide Markdown body is checked
  against two patterns: a digit followed by a currency symbol or code (`949 kr`, `1 189 kr`,
  `949 NOK`), and a code followed by a digit (`NOK 949`). It must go red on fixtures with each
  pattern and stay green on `{price}` and `{price:standard}`.
- **Translator:** placeholders, plural one/other, fallback to `en` for a missing key, and
  `money` giving "949 kr" for `nb` and "NOK 949" for `en`. The exact `en` output is read off
  the test run and pinned.
- **Remark plugin:** a token becomes the formatted price per locale, and an unknown id throws.
- **Existing tests** keep passing after a mechanical update to the new API. The rendered pages
  under `dist/` match `main` except for price text. The plan defines how to diff them.

## 6. PR 3: URLs, the root page and the manifest

### 6.1 `no` becomes `nb`

| Place | Change |
|---|---|
| `astro.config.mjs` | `locales: ["en", "nb"]`. |
| `src/locales/no.json` | Renamed `nb.json`. |
| `src/content/guides/no/` | Renamed `nb/`. Internal links in it (`/no/`, `/no/settings/#about`) become `/nb/…`. |
| `src/layouts/Base.astro` | The `ogLocale` map key becomes `nb` (value `nb_NO`). `inLanguage` uses the locale directly. `<html lang>` follows the locale. |
| `src/pages/[locale]/guides/[slug].astro`, `integrations/seo-check.mjs` | `no` becomes `nb`. |
| Tests | About 25 files pin `no`. They switch to `nb`. The yes/no strings (`no: "No"`) and `dataset.no` are not locale codes and stay. |

### 6.2 Redirects (`public/_redirects`)

```
/no/tracker/rumours/  /nb/news/      301
/en/tracker/rumours/  /en/news/      301
/no/*                 /nb/:splat     301
```

- The specific rumours line comes first and points straight at `/nb/`, so there's no chain.
- `/ /en/ 302` is removed.
- `redirects.test.ts` pins all three lines and asserts there's no rule for `/`.

### 6.3 hreflang

- Every indexable page links `en` and `nb`.
- `x-default`: the two home pages point it at `/`. Every other page points it at its `/en/`
  version, as today, because only the home has a language-neutral address.
- The root page carries `en`, `nb` and `x-default` (itself).

### 6.4 The root page (`src/pages/index.astro`)

- **Head:**
  - Uses Base's head conventions without the header, tab bar or footer.
  - Title "Rookdex", the English site description, canonical `https://rookdex.app/`, and the
    hreflang set from §6.3.
  - The WebSite JSON-LD (`name`, `url: https://rookdex.app/`) moves here from the home pages,
    with no `inLanguage`, since the root is language-neutral.
- **Body:** dark, the mark, and one plain link per language, labelled with its autonym and
  carrying `lang` and `hreflang`. Styled with Rookdex tokens, and centred with no layout
  beyond that.
- **Resolver script:**
  - One inline `<script>`. Astro's CSP hashes it automatically, as it does every other inline
    script.
  - It reads `localStorage.lang` inside `try`, so blocked storage counts as unset.
  - It passes it with `navigator.languages` to `resolveLang`. The library is imported as a
    bundled module if that keeps the script small. Otherwise it's a ten-line inline equivalent
    with a test asserting it agrees with the library. The plan picks one after measuring.
  - It calls `location.replace("/" + resolved + "/")`, using the bundle key, never the stored
    string. `replace` keeps the root out of history, so Back doesn't bounce.
  - A stored value that isn't a configured language (`no`, `system`, garbage) is removed on
    read, as the standard requires.
- **No JavaScript:** the links are the page. Crawlers see the same thing.
- **Sitemap:** `/` is added, with its hreflang alternates. `indexablePaths` and `seo-check`
  learn about the root.

### 6.5 Manifest and service worker

- `public/manifest.webmanifest`: `start_url` becomes `/`. `id` stays `/`, so existing installs
  keep their identity. `lang` and `description` stay English.
- The precache integration already maps `index.html` to `/`, so the root gets precached once
  it exists. A test asserts `/` is in the precache list, so the installed app resolves offline.

## 7. PR 3: the picker and the stored language

### 7.1 Markup (`LanguageSwitch.astro`)

The markup follows the standard's §6.1:

- `<details data-picker="lang">`. The trigger is the globe icon plus an `.sr-only` name. The
  visible `{locale.toUpperCase()}` span is removed.
- The rows are `.picker-row` links (`<a href hreflang lang>`), with `aria-current="page"` on
  the active one.
- First comes the **System row**: "System (<span lang>Norsk bokmål</span>)" using the reserved
  key `picker.system` ("System ({value})"). It's rendered `hidden`, because a static page can't
  resolve `navigator.languages`. The script fills in the resolved autonym, sets its `href` to
  the resolved language's version of the current page, and unhides it. Without JavaScript the
  picker is plain language links, as today.
- The reserved keys from standard §7.2 (`picker.language`, `picker.system`) are added to both
  bundles.
- The existing Rookdex picker CSS stays. Its selectors move from `[data-language-menu]` to
  `[data-picker]` and `.picker-row`.

### 7.2 Behaviour

- `src/lib/picker.js` is DS 3.8.0's `components/picker.js`, copied untouched. It's imported once
  in `Base.astro` as a bundled script and replaces `src/scripts/language-menu.ts` and its test.
- `src/scripts/language-choice.ts` (new, Rookdex's own) uses one delegated click listener on
  `details[data-picker="lang"] .picker-row`:
  - A language row writes `lang = <tag>`.
  - The System row removes `lang`.
  - Then the link navigates as normal.
  - Storage errors are swallowed, so the navigation still happens.
  - It also fills in the System row (§7.1).
- **Settings:** the language rows (`settings.astro`) get the same System row first and the same
  `data-picker-row` hooks, so the header and Settings share one model. Each row stays fully
  clickable (feedback spec §7.2).

### 7.3 Delete all data

- `deleteAllData` also removes `lang` after IndexedDB succeeds.
- The settings copy for delete-all says the language choice goes too.
- The doc comment in `delete-all.ts` is updated: `lang` goes, and the install and hint flags
  stay.

### 7.4 Tests

- `language-choice.test.ts`:
  - A language row stores its tag, and System removes the key.
  - A throwing `setItem` doesn't block navigation.
  - The System row gets the resolved autonym and `href`.
- Root resolver:
  - A stored `nb` gives `/nb/`.
  - No key with `nb-NO` first in `navigator.languages` gives `/nb/`.
  - No key with `sv-SE` gives `/en/`.
  - A stored `no` or `system` is removed and resolution falls through.
  - Blocked storage gives the `navigator.languages` result.
- Delete-all: `lang` is gone afterwards, and the two flags remain.

## 8. Verification (PR 3, measured in the browser)

- **Picker:**
  - The trigger is 44 × 44 px and every row is at least 44 px tall.
  - At 320 px wide with 200 % text, the open list stays inside the viewport and the header
    doesn't scroll sideways.
  - Both measured in `en` (the baseline), with "Norsk bokmål" as the longest row.
- **Keyboard walk:** Tab to the trigger, Enter opens on the active row, arrows wrap, Home/End
  jump, Escape returns focus, and Tab out closes.
- **Root, fresh profile:**
  - With `nb-NO` first it lands on `/nb/`.
  - With `lang=en` stored it lands on `/en/`.
  - With JavaScript off it shows both links.
  - `curl -I https://<preview>/` gives 200, not 3xx.
- **Redirects:** `curl -I` on `/no/`, `/no/tracker/`, `/no/tracker/rumours/` and
  `/no/guides/before-you-start/` gives one 301 each, to the `/nb/` equivalent.
- **Installed app** (phone, production after merge, since version previews can't judge
  `start_url`): with Norwegian picked, launching opens `/nb/`, and launching offline still
  resolves.
- **Gates:** `npm test`, `npm run check`, `npx biome ci .` and `npm run build`
  (seo-check passes, and the sitemap count goes up by one for `/`).

## 9. Out of scope

- Theme and currency pickers. Rookdex is dark-only and has one currency, so neither picker
  appears.
- `picker.css`, tokens and any other DS adoption (D6).
- `translate.mjs` (D8).
- Search Console steps. The sitemap and hreflang carry the change, and the 301s pass on the
  `/no/` signals.
- A third language.

## 10. Risks

| Risk | Handling |
|---|---|
| The 159-read rewrite misses a key, or a computed key has no bundle entry. | Typed keys fail `astro check`, and the key parity test plus the `dist/` diff in PR 2 catch the rest. |
| Old `/no/` URLs in search results and bookmarks. | 301s via a splat rule, pinned by a test, and checked with `curl` on the preview. |
| The installed app on an old `start_url` (`/en/`). | Browsers refresh the manifest on their own. Until then, it opens `/en/`, which still works. |
| The `money` output differs between engines (spaces in "1 189 kr"). | Tests compare against `Intl` output built in the same test run, not hard-coded spaces, except where §5.5 pins a value read off the run. |
