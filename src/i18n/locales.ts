// The language list, with no bundle imports, so client scripts can use it without shipping every
// string. The bundles in src/locales/ must match it (bundles.test.ts, and `satisfies` in index.ts).
export const locales = ["en", "nb"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale)
}

/** The localStorage key for an explicit language choice (locale standard §5). Absent means System. */
export const LANG_KEY = "lang"
