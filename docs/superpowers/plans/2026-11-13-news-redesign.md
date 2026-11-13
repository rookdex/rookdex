# News page redesign implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/en/news/` and `/nb/news/` as a calm open list: a tier line on every item, a larger lead fact, and the two panels (New to GTA VI? and Official channels) beside the news from 1024 px.

**Architecture:** Everything stays static Astro, rendered at build time. One grid holds Confirmed, Rumours and an `<aside>` with the two panels; mobile-first `min-width` steps at 768, 1024 and 1600 px place them. Item styles stay in `global.css` beside `.rumour-list`; the page's layout and panel styles live in the scoped `<style>` of `news.astro`. Seven new icons join `src/islands/tracker/icons.tsx` and render on the server, like the Dex `BookIcon`.

**Tech Stack:** Astro 5, React (server-rendered SVG icons only), Vitest with the Astro container (`src/test/render.ts`), Playwright from the scratch harness in `%TEMP%/rookdex-e2e` for measuring.

**Spec:** `docs/superpowers/specs/2026-11-12-news-redesign-design.md`

## Global Constraints

- Mobile-first CSS: `min-width` queries only, steps at 768, 1024 and 1600 px. No `max-width` queries.
- Columns: 1 at 320 and 768, 2 at 1024 and 1280, 3 at 1600, 1920 and 3440 px. `main` takes `.wrap.wide` (85rem from 1600 px) through `<Base wide>`.
- Sections are separated by `--space-6`. Items inside a section are separated by a hairline (`1px solid var(--border)`) with `var(--space-3)` padding above and below, and no hairline after the last item.
- Every link in the panels and the jump line is at least `--tap` (44 px) tall.
- Tier line: 0.75rem, `--text-muted`. Confirmed dot filled in `--tier-confirmed`; rumour dot a hollow ring in `--text-muted`. The dot is `aria-hidden`; the label carries the meaning.
- Dates: `Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" })`, plus `year: "numeric"` when the year differs from the build year. Facts use `announced`, rumours use `added`.
- Lead item: the first of `newestFacts` gets `is-lead` and a 1.25rem title. No facts, no lead.
- Panels never use `.rumour-list`; they use `.news-panel`. Panel rows opt out of the running-text underline and underline on hover and focus instead.
- Icons: 24 viewBox, stroke 2, round caps and joins, `fill="none"`, 22 px, `aria-hidden`, `--text-muted`, no tile. My own geometry, no brand logos.
- No new colours. Nothing on the page uses `--accent-2` (orange) or `--gradient`. Pink marks Confirmed, cyan stays on links.
- No `aria-label` on the `<aside>`: inside `<article>` an unnamed aside is not a landmark, and a named one inside `main` trips axe's `landmark-complementary-is-top-level`. The spec only asks for the element.
- Copy, exactly:

  | Key | English | Norwegian |
  |---|---|---|
  | `newsGuides.title` (changed) | New to GTA VI? | Ny i GTA VI? |
  | `newsGuides.intro` (new) | Guides for your first days | Guider for de første dagene |
  | `news.jumpLabel` (new) | On this page | På denne siden |

- `links.test.ts` allows exactly one `text-decoration: underline;` in `global.css`. The panel hover underline therefore lives in the scoped style of `news.astro`, never in `global.css`.
- Every `:hover` rule sits inside `@media (hover: hover)`.
- Repo traps: an Edit on a CRLF working copy stages CRLF, so run `sed -i 's/\r$//' <file>` on every touched file before `git add`. Edit can write `æ`-style escapes into JSON: check `src/locales/nb.json` with `grep -n 'u00' src/locales/nb.json` after editing (expect no new hits). Stage named files only, never `git commit -a`. No AI attribution in commits.
- English for all code, comments and test names. No em dashes anywhere.

## Review Focus

1. **Long Norwegian labels in the narrowest aside.** At 1024 px the aside is about 300 px wide and "Trailere, skjermbilder og bakgrunnsbilder" wraps, worse at 200 % text. Expect the row to grow, the icon to stay beside the first line, and no horizontal overflow. Pinned by the `nb` 1024 px and 200 % runs in Task 5's measure spec, and by `min-width: 0` plus `overflow-wrap: anywhere` on `.row-label` in Task 3.
2. **A build in another time zone.** A date formatted without `timeZone: "UTC"` shows the day before in any zone west of UTC ("9 Nov" for `2026-11-10` in Los Angeles). Pinned by a `newsDate` test under `vi.stubEnv("TZ", "America/Los_Angeles")` in Task 2.
3. **A guide added later.** A third guide with a slug the icon map does not know must still render, with the checklist icon. Pinned by the `guideIcon` fallback tests in Task 1 (including `constructor`).
4. **Panel rows at rest.** The `:where(.news) a` underline must not reach the panel rows, but it must stay on the source links inside items and on the jump line. Pinned by the computed `text-decoration-line` checks in Task 5's measure spec.
5. **No facts at the widest step.** With no facts, Rumours must take the first slot and no empty column may be left at 1600 px. Pinned by the `no-facts` render test in Task 4 and by Task 4's CSS giving `.no-facts` the two-column template from 1024 px up.

---

## File map

| File | Change |
|---|---|
| `src/islands/tracker/icons.tsx` | Add 7 icons and `guideIcon(slug)`. |
| `src/islands/tracker/icons.test.ts` | Tests for `guideIcon` and the icon markup. |
| `src/model/days.ts` | Add `newsDate(iso, locale, buildYear)`. |
| `src/model/days.test.ts` | Tests for `newsDate`. |
| `src/styles/global.css` | `.rumour-list` spacing, last-item hairline, lead title, tier line and dots. |
| `src/locales/en.json`, `src/locales/nb.json` | Change `newsGuides.title`; add `newsGuides.intro` and `news.jumpLabel`. |
| `src/pages/[locale]/news.astro` | Tier lines, lead, aside with both panels, jump nav, grid, `wide`. |
| `src/test/news-page.test.ts` | Updated and new render tests. |
| `%TEMP%/rookdex-e2e/specs/news-measure.spec.mjs` | Scratch measuring spec (not committed). |

