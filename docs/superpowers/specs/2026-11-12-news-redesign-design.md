# Rookdex: News page redesign spec

Written 12.11.2026 from the News redesign brainstorm (session 127), with three mockups compared in chat. Direction A, the open list, won. The page today is one 1088 px column where every item looks the same, and Official channels starts about 3,000 px down on a 1600 px screen. This spec makes the page calmer, gives it more air, and moves the two panels (New to GTA VI? and Official channels) beside the news on wide screens.

A second spec, written after this one ships, makes the other pages adapt per screen size the same way.

## 1. What this spec covers

- **Layout per screen size:** one column on phones and tablets, two columns from 1024 px, three from 1600 px (§2).
- **Item anatomy:** a tier line with a dot, label and date, a larger lead item, more padding (§3).
- **Side panels:** "Getting ready" becomes "New to GTA VI?", and Official channels gets muted icons (§4).
- **Copy:** two changed or new keys and one hidden label, in English and Norwegian (§5).

### Non-goals

- No new guides. Writing "How to play" or tips and tricks content is its own brainstorm, and the panel only lists guides that exist.
- No change to the seed, the facts and rumours data, the hub or its News tile.
- No other page changes. Settings gets its own redesign after this.
- No brand logos. The channels stay plain links with neutral icons, as `news.astro` has said since #116.
- No new colours. Orange leaves the page entirely; pink marks Confirmed and cyan stays on links.

## 2. Layout per screen size

All CSS is mobile-first with `min-width` steps. No `max-width` queries.

| Width | Layout |
|---|---|
| 320 to 767 px | One column: h1, jump line, Confirmed, Rumours, New to GTA VI?, Official channels. |
| 768 to 1023 px | Same single column. The two panels sit side by side at the end. |
| 1024 to 1599 px | Two columns: news (Confirmed above Rumours) about two thirds, the panels stacked on the right. |
| 1600 px and up | Three columns: Confirmed, Rumours, panels. `main` takes `.wrap.wide` (85rem), centred at 1920 and 3440 px. |

- **Grid:** Confirmed, Rumours and the `<aside>` are direct children of one grid. From 1024 px the areas are `"confirmed aside" "rumours aside"`, with the aside spanning both rows. From 1600 px they are `"confirmed rumours aside"`. The panel tops line up with the top of Confirmed.
- **Why three columns at 1600 px:** text already stops at `--measure` (65ch), so a two-column layout would leave an empty strip inside the news column. A third column keeps lines short and Confirmed and Rumours visibly apart.
- **Jump line:** below 1024 px a quiet line of text links sits under the h1, pointing at the two panels. From 1024 px it is hidden, because the panels are already in view.
- **No facts:** the Confirmed section is left out when there are no facts, as today. The grid then gets the class `no-facts`, and Rumours takes the Confirmed slot, so no empty column is left at 1600 px.
- **Spacing:** sections are separated by `--space-6` (3rem). Items inside a section are separated by a hairline with `var(--space-3)` padding above and below. No hairline after the last item.
- **The aside at 1024 px and up** is not sticky. Both panels are short, and a sticky column would overlap the footer at 200 % text.

## 3. News items

Each fact and rumour keeps everything it shows today: title, summary, source link and the "All sources" list. Only the top line and the spacing change.

- **Tier line:** a dot, the tier label and the date, in muted text at 0.75rem.
  - Confirmed: a filled dot in `--tier-confirmed`. Label `facts.title` ("Confirmed").
  - Rumour: a hollow ring in `--text-muted`, matching the hub's outlined rumour chip. Label `hub.chipRumour`.
  - The label carries the meaning; the dot is decorative (`aria-hidden`).
- **Date:** a `<time datetime>`. Facts use `announced`, rumours use `added` (the same fields the hub's News tile shows). Formatted at build time with `new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" })`, so "10 Nov" in English and "10. nov." in Norwegian. When the date's year differs from the build year, the year is added (`year: "numeric"`), so a June item still reads right after New Year.
- **Lead item:** the newest fact (the first of `newestFacts`) gets the class `is-lead` and a larger title, about 1.25rem. Everything else on it is the same as the other items. With no facts there is no lead.
- **Styles:** the panels stop using `.rumour-list`. Item padding changes stay on the news lists, and the panels get their own `.news-panel` class, so the spacing change cannot leak into them (`.rumour-list` already also matches `.fact-list`).
- **Order:** unchanged. Facts newest first, rumours newest first with ties by id.

## 4. Side panels

Both panels sit in one `<aside>` with a heading, a muted intro line and rows separated by hairlines. No boxes, no coloured frames.

- **New to GTA VI?** (replaces "Getting ready"). Rows are the existing guides, each with a muted icon, the guide title as the link and a › at the end. The guide summary is dropped from the row to keep the panel short; the guide page still shows it.
- **Official channels.** The same five links in the same order, with `channels.intro` kept as the intro line. Each row has a muted icon and the existing external-link marker.
- **Icons:** footer style, 22 px, `--text-muted`, no tile, `aria-hidden`. They join `src/islands/tracker/icons.tsx` in its existing style (24 viewBox, stroke 2, round caps): newspaper (Newswire), image (media), play (YouTube), at sign (X), camera (Instagram), checklist (Before you start), clock (Your first hour). Guide icons are picked by slug, with the checklist as the fallback for any future guide.
- **Rows:** every row is a full link at least `--tap` (44 px) high. They are standalone links, set apart by their icon and arrow, so they opt out of the running-text underline that `:where(.news) a` gives (`.news-panel a { text-decoration: none }`), and underline on hover and focus instead.
- **Ids:** the panel h2s carry the ids the jump line points at (`new-to-gta` and the existing `channels`), so a jump lands on the heading.

## 5. Copy

| Key | English | Norwegian |
|---|---|---|
| `newsGuides.title` (changed) | New to GTA VI? | Ny i GTA VI? |
| `newsGuides.intro` (new) | Guides for your first days | Guider for de første dagene |
| `news.jumpLabel` (new, hidden) | On this page | På denne siden |

The jump line's two links reuse `newsGuides.title` and `channels.title`. No other copy changes.

## 6. Accessibility

- Landmarks: the panels are an `<aside>`; the jump line is a `<nav>` labelled by `news.jumpLabel`.
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
- From 1024 px, the aside's top lines up with Confirmed's top.
- Every link in the panels and the jump line is at least 44 px tall.
- 200 % text holds at 390, 1280 and 1600 px (the three-column step).
- The Norwegian page is measured at 1024 px too, where the aside is narrowest and the Norwegian labels run longest.
- CLS about 0, and Lighthouse CI stays green.
- Screenshots at 390, 1280 and 1920 px for review.

## 8. Shipping

One PR, cut from `main`. If it merges by Saturday 14.11, the store screenshots and the README refresh are taken after it, so both show the new page before the Play production application on Sunday 15.11.

## 9. Considered and rejected

- **A sticky aside.** Both panels are short, and a sticky column overlaps the footer at 200 % text.
- **Relative dates ("3 days ago").** They need a client clock and hydration, like the hub tile. Absolute dates keep the page static.
- **The tier dot in forced colours.** The filled dot can vanish when forced colours drop backgrounds. It is decorative and the text label carries the meaning, so no fix is needed.
- **A "New" badge.** It was dropped with the calmer direction, along with the summary line under the h1.

> Stress-tested 2026-11-12 (skill 5065c26): 7 applied, 0 adapted, 0 decided by me.
