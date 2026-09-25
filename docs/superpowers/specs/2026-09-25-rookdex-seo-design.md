# Rookdex SEO design

Date: 2026-09-25 · Status: approved in brainstorming; stress test (`2026-09-25-rookdex-seo-stress-test.md`) folded in; awaiting written-spec review · Ships before Spec A (`2026-09-25-rookdex-feedback-round-design.md`) is built, so indexing has time to settle before launch on 19 November 2026.

## 1. Goal

When someone searches for a GTA 6 countdown, tracker or launch checklist, Rookdex should show up with a clear title, the name "Rookdex" and a proper link preview. Only rookdex.app gets indexed, never a workers.dev copy. The site stays static, adds no packages and keeps no analytics.

## 2. What is there today

- `Base.astro` already writes a canonical link, hreflang alternates (`en`, `no`, `x-default` → `en`) and a per-page `<meta name="description">`.
- The title is `{title} · Rookdex`, or just `Rookdex` on home.
- `public/og.png` (1200 × 630) exists but is inert: no `og:image` or `twitter:card` anywhere.
- `/` redirects to `/en/` (302, `public/_redirects`).
- Missing: `robots.txt`, a sitemap, Open Graph and Twitter tags, structured data.
- `404.html` claims `https://rookdex.app/en/` as its canonical because it passes `path=""`. That is wrong.
- `wrangler.jsonc` has `workers_dev: true` (a production mirror at `rookdex.malinfossum-dev.workers.dev` that nothing uses) and `preview_urls: true` (one URL per uploaded version, used by the CI `preview` job).

## 3. Decisions

| # | Decision |
|---|----------|
| D1 | Search engines: Google Search Console (domain property, DNS TXT at the apex in Cloudflare) and Bing Webmaster Tools (imported from GSC). |
| D2 | workers.dev: turn the production mirror off (`workers_dev: false`, keep `preview_urls: true`) **and** send `X-Robots-Tag: noindex` on every workers.dev host through `_headers`. |
| D3 | IndexNow: yes, as a step after a successful deploy. It never fails the deploy. |
| D4 | Sitemap scope: content pages only (home, tracker, news, every guide) in both locales, 8 URLs today. Settings stays out of the sitemap but is not noindexed. The 404 is never listed. |
| D5 | Sitemap holds `<loc>` only. No `lastmod` (a wrong one is worse than none), no `priority`/`changefreq` (ignored), no hreflang (already in the HTML). |
| D6 | Search titles and home description differ from visible headings. The visible `<h1>`s stay as they are. |
| D7 | Site name: WebSite JSON-LD on both home pages with `url: "https://rookdex.app/"`. Google only supports site names at the domain root and follows the root's redirect to `/en/`. |
| D8 | Every page shares `og.png`. |

## 4. Units

### 4.1 Route model: `src/model/seo.ts`

```ts
/** Locale-less paths the sitemap lists and IndexNow pings, in the same form pages pass to Base. */
export function indexablePaths(guideSlugs: string[]): string[]
```

It returns `["", "tracker", "news", ...guideSlugs.map((s) => `guides/${s}`)]`, with guide slugs deduplicated and sorted. It throws if a slug does not match `^[a-z0-9-]+$`; both the sitemap and the guide pages' `getStaticPaths` go through it, so a bad slug fails the build. The same module exports `jsonLd(obj)`, which returns `JSON.stringify(obj).replace(/</g, "\\u003c")`, so no value can close the `<script>` tag. Both functions are pure and has no Astro imports, so it is unit-testable. It is the single list the sitemap and IndexNow both read. Future indexable pages (Spec A's `tracker/sources`, Spec B's profile if public, 1c news pages) are added here.

### 4.2 Sitemap: `src/pages/sitemap.xml.ts`

A static `GET` endpoint, prerendered to `dist/sitemap.xml`:

- It reads the guide slugs from the `guides` collection (entry id `en/before-you-start` → slug `before-you-start`, union across locales).
- For each locale × `indexablePaths(...)` it writes `<url><loc>{getAbsoluteLocaleUrl(locale, path)}</loc></url>`.
- It is served as XML by the host from the `.xml` extension; static endpoints drop their response headers at build. UTF-8 declaration, namespace `http://www.sitemaps.org/schemas/sitemap/0.9`.
- URLs are sorted, so builds are byte-stable.
- `getAbsoluteLocaleUrl` already yields `https://rookdex.app/en/…/` with the trailing slash from `trailingSlash: "always"`. No escaping is needed because `indexablePaths` enforces `[a-z0-9-]` slugs (see 4.1).

