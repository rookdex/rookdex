# Rookdex SEO spec: stress test

Date: 2026-09-25 · Spec: `2026-09-25-rookdex-seo-design.md` · Reviewer: a fresh-context agent that checked the repo and the vendor docs · **All 10 proposed changes are folded into the spec.**

Result: no 🔴 or 🟠 findings. Privacy and accessibility are clean. Eight 🟡 findings produced ten spec edits.

## Findings and what changed

| # | Lens | Finding | Folded as |
|---|------|---------|-----------|
| 1 | Security | `set:html` is unescaped, so the JSON-LD is only safe while its values are constant; `JSON.stringify` doesn't escape `<`. | `jsonLd()` helper in `src/model/seo.ts` escapes `<` as `<`, with a unit test (4.1, 4.4, 5). |
| 2 | Security | `workflow_dispatch` can deploy any branch to production, and the `production` environment has no branch policy. The spec guarded only the ping. | Job-level `if: github.ref == 'refs/heads/main'` on `deploy` (4.6), plus a manual `main`-only environment policy (6). Flagged as scope growth. |
| 3 | Loopholes | Under the default `bash -e`, `curl --fail-with-body` exits before the summary write, which hides the 403 and 422 errors. | `-o resp.txt -w '%{http_code}' … \|\| true`, always write the summary, exit 1 unless 200 or 202; `urlList` built with `jq --args` (4.6). |
| 4 | Loopholes | seo-check passes when the sitemap is missing or empty, can't see a new page left out of it, and its "wrong host" claim was false. | Rule 0: sitemap exists, host prefix, and the `<loc>` set equals the built pages minus `settings` (4.8, 7). |
| 5 | Loopholes | The 65-character title test ran only on the copy files, missing guide `searchTitle`, which is the longest title (NO guide, 59). | `searchTitle: z.string().max(65).optional()` plus a title-length check in rule 4 (4.4, 4.8). |
| 6 | Loopholes | Regex "must not contain" rules pass silently if attributes are reordered; the existing `renderDoc` harness was unused. | Rule 3 uses substring checks; new `Base.test.ts` cases through `renderDoc` (4.8, 5). |
| 7 | Loopholes | Three wrong claims: a frontmatter schema can't see the entry id; static endpoints drop response headers; the key file's no-newline rule wasn't enforced. | Slug check moved into `indexablePaths`; the Content-Type line now says the host serves it as XML from the extension; rule 6 reads the key file raw, and `.gitattributes` sets `-text` on it (4.1, 4.2, 4.6, 4.8). |
| 8 | Loopholes | The NO home description was 177 characters, so it gets cut off in results. | New NO line at 163 characters (EN is 161); the copy test caps it at 165 (4.4, 5). I kept "den 19. november" instead of the reviewer's "GTA 6 19. november", because the two numbers side by side read badly. |

## Considered and rejected

- **Astro CSP and the inline JSON-LD block.** Astro hashes only the scripts it processes; `is:inline` blocks are skipped. `ld+json` is data that never runs, so it needs no hash.
- **The service worker and the crawler-only files and the 404.** Crawlers don't run service workers. A response that isn't `ok` is never cached.
- **The 404 status.** `not_found_handling: "404-page"` serves a real 404 (Cloudflare docs).
- **`auto-trailing-slash` redirecting `/sitemap.xml`.** Documented for HTML only. Rule 0 and the manual `curl` would catch any surprise.
- **The workers.dev rule matching rookdex.app.** The host part `workers.dev` is literal. Placeholders can't match across `.`.
- **The order of seo-check and precache.** The hooks are independent, and a throw fails the build before deploy either way.
- **The site-name `url` is the domain root while `/en/` is canonical.** This is what Google documents for a home page that redirects. The Rich Results Test and a GSC inspection confirm it after launch.
- **`og:title` repeats "· Rookdex".** Cosmetic, and it keeps one source for the title.
- **The NO `og:image:alt` is in English.** The banner's own text is English.
- **Title and heading differ.** WCAG 2.4.2 asks for descriptive titles, not titles identical to the heading.
- **English fallback guides under `/no/`.** None exist today.
- **Pinging every URL on every deploy.** 8 URLs per merge to `main`. A 429 only fails a step that doesn't block the deploy.

## Verified externally (2026-09-25)

- Cloudflare `_headers`: the host pattern, placeholder matching and header merging (developers.cloudflare.com/workers/static-assets/headers/).
- Cloudflare 404 handling and trailing-slash routing (…/static-assets/routing/static-site-generation/).
- Cloudflare version previews with `workers_dev: false` and an explicit `preview_urls: true` (…/workers/configuration/previews/).
- Google site names (developers.google.com/search/docs/appearance/site-names).
- IndexNow key rules, `keyLocation` and response codes (indexnow.org/documentation).
- Astro `security.csp` and `trailingSlash` (docs.astro.build).
- `curl --fail-with-body` exit code (curl.se).
- GitHub Actions default shell (docs.github.com).
- `og:locale` and `og:image:alt` (ogp.me).
- In the repo: the `production` environment settings through `gh api repos/rookdex/rookdex/environments/production`.
