import { createTranslator } from "../lib/i18n/index.js"
import en from "../locales/en.json"
import no from "../locales/no.json"
import type { Price } from "../model/prices"
import type { Locale } from "./locales"

export * from "./locales"

/** Every UI string key. en.json is the source; `satisfies` below makes a key missing from another
 *  bundle a type error, and bundles.test.ts catches extra or empty ones. */
export type Key = keyof typeof en
/** A key plural() accepts: `<key>.one` and `<key>.other` both exist. */
export type PluralKey = {
	[K in Key]: K extends `${infer Base}.other` ? (`${Base}.one` extends Key ? Base : never) : never
}[Key]
export type Vars = Record<string, string | number>

const bundles = { en, no } satisfies Record<Locale, Record<Key, string>>
const i18n = createTranslator(bundles, { fallback: "en" })

/** The vendored library bound to one locale, with Rookdex's money rule (whole kroner, no ",00"). */
export interface Translator {
	readonly locale: Locale
	t(key: Key, vars?: Vars): string
	plural(key: PluralKey, count: number): string
	money(price: Price): string
	displayName(tag: Locale): string
}
export type Translate = Translator["t"]

export function translator(locale: Locale): Translator {
	return {
		locale,
		t: (key, vars) => i18n.t(locale, key, vars),
		plural: (key, count) => i18n.plural(locale, key, count),
		money: (price) => i18n.money(locale, price.amount, price.currency, { stripWhole: true }),
		displayName: (tag) => i18n.displayName(tag),
	}
}

export function hasKey(key: string): key is Key {
	return Object.hasOwn(en, key)
}

/** A seed category or group label. Seed ids are runtime strings, so an id without a key shows
 *  itself; seed.test.ts keeps every id keyed in both bundles. */
export function seedLabel(t: Translate, kind: "category" | "group", id: string): string {
	const key = `${kind}.${id}`
	return hasKey(key) ? t(key) : id
}
