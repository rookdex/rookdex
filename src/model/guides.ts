// Guide lookup rules and frontmatter schema. Testable without astro:content (the content layer).
import { z } from "astro/zod"
import { duplicateOutlet } from "./outlet"

/**
 * Guide frontmatter. One page per outlet: two links showing the same domain to different pages fail
 * WCAG 2.4.4, and one best page per outlet is the better citation anyway (spec §9). Astro names the
 * guide when the build fails.
 */
export const guideSchema = z.object({
	title: z.string(),
	summary: z.string(),
	updated: z.coerce.date(),
	sources: z
		.array(z.string().url())
		.default([])
		.superRefine((urls, ctx) => {
			const outlet = duplicateOutlet(urls)
			if (outlet) {
				ctx.addIssue({
					code: "custom",
					message: `two sources from ${outlet}; cite one page per outlet`,
				})
			}
		}),
})

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
