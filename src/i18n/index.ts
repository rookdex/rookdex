import { en, type Strings } from "./en"
import { no } from "./no"

export type { Strings }

export const locales = ["en", "no"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

const strings: Record<Locale, Strings> = { en, no }

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale)
}

export function t(locale: Locale): Strings {
	return strings[locale]
}

/** Fills `{name}` placeholders. Unknown names stay visible on purpose. */
export function fill(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in vars ? String(vars[key]) : match
	)
}