Branch: after PR #122 (spec and this plan) merges, cut `feat/news-redesign` from `main`. One PR for all five tasks.

---

### Task 1: Panel icons

**Files:**
- Modify: `src/islands/tracker/icons.tsx` (append after `categoryIcon`)
- Test: `src/islands/tracker/icons.test.ts`

**Interfaces:**
- Consumes: the file's existing `common` props object.
- Produces: `NewspaperIcon`, `ImageIcon`, `PlayIcon`, `AtIcon`, `CameraIcon`, `ChecklistIcon`, `ClockIcon` (each `() => ReactElement`), and `guideIcon(slug: string): () => ReactElement`.

- [ ] **Step 1: Write the failing tests**

Add to `src/islands/tracker/icons.test.ts` (merge the import lines with the existing ones):

```ts
import { renderToStaticMarkup } from "react-dom/server"
import {
	AllIcon,
	AtIcon,
	CameraIcon,
	ChecklistIcon,
	ClockIcon,
	categoryIcon,
	guideIcon,
	ImageIcon,
	NewspaperIcon,
	PlayIcon,
} from "./icons"

describe("News panel icons (News redesign spec §4)", () => {
	it("gives each launch guide its own icon", () => {
		expect(guideIcon("before-you-start")).toBe(ChecklistIcon)
		expect(guideIcon("first-hour")).toBe(ClockIcon)
	})

	it("falls back to the checklist for a guide it does not know, inherited names included", () => {
		expect(guideIcon("heists")).toBe(ChecklistIcon)
		expect(guideIcon("constructor")).toBe(ChecklistIcon)
		expect(guideIcon("toString")).toBe(ChecklistIcon)
	})

	it.each([
		["newspaper", NewspaperIcon],
		["image", ImageIcon],
		["play", PlayIcon],
		["at", AtIcon],
		["camera", CameraIcon],
		["checklist", ChecklistIcon],
		["clock", ClockIcon],
	])("draws the %s icon as a hidden 22 px outline", (_name, Icon) => {
		const svg = renderToStaticMarkup(<Icon />)
		expect(svg).toContain('viewBox="0 0 24 24"')
		expect(svg).toContain('width="22"')
		expect(svg).toContain('fill="none"')
		expect(svg).toContain('stroke="currentColor"')
		expect(svg).toContain('aria-hidden="true"')
		expect(svg).not.toContain("<image")
	})
})
```

The test file contains JSX now, so rename it: `git mv src/islands/tracker/icons.test.ts src/islands/tracker/icons.test.tsx`. Keep `AllIcon` and `categoryIcon` in the import; the existing tests still use them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/islands/tracker/icons.test.tsx`
Expected: FAIL, `guideIcon` (and the icons) are not exported.

- [ ] **Step 3: Write the icons and `guideIcon`**

Append to `src/islands/tracker/icons.tsx`:

```tsx
// News panel icons (News redesign spec §4): muted, footer style, my own geometry. None of them
// is a brand logo; the channel's name is the link text.

export function NewspaperIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M4 4h12v15a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2z" />
			<path d="M16 8h4v11a1 1 0 0 1-1 1h-2" />
			<path d="M8 8h4M8 12h4M8 16h4" />
		</svg>
	)
}

export function ImageIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<circle cx="9" cy="10" r="1.5" />
			<path d="m21 16-5-5-9 8" />
		</svg>
	)
}

export function PlayIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<path d="m10 8.5 5 3.5-5 3.5z" />
		</svg>
	)
}

export function AtIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
		</svg>
	)
}

export function CameraIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<circle cx="12" cy="13" r="3.5" />
		</svg>
	)
}

export function ChecklistIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
			<path d="M11 6h10M11 12h10M11 18h10" />
		</svg>
	)
}

export function ClockIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	)
}

const byGuide: Record<string, () => ReactElement> = {
	"before-you-start": ChecklistIcon,
	"first-hour": ClockIcon,
}

/** The icon for a guide slug. A guide added later gets the checklist until it has its own;
 *  hasOwn keeps "constructor" and friends from returning Object's own functions. */
