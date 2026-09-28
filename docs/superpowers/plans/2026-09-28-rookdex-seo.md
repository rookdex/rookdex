# Rookdex SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rookdex.app indexable with clear search titles, link previews and a site name, keep every workers.dev host out of search, and fail the build when the SEO output breaks.

**Architecture:** One pure route and helper module (`src/model/seo.ts`) feeds the sitemap endpoint, the guide pages and the JSON-LD block. `Base.astro` gets the full `<title>` from copy, Open Graph and Twitter tags, and an `indexable` prop that the 404 turns off. A second Astro integration (`integrations/seo-check.mjs`) checks the built `dist/` across files, and the deploy workflow pings IndexNow after a successful deploy.

**Tech Stack:** Astro 7 (static output, i18n routing, content collections), Vitest 5 with the Astro Container API, Cloudflare Workers static assets (`wrangler.jsonc`, `_headers`), GitHub Actions. No new packages.

**Spec:** `docs/superpowers/specs/2026-09-25-rookdex-seo-design.md` (+ `2026-09-25-rookdex-seo-stress-test.md`). Read both before Task 1.

## Global Constraints

- No new npm packages, no analytics, no HTML-parser dependency in the build check.
- Site origin is exactly `https://rookdex.app`. Built URLs end with `/` (`trailingSlash: "always"`).
- Every `<title>` is at most 65 characters; `seo.homeDescription` is at most 165 characters.
- Guide slugs match `^[a-z0-9-]+$`, otherwise the build fails.
- Sitemap: `<loc>` only; no `lastmod`, `priority`, `changefreq` or hreflang. 8 URLs today (home, tracker, news, `guides/before-you-start` × `en`, `no`). Settings and the 404 are never listed.
- `og:locale` is `en_US` for `en` and `nb_NO` for `no`. JSON-LD `inLanguage` is `en` or `nb`.
- The IndexNow key file holds 32 lowercase hex characters and nothing else, with no trailing newline.
- Visible `<h1>` headings do not change.
- Code style: Biome (tabs, double quotes, no semicolons, line width 100). Code and comments in English.
- Commits: imperative sentence subject like the repo history ("Add …"), author `malinfossum.dev@proton.me`, no `Co-Authored-By` or AI attribution.

