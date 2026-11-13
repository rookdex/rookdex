# Rookdex: News page redesign spec

Written 12.11.2026 from the News redesign brainstorm (session 127), with three mockups compared in chat. Direction A, the open list, won. The page today is one 1088 px column where every item looks the same, and Official channels starts about 3,000 px down on a 1600 px screen. This spec makes the page calmer, gives it more air, and moves the two panels (New to GTA VI? and Official channels) beside the news on wide screens.

A second spec, written after this one ships, makes the other pages adapt per screen size the same way.

**Feedback round 13.11.2026.** The first build (PR #124) read better but still blended together. I asked for boxes around the objects, no cyan in the panels, less cyan in the news column, the panel icons on the first line of a wrapped label, and a look closer to the Dex category cards and the dashboard tiles. Two mockups were compared on the real page: one card per item, or one tile per section. One card per item won. §1 to §4, §7 and §9 below describe the page after that round.

**Feedback round 2, 13.11.2026.** On a phone the panels were too easy to miss: the only way in was a small line of text links under the h1, pointing at the bottom of a long page. I asked for clear entry points that say what they do and where they go. Three phone mockups (360 px, English and Norwegian) were compared side by side: two cards, two buttons in a row, and one tile with two rows. The one tile won, because it is compact, still says what is behind each row, and has room for more rows later. A second set of mockups settled its spacing: air and a hairline between the tile and Confirmed, so the tile does not sit between two headings. Before merging, the wide layout was aligned too: the Norwegian Rumours intro wraps to two lines, which pushed its first card 24 px below Confirmed's, and the panels started at the Confirmed heading instead of at the cards. A live demo of shared rows was approved. §2, §5, §6, §7 and §9 below describe the jump tile.

## 1. What this spec covers

- **Layout per screen size:** one column on phones and tablets, two columns from 1024 px, three from 1600 px (§2).
- **Item anatomy:** every item in its own card, a tier line with the hub's tier chip and the date, a larger lead item (§3).
- **Side panels:** two tiles. "Getting ready" becomes "New to GTA VI?", and Official channels gets muted icons (§4).
- **Copy:** two changed or new keys and one hidden label, in English and Norwegian (§5).

### Non-goals

- No new guides. Writing "How to play" or tips and tricks content is its own brainstorm, and the panel only lists guides that exist.
- No change to the seed, the facts and rumours data, the hub or its News tile.
- No other page changes. Settings gets its own redesign after this.
- No brand logos. The channels stay plain links with neutral icons, as `news.astro` has said since #116.
- No new colours. Orange leaves the page entirely and pink marks Confirmed. Cyan is not used in the panels or the jump tile. Panel rows are white, and source links are grey (§3, §4).

## 2. Layout per screen size

All CSS is mobile-first with `min-width` steps. No `max-width` queries.

| Width | Layout |
|---|---|
| 320 to 767 px | One column: h1, jump tile, Confirmed, Rumours, New to GTA VI?, Official channels. |
| 768 to 1023 px | Same single column. The two panels sit side by side at the end. |
| 1024 to 1599 px | Two columns: news (Confirmed above Rumours) about two thirds, the panels stacked on the right. |
| 1600 px and up | Three columns: Confirmed, Rumours, panels. `main` takes `.wrap.wide` (85rem), centred at 1920 and 3440 px. |

- **Grid:** Confirmed, Rumours and the `<aside>` are direct children of one grid. From 1024 px each news section spans three rows (h2, intro, card list) and is a `subgrid` of them, so the first cards line up across columns even when one intro wraps, and the aside starts on the card row. From 1024 px Confirmed sits above Rumours in the first column and the aside spans from Confirmed's card row to the end. From 1600 px the areas are Confirmed, Rumours and the aside side by side, with the aside on the third row. The grid's row gap is 0 there (the subgrids space their own rows), and Rumours keeps `--space-4` above it when stacked under Confirmed. The panel tops line up with the top of the first card.
- **Why three columns at 1600 px:** text already stops at `--measure` (65ch), so a two-column layout would leave an empty strip inside the news column. A third column keeps lines short and Confirmed and Rumours visibly apart.
- **Jump tile:** below 1024 px (phones and tablets, where the panels sit at the end of the page) a tile under the h1 points at the two panels. From 1024 px it is hidden, because the panels are already in view.
  - **Tile:** like the panels: 1px `--border`, `--radius`, `--bg-raised`, padding `--space-2` by `--space-4`. A visible label "On this page" in the dashboard's small uppercase `.tile-label` style names the `<nav>` through `aria-labelledby`.
  - **Rows:** one per panel, built as panel rows (`.panel-list`): a muted 22 px icon (checklist for New to GTA VI?, newspaper for Official channels), the panel's title in white at the heading font, a muted count of what is behind it at 0.875rem ("2 guides", "5 links", counted from the panel's own list), and a muted 18 px ↓ that says the jump stays on this page. Each row is at least `--tap` high, rows are split by a hairline, and the icon and ↓ sit on the first line of a wrapped label.
  - **Spacing:** 16 px from the h1 to the tile, then 32 px (`--space-5`) of air, a 1px `--border` hairline across the column, and 32 px more before Confirmed. The tile reads as part of the page head, and Confirmed starts a new block. From 1024 px the hairline goes with the tile.