export function guideIcon(slug: string): () => ReactElement {
	return Object.hasOwn(byGuide, slug) ? byGuide[slug] : ChecklistIcon
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/islands/tracker/icons.test.tsx`
Expected: PASS, all tests including the two existing `categoryIcon` tests.

- [ ] **Step 5: Lint and commit**

```bash
npx biome check src/islands/tracker/icons.tsx src/islands/tracker/icons.test.tsx
sed -i 's/\r$//' src/islands/tracker/icons.tsx src/islands/tracker/icons.test.tsx
git add src/islands/tracker/icons.tsx src/islands/tracker/icons.test.tsx
git commit -m "Add the News panel icons"
```

---

### Task 2: Tier line, dates and the lead item

**Files:**
- Modify: `src/model/days.ts` (append `newsDate`)
- Test: `src/model/days.test.ts`
- Modify: `src/styles/global.css:2439-2471` (the `.rumour-list` block)
- Modify: `src/pages/[locale]/news.astro` (the fact and rumour `<li>` markup)
- Test: `src/test/news-page.test.ts`

**Interfaces:**
- Consumes: `dateLocale(locale: Locale): string` from `src/model/days.ts`.
- Produces: `newsDate(iso: string, locale: Locale, buildYear: number): string`. Markup classes later tasks and the measure spec rely on: `.tier-line`, `.tier-dot.is-confirmed`, `.tier-dot.is-rumour`, `.tier-label`, `li.is-lead`.

- [ ] **Step 1: Write the failing `newsDate` tests**

Add `newsDate` to the import in `src/model/days.test.ts` and append:

```ts
describe("newsDate (News redesign spec §3)", () => {
	it("shows day and short month, day first in both languages", () => {
		expect(newsDate("2026-11-10", "en", 2026)).toBe("10 Nov")
		expect(newsDate("2026-11-10", "nb", 2026)).toBe("10. nov.")
	})

	it("adds the year when it differs from the build year", () => {
		expect(newsDate("2026-06-24", "en", 2027)).toBe("24 Jun 2026")
		expect(newsDate("2026-06-24", "nb", 2027)).toBe("24. juni 2026")
	})

	it("keeps the calendar day in a zone west of UTC", () => {
		vi.stubEnv("TZ", "America/Los_Angeles")
		expect(newsDate("2026-11-10", "en", 2026)).toBe("10 Nov")
		expect(newsDate("2026-01-01", "en", 2026)).toBe("1 Jan")
	})
})
```

The file's `afterEach` already calls `vi.unstubAllEnvs()`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/model/days.test.ts`
Expected: FAIL, `newsDate` is not exported.

- [ ] **Step 3: Write `newsDate`**

Append to `src/model/days.ts`:

```ts
/** A News date (`YYYY-MM-DD`) as "10 Nov" or "10. nov.", with the year when it is not
 *  `buildYear`. Read and formatted in UTC, so the day never shifts with the build machine's zone. */
export function newsDate(iso: string, locale: Locale, buildYear: number): string {
	const date = new Date(`${iso}T00:00:00Z`)
	const year = date.getUTCFullYear() === buildYear ? {} : { year: "numeric" as const }
	return new Intl.DateTimeFormat(dateLocale(locale), {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		...year,
	}).format(date)
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/model/days.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing page tests**

In `src/test/news-page.test.ts`, change the mocked older fact so one date falls in another year:

```ts
		facts: [fact("older", "2025-06-24"), fact("newer", "2026-10-15")],
```

Then add these tests inside the `describe` block:

```ts
	it("opens every item with its tier label and a dated <time>", async () => {
		for (const locale of ["en", "nb"] as const) {
			const doc = await renderDoc(News, { params: { locale } })
			const labels = locale === "en" ? ["Confirmed", "Rumour"] : ["Bekreftet", "Rykte"]
			const sections = [
				['[aria-labelledby="confirmed"]', labels[0], "is-confirmed"],
				['[aria-labelledby="rumours"]', labels[1], "is-rumour"],
			] as const
			for (const [section, label, dot] of sections) {
				const items = [...doc.querySelectorAll(`${section} .rumour-list > li`)]
				expect(items.length).toBeGreaterThan(0)
				for (const item of items) {
					// Title first in the DOM, so heading navigation hears the tier and date next.
					expect(item.firstElementChild?.tagName).toBe("H3")
					expect(item.children[1]?.classList.contains("tier-line")).toBe(true)
					const line = item.querySelector(".tier-line")
					expect(line?.querySelector(".tier-label")?.textContent).toBe(label)
					const marker = line?.querySelector(".tier-dot")
					expect(marker?.classList.contains(dot)).toBe(true)
					expect(marker?.getAttribute("aria-hidden")).toBe("true")
					const datetime = line?.querySelector("time")?.getAttribute("datetime") ?? ""
					expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}$/)
					expect(Number.isNaN(Date.parse(datetime))).toBe(false)
				}
			}
		}
	})

	it("shows the year on a date from another year", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const old = doc.querySelector('.fact-list time[datetime="2025-06-24"]')
		expect(old?.textContent).toBe("24 Jun 2025")
	})

	it("marks the newest fact, and only it, as the lead", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const leads = [...doc.querySelectorAll(".is-lead")]
		expect(leads).toHaveLength(1)
		expect(leads[0]?.querySelector("h3")?.textContent).toBe("Fact newer")
		expect(leads[0]?.parentElement?.classList.contains("fact-list")).toBe(true)
	})
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/test/news-page.test.ts`
Expected: the three new tests FAIL (no `.tier-line`, no `.is-lead`); the existing tests still PASS.

- [ ] **Step 7: Add the tier line and the lead to `news.astro`**

In the frontmatter, add the import and the build year:

```ts
import { newsDate } from "../../model/days"
```

```ts
// Dates are fixed at build time; a date from another year shows its year (News redesign spec §3).
const buildYear = new Date().getUTCFullYear()
```

Replace the fact `map` callback's returned `<li>` so it reads:

```astro
						{confirmed.map((fact, index) => {
							const official =
								fact.sources.find((source) => source.tier === "official") ?? fact.sources[0]
							return (
								<li class:list={{ "is-lead": index === 0 }}>
									<h3>{fact.name[lang]}</h3>
									<p class="tier-line">
										<span class="tier-dot is-confirmed" aria-hidden="true" />
										<span class="tier-label">{t("facts.title")}</span>
										<time datetime={fact.announced}>
											{newsDate(fact.announced, lang, buildYear)}
										</time>
									</p>
```

(The rest of the fact `<li>`, from `<p class="summary">` to `</li>`, stays as it is.)

In the rumour `map` callback, insert the tier line right after the `<h3>`:

```astro
								<li>
									<h3>{rumour.name}</h3>
									<p class="tier-line">
										<span class="tier-dot is-rumour" aria-hidden="true" />
										<span class="tier-label">{t("hub.chipRumour")}</span>
										<time datetime={rumour.added}>{newsDate(rumour.added, lang, buildYear)}</time>
									</p>
```

The tier line follows the title in the DOM and is drawn above it with `order: -1` (Step 8). A screen-reader user who jumps by heading lands on the title and hears the tier and date next; with the line first in the DOM, heading navigation would skip the date.

- [ ] **Step 8: Restyle the item list in `global.css`**

Replace the `.rumour-list li` rule (line 2445) and add the new rules right after `.rumour-list .meta a` (line 2471):

```css
/* News items (News redesign spec §2, §3). The child combinator keeps the hairline off the
   "All sources" list inside an item. */
.rumour-list > li {
	display: flex;
	flex-direction: column;
	padding: var(--space-3) 0;
	border-bottom: 1px solid var(--border);
}

.rumour-list > li:last-child {
	border-bottom: 0;
}

.rumour-list > .is-lead h3 {
	font-size: 1.25rem;
}

/* Tier, then date, in muted small text. The label carries the meaning; the dot is decorative.
   It follows the title in the DOM (heading navigation lands on the title first) and is drawn
   above it. */
.tier-line {
	order: -1;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-1) var(--space-2);
	margin: 0 0 var(--space-1);
	font-size: 0.75rem;
	color: var(--text-muted);
}

.tier-dot {
	flex: none;
	inline-size: 0.5rem;
	block-size: 0.5rem;
	border-radius: 50%;
}

.tier-dot.is-confirmed {
	background: var(--tier-confirmed);
}

.tier-dot.is-rumour {
	border: 1.5px solid var(--text-muted);
}
```

Update the comment in `src/components/AllSources.astro` above `.all-sources ul > li`: replace "`.rumour-list li`" with "`.rumour-list > li`" so it names the rule that exists.

- [ ] **Step 9: Run the page and style tests**

Run: `npx vitest run src/test/news-page.test.ts src/model/days.test.ts src/styles`
Expected: PASS, including `links.test.ts` and `hover.test.ts`.

- [ ] **Step 10: Lint and commit**

```bash
npx biome check src/model/days.ts src/model/days.test.ts src/styles/global.css "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/components/AllSources.astro
sed -i 's/\r$//' src/model/days.ts src/model/days.test.ts src/styles/global.css "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/components/AllSources.astro
git add src/model/days.ts src/model/days.test.ts src/styles/global.css "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/components/AllSources.astro
git commit -m "Give each News item a tier line and date, and lead with the newest fact"
```

---

### Task 3: The two side panels

**Files:**
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Modify: `src/pages/[locale]/news.astro` (replace the channels and guides sections; scoped `<style>`)
- Test: `src/test/news-page.test.ts`

**Interfaces:**
- Consumes: `guideIcon`, `NewspaperIcon`, `ImageIcon`, `PlayIcon`, `AtIcon`, `CameraIcon` from Task 1.
- Produces: `<aside class="news-aside">` holding `section.news-panel[aria-labelledby="new-to-gta"]` then `section.news-panel[aria-labelledby="channels"]`; h2 ids `new-to-gta` and `channels`; rows `ul.panel-list > li > a` with `.row-label`. Task 4 places the aside in the grid; the measure spec reads these classes.

- [ ] **Step 1: Write the failing tests**

In `src/test/news-page.test.ts`, replace the test `"ends with the launch guides, linked in the page's language"` with:

```ts
	it("puts New to GTA VI? above Official channels in the aside", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const heads = [...doc.querySelectorAll("aside h2")].map((h) => [h.id, h.textContent])
		expect(heads).toEqual([
			["new-to-gta", "New to GTA VI?"],
			["channels", "Official channels"],
		])
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .section-intro')?.textContent).toBe(
			"Guides for your first days"
		)
		expect(doc.querySelector("aside")?.hasAttribute("aria-label")).toBe(false)
	})

	it("lists the guides in the page's language, each a full row with an icon", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(doc.querySelector("#new-to-gta")?.textContent).toBe("Ny i GTA VI?")
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .section-intro')?.textContent).toBe(
			"Guider for de første dagene"
		)
		const links = [...doc.querySelectorAll('[aria-labelledby="new-to-gta"] .panel-list a')]
		expect(
			links.map((a) => [a.querySelector(".row-label")?.textContent, a.getAttribute("href")])
		).toEqual([
			["Før du begynner", "/nb/guides/before-you-start/"],
			["Den første timen", "/nb/guides/first-hour/"],
		])
		for (const a of links) {
			expect(a.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector('.row-arrow[aria-hidden="true"]')?.textContent).toBe("›")
		}
		// The guide summary stays on the guide page, not in the row.
		expect(doc.querySelector('[aria-labelledby="new-to-gta"] .summary')).toBeNull()
	})

	it("keeps the panels off the news list styles", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("aside .rumour-list")).toBeNull()
		expect(doc.querySelectorAll("aside .news-panel")).toHaveLength(2)
	})