**Deviations from the spec, all small and deliberate:**
1. `seo.ts` also exports `validSlugs` (the guide pages' `getStaticPaths` calls it, so "both go through it" holds), `sitemapXml` (keeps the endpoint thin and testable) and `SITE` (the Container API renders without the config's `site`, so `Base` can't rely on `Astro.site`).
2. **Rule 3 checks the 404's `<head>` only.** The 404 body links each language with `hreflang="en"`/`hreflang="no"` on `<a>`, so a whole-file substring check for `hreflang=` would always fail. Substring checks inside `<head>` keep the "no reordering loophole" property.
3. `listFiles` is exported from `precache.mjs` and reused by the check.
4. A new `src/test/public-files.test.ts` pins `robots.txt`, the key file, `.gitattributes`, `_headers`, `wrangler.jsonc` and the deploy guard, because CI runs tests before the build.
5. The JSON-LD block renders only when `path === ""` **and** `indexable`, so the 404 (which passes `path=""`) never gets it.
6. In `deploy.yml`, `jq`'s `--args` comes after the filter, as jq expects.

## Review Focus

1. **A guide file in a subfolder or with capitals** (`guides/en/Launch_Day.md`, `guides/en/sub/x.md`): the build must fail with a message naming the slug, never ship a URL with `/`, `_` or capitals. Pinned in Task 1.
2. **Windows line endings:** `robots.txt` checked out with CRLF must still pass rule 5; a key file with any trailing newline must fail rule 6. Pinned in Task 5.
3. **A title with `&` or quotes** (a future guide `searchTitle`): Astro writes `&amp;`, and the 65-character rule must count the decoded text, not the entity. Pinned in Task 5.
4. **The 404 and the home page share `path=""`:** the 404 must have no canonical, no hreflang link, no `og:url` and no JSON-LD, while its body language links stay. Pinned in Tasks 3 and 5.
5. **Norwegian pages:** `og:locale` must be `nb_NO` with `en_US` as the alternate, and JSON-LD `inLanguage` must be `nb`, not `no`. Pinned in Task 3.

---

### Task 1: SEO route model

**Files:**
- Create: `src/model/seo.ts`
- Create: `src/model/seo.test.ts`
- Modify: `src/pages/[locale]/guides/[slug].astro:6-14`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `SITE: "https://rookdex.app"` (string constant, no trailing slash)
  - `validSlugs(slugs: string[]): string[]`: throws on a slug not matching `^[a-z0-9-]+$`; returns deduped, sorted slugs
  - `indexablePaths(guideSlugs: string[]): string[]`: `["", "tracker", "news", ...validSlugs(guideSlugs).map((s) => "guides/" + s)]`
  - `jsonLd(value: unknown): string`: `JSON.stringify` with every `<` written as `<`
  - `sitemapXml(urls: string[]): string`: a sorted `<urlset>` document

- [ ] **Step 0: Commit the plan and the pending spec wording fix**

```bash
git add docs/superpowers/specs/2026-09-25-rookdex-seo-design.md docs/superpowers/plans/2026-09-28-rookdex-seo.md
git commit -m "Add the SEO implementation plan"
```

Skip if `git status --short docs/` is already empty.

- [ ] **Step 1: Write the failing tests**

`src/model/seo.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { indexablePaths, jsonLd, SITE, sitemapXml, validSlugs } from "./seo"

describe("SITE", () => {
	it("is the production origin without a trailing slash", () => {
		expect(SITE).toBe("https://rookdex.app")
	})
})

describe("validSlugs (SEO spec §4.1)", () => {
	it("dedupes and sorts", () => {
		expect(validSlugs(["regions", "before-you-start", "regions"])).toEqual([
			"before-you-start",
			"regions",
		])
	})

	it.each(["Launch", "launch_day", "sub/x", "", "før"])("throws on %j, naming it", (slug) => {
		expect(() => validSlugs(["ok", slug])).toThrow(`"${slug}"`)
	})
})

describe("indexablePaths (SEO spec §4.1)", () => {
	it("lists home, tracker, news, then each guide once under guides/", () => {
		expect(indexablePaths(["before-you-start", "before-you-start"])).toEqual([
			"",
			"tracker",
			"news",
			"guides/before-you-start",
		])
	})

	it("never lists settings", () => {
		expect(indexablePaths(["before-you-start"])).not.toContain("settings")
	})

	it("throws on a bad guide slug", () => {
		expect(() => indexablePaths(["Bad Slug"])).toThrow()
	})
})

describe("jsonLd (SEO spec §4.4)", () => {
	it("can't close the script tag, and still parses back to the same value", () => {
		const value = { name: "</script><script>alert(1)</script>" }
		const out = jsonLd(value)
		expect(out).not.toContain("<")
		expect(JSON.parse(out)).toEqual(value)
	})
})

describe("sitemapXml (SEO spec §4.2)", () => {
	it("writes one sorted <url><loc> per URL, and nothing else per entry", () => {
		const xml = sitemapXml([`${SITE}/no/`, `${SITE}/en/`])
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
		expect([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])).toEqual([
			`${SITE}/en/`,
			`${SITE}/no/`,
		])
		expect(xml).not.toMatch(/lastmod|priority|changefreq|hreflang/)
	})

	it("is byte-stable whatever order the URLs come in", () => {
		const urls = [`${SITE}/en/`, `${SITE}/en/news/`, `${SITE}/no/`]
		expect(sitemapXml([...urls].reverse())).toBe(sitemapXml(urls))
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/model/seo.test.ts`
Expected: FAIL, `Failed to resolve import "./seo"`.

- [ ] **Step 3: Write the implementation**

`src/model/seo.ts`:

```ts
// Indexable routes and the small helpers the sitemap, the guide pages and the JSON-LD block share.
// Pure and free of Astro imports, so it is unit-testable (SEO spec §4.1).

/** The production origin. The Container API renders without the config's `site`, so this is the
 *  source for absolute URLs that are not locale routes (og:image, the JSON-LD url). */
export const SITE = "https://rookdex.app"

const SLUG = /^[a-z0-9-]+$/

/** Guide slugs, deduped and sorted. Throws on a slug that isn't safe to put in a URL unescaped. */
export function validSlugs(slugs: string[]): string[] {
	for (const slug of slugs) {
		if (!SLUG.test(slug)) {
			throw new Error(`Guide slug "${slug}" must match ${SLUG}; rename the file in src/content/guides/`)
		}
	}
	return [...new Set(slugs)].sort()
}

/** Locale-less paths the sitemap lists and IndexNow pings, in the same form pages pass to Base.
 *  New indexable pages are added here. */
export function indexablePaths(guideSlugs: string[]): string[] {
	return ["", "tracker", "news", ...validSlugs(guideSlugs).map((slug) => `guides/${slug}`)]
}

/** JSON for a `set:html` script block: `<` is escaped, so no value can close the tag. */
export function jsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c")
}

/** A sitemap with `<loc>` only (spec D5). URLs are sorted so builds are byte-stable. The slug rule
 *  above is why no XML escaping is needed. */
export function sitemapXml(urls: string[]): string {
	const entries = [...urls].sort().map((url) => `  <url><loc>${url}</loc></url>`)
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries,
		"</urlset>",
		"",
	].join("\n")
}
```

- [ ] **Step 4: Route the guide pages through the slug check**

In `src/pages/[locale]/guides/[slug].astro`, change the import on line 6 and the `getStaticPaths` body:

```astro
import { guideSlugs, resolveGuide } from "../../../model/guides"
import { validSlugs } from "../../../model/seo"

export async function getStaticPaths() {
	const entries = await getCollection("guides")
	// Every slug exists in every language; missing translations render the English copy. A slug
	// that isn't URL-safe fails the build here and in the sitemap (SEO spec §4.1).
	return locales.flatMap((locale) =>
		validSlugs(guideSlugs(entries)).map((slug) => ({ params: { locale, slug } }))
	)
}
```

- [ ] **Step 5: Format, then run the tests to verify they pass**

Run: `npx biome format --write src/model/seo.ts src/model/seo.test.ts` (the `throw` line is over 100 characters).

Run: `npx vitest run src/model/seo.test.ts src/model/guides.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/model/seo.ts src/model/seo.test.ts "src/pages/[locale]/guides/[slug].astro"
git commit -m "Add the SEO route model with slug, JSON-LD and sitemap helpers"
```

---

### Task 2: Search titles and the home description

**Files:**
- Modify: `src/i18n/en.ts` (add a `seo` block as the last key)
- Modify: `src/i18n/no.ts` (same)
- Modify: `src/i18n/copy.test.ts`
- Modify: `src/model/guides.ts:10-26` (`searchTitle`)
- Modify: `src/model/guides.test.ts`
- Modify: `src/content/guides/en/before-you-start.md`, `src/content/guides/no/before-you-start.md` (frontmatter)
- Modify: `src/layouts/Base.astro:16-35` (title verbatim)
- Modify: `src/layouts/Base.test.ts`
- Modify: `src/pages/[locale]/index.astro:18`, `tracker/index.astro:15`, `news.astro:17`, `settings.astro:20`, `guides/[slug].astro:31`, `src/pages/404.astro:10`
- Modify: `src/test/news-page.test.ts`
- Create: `src/test/not-found-page.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `Strings["seo"]`: `{ titles: { home, tracker, news, settings, notFound }, homeDescription, ogImageAlt }` (all strings)
  - `guideSchema` gains `searchTitle?: string` (max 65)
  - `Base` prop `title` is now the **complete** `<title>` text; Base no longer appends ` · Rookdex`

- [ ] **Step 1: Write the failing copy tests**

Append to `src/i18n/copy.test.ts`:

```ts
describe("search titles and description (SEO spec §4.4)", () => {
	it.each([
		["en", en],
		["no", no],
	] as const)("%s titles fit in a result and name the site", (_locale, s) => {
		for (const title of Object.values(s.seo.titles)) {
			expect([...title].length, title).toBeLessThanOrEqual(65)
			expect(title).toContain("Rookdex")
		}
	})

	it.each([
		["en", en],
		["no", no],
	] as const)("%s home description is at most 165 characters", (_locale, s) => {
		expect([...s.seo.homeDescription].length).toBeLessThanOrEqual(165)
	})

	it("keeps the visible headings as they were", () => {
		expect(en.tracker.title).toBe("Tracker")
		expect(no.tracker.title).toBe("Oversikt")
		expect(en.seo.titles.home).toBe("Rookdex: GTA 6 countdown, tracker and launch guide")
	})
})
```

- [ ] **Step 2: Write the failing schema, Base and page tests**

Append to the `guideSchema` describe block in `src/model/guides.test.ts`:

```ts
	it("takes an optional search title of at most 65 characters", () => {
		expect(guideSchema.parse(guide).searchTitle).toBeUndefined()
		expect(guideSchema.safeParse({ ...guide, searchTitle: "x".repeat(65) }).success).toBe(true)
		expect(guideSchema.safeParse({ ...guide, searchTitle: "x".repeat(66) }).success).toBe(false)
	})
```

Add a new describe block at the end of `src/layouts/Base.test.ts`:

```ts
describe("title (SEO spec §4.4)", () => {
	it("writes the title prop verbatim, with no suffix added", async () => {
		const doc = await page("tracker")
		expect(doc.title).toBe("T")
	})
})
```

Add to `src/test/news-page.test.ts`:

```ts
	it("has a search title that differs from the heading", async () => {
		expect((await renderDoc(News, { params: { locale: "en" } })).title).toBe(
			"GTA 6 news and rumours · Rookdex"
		)
		expect((await renderDoc(News, { params: { locale: "no" } })).title).toBe(
			"GTA 6-nyheter og rykter · Rookdex"
		)
	})
```

Create `src/test/not-found-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import NotFound from "../pages/404.astro"
import { renderDoc } from "./render"

describe("404 page", () => {
	it("keeps its English title with the site name", async () => {
		const doc = await renderDoc(NotFound)
		expect(doc.title).toBe("Page not found · Rookdex")
		expect(doc.querySelector("h1")?.textContent).toBe("Page not found")
	})
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/i18n/copy.test.ts src/model/guides.test.ts src/layouts/Base.test.ts src/test/news-page.test.ts src/test/not-found-page.test.ts`
Expected: FAIL. `s.seo` is undefined, `searchTitle` is stripped by the schema, Base returns `"T · Rookdex"`, and News returns `"News · Rookdex"`. The 404 test may already pass; that's fine, because it guards Task 3.

- [ ] **Step 4: Add the copy**

Add this as the last key of `en` in `src/i18n/en.ts` (after `settings: { … },`):

```ts
	seo: {
		// Full <title> texts. Visible headings keep their own keys; these are what search shows.
		titles: {
			home: "Rookdex: GTA 6 countdown, tracker and launch guide",
			tracker: "GTA 6 collectibles and wildlife tracker · Rookdex",
			news: "GTA 6 news and rumours · Rookdex",
			settings: "Settings · Rookdex",
			notFound: "Page not found · Rookdex",
		},
		homeDescription:
			"Countdown to GTA 6 on 19 November 2026, a tracker for collectibles, places, vehicles and wildlife, and what to sort out before launch night. Free, works offline.",
		ogImageAlt: "Rookdex banner: The open-source GTA VI companion.",
	},
```

Add this as the last key of `no` in `src/i18n/no.ts`:

```ts
	seo: {
		titles: {
			home: "Rookdex: GTA 6-nedtelling, sjekkliste og lanseringsguide",
			tracker: "GTA 6-sjekkliste for samleobjekter og dyreliv · Rookdex",
			news: "GTA 6-nyheter og rykter · Rookdex",
			settings: "Innstillinger · Rookdex",
			// The 404 is English-only today; the key exists because `no` is typed as `Strings`.
			notFound: "Siden finnes ikke · Rookdex",
		},
		homeDescription:
			"Nedtelling til GTA 6 den 19. november 2026, sjekkliste for samleobjekter, steder, kjøretøy og dyreliv, og hva du bør ordne før lansering. Gratis, virker uten nett.",
		// The banner's own text is English.
		ogImageAlt: "Rookdex-banner: The open-source GTA VI companion.",
	},
```

- [ ] **Step 5: Add `searchTitle` to the guide schema and the two guides**

In `src/model/guides.ts`, add after `summary: z.string(),`:

```ts
	/** The full <title> text for search; the page falls back to "{title} · Rookdex". */
	searchTitle: z.string().max(65).optional(),
```

In `src/content/guides/en/before-you-start.md`, add after the `title:` line:

```yaml
searchTitle: "Before you start: GTA 6 launch checklist · Rookdex"
```

In `src/content/guides/no/before-you-start.md`, add after the `title:` line:

```yaml
searchTitle: "Før du begynner: GTA 6-sjekkliste for lanseringen · Rookdex"
```

(The quotes are required: the value contains a colon.)

- [ ] **Step 6: Make Base write the title verbatim**

In `src/layouts/Base.astro`, update the `title` prop doc and line 35:

```ts
	/** The complete <title> text: `s.seo.titles.*`, or a guide's `searchTitle`. */
	title: string
```

```astro
		<title>{title}</title>
```

- [ ] **Step 7: Pass the search titles from every page**

- `src/pages/[locale]/index.astro:18`: `<Base locale={locale} title={s.seo.titles.home} description={s.seo.homeDescription} path="">`
- `src/pages/[locale]/tracker/index.astro:15`: `title={s.seo.titles.tracker}`
- `src/pages/[locale]/news.astro:17`: `title={s.seo.titles.news}`
- `src/pages/[locale]/settings.astro:20`: `title={s.seo.titles.settings}`
- `src/pages/404.astro:10`: `title={s.seo.titles.notFound}`
- `src/pages/[locale]/guides/[slug].astro:31`:

```astro
<Base
	locale={locale}
	title={entry.data.searchTitle ?? `${entry.data.title} · ${s.siteName}`}
	description={entry.data.summary}
	path={`guides/${slug}`}
>
```

Leave every `<h1>` and every `description=` except the home page's unchanged. `s.tagline` stays the visible home tagline.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/i18n src/model/guides.test.ts src/layouts src/test`
Expected: PASS, including the existing Settings test `doc.title === "Innstillinger · Rookdex"`.

Run: `npm run check`
Expected: 0 errors (a missing `seo` key in `no.ts` would fail here).

- [ ] **Step 9: Commit**

```bash
git add src/i18n src/model/guides.ts src/model/guides.test.ts src/content/guides src/layouts src/pages src/test/news-page.test.ts src/test/not-found-page.test.ts
git commit -m "Give every page a search title and the home page a search description"
```

---

### Task 3: Open Graph, Twitter card, indexable prop and site-name JSON-LD

**Files:**
- Modify: `src/layouts/Base.astro` (frontmatter and `<head>`)
- Modify: `src/layouts/Base.test.ts`
- Modify: `src/pages/404.astro:10`
- Modify: `src/test/not-found-page.test.ts`

**Interfaces:**
- Consumes: `SITE`, `jsonLd` from `src/model/seo.ts` (Task 1); `s.seo.ogImageAlt` (Task 2).
- Produces: `Base` prop `indexable?: boolean` (default `true`). Built pages carry `meta[property="og:image"][content="https://rookdex.app/og.png"]`, `meta[name="twitter:card"]`, and on the two home pages one `script[type="application/ld+json"]`. Task 5's build check relies on exactly these attribute forms.

- [ ] **Step 1: Write the failing Base tests**

In `src/layouts/Base.test.ts`, widen the helper and add a describe block:

```ts
function page(
	path: string,
	extra: { locale?: Locale; tab?: Tab | null; indexable?: boolean } = {}
) {
```

```ts
const content = (doc: Document, selector: string) =>
	[...doc.querySelectorAll(selector)].map((el) => el.getAttribute("content"))

describe("link previews and indexing (SEO spec §4.4)", () => {
	it("gives every page Open Graph and Twitter card tags", async () => {
		const doc = await page("tracker")
		expect(content(doc, 'meta[property="og:site_name"]')).toEqual(["Rookdex"])
		expect(content(doc, 'meta[property="og:type"]')).toEqual(["website"])
		expect(content(doc, 'meta[property="og:title"]')).toEqual(["T"])
		expect(content(doc, 'meta[property="og:description"]')).toEqual(["D"])
		expect(content(doc, 'meta[property="og:image"]')).toEqual(["https://rookdex.app/og.png"])
		expect(content(doc, 'meta[property="og:image:width"]')).toEqual(["1200"])
		expect(content(doc, 'meta[property="og:image:height"]')).toEqual(["630"])
		expect(content(doc, 'meta[property="og:image:alt"]')).toEqual([
			"Rookdex banner: The open-source GTA VI companion.",
		])
		expect(content(doc, 'meta[name="twitter:card"]')).toEqual(["summary_large_image"])
		expect(doc.querySelector('meta[name="twitter:site"]')).toBeNull()
	})

	it.each([
		["en", "en_US", "nb_NO"],
		["no", "nb_NO", "en_US"],
	] as const)("names the %s locale and the other one as alternate", async (locale, own, other) => {
		const doc = await page("tracker", { locale })
		expect(content(doc, 'meta[property="og:locale"]')).toEqual([own])
		expect(content(doc, 'meta[property="og:locale:alternate"]')).toEqual([other])
	})

	it("points og:url at the canonical URL on an indexable page", async () => {
		const doc = await page("news")
		const canonical = doc.querySelectorAll('link[rel="canonical"]')
		expect(canonical).toHaveLength(1)
		expect(content(doc, 'meta[property="og:url"]')).toEqual([canonical[0].getAttribute("href")])
		expect(doc.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(3)
	})

	it("drops canonical, hreflang links, og:url and JSON-LD when not indexable", async () => {
		const doc = await page("", { indexable: false, tab: null })
		expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
		expect(doc.querySelector('link[rel="alternate"][hreflang]')).toBeNull()
		expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
		expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
		// Link previews still work for a shared 404 link.
		expect(content(doc, 'meta[property="og:image"]')).toEqual(["https://rookdex.app/og.png"])
	})

	it.each([
		["en", "en"],
		["no", "nb"],
	] as const)("puts one WebSite JSON-LD block on the %s home page only", async (locale, lang) => {
		const home = await page("", { locale })
		const blocks = home.querySelectorAll('script[type="application/ld+json"]')
		expect(blocks).toHaveLength(1)
		expect(JSON.parse(blocks[0].textContent ?? "")).toEqual({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "Rookdex",
			url: "https://rookdex.app/",
			inLanguage: lang,
		})
		const tracker = await page("tracker", { locale })
		expect(tracker.querySelector('script[type="application/ld+json"]')).toBeNull()
	})
})
```

Add to `src/test/not-found-page.test.ts` inside the describe:

```ts
	it("claims no address of its own but keeps its language links", async () => {
		const doc = await renderDoc(NotFound)
		expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
		expect(doc.querySelector('link[rel="alternate"][hreflang]')).toBeNull()
		expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
		expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
		expect(
			[...doc.querySelectorAll("main a[hreflang]")].map((a) => a.getAttribute("hreflang"))
		).toEqual(["en", "no"])
	})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/layouts/Base.test.ts src/test/not-found-page.test.ts`
Expected: FAIL. There are no og tags, the 404 still has a canonical, and there's no JSON-LD.

- [ ] **Step 3: Implement the head changes**

In `src/layouts/Base.astro` frontmatter, add the import and the prop, and derive the values:

```ts
import { jsonLd, SITE } from "../model/seo"
```

```ts
	/** false drops the canonical, hreflang links, og:url and JSON-LD: the 404 has no address of
	 *  its own and is served with a real 404 status, so it needs no noindex (SEO spec §4.4). */
	indexable?: boolean
}

const { locale, title, description, path, tab, indexable = true } = Astro.props
const s = t(locale)
const canonical = getAbsoluteLocaleUrl(locale, path)
const ogLocale: Record<Locale, string> = { en: "en_US", no: "nb_NO" }
```

Replace the three lines from `<link rel="canonical" …>` to the `x-default` link with:

```astro
		{
			indexable && (
				<>
					<link rel="canonical" href={canonical} />
					{locales.map((l) => <link rel="alternate" hreflang={l} href={getAbsoluteLocaleUrl(l, path)} />)}
					<link rel="alternate" hreflang="x-default" href={getAbsoluteLocaleUrl(defaultLocale, path)} />
					<meta property="og:url" content={canonical} />
				</>
			)
		}
		<meta property="og:site_name" content={s.siteName} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:locale" content={ogLocale[locale]} />
		{locales.filter((l) => l !== locale).map((l) => <meta property="og:locale:alternate" content={ogLocale[l]} />)}
		<meta property="og:image" content={`${SITE}/og.png`} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content={s.seo.ogImageAlt} />
		<meta name="twitter:card" content="summary_large_image" />
		{
			/* Site name (spec D7): Google reads it at the domain root, which redirects to /en/. The
			   block is data, never runs, and needs no CSP hash; jsonLd escapes "<". */
			path === "" && indexable && (
				<script
					type="application/ld+json"
					is:inline
					set:html={jsonLd({
						"@context": "https://schema.org",
						"@type": "WebSite",
						name: s.siteName,
						url: `${SITE}/`,
						inLanguage: locale === "no" ? "nb" : "en",
					})}
				></script>
			)
		}
```

In `src/pages/404.astro:10`, add `indexable={false}`:

```astro
<Base locale="en" title={s.seo.titles.notFound} description={s.notFound.body} path="" tab={null} indexable={false}>
```

Run `npx biome format --write src/layouts/Base.astro src/pages/404.astro` so the long lines wrap the Biome way.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/layouts src/test`
Expected: PASS. If the JSON-LD `textContent` comes back empty, check that `set:html` sits on a `<script>` with `is:inline`. Without `is:inline`, Astro bundles the tag as a module script.

- [ ] **Step 5: Commit**

```bash
git add src/layouts src/pages/404.astro src/test/not-found-page.test.ts
git commit -m "Add link previews, the site name and an indexable switch to the page head"
```

---

### Task 4: Sitemap, robots.txt, IndexNow key and precache skips

**Files:**
- Create: `src/pages/sitemap.xml.ts`
- Create: `public/robots.txt`
- Create: `public/indexnow-key.txt`
- Create: `.gitattributes`
- Create: `src/test/public-files.test.ts`
- Modify: `integrations/precache.mjs:8` (skip list) and `:36` (export `listFiles`)
- Modify: `integrations/precache.test.ts`

**Interfaces:**
- Consumes: `indexablePaths`, `sitemapXml` (Task 1); `guideSlugs` from `src/model/guides.ts`; `getAbsoluteLocaleUrl` from `astro:i18n`.
- Produces: `dist/sitemap.xml`, `dist/robots.txt`, `dist/indexnow-key.txt`; `export async function listFiles(root: string): Promise<string[]>` in `integrations/precache.mjs` (Task 5 imports it).

- [ ] **Step 1: Write the failing tests**

Create `src/test/public-files.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")

describe("crawler files (SEO spec §4.3, §4.6)", () => {
	it("robots.txt allows everything and names the sitemap", () => {
		const lines = read("public/robots.txt").split(/\r?\n/)
		expect(lines).toContain("User-agent: *")
		expect(lines).toContain("Allow: /")
		expect(lines).toContain("Sitemap: https://rookdex.app/sitemap.xml")
	})

	it("the IndexNow key is 32 lowercase hex characters and nothing else", () => {
		expect(read("public/indexnow-key.txt")).toMatch(/^[a-f0-9]{32}$/)
	})

	it("keeps line-ending conversion off the key file", () => {
		expect(read(".gitattributes").split(/\r?\n/)).toContain("public/indexnow-key.txt -text")
	})
})
```

Add to `integrations/precache.test.ts` in the `shouldPrecache` describe:

```ts
	it("skips the crawler-only files (SEO spec §4.7)", () => {
		for (const file of ["robots.txt", "sitemap.xml", "indexnow-key.txt"]) {
			expect(shouldPrecache(file), file).toBe(false)
		}
	})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/test/public-files.test.ts integrations/precache.test.ts`
Expected: FAIL with `ENOENT` for `public/robots.txt`, and `shouldPrecache("robots.txt")` returns `true`.

- [ ] **Step 3: Create robots.txt, the key and .gitattributes**

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://rookdex.app/sitemap.xml
```

Generate the key in **Git Bash** (PowerShell's `>` can add a BOM or newline):

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(16).toString('hex'))" > public/indexnow-key.txt
```

`.gitattributes`:

```
# The IndexNow key file must hold the key and nothing else (SEO spec §4.6).
public/indexnow-key.txt -text
```

- [ ] **Step 4: Skip the crawler files in the precache and export `listFiles`**

In `integrations/precache.mjs`, change line 8 and the doc comment on `shouldPrecache`:

```js
const SKIP = new Set([
	"404.html",
	"sw.js",
	"_headers",
	"_redirects",
	"robots.txt",
	"sitemap.xml",
	"indexnow-key.txt",
])
```

```js
/** Which built files the worker precaches: pages and assets, minus the worker's own files, the
 *  crawler-only files (robots, sitemap, IndexNow key, OG banner) and every non-latin font subset
 *  (they load on demand online). */
```

Change `async function listFiles(root)` to `export async function listFiles(root)` and give it a doc line:

```js
/** Every file under `root`, as posix paths relative to it. */
export async function listFiles(root) {
```

- [ ] **Step 5: Create the sitemap endpoint**

`src/pages/sitemap.xml.ts`:

```ts
import { getCollection } from "astro:content"
import { getAbsoluteLocaleUrl } from "astro:i18n"
import { locales } from "../i18n"
import { guideSlugs } from "../model/guides"
import { indexablePaths, sitemapXml } from "../model/seo"

// Prerendered to dist/sitemap.xml. The host serves it as XML from the extension; a static
// endpoint's response headers are dropped at build (SEO spec §4.2).
export async function GET() {
	const paths = indexablePaths(guideSlugs(await getCollection("guides")))
	const urls = locales.flatMap((locale) => paths.map((path) => getAbsoluteLocaleUrl(locale, path)))
	return new Response(sitemapXml(urls))
}
```

- [ ] **Step 6: Run the tests and the build**

Run: `npx vitest run src/test/public-files.test.ts integrations/precache.test.ts`
Expected: PASS.

Run: `npm run build`, then in Git Bash: `grep -c '<loc>' dist/sitemap.xml && grep -o '<loc>[^<]*</loc>' dist/sitemap.xml && grep -E 'robots|sitemap|indexnow' dist/sw.js || echo "not precached"`
Expected: `8`, then the 8 URLs `https://rookdex.app/{en,no}/`, `…/tracker/`, `…/news/`, `…/guides/before-you-start/`, and `not precached`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/sitemap.xml.ts public/robots.txt public/indexnow-key.txt .gitattributes src/test/public-files.test.ts integrations/precache.mjs integrations/precache.test.ts
git commit -m "Add the sitemap, robots.txt and the IndexNow key, kept out of the precache"
```

---

### Task 5: Build check integration

**Files:**
- Create: `integrations/seo-check.mjs`
- Create: `integrations/seo-check.test.ts`
- Modify: `astro.config.mjs:4,10`

**Interfaces:**
- Consumes: `listFiles` from `integrations/precache.mjs` (Task 4). The built head forms from Task 3: `<link rel="canonical" href="…">`, `<meta property="og:image" content="…">`, `<meta name="twitter:card" …>`, `<meta name="description" content="…">`, `<script type="application/ld+json">…</script>`.
- Produces:
  - `seoErrors(files: Record<string, string>, site: string): string[]`: each message starts with `[seo N]` (N = the spec §4.8 rule number)
  - `NOT_IN_SITEMAP: string[]` = `["settings"]`
  - default export `seoCheck()`, an Astro integration

- [ ] **Step 1: Write the failing tests**

`integrations/seo-check.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { seoErrors } from "./seo-check.mjs"

const SITE = "https://rookdex.app"
const LD = `<script type="application/ld+json">{"@type":"WebSite","url":"https://rookdex.app/"}</script>`

function page(url: string, head = "", title = "GTA 6 news and rumours · Rookdex") {
	return `<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="D"><link rel="canonical" href="${url}"><meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image">${head}</head><body></body></html>`
}

function sitemap(paths: string[]) {
	return `<?xml version="1.0" encoding="UTF-8"?><urlset>${paths.map((p) => `<url><loc>${SITE}/${p}</loc></url>`).join("")}</urlset>`
}

/** A dist/ that passes every rule. Settings is built but left out of the sitemap on purpose. */
function good(): Record<string, string> {
	return {
		"en/index.html": page(`${SITE}/en/`, LD),
		"no/index.html": page(`${SITE}/no/`, LD),
		"en/news/index.html": page(`${SITE}/en/news/`),
		"no/news/index.html": page(`${SITE}/no/news/`),
		"en/settings/index.html": page(`${SITE}/en/settings/`),
		"no/settings/index.html": page(`${SITE}/no/settings/`),
		// The body's language links carry hreflang; only the head is checked (rule 3).
		"404.html": `<html><head><title>Page not found · Rookdex</title></head><body><a href="/en/" hreflang="en">English</a></body></html>`,
		"sitemap.xml": sitemap(["en/", "no/", "en/news/", "no/news/"]),
		// CRLF, as a Windows checkout may have it.
		"robots.txt": "User-agent: *\r\nAllow: /\r\n\r\nSitemap: https://rookdex.app/sitemap.xml\r\n",
		"indexnow-key.txt": "0123456789abcdef0123456789abcdef",
	}
}

const rules = (files: Record<string, string>) =>
	seoErrors(files, SITE).map((message) => message.slice(0, 7))

describe("seoErrors (SEO spec §4.8)", () => {
	it("passes a good build, CRLF robots.txt and 404 body hreflang included", () => {
		expect(seoErrors(good(), SITE)).toEqual([])
	})

	it("accepts the site with a trailing slash", () => {
		expect(seoErrors(good(), `${SITE}/`)).toEqual([])
	})

	it("rule 0: a missing or empty sitemap", () => {
		const missing = good()
		delete missing["sitemap.xml"]
		expect(rules(missing)).toContain("[seo 0]")
		expect(rules({ ...good(), "sitemap.xml": sitemap([]) })).toContain("[seo 0]")
	})

	it("rule 0: a URL on another host", () => {
		const files = good()
		files["sitemap.xml"] = files["sitemap.xml"].replace(
			`${SITE}/en/news/`,
			"https://rookdex.malinfossum-dev.workers.dev/en/news/"
		)
		expect(rules(files)).toContain("[seo 0]")
	})

	it("rule 0: a built page nobody added to the sitemap", () => {
		const files = { ...good(), "en/tracker/index.html": page(`${SITE}/en/tracker/`) }
		expect(seoErrors(files, SITE).join("\n")).toContain("[seo 0] https://rookdex.app/en/tracker/")
	})

	it("rule 1: a sitemap URL with no built page", () => {
		const files = good()
		delete files["no/news/index.html"]
		expect(rules(files)).toContain("[seo 1]")
	})

	it("rule 2: a page with no canonical, two, or the wrong one", () => {
		const none = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`).replace(/<link[^>]*>/, "") }
		const two = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, `<link rel="canonical" href="${SITE}/en/news/">`) }
		const wrong = { ...good(), "en/news/index.html": page(`${SITE}/en/`) }
		for (const files of [none, two, wrong]) expect(rules(files)).toContain("[seo 2]")
	})

	it("rule 2 also covers pages kept out of the sitemap", () => {
		const files = { ...good(), "en/settings/index.html": page(`${SITE}/en/`) }
		expect(rules(files)).toContain("[seo 2]")
	})

	it.each([
		'<link rel="canonical" href="https://rookdex.app/en/">',
		'<link href="https://rookdex.app/en/" hreflang="en" rel="alternate">',
		'<meta content="https://rookdex.app/en/" property="og:url">',
	])("rule 3: the 404 head contains %s", (tag) => {
		const files = good()
		files["404.html"] = files["404.html"].replace("</head>", `${tag}</head>`)
		expect(rules(files)).toContain("[seo 3]")
	})

	it("rule 4: a listed page without og:image, twitter:card or description", () => {
		for (const strip of [/<meta property="og:image"[^>]*>/, /<meta name="twitter:card"[^>]*>/]) {
			const files = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`).replace(strip, "") }
			expect(rules(files)).toContain("[seo 4]")
		}
		const empty = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`).replace('content="D"', 'content=" "') }
		expect(rules(empty)).toContain("[seo 4]")
	})

	it("rule 4: og:image on another host", () => {
		const files = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`).replace(`${SITE}/og.png`, "https://x.workers.dev/og.png") }
		expect(rules(files)).toContain("[seo 4]")
	})

	it("rule 4: an empty title or one over 65 characters", () => {
		const empty = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", "") }
		const long = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", "x".repeat(66)) }
		expect(rules(empty)).toContain("[seo 4]")
		expect(rules(long)).toContain("[seo 4]")
	})

	it("rule 4 counts decoded text: 65 characters written with &amp; pass", () => {
		const title = `${"x".repeat(63)} &amp;` // 65 characters once decoded, 69 as written
		const files = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", title) }
		expect(seoErrors(files, SITE)).toEqual([])
	})

	it("rule 5: robots.txt missing or without the sitemap line", () => {
		const missing = good()
		delete missing["robots.txt"]
		expect(rules(missing)).toContain("[seo 5]")
		expect(rules({ ...good(), "robots.txt": "User-agent: *\nAllow: /\n" })).toContain("[seo 5]")
	})

	it.each([
		["missing", undefined],
		["trailing LF", "0123456789abcdef0123456789abcdef\n"],
		["trailing CRLF", "0123456789abcdef0123456789abcdef\r\n"],
		["upper case", "0123456789ABCDEF0123456789ABCDEF"],
		["too short", "0123456789abcdef"],
	])("rule 6: key file %s", (_label, key) => {
		const files = good()
		if (key === undefined) delete files["indexnow-key.txt"]
		else files["indexnow-key.txt"] = key
		expect(rules(files)).toContain("[seo 6]")
	})

	it("rule 7: a home page with no JSON-LD, two blocks, bad JSON or the wrong url", () => {
		const variants = [
			page(`${SITE}/en/`),
			page(`${SITE}/en/`, LD + LD),
			page(`${SITE}/en/`, '<script type="application/ld+json">{not json</script>'),
			page(`${SITE}/en/`, LD.replace("https://rookdex.app/", "https://rookdex.app/en/")),
		]
		for (const html of variants) {
			expect(rules({ ...good(), "en/index.html": html })).toContain("[seo 7]")
		}
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run integrations/seo-check.test.ts`
Expected: FAIL, `Failed to resolve import "./seo-check.mjs"`.

- [ ] **Step 3: Write the integration**

`integrations/seo-check.mjs`:

```js
// Astro integration. After the static build it checks the SEO rules that span several built files
// (SEO spec §4.8) and fails the build when one breaks. CI runs tests before the build, so a check
// of dist/ has to live here. Regex and substring checks only: Astro emits the head in a known shape.
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { listFiles } from "./precache.mjs"

/** Built pages kept out of the sitemap on purpose (spec D4), as locale-less paths. */
export const NOT_IN_SITEMAP = ["settings"]

const LOCALES = ["en", "no"]
const PAGE = /^(en|no)\/(.+\/)?index\.html$/
const ROOT_FILES = ["404.html", "sitemap.xml", "robots.txt", "indexnow-key.txt"]
const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

/** The entities Astro writes in text and attributes, decoded so lengths count characters. */
function decode(text) {
	return text
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&#x27;/g, "'")
		.replace(/&amp;/g, "&")
}

function tags(html, name) {
	return html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? []
}

function attr(tag, name) {
	return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
}

function metas(html, key, value) {
	return tags(html, "meta").filter((tag) => attr(tag, key) === value)
}

function head(html) {
	const end = html.indexOf("</head>")
	return end === -1 ? html : html.slice(0, end)
}

/**
 * Every broken rule, as "[seo N] …" messages. `files` maps a dist-relative posix path to its text:
 * every page under en/ and no/, plus 404.html, sitemap.xml, robots.txt and indexnow-key.txt. A
 * missing entry counts as a missing file.
 */
export function seoErrors(files, site) {
	const base = site.replace(/\/$/, "")
	const errors = []
	const pages = new Map(
		Object.keys(files)
			.filter((file) => PAGE.test(file))
			.map((file) => [`${base}/${file.slice(0, -"index.html".length)}`, file])
	)

	// Rules 0 and 1: the sitemap exists, stays on the site, and matches the built pages.
	const listed = [...(files["sitemap.xml"] ?? "").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
	if (listed.length === 0) errors.push("[seo 0] sitemap.xml is missing or lists no URLs")
	for (const url of listed) {
		if (!url.startsWith(`${base}/`)) errors.push(`[seo 0] ${url} is not on ${base}`)
		else if (!pages.has(url)) errors.push(`[seo 1] ${url} is in the sitemap but has no built page`)
	}
	const excluded = new Set(LOCALES.flatMap((l) => NOT_IN_SITEMAP.map((p) => `${base}/${l}/${p}/`)))
	for (const url of pages.keys()) {
		if (!excluded.has(url) && !listed.includes(url)) {
			errors.push(`[seo 0] ${url} is built but not in the sitemap; add it to indexablePaths or NOT_IN_SITEMAP`)
		}
	}

	// Rule 2: every locale page has exactly one canonical, pointing at itself.
	for (const [url, file] of pages) {
		const canonical = tags(files[file], "link").filter((tag) => attr(tag, "rel") === "canonical")
		if (canonical.length !== 1 || attr(canonical[0], "href") !== url) {
			errors.push(`[seo 2] ${file} needs exactly one canonical link, to ${url}`)
		}
	}

	// Rule 3: the 404 claims no address. Its body links each language with hreflang, so only the
	// head is searched; substrings can't be dodged by attribute order.
	const notFoundHead = head(files["404.html"] ?? "")
	for (const needle of ['rel="canonical"', "hreflang=", "og:url"]) {
		if (notFoundHead.includes(needle)) errors.push(`[seo 3] 404.html head contains ${needle}`)
	}

	// Rule 4: listed pages have a preview image, a card, a description and a title that fits.
	for (const url of listed) {
		const file = pages.get(url)
		if (!file) continue
		const html = files[file]
		const image = metas(html, "property", "og:image")
		if (image.length !== 1 || attr(image[0], "content") !== `${base}/og.png`) {
			errors.push(`[seo 4] ${file} needs one og:image at ${base}/og.png`)
		}
		if (metas(html, "name", "twitter:card").length !== 1) {
			errors.push(`[seo 4] ${file} needs one twitter:card`)
		}
		const description = metas(html, "name", "description")[0]
		if (!decode(attr(description ?? "", "content") ?? "").trim()) {
			errors.push(`[seo 4] ${file} has no description`)
		}
		const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").trim()
		if (!title || [...title].length > 65) {
			errors.push(`[seo 4] ${file} title is empty or over 65 characters: "${title}"`)
		}
	}

	// Rule 5: robots.txt names the sitemap (CRLF tolerated).
	if (!(files["robots.txt"] ?? "").split(/\r?\n/).includes(`Sitemap: ${base}/sitemap.xml`)) {
		errors.push(`[seo 5] robots.txt lacks "Sitemap: ${base}/sitemap.xml"`)
	}

	// Rule 6: the key file is the key and nothing else, untrimmed.
	if (!/^[a-f0-9]{32}$/.test(files["indexnow-key.txt"] ?? "")) {
		errors.push("[seo 6] indexnow-key.txt must be exactly 32 lowercase hex characters")
	}

	// Rule 7: each home page has one WebSite block at the domain root.
	for (const locale of LOCALES) {
		const file = `${locale}/index.html`
		const blocks = [...(files[file] ?? "").matchAll(LD_BLOCK)]
		let url
		try {
			url = blocks.length === 1 ? JSON.parse(blocks[0][1]).url : undefined
		} catch {
			url = undefined
		}
		if (url !== `${base}/`) errors.push(`[seo 7] ${file} needs one JSON-LD block with url ${base}/`)
	}

	return errors
}

export default function seoCheck() {
	let site = ""
	return {
		name: "rookdex-seo-check",
		hooks: {
			"astro:config:done": ({ config }) => {
				site = String(config.site ?? "")
			},
			"astro:build:done": async ({ dir, logger }) => {
				if (!site) throw new Error("seo check: astro.config.mjs has no site")
				const root = fileURLToPath(dir)
				const wanted = (await listFiles(root)).filter(
					(file) => PAGE.test(file) || ROOT_FILES.includes(file)
				)
				const files = {}
				for (const file of wanted) files[file] = await readFile(join(root, file), "utf8")
				const errors = seoErrors(files, site)
				if (errors.length > 0) throw new Error(`SEO check failed:\n${errors.join("\n")}`)
				logger.info(`seo check passed: ${wanted.length} files`)
			},
		},
	}
}
```

- [ ] **Step 4: Register it after the precache**

In `astro.config.mjs`:

```js
import precache from "./integrations/precache.mjs"
import seoCheck from "./integrations/seo-check.mjs"
```

```js
	integrations: [react(), precache(), seoCheck()],
```

- [ ] **Step 5: Run the tests and the real build**

Run: `npx vitest run integrations`
Expected: PASS.

Run: `npx biome format --write integrations && npm run build`
Expected: the build ends with `seo check passed: 14 files` (en + no × home, tracker, news, settings, guide = 10 pages, plus 4 root files; if the number differs, make sure the file list explains it, not a wrong filter). Then prove the check can fail: temporarily change `"news"` to `"newz"` in `indexablePaths`, run `npm run build`, and expect `[seo 1]` and `[seo 0]` errors. Revert the change.

- [ ] **Step 6: Commit**

```bash
git add integrations/seo-check.mjs integrations/seo-check.test.ts astro.config.mjs
git commit -m "Fail the build when the sitemap, canonicals or preview tags break"
```

---

### Task 6: Hosts and deploy (workers.dev off, noindex previews, main-only deploy, IndexNow ping)

**Files:**
- Modify: `wrangler.jsonc:11-13`
- Modify: `public/_headers` (append a block)
- Modify: `.github/workflows/deploy.yml:29-48`
- Modify: `src/test/public-files.test.ts`

**Interfaces:**
- Consumes: `dist/sitemap.xml` and `public/indexnow-key.txt` (Task 4).
- Produces: nothing code imports.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/public-files.test.ts`:

```ts
describe("hosts and deploy (SEO spec §4.5, §4.6)", () => {
	it("turns the workers.dev mirror off but keeps version previews", () => {
		// Every comment in wrangler.jsonc sits on its own line; parsing catches a duplicate key or a
		// lost brace that a regex would miss.
		const config = JSON.parse(read("wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""))
		expect(config.workers_dev).toBe(false)
		expect(config.preview_urls).toBe(true)
		expect(config.assets.not_found_handling).toBe("404-page")
	})

	it("sends noindex on every workers.dev host", () => {
		const lines = read("public/_headers").split(/\r?\n/)
		const host = lines.indexOf("https://:version.:subdomain.workers.dev/*")
		expect(host).toBeGreaterThanOrEqual(0)
		expect(lines[host + 1].trim()).toBe("X-Robots-Tag: noindex")
	})

	it("deploys only from main, and the IndexNow ping can't fail the deploy", () => {
		const workflow = read(".github/workflows/deploy.yml").replace(/\r\n/g, "\n")
		const job = workflow.slice(workflow.indexOf("\n  deploy:\n"))
		// The guard sits on the job, not a step, and the ping runs after the deploy it announces.
		expect(job.split("\n    steps:")[0]).toContain("\n    if: github.ref == 'refs/heads/main'")
		expect(job.indexOf("- name: Ping IndexNow")).toBeGreaterThan(job.indexOf("- name: Deploy"))
		const ping = workflow.slice(workflow.indexOf("- name: Ping IndexNow"))
		expect(ping).toContain("continue-on-error: true")
		expect(ping).toContain("timeout-minutes: 2")
		expect(ping).not.toContain("--fail")
		expect(ping).not.toContain("secrets.")
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/test/public-files.test.ts`
Expected: FAIL on all three new cases.

- [ ] **Step 3: Update wrangler.jsonc**

Replace lines 11–13 (the comment, `preview_urls` and `workers_dev`; line 10 is the `},` closing `assets` and stays):

```jsonc
	// Every `wrangler versions upload` gets its own preview URL; Cloudflare keeps those only while
	// this is explicit. `main` deploys to the custom domain; the workers.dev mirror is off (SEO spec D2).
	"preview_urls": true,
	"workers_dev": false,
```

- [ ] **Step 4: Append the noindex block to `public/_headers`**

Add a blank line, then:

```
https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

- [ ] **Step 5: Guard the deploy job and add the IndexNow step**

In `.github/workflows/deploy.yml`, add the guard under `deploy:` and the step after `Deploy`:

```yaml
  deploy:
    needs: test
    # workflow_dispatch can target any branch; only main may reach production (SEO spec §4.6).
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
```

```yaml
      - name: Ping IndexNow
        # Search engines learn about changed pages sooner. A failed ping shows as a failed step,
        # never a failed deploy; the key file is public by design and no secret is used.
        continue-on-error: true
        timeout-minutes: 2
        shell: bash
        run: |
          mapfile -t urls < <(grep -o '<loc>[^<]*</loc>' dist/sitemap.xml | sed -e 's/<loc>//' -e 's#</loc>##')
          if [ "${#urls[@]}" -eq 0 ]; then
            echo "## IndexNow: no URLs in dist/sitemap.xml" >> "$GITHUB_STEP_SUMMARY"
            exit 1
          fi
          jq -n --rawfile key public/indexnow-key.txt \
            '{host: "rookdex.app", key: $key, keyLocation: "https://rookdex.app/indexnow-key.txt", urlList: $ARGS.positional}' \
            --args "${urls[@]}" > body.json
          status=$(curl -sS --max-time 20 -o resp.txt -w '%{http_code}' -X POST https://api.indexnow.org/indexnow \
            -H 'Content-Type: application/json; charset=utf-8' --data @body.json) || true
          {
            echo "## IndexNow"
            echo "HTTP ${status:-none} for ${#urls[@]} URLs"
            cat resp.txt 2>/dev/null || true
          } >> "$GITHUB_STEP_SUMMARY"
          [ "$status" = 200 ] || [ "$status" = 202 ] || exit 1
```

(`jq` treats the first non-option argument as the filter, and `--args` turns everything after it into `$ARGS.positional`. No URL is spliced into JSON by hand.)

- [ ] **Step 6: Run the tests and a local dry run of the URL extraction**

Run: `npx vitest run src/test/public-files.test.ts`
Expected: PASS.

In Git Bash, after `npm run build`:

```bash
mapfile -t urls < <(grep -o '<loc>[^<]*</loc>' dist/sitemap.xml | sed -e 's/<loc>//' -e 's#</loc>##'); echo "${#urls[@]}"; printf '%s\n' "${urls[@]}"
```

Expected: `8` and the 8 URLs. `jq` isn't installed on this machine, so the JSON body is first proven by the deploy run's summary after merge (spec §5, manual check 4). `ubuntu-latest` ships with `jq`.

- [ ] **Step 7: Commit**

```bash
git add wrangler.jsonc public/_headers .github/workflows/deploy.yml src/test/public-files.test.ts
git commit -m "Keep workers.dev hosts out of search, deploy only main and ping IndexNow"
```

---

### Task 7: Gates, built-output check and PR

**Files:**
- None new. Reads `dist/`.

**Interfaces:**
- Consumes: everything above.
- Produces: a pushed `seo-spec` branch and an open PR.

- [ ] **Step 1: Run every gate CI runs**

Run: `npx biome ci . --line-ending=auto && npm run check && npm test && npm run build`

(`core.autocrlf=true` gives this checkout CRLF, so plain `biome ci .` reports ~118 line-ending errors locally even on `main`. CI checks out LF and runs plain `biome ci .`.)
Expected: all green; build log shows `seo check passed`.

- [ ] **Step 2: Read the built head of three pages**

In Git Bash:

```bash
for f in dist/en/index.html dist/no/tracker/index.html dist/404.html; do echo "== $f"; sed -n 's/.*<head>\(.*\)<\/head>.*/\1/p' "$f" | grep -oE '<title>[^<]*</title>|<(link|meta)[^>]*(canonical|hreflang|og:|twitter:|description)[^>]*>|<script type="application/ld\+json">[^<]*</script>'; done
```

Expected: `/en/` has the home title, one canonical, three hreflang links, og tags with `en_US` + alternate `nb_NO`, and one JSON-LD block with `"url":"https://rookdex.app/"` and `"inLanguage":"en"`. `/no/tracker/` has the NO tracker title, `nb_NO` + `en_US`, and no JSON-LD. `404.html` has og and twitter tags but no canonical, no hreflang link and no `og:url`.

- [ ] **Step 3: Push and open the PR**

```bash
git push
gh pr create --base main --head seo-spec --title "Make Rookdex findable in search" --body-file <scratchpad>/pr-body.md
```

PR body (write it to the scratchpad file first):

```markdown
Makes rookdex.app indexable before launch, following the SEO spec and its stress test (both in this PR).

## What changes
- Every page gets a search title; the home pages get a search description. Visible headings are unchanged.
- Open Graph and Twitter card tags on every page, all using `og.png`; WebSite JSON-LD on both home pages for the site name.
- `sitemap.xml` (8 content URLs) and `robots.txt`; the 404 no longer claims `/en/` as its canonical.
- The workers.dev mirror is off, and version previews send `X-Robots-Tag: noindex`.
- An IndexNow ping after each deploy that never fails the deploy.
- The deploy job only runs from `main` (a manual run could deploy any branch before).
- A build check that fails on a missing sitemap, a wrong canonical, a missing preview tag or an overlong title.

## After merge (by hand)
- Check the preview URL sends `x-robots-tag: noindex` and the workers.dev mirror is gone.
- Search Console domain property (DNS TXT), submit the sitemap, request indexing of `/`; import into Bing.
- Environments → production → deployment branches: `main` only.
```

- [ ] **Step 4: Bind the PR and read CI**

Use `mcp__ccd_pr__get_status`; if it doesn't report the PR, `mcp__ccd_pr__bind_pr`. Read the CI result once; don't poll.

---

## Stress test (2026-09-28)

A fresh-context agent built all 7 tasks exactly as written, in a throwaway clone. Results: 625 tests passed, `astro check` found 0 errors, the build printed `seo check passed: 14 files`, and the sitemap listed 8 URLs. The built heads match every regex shape the check assumes, and the CSP `script-src` is byte-identical before and after. It found no 🔴 or 🟠. All four 🟡 findings are applied above:

1. **Wrong line refs** for `wrangler.jsonc` (now 11–13) and `astro.config.mjs` (now 10). With the old refs, the old regex test stayed green on a broken config. It now parses the JSONC.
2. **Biome on a CRLF checkout.** The local gate now uses `--line-ending=auto`, and `seo.ts` gets formatted in Task 1.
3. **Deploy-guard test.** It now pins the `if:` to the job and the ping to after Deploy.
4. **Plan and spec wording fix not committed.** Task 1 now starts with Step 0.

**Considered and rejected:**
- Rule 0's host check can't fail on its own, because `og:image` and the JSON-LD `url` use `SITE`. A site change still fails rules 4 and 7.
- The glob loader lowercases file names, so `Launch.md` becomes `launch` and builds. `_` still fails.
- `jq` isn't installed locally. The first deploy summary proves the body, and a mistake can't block a deploy.
- A permanently failing ping keeps runs green, by spec design (D3).
- Unpinned `actions/*@v4` and no `concurrency:` on deploy predate this plan and are out of SEO scope. Worth a separate hardening task.

> Stress-tested 2026-09-28 (skill 2120355) — 4 applied, 0 adapted, 0 decided by me.
