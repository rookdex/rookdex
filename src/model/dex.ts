// Page data for the Dex (category pages spec §4). Pure: it shapes live seed items, so the pages
// and the tests share one source of truth and the tracker's group order.
import {
	hasKey,
	type Key,
	type PluralKey,
	seedLabel,
	type Translate,
	type Translator,
} from "../i18n"
import type { SeedItem } from "./schema"
import { normalize, type SearchTerms } from "./search"
import { SEARCH_TERMS } from "./searchTerms"
import { categoryIds, groupItems } from "./seed"

export interface DexGroup {
	id: string
	items: SeedItem[]
}

export interface DexCategory {
	id: string
	total: number
	confirmed: number
	expected: number
	groups: DexGroup[]
}

/** Callers filter retired items out, as the Sources page does. Throwing keeps a stale item from
 *  ever reaching a page. */
function assertLive(items: SeedItem[]): void {
	const retired = items.find((item) => item.retired)
	if (retired) throw new Error(`${retired.id} is retired; filter retired items out first`)
}

export function dexCategory(items: SeedItem[], category: string): DexCategory {
	assertLive(items)
	const own = items.filter((item) => item.category === category)
	if (own.length === 0) throw new Error(`No live items in category "${category}"`)
	const confirmed = own.filter((item) => item.status === "confirmed").length
	return {
		id: category,
		total: own.length,
		confirmed,
		expected: own.length - confirmed,
		groups: [...groupItems(own)].map(([id, list]) => ({ id, items: list })),
	}
}

export function dexIndex(items: SeedItem[]): DexCategory[] {
	assertLive(items)
	return categoryIds(items).map((category) => dexCategory(items, category))
}

/** One result row on the Dex front page (Dex search spec §4, §5.1). */
export interface DexSearchRow {
	id: string
	name: string
	/** The category page with the item's card as the fragment. */
	href: string
	status: SeedItem["status"]
	/** The short word only: the precedent text is too long for a row and lives on the card. */
	statusWord: string
	/** "<category> · <group>" in the page language. */
	place: string
	/** The name and the group's search words, normalized. One string is enough: a query word never
	 *  holds a space after normalize, so it cannot match across two fields. */
	search: string
}

/** Every live item as a search row, in the order the Dex pages list them. `urlFor` builds a
 *  category page URL, so this module stays free of astro:i18n. */
export function dexSearchRows(
	t: Translate,
	urlFor: (category: string) => string,
	items: SeedItem[],
	terms: SearchTerms = SEARCH_TERMS
): DexSearchRow[] {
	return dexIndex(items).flatMap((category) =>
		category.groups.flatMap((group) =>
			group.items.map((item) => ({
				id: item.id,
				name: item.name,
				href: `${urlFor(category.id)}#${item.id}`,
				status: item.status,
				statusWord: item.status === "confirmed" ? t("tracker.confirmed") : t("dex.expected"),
				place: `${seedLabel(t, "category", category.id)} · ${seedLabel(t, "group", group.id)}`,
				search: normalize([item.name, ...(terms[item.group] ?? [])].join(" ")),
			}))
		)
	)
}

/** The copy keys a category page needs. copy.test.ts checks both bundles hold them for every live
 *  category, so a new seed category fails CI until its copy exists. */
export function dexKeys(category: string): string[] {
	return [
		`seo.titles.dex.${category}`,
		`dex.lede.${category}.one`,
		`dex.lede.${category}.other`,
		`dex.description.${category}.one`,
		`dex.description.${category}.other`,
	]
}

export interface DexCopy {
	title: string
	lede: string
	description: string
}

function key(name: string): Key {
	if (!hasKey(name)) throw new Error(`Missing copy key "${name}"`)
	return name
}

/** A category page's title, lede and meta description. Throws on a missing key, so a seed
 *  category without copy fails the build instead of showing a raw key. */
export function dexCopy({ t, plural }: Translator, category: DexCategory): DexCopy {
	for (const name of dexKeys(category.id)) key(name)
	const counts = { confirmed: category.confirmed, expected: category.expected }
	return {
		title: t(key(`seo.titles.dex.${category.id}`)),
		// dexKeys checked `.one` and `.other` above, which is what makes these plural keys.
		lede: plural(`dex.lede.${category.id}` as PluralKey, category.total, counts),
		description: plural(`dex.description.${category.id}` as PluralKey, category.total),
	}
}

/** The word beside an item's status dot. The word carries the status, so colour is never the
 *  only signal. An expected item always has a precedent in the shipped seed (tierErrors); the
 *  plain fallback keeps the line from ending in "as in ". */
export function dexStatus(t: Translate, item: SeedItem): string {
	if (item.status === "confirmed") return t("tracker.confirmed")
	return item.precedent
		? t("tracker.expectedFrom", { precedent: item.precedent })
		: t("dex.expected")
}
