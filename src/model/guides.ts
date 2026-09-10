// Guide lookup rules. Works on ids only, so it is testable without Astro.

export function splitGuideId(id: string): { locale: string; slug: string } {
	const [locale, ...rest] = id.split("/")
	return { locale, slug: rest.join("/") }
}

export function guideSlugs(entries: { id: string }[]): string[] {
	return [...new Set(entries.map((e) => splitGuideId(e.id).slug))]
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