```

Replace the test `"lists Rockstar's official channels as plain text links in a new tab"` with:

```ts
	it("lists Rockstar's official channels with muted icons, never a brand logo", async () => {
		const doc = await renderDoc(News, { params: { locale: "nb" } })
		expect(doc.querySelector("#channels")?.textContent).toBe("Offisielle kanaler")
		expect(doc.querySelector('[aria-labelledby="channels"] .section-intro')?.textContent).toBe(
			"Rockstars egne nyheter og medier, rett fra kilden."
		)
		const links = [...doc.querySelectorAll('[aria-labelledby="channels"] .panel-list a')]
		expect(
			links.map((a) => [a.querySelector(".row-label")?.textContent, a.getAttribute("href")])
		).toEqual([
			["Rockstar Newswire", "https://www.rockstargames.com/newswire"],
			["Trailere, skjermbilder og bakgrunnsbilder", "https://www.rockstargames.com/VI/media"],
			["YouTube", "https://www.youtube.com/@RockstarGames"],
			["X", "https://x.com/rockstargames"],
			["Instagram", "https://instagram.com/rockstargames"],
		])
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.querySelector("img")).toBeNull()
			const icon = a.querySelector("svg")
			expect(icon?.getAttribute("fill")).toBe("none")
			expect(icon?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector(".ext-icon")).not.toBeNull()
		}
	})
