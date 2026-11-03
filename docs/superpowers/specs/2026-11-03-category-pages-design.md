# Rookdex: Dex category pages design spec

Written 03.11.2026 from the category pages brainstorm (session 101). It adds one static page per tracker category and a Dex index page, in both languages: ten new pages that list every item with its status, description and sources.

GTA VI launches Thursday 19 November 2026. These pages have two jobs before then. Search engines get a page per topic people actually search for ("GTA 6 animals", "GTA 6 cars"), and players get a calm place to read about an item without the tracker's checkboxes. They are also the start of the Dex tab planned for December. Target: built and merged by 07.11.2026.

## 1. What this spec covers

- `/xx/dex/<category>/` for wildlife, vehicles, places and collectibles, plus a `/xx/dex/` index, in English and Norwegian.
- A pure model module that shapes the seed into page data.
- The item card, including sources as a closed-by-default dropdown.
- Links into the Dex from the tracker page, the hub and the Sources page.
- SEO titles and descriptions, sitemap entries, copy in both languages, accessibility and tests.

### Non-goals

- **No Dex tab.** The pages pass `tab="tracker"` to `Base` until the tab ships in December.
- No ticking on these pages. Each card links to the item in the tracker instead.
- No Norwegian item text. The seed has one English `name` and `description` per item; nb pages show them as English.
- No JSON-LD, no item counts in titles, no images.
- No change to the tracker island, its `CategoryNav.tsx` or the seed. The tracker refresh (spec `2026-11-03-tracker-refresh-design.md`) owns those.
- No footer link row.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Routes | `/xx/dex/<category>/` and `/xx/dex/`, 10 pages | One page per searchable topic, and a stable home for the December Dex tab |
| Tab | `tab="tracker"` for now | The pages belong to the tracker until the Dex tab exists; `Base` then shows the back button |
| nb item text | Norwegian page chrome, English name and description marked `lang="en"` | The seed has no nb fields. `lang` makes screen readers switch voice and tells search engines what they are reading |
| Sources page | Kept at `/xx/tracker/sources/`; its section headings link to the category pages | The tracker's book icons already point there and the page is indexed |
| Titles | Topic titles without counts (section 7) | Counts change every refresh and would stale the search snippet |
| Sources on a card | Native `<details>` dropdown in the card footer, closed by default (section 5.2) | Inline sources pulled focus from the item. A closed card is 153 px tall against 266 px with sources inline. Zero JavaScript, and the links stay in the HTML for crawlers |
| Architecture | Two Astro pages, a pure `src/model/dex.ts`, a shared `SourceList.astro` | Zero-JS pages, model logic unit-tested without Astro, one source of truth for the source list markup |

## 3. Pages and routes

- `src/pages/[locale]/dex/[category].astro`: `getStaticPaths` returns every locale times every category id from `categoryIds(live)`, where `live` is the seed without retired items. A new category in the seed gets a page as soon as its copy keys exist, and the copy test in section 12 fails until they do.
- `src/pages/[locale]/dex/index.astro`: one page per locale.
- Both pass `path="dex/<category>"` or `path="dex"` and `tab="tracker"` to `Base`.

## 4. Model: `src/model/dex.ts` (pure, no Astro)

- `dexCategory(items: SeedItem[], category: string): DexCategory` takes live items and returns:
  - `id`, `total`, `confirmed`, `expected`,
  - `groups`: `{ id, items }[]` in the tracker's order (`groupItems`), so the page and the tracker never disagree.
- `dexIndex(items: SeedItem[]): DexCategory[]`: one entry per category in `categoryIds` order.
- Retired items are filtered out by the caller, as on the Sources page, and the functions throw if they receive one. That keeps a stale item from ever reaching a page.

## 5. Category page

### 5.1 Layout, top to bottom

1. Back button from `Base` (sub page).
2. H1: the plain category label from `seedLabel(t, "category", id)` ("Wildlife", "Dyreliv").
3. Lede with the counts: "25 animals so far: 24 confirmed, 1 expected." Plural keys (section 8).
4. Group chips: an in-page `<nav>` with one chip per group, label plus count, linking to `#group-<id>`. Same look as the Sources page chips, 44 px tall.
5. One `<section>` per group, labelled by its H2 (`id="group-<id>"`). The H2 uses the tracker refresh's group heading style: 14 px bold uppercase, the count beside it in muted ink, a 1 px line above.
6. Card grid: 1 column, 2 from 768 px, 3 from 1024 px. Mobile-first `min-width` queries only.
7. "More in the Dex": links to the other three categories, then a link to the Sources page.

### 5.2 Item card

`<article id="<item id>">` so `#wildlife/crane` lands on the card. The card uses the Sources page entry's surface: raised background, 1 px border, radius, and the `:target` highlight.