- **No facts:** the Confirmed section is left out when there are no facts, as today. The grid then gets the class `no-facts`, and Rumours takes the Confirmed slot, so no empty column is left at 1600 px.
- **Spacing:** the grid and the aside use a `--space-4` (1.5rem) gap, as between the dashboard tiles. Inside a section the item cards sit `--space-3` (1rem) apart (§3).
- **The aside at 1024 px and up** is not sticky. Both panels are short, and a sticky column would overlap the footer at 200 % text.

## 3. News items

Each fact and rumour keeps everything it shows today: title, summary, source link and the "All sources" list. The frame, the top line and the link colour change.

- **Card:** every item is its own card, like a Dex category card: 1px `--border`, `--radius`, `--bg-raised`, padding `--space-3` on top and `--space-4` at the sides. The bottom padding is `--space-1`, because the source link's 44 px target already brings its own air.
- **Tier line:** the hub News tile's `.news-chip`, then the date in muted text at 0.75rem. One class serves both pages.
  - Confirmed: the filled pink chip (`is-confirmed`). Label `facts.title` ("Confirmed").
  - Rumour: the outlined grey chip (`is-rumour`). Label `hub.chipRumour`.
  - The chip is text, so the tier is never colour alone.
- **Source links:** the item's source link and the links in "All sources" are `--text-muted`, with the running-text underline in muted grey. Hover turns the underline cyan, as for any running-text link. Cyan is kept for moving around the site.
- **Date:** a `<time datetime>`. Facts use `announced`, rumours use `added` (the same fields the hub's News tile shows). Formatted at build time with `new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" })`, so "10 Nov" in English and "10. nov." in Norwegian. When the date's year differs from the build year, the year is added (`year: "numeric"`), so a June item still reads right after New Year.
- **Lead item:** the newest fact (the first of `newestFacts`) gets the class `is-lead` and a larger title, about 1.25rem. Everything else on it is the same as the other items. With no facts there is no lead.
- **Styles:** the panels stop using `.rumour-list`. Item padding changes stay on the news lists, and the panels get their own `.news-panel` class, so the spacing change cannot leak into them (`.rumour-list` already also matches `.fact-list`).
- **Order:** unchanged. Facts newest first, rumours newest first with ties by id.

## 4. Side panels

Both panels sit in one `<aside>`. Each panel is a tile, like the dashboard tiles: 1px `--border`, `--radius`, `--bg-raised`, `--space-4` padding. Inside are a white heading at 1.125rem, a muted intro line at 0.875rem and rows separated by hairlines. No coloured frames.

- **New to GTA VI?** (replaces "Getting ready"). Rows are the existing guides, each with a muted icon, the guide title as the link and a › at the end. The guide summary is dropped from the row to keep the panel short; the guide page still shows it.
- **Official channels.** The same five links in the same order, with `channels.intro` kept as the intro line. Each row has a muted icon and the existing external-link marker.
- **Icons:** footer style, 22 px, `--text-muted`, no tile, `aria-hidden`. They join `src/islands/tracker/icons.tsx` in its existing style (24 viewBox, stroke 2, round caps): newspaper (Newswire), image (media), play (YouTube), at sign (X), camera (Instagram), checklist (Before you start), clock (Your first hour). Guide icons are picked by slug, with the checklist as the fallback for any future guide.
- **Rows:** every row is a full link at least `--tap` (44 px) high. They are standalone links, set apart by their icon and arrow, so they opt out of the running-text underline that `:where(.news) a` gives (`.news-panel a { text-decoration: none }`), and underline on hover and focus instead.
- **Row colours:** the label is `--text` (white). The icon, the › and the ↗ are `--text-muted`. No cyan anywhere in the panels.
- **First-line alignment:** when a label wraps (the Norwegian media row at 1024 px and up), the icon, the › and the ↗ stay on its first line instead of centring on the whole label. The row aligns to the top, its block padding is `max(--space-1, (--tap - 1lh) / 2)`, and the icon and ↗ drop half the gap between their height and `1lh`. That holds at any text size, and a one-line row stays 44 px.
- **Ids:** the panel h2s carry the ids the jump tile points at (`new-to-gta` and the existing `channels`), so a jump lands on the heading.

## 5. Copy

| Key | English | Norwegian |
|---|---|---|
| `newsGuides.title` (changed) | New to GTA VI? | Ny i GTA VI? |
| `newsGuides.intro` (new) | Guides for your first days | Guider for de første dagene |
| `news.jumpLabel` (new; visible on the jump tile since round 2) | On this page | På denne siden |
| `news.jumpGuides.one` / `.other` (new, round 2) | 1 guide / {count} guides | 1 guide / {count} guider |
| `news.jumpChannels.one` / `.other` (new, round 2) | 1 link / {count} links | 1 lenke / {count} lenker |

The jump tile's two rows reuse `newsGuides.title` and `channels.title`, followed by the count. No other copy changes.

## 6. Accessibility

- Landmarks: the panels are an `<aside>`; the jump tile is a `<nav>` labelled by its visible `news.jumpLabel`, so the label is not read twice.
- Heading order stays h1, h2 per section and panel, h3 per item.
- Tier meaning is never colour alone: every item has its text label.
- Focus rings stay visible on every link. Hover and focus states reuse the existing link styles.

## 7. Testing and verification

**Tests first.** `src/test/news-page.test.ts` grows, for both locales, to check that:
- Confirmed comes before Rumours, and every item has a tier label and a `<time>` with a valid `datetime`.
- The newest fact, and only it, has `is-lead`.
- The `<aside>` holds New to GTA VI? before Official channels.
- The jump links point at the ids of the two panel h2s.
- With no facts mocked, the grid has `no-facts` and there is no `is-lead`.
- A date in another year than the build year shows its year.
- The five channel links keep their names and URLs, and no channel row contains a brand logo.

Copy tests cover the new keys in both bundles.

**Measured before it's called done**, on a `preview` build (never the dev server, whose toolbar covers the phone tab bar):
- At 320, 768, 1024, 1280, 1600, 1920 and 3440 px: no horizontal overflow, and 1, 1, 2, 2, 3, 3, 3 columns.
- From 1024 px, the aside's top lines up with the first card's top, and from 1600 px the first Confirmed and Rumours cards share that line too. Measured in round 2 at 1024 to 3440 px, English and Norwegian, at 100 % and 200 % text: all equal, no card stretched, no overflow.
- Every link in the panels and the jump tile is at least 44 px tall.
- Round 2, at 320, 360, 390 and 768 px and at 200 % text (320, 390, 768 px), English and Norwegian: the jump tile shows, has no horizontal overflow and no cyan, its rows are at least 44 px with the icon and ↓ within 0.5 px of the first line, the gaps are 16, 32 and 32 px (doubled at 200 % text), and a tap lands the panel heading at the top. At 360 px the tile ends at 278 px, above the fold of a 640 px phone. At 1024 px the tile and hairline are gone.
- Round 2 found the news cards running 124 px past a 320 px phone in Norwegian at 200 % text (already so on production): `.rumour-list` had an implicit auto column that grew to the longest word. It now has `grid-template-columns: minmax(0, 1fr)`, so `overflow-wrap: break-word` breaks the word inside the card.
- 200 % text holds at 390, 1280 and 1600 px (the three-column step).
- The Norwegian page is measured at 1024 px too, where the aside is narrowest and the Norwegian labels run longest.
- No cyan in the panels or on the news items, every item is a card and both panels are tiles.
- The panel icon and ↗ sit within 0.5 px of the first line's centre, at 100 % and 200 % text.
- CLS about 0, and Lighthouse CI stays green.
- Screenshots at 390, 1280 and 1920 px for review.

## 8. Shipping

One PR, cut from `main`. If it merges by Saturday 14.11, the store screenshots and the README refresh are taken after it, so both show the new page before the Play production application on Sunday 15.11.

## 9. Considered and rejected

- **Two cards for the jump** (round 2, option A). Each panel as its own card with an intro line. The clearest, but it pushed Confirmed about 90 px further down than the one tile, and the Official channels intro needed a shorter second wording.
- **Two buttons in a row for the jump** (round 2, option B). The most compact, but the titles wrapped to two lines at 360 px and said nothing about what is behind them.
- **The line of text links** (the jump line from the first build). Too small and too easy to miss on a phone, replaced by the jump tile in round 2.

- **A sticky aside.** Both panels are short, and a sticky column overlaps the footer at 200 % text.
- **Relative dates ("3 days ago").** They need a client clock and hydration, like the hub tile. Absolute dates keep the page static.
- **The open list with hairlines only** (the first build). Without frames the items and panels blended together, and the cyan panel rows pulled the eye away from the news. Replaced in the feedback round.
- **One tile per section** (feedback round, option B). Confirmed and Rumours as one tile each, with hairlines between items. Fewer boxes, but the items inside a tile still share one surface, which was the original complaint.
- **A dot and label for the tier.** Replaced by the hub's chip, so the News page and the News tile mark a tier the same way.
- **A "New" badge.** It was dropped with the calmer direction, along with the summary line under the h1.

> Stress-tested 2026-11-12 (skill 5065c26): 7 applied, 0 adapted, 0 decided by me.