```

In the first test (`"is the News tab, with Confirmed above Rumours"`), change the expected h2 list to:

```ts
		expect([...doc.querySelectorAll("main h2")].map((h) => h.textContent)).toEqual([
			"Confirmed",
			"Rumours",
			"New to GTA VI?",
			"Official channels",
		])
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/test/news-page.test.ts`
Expected: the changed and new tests FAIL (no `aside`, old titles).

- [ ] **Step 3: Change the copy**

In `src/locales/en.json`, replace the `newsGuides.title` line and add the intro after it:

```json
	"newsGuides.title": "New to GTA VI?",
	"newsGuides.intro": "Guides for your first days",
```

In `src/locales/nb.json`:

```json
	"newsGuides.title": "Ny i GTA VI?",
	"newsGuides.intro": "Guider for de første dagene",
```

Check the Norwegian file kept its letters: `grep -n 'u00' src/locales/nb.json` shows no line with `newsGuides`.

- [ ] **Step 4: Build the aside in `news.astro`**

Frontmatter: add the icon import and attach icons to the channels and guides.

```ts
import {
	AtIcon,
	CameraIcon,
	guideIcon,
	ImageIcon,
	NewspaperIcon,
	PlayIcon,
} from "../../islands/tracker/icons"
```

```ts
// Rockstar's own channels, as its site footer links them. Muted icons of my own, no logos.
const channels = [
	{ name: "Rockstar Newswire", href: "https://www.rockstargames.com/newswire", Icon: NewspaperIcon },
	// Rockstar's media page, linked and never mirrored: no Rockstar art on Rookdex.
	{ name: t("channels.media"), href: "https://www.rockstargames.com/VI/media", Icon: ImageIcon },
	{ name: "YouTube", href: "https://www.youtube.com/@RockstarGames", Icon: PlayIcon },
	{ name: "X", href: "https://x.com/rockstargames", Icon: AtIcon },
	{ name: "Instagram", href: "https://instagram.com/rockstargames", Icon: CameraIcon },
]
```

In the guides `map`, keep the slug's icon:

```ts
		return {
			href: getRelativeLocaleUrl(locale, `guides/${slug}`),
			Icon: guideIcon(slug),
			...found.entry.data,
		}
```

Replace the old comment above `guideEntries` ("The launch guides close the page...") with: `// The launch guides head the aside, so a first-timer finds the checklist beside the news.`

Delete the two old sections (`aria-labelledby="channels"` and `aria-labelledby="guides"`) and put this after the Rumours section:

```astro
		<aside class="news-aside">
			<section class="news-panel" aria-labelledby="new-to-gta">
				<h2 id="new-to-gta">{t("newsGuides.title")}</h2>
				<p class="section-intro">{t("newsGuides.intro")}</p>
				<ul class="panel-list">
					{
						guides.map(({ href, title, Icon }) => (
							<li>
								<a href={href}>
									<Icon />
									<span class="row-label">{title}</span>
									<span class="row-arrow" aria-hidden="true">
										›
									</span>
								</a>
							</li>
						))
					}
				</ul>
			</section>
			<section class="news-panel" aria-labelledby="channels">
				<h2 id="channels">{t("channels.title")}</h2>
				<p class="section-intro">{t("channels.intro")}</p>
				<ul class="panel-list">
					{
						channels.map(({ name, href, Icon }) => (
							<li>
								<ExternalLink href={href} locale={lang}>
									<Icon />
									<span class="row-label">{name}</span>
								</ExternalLink>
							</li>
						))
					}
				</ul>
			</section>
		</aside>
```

If Biome reformats the `›` span onto one line, accept its format and check `.row-arrow` text in the test still equals `›` exactly (no whitespace). If the test sees whitespace, write the span on one line: `<span class="row-arrow" aria-hidden="true">›</span>`.

- [ ] **Step 5: Style the panels (scoped)**

In the `<style>` block of `news.astro`, delete the `.channel-list li`, `.channel-list :global(a)` and `.guide-list a` rules, and add:

```css
	/* The side panels (News redesign spec §4): rows split by hairlines, no boxes. Each row is one
	   full-width link, set apart by its icon and arrow, so it drops the running-text underline
	   and shows it on hover and focus instead. :global(a) reaches into ExternalLink. */
	.panel-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.panel-list li + li {
		border-top: 1px solid var(--border);
	}

	.panel-list :global(a) {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap);
		padding-block: var(--space-1);
		text-decoration: none;
	}

	.panel-list :global(a > svg:first-child) {
		flex: none;
		color: var(--text-muted);
	}

	.panel-list :global(a:focus-visible) {
		text-decoration: underline;
	}

	@media (hover: hover) {
		.panel-list :global(a:hover) {
			text-decoration: underline;
		}
	}

	.row-label {
		flex: 1 1 auto;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.row-arrow {
		color: var(--text-muted);
	}
```