- H3: item name.
- Status line: an 8 px dot and a word. Confirmed uses `--tier-confirmed` and `tracker.confirmed`. Expected uses `--tier-expected` and `tracker.expectedFrom` ("Expected, as in GTA V"). The word carries the meaning, so the colour is never the only signal. An expected item without a `precedent` falls back to a new plain `dex.expected` key, so the line never ends in "as in ".
- Description paragraph, left out when the item has none.
- Footer row:
  - **Sources dropdown.** `<details class="card-sources">` with a `<summary>` holding the tracker's `BookIcon` (rendered from `src/islands/tracker/icons` with no client directive, so it ships as static SVG), the text "Sources (3)" / "Kilder (3)" and a chevron that turns 180° when open (the turn is skipped under `prefers-reduced-motion`). The summary is 44 px tall, muted, 13 px. Opening it shows the stacked source list inside the card: each source title as an external link with its outlet on the line under it. Many items cite two Rockstar trailers on youtube.com, which is why the title leads and the outlet only supports it.
  - **"Tick it off in the tracker"** linking to `/xx/tracker/#item-<id>`, with the item name in a visually hidden span (marked `lang="en"` on nb pages). It stays on the summary row whether the dropdown is open or closed. The `<details>` takes the full card width so the open list does too, and the tick link sits on the summary row's inline end with absolute positioning. That needs a card wide enough for both labels: the footer is a size container, and below the measured width the tick link drops to its own row under the dropdown (the narrow phone case). The threshold comes from measuring both labels in both languages in the browser, never from an estimate, and is written in `em`. Font-relative units in a container query follow the container's font size, so at 200 % text the threshold grows with the labels and the two never overlap.
- Keyboard order is the summary, the source links when open, then the tick link. On wide cards the tick link sits visually on the summary row but comes last in focus order: everything about the sources, then the card's one action. Moving the tick link first in the DOM would put focus right-to-left on the row.
- The summary keeps its native disclosure role. The default marker is hidden with `list-style: none` plus `::-webkit-details-marker { display: none }`, and the flex layout sits on an inner span, so the summary itself never changes display type.

### 5.3 Shared source list

The Sources page entry and the card render the same list. I extract it to `src/components/SourceList.astro` (props: `sources`, `locale`) with the Sources page's current markup and CSS: `ul.tap-links`, `ExternalLink` with no whitespace around the title, the outlet line, the block-flow fix for the wrapped ↗. The Sources page then uses the component, and its rendered HTML stays the same apart from the heading links in section 6.

## 6. Dex index page

- H1 "Dex", a one-line lede ("Every animal, car, place and collectible confirmed for GTA 6 so far, with its sources.").
- Four whole-card links, one per category: the label in the display face, "24 confirmed · 1 expected" in muted ink (the dot is `aria-hidden`, so the link name reads as plain words), and a line naming the groups ("Birds, mammals, marine life, reptiles"). One column on phone, 2×2 from 768 px. Each card is a single `<a>` so it is one tab stop and one 44 px-plus target.
- A link to the Sources page under the grid.

## 7. Links into the Dex

- **Tracker page.** A "Browse by category" row of four chips after the island, at the bottom of `src/pages/[locale]/tracker/index.astro`. It is server-rendered, so it sits under the fallback's reserved height and adds no layout shift. The tracker refresh also touches this file; whichever PR lands second rebases.
- **Hub.** `CategoryBars` gets a `dexHref` prop and shows "Every item in the Dex" beside its "Categories" heading. `Hub.tsx` and `Dashboard.tsx` both pass it. The rows keep linking to `tracker?show=<cat>`.
- **Sources page.** Each section H2 becomes a link to its category page. The chip nav and entries stay as they are.

## 8. Copy

New keys in `en.json` and `nb.json`. Labels for categories and groups come from the existing `category.*` and `group.*` keys.

| Key | English | Norwegian |
|---|---|---|
| `seo.titles.dexIndex` | GTA 6 Dex: every animal, car, place and collectible · Rookdex | GTA 6 Dex: alle dyr, biler, steder og samleobjekter · Rookdex |
| `seo.titles.dex.wildlife` | GTA 6 animals: every species confirmed so far · Rookdex | GTA 6 dyr: alle arter bekreftet så langt · Rookdex |
| `seo.titles.dex.vehicles` | GTA 6 cars and vehicles: every one confirmed so far · Rookdex | GTA 6 biler og kjøretøy: alle bekreftet så langt · Rookdex |
| `seo.titles.dex.places` | GTA 6 places: every location confirmed so far · Rookdex | GTA 6 steder: alle bekreftet så langt · Rookdex |
| `seo.titles.dex.collectibles` | GTA 6 collectibles: what to expect at launch · Rookdex | GTA 6 samleobjekter: dette venter ved lansering · Rookdex |
| `dex.title` | Dex | Dex |
| `dex.expected` | Expected | Forventet |
| `dex.sources` | Sources ({count}) | Kilder ({count}) |
| `dex.tick` | Tick it off in the tracker | Kryss av i trackeren |
| `dex.more` | More in the Dex | Mer i Dex-en |
| `dex.browse` | Browse by category | Bla etter kategori |
| `dex.everyItem` | Every item in the Dex | Alt i Dex-en |

