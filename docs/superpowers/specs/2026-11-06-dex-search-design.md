# Rookdex: Dex search design spec

Written 06.11.2026 from the Dex search brainstorm (sessions 119 and 120). It adds one search box to the Dex front page, `/xx/dex/`, that searches every item across all four categories and links each result to its card on the category page.

The Dex tab shipped on 06.11 (#104). Today the front page offers four category tiles and nothing else, so finding one item means guessing its category first. Search fixes that with the words people already use in the tracker. Target: merged before the feature freeze on 12.11.2026.

## 1. What this spec covers

- A search box on `/en/dex/` and `/nb/dex/`, under the lede.
- A server-rendered result list of every live item, filtered in place by a small vanilla script.
- One pure helper for each item's search text, the script module, copy in both languages, layout, accessibility and tests.

### Non-goals

- No search on the category pages. They stay zero-JS (category pages spec §5).
- No React island. The tracker's search state (Hide found, tiles, chips, snapshots) has no meaning here.
- No query in the URL, in storage or in history. Same rule as the tracker.
- No fuzzy matching, ranking or highlighting. Matching is the tracker's `matches`, so both searches find the same items for the same words.
- No change to the tracker island, the seed or `searchTerms.ts`.
- No sticky search row (section 6.3).

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Where | The Dex front page only, under the lede | One place to search everything; category pages already list their own items (option A; B and C rejected, section 12) |
| Results | Rows of name, status and "Category · Group", each linking to `/xx/dex/<category>/#<item-id>` | The card is where the detail lives; `.dex-card:target` already marks the card you land on |
| While typing | The four tiles hide, the rows show. Clearing the box brings the tiles back | The page shows one thing at a time |
| Matching | `normalize` and `matches` from `src/model/search.ts` over the item name plus `SEARCH_TERMS[group]` | Identical results to the tracker, including "car" and "bil" on both locales |
| Rendering | Every live item rendered on the server in a hidden list; the script toggles `hidden` | No JSON payload, no client templating, links in the HTML from the first byte |
| No JavaScript | The box renders visible from the first paint and does nothing without JS; the tiles still work | CLS 0. Inserting the box after JS runs moves the page by about 60 px. Accepted 06.11 |
| Enter | Focuses the result list, as the tracker does (#89) | Next Tab reaches the first row; phone keyboards close |
| No match | A message and a Clear search button | The tracker searches the same items, so a link there would find nothing either |
| Status on a row | Dot plus the short word, "Confirmed" or "Expected" | The word carries the status (colour is never the only signal); the precedent text is too long for a row and lives on the card |

## 3. Behaviour

1. **Empty box.** The page looks as it does today: lede, four tiles, Sources link. The result list and the count line are hidden.
2. **Typing.** On every `input` event the script runs `matches(query, [row search text])` for each row and sets `hidden` on the rows that fail. The tiles get `hidden`. The visible count line reads "n results". Rows keep Dex order: categories, then groups and names as the category pages list them (`dexIndex`).
3. **No match.** The list hides and the message "No match for "{query}"." shows with a Clear search button. The count line hides.
4. **Clear.** The × button inside the field shows only while the box is non-empty. It and the Clear search button (both carry `data-dex-clear`; the script wires every match) empty the box, show the tiles, hide the list and move focus to the field. Escape in a non-empty field does the same, with `preventDefault` so the browser's own clear does not skip the announcement; Escape in an empty field is left to the browser.
5. **Enter.** Enter (not while an input method is composing) announces the result count at once and focuses the list (`tabindex="-1"`, `preventScroll: true`), scrolling its start into view only when it is off screen. With no match, Enter only announces. The tracker's keyboard-settle re-scroll (`Tracker.tsx`) is not needed: it exists for the sticky row, and here the list starts directly under the field, so it stays on screen when a phone keyboard closes.
6. **Leaving and coming back.** A result link is a normal navigation. On `pageshow` (including a bfcache restore) and on first run, the script re-applies the field's current value, so the list always matches the box. This re-apply is silent: no announcement and no focus move, because nothing happened that the user did.

Whitespace-only queries count as empty (`normalize` trims). The field has `maxlength="100"`, as the tracker's does.

## 4. Markup (`src/pages/[locale]/dex/index.astro`)

```astro
<div class="dex-search" role="search" data-dex-search>
	<label for="dex-search" class="visually-hidden">{t("dex.search.label")}</label>
	<div class="search-field">
		<input id="dex-search" type="search" maxlength="100" autocomplete="off"
			enterkeyhint="search" placeholder={t("dex.search.placeholder")} />
		<button type="button" class="search-clear" hidden data-dex-clear>
			<CloseIcon /><span class="visually-hidden">{t("tracker.search.clear")}</span>
		</button>
	</div>
	<p class="dex-search-count" hidden data-dex-count aria-hidden="true"></p>
	<p class="visually-hidden" role="status" data-dex-status></p>
</div>
<ul class="dex-index" data-dex-tiles>…the four tiles, unchanged…</ul>
<ul class="dex-results" hidden tabindex="-1" aria-label={t("dex.search.resultsLabel")} data-dex-results>
	{rows.map((row) => (
		<li hidden data-search={row.search}>
			<a class="dex-row" href={row.href}>
				<span class="row-name" lang={itemLang}>{row.name}</span>
				<span class="row-meta">
					<span class:list={["dot", row.status]} aria-hidden="true" />
					{row.statusWord}<span class="sep" aria-hidden="true">·</span>{row.place}
				</span>
			</a>
		</li>
	))}
</ul>
<div class="dex-no-match" hidden data-dex-empty>
	<p data-dex-empty-text></p>
	<button type="button" data-dex-clear>{t("tracker.search.clear")}</button>
</div>
```

- `role="search"` on a `div`, not `<search>`, for the same Testing Library reason the tracker gives.
- No `<form>`: Enter must never submit or reload.
- `CloseIcon` is the tracker's (`src/islands/tracker/icons`), rendered once on the server like `BookIcon` on the category pages.
- The count line is `aria-hidden` because the status region says the same thing after the pause (section 7).
- `row.place` is "Category · Group" from `seedLabel`, so it is in the page language. `row.name` carries `lang="en"` on `/nb/` (category pages spec §10).
- `href` is `getRelativeLocaleUrl(locale, "dex/<category>") + "#" + item.id`. Ids such as `vehicles/declasse-tulip` are valid fragments as they are; the card's `<article id={item.id}>` is the target.
- The no-match text is set with `textContent`, never `innerHTML`, because it contains the query.

## 5. Code

### 5.1 `src/model/dex.ts`: `dexSearchRows(t, locale, items)`

A pure function, unit-tested without Astro, returning one row per live item in seed order:

```ts
interface DexSearchRow {
	id: string
	name: string
	href: string // locale-relative, ends in #<id>
	status: "confirmed" | "expected"
	statusWord: string // t("tracker.confirmed") or t("dex.expected")
	place: string // "<category label> · <group label>"
	search: string // normalize([name, ...SEARCH_TERMS[group]].join(" "))
}
```

`search` is joined with spaces into one string. That is equivalent to passing the fields separately to `matches`: a query word never contains a space after `normalize`, so it cannot match across two fields. The function takes the category URL builder as a parameter, `urlFor: (category: string) => string`, and the page passes `(c) => getRelativeLocaleUrl(locale, `dex/${c}`)`. That keeps the model free of `astro:i18n`. Its full signature is `dexSearchRows(t, urlFor, items)`; the section heading's `locale` is not needed.

### 5.2 `src/scripts/dex-search.ts`: `wireDexSearch(root, win)`

Plain DOM, no framework, tested in jsdom like `history-buttons.ts`. It finds its elements by the `data-dex-*` hooks inside `root`, wires `input`, `keydown` (Enter, Escape), both clear buttons and `pageshow`, and owns one settle timer for the status region. It imports only `matches`, `normalize` and the settle constant, never React. The page calls it from a bundled `<script>`, the same pattern as `settings.astro`.

Plural copy needs the counts in the browser, so the page passes the templates as `data-*` attributes on `root` (`data-one`, `data-other`, `data-no-match`, `data-cleared`), each from `t()` on the server. The script picks "one" for a count of 1 and "other" otherwise and replaces `{count}` and `{query}`. That covers both locales' plural rules. Replacement uses a function (`text.replace("{query}", () => query)`), never a replacement string: a query such as `$&` or `$'` would otherwise be read as a replacement pattern and print the wrong text.

The status region has one writer. `say(text)` cancels any pending settle timer before writing, so a "3 results" queued while typing can never land after "Search cleared". The last event wins.

CSP (`astro.config.mjs`, `security.csp`) allows only hashed or same-origin scripts and no inline styles. So the script is a processed `<script>` (never `is:inline` or `define:vars`), adds no `on*` attributes, and hides things with the `hidden` attribute, never a `style` attribute. The global `[hidden] { display: none }` rule in `global.css` keeps `hidden` working on `.dex-index` and `.dex-row`, which set `display` themselves.

### 5.3 Shared settle time

`SETTLE_MS` (500) moves from `src/islands/tracker/useLiveStatus.ts` to `src/model/search.ts`; `useLiveStatus` re-imports it. Then the Dex script can share it without importing a React module.

## 6. Layout and CSS

### 6.1 The box

The field reuses the global `.search-field` and `.search-field input` styles: 44 px tall, raised background, muted placeholder at full opacity. The clear button's rules are scoped `.tracker .search-clear` today; I widen those selectors (base, hover, active, focus-visible) to `:is(.tracker, .dex-search) .search-clear` instead of copying them. The box spans the content column, with `var(--space-3)` above and below.

### 6.2 Rows

- One column on phones, two from 768 px, three from 1600 px (`repeat(n, minmax(0, 1fr))`, gap 12px like the tiles).
- Each row is a whole-row link: `min-height: var(--tap)`, `var(--space-2) var(--space-3)` padding, border, radius and raised background like `.dex-tile`, the same hover, active and focus-visible lift.
- Name on line one at body size and weight 600; meta on line two at 0.8125rem in `--text-muted`. Name and meta differ in weight, size and ink (labels look like labels). Long names wrap; the longest today is 32 characters.
- The dots reuse `.dot`, `.confirmed`, `.expected` and the forced-colours border from the tiles.
- The count line and the no-match block use `--text-muted` at 0.875rem; the no-match block wraps the query with `overflow-wrap: anywhere`, as `.item-empty` does. Its Clear search button is 44 px tall.

### 6.3 Not sticky

The Dex box does not use the `.search-row` class, so it gets neither the tracker's sticky row nor the `html:has(.search-row)` scroll padding. The Dex has no checkboxes to tick down a long list, and Enter already hands focus to the results. If testers ask for it later, it is one class.

## 7. Accessibility

- The field has a visible placeholder and a hidden `<label>`; the accessible name is "Search the Dex".
- One polite status region. Typing announces "n results" (or the no-match text) after typing pauses for `SETTLE_MS`; Enter announces at once; clearing announces "Search cleared". The last event wins.
- Hidden rows carry `hidden`, so they are out of the tab order and the accessibility tree.
- The result list has an accessible name ("Search results"), so a screen reader names the list Enter lands on.
- Every row and button is at least 44 by 44 px. Focus rings are the global ones.
- Forced colours: the dots keep their border, rows keep their border, the pressed-state problem from the chips (#103) does not arise because nothing here has a pressed state.

## 8. Copy

New keys in `src/locales/en.json` and `nb.json`, beside the other `dex.*` keys:

| Key | en | nb |
|---|---|---|
| `dex.search.label` | Search the Dex | Søk i Dex-en |
| `dex.search.placeholder` | Name or type, e.g. Tulip or boat | Navn eller type, f.eks. Tulip eller båt |
| `dex.search.resultsLabel` | Search results | Søkeresultater |

Reused as they are: `tracker.search.clear`, `tracker.search.results.one` and `.other`, `tracker.search.noMatch`, `tracker.search.cleared`, `tracker.confirmed`, `dex.expected`. They are the same words in the same situation; one source keeps the two searches saying the same thing.

## 9. SEO, performance and offline

- The rows add about 216 links and roughly 50 KB of HTML (well under 10 KB gzipped) to two pages. They are in the HTML but `hidden`; the links point at pages that are already indexed, so nothing new is exposed.
- The script is one small module (target under 3 KB gzipped), loaded only on `/xx/dex/`. Category pages ship no new bytes.
- The service worker precaches the page and its script like any other build output; search works offline.
- `http://localhost/en/dex/` is added to `collect.url` in `lighthouserc.json`. It is not there today, so without this line no Lighthouse check would ever see the new page. The existing budgets then apply: performance 0.9, accessibility 1, best practices 0.9, SEO 1.

## 10. Edge cases

| Case | Result |
|---|---|
| Query of only spaces | Treated as empty: tiles show |
| `(`, `*`, `"`, `<` in the query | Plain text: `matches` uses `includes`, the message uses `textContent` |
| 100 characters with no spaces | No-match text wraps inside 320 px |
| Back from a category page | `pageshow` re-applies the field value; list and box agree |
| JS fails or is off | Box visible, typing does nothing, tiles and links work |
| An item is retired in a later seed | Not rendered (the page already filters `retired`) |
| A new group appears | `searchTerms.test.ts` already fails without its terms |
| 200 % text | Rows grow; the 2- and 3-column steps are px media queries, so they hold; no overflow at 320 px |

## 11. Testing

- **Unit (`dex.test.ts`):** `dexSearchRows` returns one row per live item in seed order, the right `href` with `#<id>`, the short status word per locale, `place` in the page language, and `search` that holds the name and every group term, normalized.
- **Unit (`dex-search.test.ts`, jsdom):** typing filters rows and hides tiles; the × shows only while the box is non-empty; clearing restores the tiles and focuses the field; no match shows the message with the query as text, including `<b>`, `$&` and `$'` printed literally; Enter focuses the list and announces at once; Escape clears only when non-empty; IME composition Enter is ignored; the status region waits for the settle time; a clear inside the settle window leaves "Search cleared" as the final text; `pageshow` re-applies the value without announcing or moving focus.
- **Page render:** `/en/dex/` and `/nb/dex/` contain the box, the hidden list with one row per live item (count compared with `seedItems.filter((item) => !item.retired).length`, not a literal) and the `data-*` copy templates; no `<form>`.
- **Copy:** the three new keys exist in both locales (`bundles.test.ts` already holds en/nb parity).
- **Playwright (scratch at `%TEMP%/rookdex-e2e`):** type "boat", "bil" and "tulip" on both locales; the number of visible rows equals the number on the count line; Enter then Tab lands on the first row; follow a row and check the card is `:target`; back restores a matching list; Escape and both clear buttons; no `securitypolicyviolation` event fires on the built `preview` site.
- **Lighthouse CI:** the new `/en/dex/` URL passes the four existing budgets.
- **Measuring pass:** 320, 768, 1024, 1280, 1600 and 1920 px, en and nb, at 100 % and 200 % text: no horizontal overflow, rows and buttons at least 44 px, the field and × share one height, CLS 0 on load with the box visible.

## 12. Considered and rejected

- **B: a search box on every Dex page.** Ten boxes for one job, and it breaks the category pages' zero-JS rule.
- **C: full cards as results.** Sources dropdowns and descriptions turn a quick lookup into a long scroll; the card is one tap away.
- **Show the box only once JS runs.** About 60 px of layout shift on every load to hide a box from a tiny group of visitors.
- **A Tracker link in the no-match message.** The tracker searches the same items with the same words, so it would find nothing either.
- **A JSON payload and client-side rendering.** More code and a blank list until the script runs; server rows are simpler and crawlable.
- **Reusing the tracker's React `SearchBar`.** It carries Hide found and props the Dex has no use for, and it would make the Dex page an island.

### From the stress test

- **Enter focuses a container, not a heading.** The house rule says navigation focuses a heading. This is not navigation: it hands focus from the field to the results, as the tracker does (#89). The list has a name, so a screen reader says "Search results, list, n items", and the next Tab reaches the first row.
- **Two buttons named "Clear search" in the no-match state.** The × is the control in the field; the text button is the visible way out for sighted users who do not spot the ×. Both do the same thing, so the duplicate name cannot mislead.
- **Pressing Enter twice with the same count.** A polite region may not repeat identical text. Nothing changed, so there is nothing new to hear.
- **Hidden rows and SEO.** The 216 hidden links point at anchors on pages that are already linked and indexed, so they expose nothing new and are not cloaking.

> Stress-tested 2026-11-06 (skill a217382): 9 applied, 0 adapted, 0 decided by me.