`.row-label` is set inside the ExternalLink slot too; Astro scopes slotted markup to the page that wrote it, so the scoped rule reaches it.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/test/news-page.test.ts src/i18n src/styles`
Expected: PASS, including `bundles.test.ts` (both bundles have `newsGuides.intro`) and `links.test.ts` (still one `text-decoration: underline;` in `global.css`).

- [ ] **Step 7: Lint and commit**

```bash
npx biome check "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
sed -i 's/\r$//' "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
git add "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
git commit -m "Move the guides and official channels into a News side panel"
```

---

### Task 4: Grid, jump line and the wide page

**Files:**
- Modify: `src/locales/en.json`, `src/locales/nb.json` (`news.jumpLabel`)
- Modify: `src/pages/[locale]/news.astro` (markup wrapper, `<Base wide>`, scoped `<style>`)
- Test: `src/test/news-page.test.ts`

**Interfaces:**
- Consumes: `.news-aside` and the h2 ids `new-to-gta` and `channels` from Task 3.
- Produces: `<nav class="news-jump" aria-label="On this page">`, `div.news-grid` (with `no-facts` when there are no facts) whose children are `section.news-confirmed`, `section.news-rumours` and `aside.news-aside`.

- [ ] **Step 1: Write the failing tests**

Add these tests (the existing `facts` import from `../model/seed` is the mocked array):

```ts
	it("jumps to the two panels from a labelled line under the heading", async () => {
		for (const [locale, label] of [
			["en", "On this page"],
			["nb", "På denne siden"],
		] as const) {
			const doc = await renderDoc(News, { params: { locale } })
			const nav = doc.querySelector(`nav[aria-label="${label}"]`)
			expect(nav?.previousElementSibling?.tagName).toBe("H1")
			const targets = [...(nav?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))
			expect(targets).toEqual(["#new-to-gta", "#channels"])
			for (const href of targets) {
				const heading = doc.getElementById(href?.slice(1) ?? "")
				expect(heading?.tagName).toBe("H2")
				expect(heading?.closest("aside")).not.toBeNull()
			}
			expect([...(nav?.querySelectorAll("a") ?? [])].map((a) => a.textContent)).toEqual([
				doc.getElementById("new-to-gta")?.textContent,
				doc.getElementById("channels")?.textContent,
			])
		}
	})

	it("puts Confirmed, Rumours and the aside in one grid on the wide page", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const grid = doc.querySelector(".news-grid")
		const parts = ["news-confirmed", "news-rumours", "news-aside"]
		const children = [...(grid?.children ?? [])]
		expect(children.map((el) => parts.find((c) => el.classList.contains(c)))).toEqual(parts)
		expect(grid?.classList.contains("no-facts")).toBe(false)
		expect(doc.querySelector("main")?.classList.contains("wide")).toBe(true)
	})

	it("drops Confirmed and the lead when there are no facts", async () => {
		const saved = facts.splice(0)
		try {
			const doc = await renderDoc(News, { params: { locale: "en" } })
			const grid = doc.querySelector(".news-grid")
			expect(grid?.classList.contains("no-facts")).toBe(true)
			expect(grid?.firstElementChild?.classList.contains("news-rumours")).toBe(true)
			expect(doc.querySelector("#confirmed")).toBeNull()
			expect(doc.querySelector(".is-lead")).toBeNull()
		} finally {
			facts.push(...saved)
		}
	})
```

`facts` is the mocked array the page reads at render time, so emptying it in place shows the page with no facts; the `finally` restores it for the other tests.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/test/news-page.test.ts`
Expected: the three new tests FAIL (no nav, no grid, `main` not wide).

- [ ] **Step 3: Add the hidden label copy**

`src/locales/en.json`, after `"news.description"`:

```json
	"news.jumpLabel": "On this page",
```

`src/locales/nb.json`, same place:

```json
	"news.jumpLabel": "På denne siden",
```

Run `grep -n 'u00' src/locales/nb.json` and confirm the new line is not listed.

- [ ] **Step 4: Wrap the markup in `news.astro`**

Pass `wide` to `Base`:

```astro
<Base locale={locale} title={t("seo.titles.news")} description={t("news.description")} path="news" wide>
```

Directly under `<h1>`, add the jump line, then open the grid around Confirmed, Rumours and the aside:

```astro
		<h1>{t("news.title")}</h1>
		<nav class="news-jump" aria-label={t("news.jumpLabel")}>
			<a href="#new-to-gta">{t("newsGuides.title")}</a>
			<a href="#channels">{t("channels.title")}</a>
		</nav>
		<div class:list={["news-grid", { "no-facts": confirmed.length === 0 }]}>
```

Give the two news sections their grid classes:

```astro
				<section class="news-confirmed" aria-labelledby="confirmed">
```

```astro
		<section class="news-rumours" aria-labelledby="rumours">
```

Close the grid `</div>` right after `</aside>`, before `</article>`.

- [ ] **Step 5: Lay out the grid (scoped, mobile-first)**

In the `<style>` block of `news.astro`, delete the `section + section { margin-top: var(--space-4); }` rule and add:

