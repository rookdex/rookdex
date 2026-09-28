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
			throw new Error(
				`Guide slug "${slug}" must match ${SLUG}; rename the file in src/content/guides/`
			)
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