### 4.3 `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://rookdex.app/sitemap.xml
```

It is served on the version previews too. That is harmless: a crawler must be allowed to fetch a page to see its `noindex` header.

### 4.4 Head changes: `Base.astro`, copy and guide schema

**Props.** `title` now carries the complete `<title>` text, so the ` · Rookdex` suffix logic leaves `Base.astro` and moves into the copy. There is a new optional `indexable` prop (default `true`).

**Always, on every page:**

- `<meta name="description">` (unchanged).
- `og:site_name` = `Rookdex`, `og:type` = `website`, `og:title` = the `<title>` text, `og:description` = the description.
- `og:locale` = `en_US` or `nb_NO` from the page locale, plus one `og:locale:alternate` for the other.
- `og:image` = `https://rookdex.app/og.png`, `og:image:width` 1200, `og:image:height` 630, `og:image:alt` from copy.
- `twitter:card` = `summary_large_image`. No `twitter:site`, because there is no account.

**Only when `indexable`:**

- The canonical link, the three hreflang alternates, and `og:url` = the canonical URL.

**The 404** passes `indexable={false}`. It is served with a real 404 status by `not_found_handling: "404-page"`, so it needs no `noindex`, just no canonical.

**Home pages only:** a JSON-LD data block:

```html
<script type="application/ld+json" is:inline set:html={jsonLd({
  "@context": "https://schema.org", "@type": "WebSite",
  name: "Rookdex", url: "https://rookdex.app/", inLanguage: locale === "no" ? "nb" : "en" })} />
```

`set:html` is an unescaped boundary. `jsonLd` escapes `<` as `<`, so it stays safe even when a later spec puts copy into the block. Base never passes raw `JSON.stringify` to `set:html`. The CSP needs no change, because a `type="application/ld+json"` block is data and never runs.

**Guide schema:** `guideSchema` gets `searchTitle: z.string().max(65).optional()`, the full `<title>` text. The page falls back to `${title} · Rookdex`. The slug check lives in `indexablePaths` (4.1), because a frontmatter schema never sees the entry id.

**Copy.** Every page's `<title>` comes from a new `seo.titles` block (`home`, `tracker`, `news`, `settings`, `notFound`) in `en.ts`/`no.ts`, or from `searchTitle` in the guide files. Visible headings keep using the existing keys (`s.tracker.title` etc.), so no `<h1>` changes. Also new: `seo.homeDescription` and `seo.ogImageAlt`.

| Page | EN `<title>` | NO `<title>` |
|------|--------------|--------------|
| Home | Rookdex: GTA 6 countdown, tracker and launch guide | Rookdex: GTA 6-nedtelling, sjekkliste og lanseringsguide |
| Tracker | GTA 6 collectibles and wildlife tracker · Rookdex | GTA 6-sjekkliste for samleobjekter og dyreliv · Rookdex |
| News | GTA 6 news and rumours · Rookdex | GTA 6-nyheter og rykter · Rookdex |
| Guide | Before you start: GTA 6 launch checklist · Rookdex | Før du begynner: GTA 6-sjekkliste for lanseringen · Rookdex |
| Settings | Settings · Rookdex (unchanged) | Innstillinger · Rookdex (unchanged) |
| 404 | Page not found · Rookdex (unchanged) | n/a (the 404 is English) |

The NO guide title uses "Før du begynner" to match the guide's visible heading. The brainstorm said "Før du starter"; this spec aligns it with the page.

**Home description:**
- EN: "Countdown to GTA 6 on 19 November 2026, a tracker for collectibles, places, vehicles and wildlife, and what to sort out before launch night. Free, works offline."
- NO: "Nedtelling til GTA 6 den 19. november 2026, sjekkliste for samleobjekter, steder, kjøretøy og dyreliv, og hva du bør ordne før lansering. Gratis, virker uten nett."

EN is 161 characters and NO is 163, both measured. The copy test caps `seo.homeDescription` at 165, so neither line gets cut in results.

`s.tagline` stays the visible home tagline and is no longer the meta description. Tracker, news, settings and guide descriptions are unchanged.