```css
	/* Layout per screen size (News redesign spec §2). One column below 1024 px; news and panels
	   side by side from 1024 px; Confirmed, Rumours and panels in three columns from 1600 px. */
	.news-jump {
		display: flex;
		flex-wrap: wrap;
		column-gap: var(--space-4);
		margin: 0 0 var(--space-4);
		font-size: 0.875rem;
	}

	.news-jump a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
	}

	.news-grid {
		display: grid;
		gap: var(--space-6);
	}

	.news-grid > * {
		min-width: 0;
	}

	.news-aside {
		display: grid;
		gap: var(--space-6);
		align-content: start;
	}

	/* The two panels sit side by side at the end of the single column. */
	@media (min-width: 768px) {
		.news-aside {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	/* Not sticky: both panels are short, and a sticky column overlaps the footer at 200 % text.
	   The jump line goes, because the panels are in view. Extra height from the aside goes to
	   the Rumours row, so Confirmed and Rumours never drift apart. */
	@media (min-width: 1024px) {
		.news-jump {
			display: none;
		}

		.news-grid {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			grid-template-rows: auto 1fr;
			grid-template-areas:
				"confirmed aside"
				"rumours aside";
			align-items: start;
		}

		.news-grid.no-facts {
			grid-template-rows: auto;
			grid-template-areas: "rumours aside";
		}

		.news-confirmed {
			grid-area: confirmed;
		}

		.news-rumours {
			grid-area: rumours;
		}

		.news-aside {
			grid-area: aside;
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* Text stops at --measure, so a third column beats a wide news column with an empty strip. */
	@media (min-width: 1600px) {
		.news-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.75fr);
			grid-template-rows: auto;
			grid-template-areas: "confirmed rumours aside";
		}

		/* No facts: Rumours takes the first slot and the page keeps two columns, so no column
		   stands empty. */
		.news-grid.no-facts {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			grid-template-areas: "rumours aside";
		}
	}
```

The jump links keep the running-text underline from `:where(.news) a`; only the panel rows drop it.

- [ ] **Step 6: Run the full suite and type check**

Run: `npx vitest run` then `npx astro check`
Expected: all tests PASS; `astro check` reports 0 errors.

- [ ] **Step 7: Lint and commit**

```bash
npx biome check "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
sed -i 's/\r$//' "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
git add "src/pages/[locale]/news.astro" src/test/news-page.test.ts src/locales/en.json src/locales/nb.json
git commit -m "Lay out News in one, two or three columns with a jump line on small screens"
```

---

### Task 5: Measure on a preview build, then open the PR

**Files:**
- Create (scratch, not committed): `%TEMP%/rookdex-e2e/specs/news-measure.spec.mjs`

**Interfaces:**
- Consumes: the classes from Tasks 2 to 4: `.news-confirmed`, `.news-rumours`, `.news-aside`, `.news-jump`, `.panel-list a`, `.rumour-list .meta a`.
- Produces: `logs/news-measure.json` and six screenshots in `%TEMP%/rookdex-e2e/logs/`.

- [ ] **Step 1: Build and serve the preview**

Never measure the dev server: its toolbar covers the phone tab bar.

```bash
npm run build
```

