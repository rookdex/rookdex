// Guide lookup rules. Works on ids only, so it is testable without Astro.

export function splitGuideId(id: string): { locale: string; slug: string } {
	const [locale, ...rest] = id.split("/")
	return { locale, slug: rest.join("/") }
}

export function guideSlugs(entries: { id: string }[]): string[] {
	return [...new Set(entries.map((e) => splitGuideId(e.id).slug))]
}

/**
 * Slugs that have a copy in the `fallback` language. Only these get a page in every locale;
 * a guide written in another language alone stays unpublished instead of failing the build.
 */
export function publishedSlugs(entries: { id: string }[], fallback = "en"): string[] {
	const ids = new Set(entries.map((e) => e.id))
	return guideSlugs(entries).filter((slug) => ids.has(`${fallback}/${slug}`))
}

/** The guide in `locale`, or the `fallback` language's copy flagged with `fellBack`. */
export function resolveGuide<T extends { id: string }>(
	entries: T[],
	locale: string,
	slug: string,
	fallback = "en"
): { entry: T; fellBack: boolean } | undefined {
	const own = entries.find((e) => e.id === `${locale}/${slug}`)
	if (own) return { entry: own, fellBack: false }
	const fb = entries.find((e) => e.id === `${fallback}/${slug}`)
	return fb ? { entry: fb, fellBack: true } : undefined
}