**`og:image:alt`:**
- EN: "Rookdex banner: The open-source GTA VI companion."
- NO: "Rookdex-banner: The open-source GTA VI companion." (the banner's text is English)

### 4.5 Hosts: `wrangler.jsonc` and `public/_headers`

- `wrangler.jsonc`: `"workers_dev": false`. `preview_urls: true` stays explicit; Cloudflare keeps version previews only when it is.
- `_headers`, new block:

```
https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

Cloudflare's docs use this exact host pattern for preview URLs. A preview host `<id>-rookdex.malinfossum-dev.workers.dev` matches with `:version` = `<id>-rookdex`. The generic `/*` block still applies on top, because `_headers` merges every matching rule.

### 4.6 IndexNow: `public/indexnow-key.txt` + `deploy.yml`

- **Key:** 32 lowercase hex characters (`openssl rand -hex 16`). The file content is the key and nothing else, no trailing newline. `.gitattributes` gets `public/indexnow-key.txt -text`, so `core.autocrlf` can't add a CR. The key is public by design; it only proves host ownership. One file, one source: the workflow reads the key from the file, and the ping names the file through `keyLocation`, so no second copy exists to drift.
- **New step after `Deploy`, same job**, `continue-on-error: true`, `timeout-minutes: 2`:
  1. Read the URLs from `dist/sitemap.xml` (`<loc>` values), one per line.
  2. Build the JSON body with `jq -n --rawfile key public/indexnow-key.txt --args '{ host: "rookdex.app", key: $key, keyLocation: "https://rookdex.app/indexnow-key.txt", urlList: $ARGS.positional }' "${urls[@]}"`. Using `jq` means no JSON is built by hand and no URL is pasted into the shell.
  3. `status=$(curl -sS --max-time 20 -o resp.txt -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' --data @body.json) || true`. Don't use `--fail`: under the default `bash -e` it would exit before step 4 and hide the very errors the summary exists to show.
  4. Always write `$status` and `resp.txt` to `$GITHUB_STEP_SUMMARY`, then `[ "$status" = 200 ] || [ "$status" = 202 ] || exit 1`. The step then shows as failed, and `continue-on-error` keeps the run green.
  - The step uses no secrets.
- **Deploy job guard (scope growth, flagged in the stress test).** `deploy.yml` also runs on `workflow_dispatch`, which can target any branch, and the `production` environment has no branch policy. Today a manual run from a feature branch would deploy it to rookdex.app. The `deploy` job gets `if: github.ref == 'refs/heads/main'`, which also covers the IndexNow step. The matching `main`-only environment branch policy is a manual step in Section 6.
- It pings all sitemap URLs on every deploy. Deploys happen only on merge to `main`, most merges touch the shared layout, and 8 to 20 URLs is far inside fair use.

### 4.7 Precache: `integrations/precache.mjs`

`shouldPrecache` also skips `robots.txt`, `sitemap.xml` and `indexnow-key.txt`. Only crawlers fetch them, like `og.png`.

### 4.8 Build check: `integrations/seo-check.mjs`

An Astro integration on `astro:build:done`, registered after `precache()`. Its pure functions are exported and unit-tested in `integrations/seo-check.test.ts`, the same shape as the precache integration. CI runs tests before build, so a check of built output has to live in the build. It fails the build (throws) when any of these is true:

0. `sitemap.xml` is missing or empty, or a `<loc>` doesn't start with `https://rookdex.app/`, or the set of `<loc>` values isn't equal to the built `en/**/index.html` and `no/**/index.html` pages minus an explicit exclusion list (`settings`). This one rule catches a missing sitemap, an empty one, a wrong host, and a new page nobody added to `indexablePaths`.
1. A sitemap `<loc>` has no built `index.html` behind it.
2. A built page under `en/` or `no/` lacks exactly one `rel="canonical"` equal to its own absolute URL.
3. `404.html` contains the substring `rel="canonical"`, `hreflang=` or `og:url`. Substring checks can't pass by accident when attributes are reordered.
4. A page listed in the sitemap lacks `og:image` or `twitter:card`, or has an empty description, or its `<title>` text is empty or longer than 65 characters.
5. `robots.txt` lacks the exact `Sitemap: https://rookdex.app/sitemap.xml` line.
6. `indexnow-key.txt` is missing or its raw, untrimmed content doesn't match `^[a-f0-9]{32}$`.
7. Either home page lacks exactly one `application/ld+json` block whose parsed `url` is `https://rookdex.app/`.

These rules span several built files, so they belong in the build. Parsing uses regex and substring checks over the built HTML, which Astro emits in a known shape, so there is no HTML-parser dependency. The unit tests feed small fixture strings. Per-page head rules that don't need `dist/` are tested through `renderDoc` (see Section 5).

## 5. Testing

- **Unit:**
  - `indexablePaths`: order, dedupe, guide prefix, no settings, and it throws on a bad slug.
  - `jsonLd`: a value containing `</script>` comes out with no literal `<`, and still round-trips through `JSON.parse`.
  - `shouldPrecache` skips the three new files.
  - Every seo-check rule in 4.8, with a passing fixture and at least one failing fixture per rule.
  - The copy test asserts that every locale has the new `seo` keys, that no `seo.titles` value is over 65 characters (the home EN title is 50), and that `seo.homeDescription` is at most 165. Guide `searchTitle` length is enforced by the schema and by seo-check rule 4.
  - New `Base.test.ts` cases through the existing `renderDoc` harness (`src/test/render.ts`):
    - the og and twitter tags are present on every page;
    - with `indexable={false}` there is no canonical, no hreflang and no `og:url`;
    - the JSON-LD block appears only on `path=""`, and parsing it with `JSON.parse` gives `url === "https://rookdex.app/"`.
- **Build:** the `seo-check` integration runs on every `npm run build`, locally, in CI and in deploy.
- **Manual after merge:**
  - `curl -sI` on the preview URL from the PR's CI run shows `x-robots-tag: noindex`.
  - `curl -sI https://rookdex.malinfossum-dev.workers.dev/` no longer returns the site.
  - `curl -s https://rookdex.app/sitemap.xml` lists 8 URLs.
  - The deploy run summary shows the IndexNow status (200 or 202).
  - Paste `https://rookdex.app/en/` into a link-preview checker (opengraph.xyz or similar): banner, title and description show.
  - Google's Rich Results Test on `/en/` finds the WebSite item.

## 6. Rollout

1. The spec PR (this file + stress test) is on branch `seo-spec`, cut from `main`. The implementation follows on the same branch after the plan.
2. After the implementation merges and deploys green, these steps are mine by hand, because they are account actions:
   1. In GSC, add the domain property `rookdex.app` and put its TXT record at the apex in Cloudflare DNS.
   2. In GSC, submit `https://rookdex.app/sitemap.xml`.
   3. In GSC, use URL Inspection on `https://rookdex.app/` and request indexing, so the site name is read through the redirect.
   4. In Bing Webmaster Tools, import from GSC.
   5. In GitHub repository settings, go to Environments → `production` → Deployment branches and set it to `main` only. This backs up the job-level guard in 4.6.
3. Then Spec A's plan is written against the new `Base.astro` props. Spec A adds `tracker/sources` to `indexablePaths` and a search title for it.

## 7. Failure handling

| Failure | Effect | Handling |
|---------|--------|----------|
| IndexNow network error or timeout | No ping this deploy | Step marked failed but deploy green; summary shows it; next deploy pings again. |
| IndexNow 403 (key file not live yet or mismatch) | Ping rejected | Same. The key file ships in the same deploy, so a first-run 403 usually clears on the next deploy. |
| IndexNow 422 (URL not on host) | Ping rejected | Means the sitemap holds a wrong host; seo-check rule 0 fails the build before it can happen. |
| A new page added but not in `indexablePaths` | Page missing from the sitemap | Build fails on seo-check rule 0 until it is listed or added to the exclusion list. |
| `_headers` host pattern does not match previews | Previews indexable in theory | Caught by the manual `curl -I`. Previews are unlinked and carry canonicals to rookdex.app, so it is a gap, not a leak. The fallback is `preview_urls: false` with a different preview method. |
| A renamed or removed page still in `indexablePaths` | Broken sitemap entry | Build fails on seo-check rule 1. |
| Old workers.dev URLs already indexed | Stale results | The mirror stops serving; they drop out on their own. |

## 8. Out of scope

- `lastmod`, `priority`, `changefreq`, a sitemap index, a sitemap package.
- Per-page OG images, `twitter:site`.
- Article, VideoGame, BreadcrumbList or FAQ structured data. The pages aren't articles and the game isn't mine.
- Analytics and Search Console API automation.
- Making Settings `noindex`.
- New pages from Spec A, Spec B and 1c. Each adds itself to `indexablePaths` in its own plan.