Then start `npx wrangler dev --port 8788` in the background (the scratch harness's default `BASE_URL`). If port 8788 is taken by a stale `workerd`, find it with `netstat -ano | grep 8788` and stop it with `taskkill //PID <pid> //F //T`.

- [ ] **Step 2: Write the measure spec**

`%TEMP%/rookdex-e2e/specs/news-measure.spec.mjs`:

```js
import { writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

// Measuring pass for the News redesign (News redesign spec §7). Writes one JSON report to logs/.
const widths = [320, 768, 1024, 1280, 1600, 1920, 3440]
const columns = { 320: 1, 768: 1, 1024: 2, 1280: 2, 1600: 3, 1920: 3, 3440: 3 }
const results = []

function measure(page) {
	return page.evaluate(() => {
		const r = (el) => el.getBoundingClientRect()
		const shown = (el) => el && r(el).height > 0
		const parts = [".news-confirmed", ".news-rumours", ".news-aside"]
			.map((s) => document.querySelector(s))
			.filter(shown)
		const lefts = new Set(parts.map((el) => Math.round(r(el).left)))
		const confirmed = document.querySelector(".news-confirmed")
		const aside = document.querySelector(".news-aside")
		const links = [...document.querySelectorAll(".news-aside a, .news-jump a")].filter(shown)
		const orange = [...document.querySelectorAll("main *")].filter((el) => {
			const s = getComputedStyle(el)
			return [s.color, s.backgroundColor, s.borderTopColor, s.backgroundImage].some((v) =>
				v.includes("255, 138, 61")
			)
		})
		const deco = (sel) =>
			[...document.querySelectorAll(sel)].map((a) => getComputedStyle(a).textDecorationLine)
		// Keyboard focus: every visible panel and jump link shows a ring, and panel rows underline.
		const unfocused = links.filter((a) => {
			a.focus({ focusVisible: true })
			const s = getComputedStyle(a)
			const panelRow = a.closest(".panel-list") !== null
			const bad =
				s.outlineStyle === "none" || (panelRow && s.textDecorationLine !== "underline")
			a.blur()
			return bad
		}).length
		const panels = [...document.querySelectorAll(".news-panel")].map((el) => [
			Math.round(r(el).left),
			Math.round(r(el).top),
		])
		return {
			unfocused,
			panelsSideBySide:
				panels.length === 2 && panels[0][0] !== panels[1][0] && panels[0][1] === panels[1][1],
			overflow: document.documentElement.scrollWidth - innerWidth,
			columns: lefts.size,
			topGap: confirmed && aside ? Math.round(r(aside).top - r(confirmed).top) : null,
			minLinkH: Math.min(...links.map((a) => r(a).height)),
			orange: orange.length,
			panelDeco: [...new Set(deco(".panel-list a"))],
			sourceDeco: [...new Set(deco(".rumour-list .meta a"))],
		}
	})
}

async function cls(page) {
	return page.evaluate(
		() =>
			new Promise((done) => {
				let sum = 0
				new PerformanceObserver((list) => {
					for (const e of list.getEntries()) if (!e.hadRecentInput) sum += e.value
				}).observe({ type: "layout-shift", buffered: true })
				setTimeout(() => done(sum), 300)
			})
	)
}

const runs = [
	...["en", "nb"].flatMap((locale) => widths.map((width) => ({ locale, width, scale: 100 }))),
	...[390, 1280, 1600].map((width) => ({ locale: "en", width, scale: 200 })),
	{ locale: "nb", width: 1024, scale: 200 },
]

test("News layout", async ({ page }) => {
	const cdp = await page.context().newCDPSession(page)
	await cdp.send("Page.enable")
	for (const { locale, width, scale } of runs) {
		await cdp.send("Page.setFontSizes", {
			fontSizes: { standard: 16 * (scale / 100), fixed: 13 * (scale / 100) },
		})
		await page.setViewportSize({ width, height: 900 })
		await page.goto(`/${locale}/news/`, { waitUntil: "load" })
		await page.waitForTimeout(400)
		const m = { locale, width, scale, cls: await cls(page), ...(await measure(page)) }
		results.push(m)
		if (scale === 100 && [390, 1280, 1920].includes(width)) {
			await page.screenshot({ path: `logs/news-${locale}-${width}.png`, fullPage: true })
		}
	}
	// 390 is not in widths; take its screenshots in their own pass.
	for (const locale of ["en", "nb"]) {
		await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16, fixed: 13 } })
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto(`/${locale}/news/`, { waitUntil: "load" })
		await page.waitForTimeout(400)
		await page.screenshot({ path: `logs/news-${locale}-390.png`, fullPage: true })
	}
	writeFileSync("logs/news-measure.json", JSON.stringify(results, null, 2))
	for (const m of results) {
		expect(m.overflow, `${m.locale} ${m.width} ${m.scale}%`).toBeLessThanOrEqual(0)
		expect(m.minLinkH, `${m.locale} ${m.width} ${m.scale}%`).toBeGreaterThanOrEqual(44)
		expect(m.orange).toBe(0)
		expect(m.panelDeco).toEqual(["none"])
		expect(m.sourceDeco).toEqual(["underline"])
		expect(m.unfocused, `${m.locale} ${m.width} ${m.scale}%`).toBe(0)
		if (m.scale === 100) {
			expect(m.columns, `${m.locale} ${m.width}`).toBe(columns[m.width])
			// Spec §2: the two panels sit side by side at 768 px, stacked from 1024 px.
			expect(m.panelsSideBySide, `${m.locale} ${m.width}`).toBe(m.width === 768)
			expect(m.cls).toBeLessThan(0.01)
			if (m.width >= 1024) expect(Math.abs(m.topGap)).toBeLessThanOrEqual(1)
		}
	}
})
```

- [ ] **Step 3: Run it**

From `%TEMP%/rookdex-e2e`: `npx playwright test specs/news-measure.spec.mjs`
Expected: PASS. If an assertion fails, read `logs/news-measure.json` for the run, fix the CSS in `news.astro` or `global.css`, rebuild (Step 1) and rerun. After a rebuild, the service worker is blocked by the harness config, so no cache clearing is needed here. Two fix rounds at most; after that, stop and report what still fails.

- [ ] **Step 4: Look at the screenshots**

The image hook blocks Read on `%TEMP%` PNGs, so copy the six (`news-{en,nb}-{390,1280,1920}.png`) into `.superpowers/news-shots/` (gitignored) and Read them from there. Check by eye: tier lines on one row, dots centred on the label's x-height, lead title larger, panel icons on the label's first line, hairlines between items and not after the last.

- [ ] **Step 5: Full checks**

```bash
npx vitest run
npx astro check
```

Run `npx biome ci .` in the LF worktree `../rookdex-lf` after pulling this branch there; the main checkout shows CRLF noise.
Expected: all green.

- [ ] **Step 6: Push and open the PR**

Stop the background `wrangler dev` first. Write the PR body to a unique temp file, then:

```bash
git push -u origin feat/news-redesign
gh pr create --base main --title "Redesign the News page as a calm open list" --body-file "$TEMP/news-redesign-pr-$$.md"
```

PR body (first person, no AI attribution):

```markdown
The News page was one long column where every item looked the same, and Official channels started about 3,000 px down on a 1600 px screen. This makes it calmer and moves the guides and channels beside the news on wide screens.

Spec: `docs/superpowers/specs/2026-11-12-news-redesign-design.md`

- One column on phones and tablets, two from 1024 px, three from 1600 px (Confirmed, Rumours, panels).
- Every item opens with a tier line: a dot, Confirmed or Rumour, and the date. The newest fact leads with a larger title.
- "Getting ready" is now "New to GTA VI?" and sits above Official channels in a side panel, both with muted icons of my own.
- Below 1024 px a short "On this page" line jumps to the two panels.

Measured on a preview build at 320, 768, 1024, 1280, 1600, 1920 and 3440 px in both languages, plus 200 % text at 390, 1280 and 1600 px and Norwegian at 1024 px: no overflow, the expected column count, every panel link at least 44 px tall, CLS under 0.01.
```

Then check CI with the ccd_pr tools. Lighthouse CI must be green; only `ward / gate` is required, so merge by hand once every check is done.

---

## Stress test: considered and rejected

- **The build year goes stale between deploys.** A page built on 31.12 shows a November date without its year until the next deploy. The weekly News PRs and the launch rebuild cron redeploy often, so the window is days at most.
- **A build in Oslo just after midnight on 1 January** takes the UTC year, one hour behind. Same window, same fix: the next deploy.
- **Naming the `<aside>` to make it a landmark.** Inside `main` a named aside trips axe's `landmark-complementary-is-top-level`. The two h2s already give heading navigation a way in.
- **An NVDA pass by ear.** NVDA can only be driven over CDP on this machine, never by OS keys. The render tests pin heading order and the title-first DOM order, which is what NVDA would read.

> Stress-tested 2026-11-13 (skill 5065c26): 3 applied, 0 adapted, 0 decided by me.