Per-category keys end in the category id (`seo.titles.dex.<id>`, `dex.lede.<id>`, `dex.description.<id>`) so the page looks them up from the seed. Longest title is 61 characters; the seo-check cap is 65. The collectibles title is pre-launch wording; all five titles are reviewed when the Dex tab ships in December. Ledes and meta descriptions are plural keys (`dex.lede.<id>.one/.other`, `dex.description.<id>.one/.other`) with `{count}`, so "1 animal" and "25 animals" both read right. The plan writes their final text; each description names what the page lists and that every item links to its source.

## 9. SEO and offline

- `indexablePaths(guideSlugs, categoryIds)` adds `dex` and `dex/<category>` for each id, validated with the same slug rule as guides. `sitemap.xml.ts` passes the live category ids. seo-check then requires all ten pages in the sitemap with a canonical, a description and a title of at most 65 characters.
- `Base` already writes the canonical, hreflang pair, `og:image` and `twitter:card`.
- The service worker precaches every built page, so the Dex works offline with no change.

## 10. Accessibility

- One H1, H2 per group, H3 per item. Group sections are labelled by their H2.
- The summary is a native disclosure: Enter and Space toggle it and screen readers announce expanded or collapsed with no ARIA added.
- Every link and the summary are at least 44 px tall. Focus rings use the global `:focus-visible` style.
- nb pages mark item names, descriptions and source titles `lang="en"`.
- Forced colours: the status dot gets a border so it survives, and the word still carries the status.

## 11. Edge cases

- An item without a description: no paragraph, footer moves up.
- An item with one source: "Sources (1)". The count is a number in parentheses, so it needs no plural form.
- A group with one item: the grid holds one card at its normal width.
- Collectibles has 1 confirmed and 10 expected: the lede and index card show both counts, and the title already speaks about launch rather than confirmations.
- A seed id contains a slash. The article `id` uses it as is and links encode nothing extra, as on the Sources page.

## 12. Testing

- `src/model/dex.test.ts`: counts, group order matches `groupItems`, retired items throw, the index follows `categoryIds`.
- `src/i18n/copy.test.ts`: every live category id has its title, lede and description keys in both locales, and a fixture category without them fails.
- `src/model/seo.test.ts`: `indexablePaths` includes `dex` and each `dex/<category>`, rejects a bad category slug.
- `src/test/dex-page.test.ts` and `src/test/dex-index-page.test.ts` via `renderDoc`, both locales: H1 and lede, group chips and H2s, card count per group, status words, `lang="en"` on nb item text, the dropdown summary text and source links, the tick link `href` and hidden name, "More in the Dex" excludes the current category.
- Updated tests: Sources page (heading links, unchanged entries through `SourceList`), tracker page (browse chips), `CategoryBars`, `Hub` and `Dashboard` (the Dex link).
- `npm run build` with seo-check green. Record the vehicles page's HTML size and the precache total before and after, so ten new pages can't quietly bloat the service worker install.
- The browser at 320, 768 and 1280 px and at 200 % text: footer row heights, the tick link on the summary row when open on wide cards, the threshold where it drops, no overlap at 200 %, card grid columns, and the hub's Categories heading row with the Dex link in both the before and launch-night layouts. Measured, then shown to me.
- NVDA in Firefox: the summary announces collapsed and expanded, and nb item text switches voice.

## 13. Considered and rejected

- **Tick link first in the DOM.** It would match a visual where the tick link leads, but here it sits right of the summary, so focus would run right-to-left. Summary, sources, then tick is the clearer order.
- **The tracker hash link when the item is hidden.** With "Hide found" on, a found item is not in the list and `#item-<id>` lands nowhere. The Sources page's back link has the same gap today; the tracker owns that behaviour, not this spec.
- **Item counts in titles.** Already rejected in the brainstorm: they stale the search snippet after every refresh.
- **Security, privacy and legal.** No new data, storage or requests. Seed text goes through Astro's escaping, every source URL is already checked against the allowlist, and `ExternalLink` sets `noopener noreferrer`. No new dependency.

> Stress-tested 2026-11-03 (skill b9705f6), 7 applied, 1 adapted, 0 decided by me.
