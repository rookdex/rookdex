// Search words per seed group, in both languages (tracker search spec §3.2). They carry no page
// language: "car" and "bil" find the same items on /en/ and /nb/. Each entry holds the group's en
// and nb labels (searchTerms.test.ts holds that) plus singulars and common words, because a
// Norwegian plural changes the stem ("motorsykkel" is not inside "Motorsykler").
import { normalize, type SearchTerms } from "./search"

export const SEARCH_TERMS: SearchTerms = {
	cars: ["car", "cars", "bil", "biler"],
	bikes: [
		"bike",
		"bikes",
		"motorcycle",
		"motorcycles",
		"motorbike",
		"bicycle",
		"motorsykkel",
		"motorsykler",
		"motorsykler og sykler",
		"sykkel",
		"sykler",
		"mc",
	],
	watercraft: ["watercraft", "boat", "boats", "båt", "båter"],
	aircraft: [
		"aircraft",
		"plane",
		"planes",
		"helicopter",
		"helicopters",
		"fly",
		"helikopter",
		"helikoptre",
		"fly og helikoptre",
	],
	// Only the group's own name. The old Emergency, Commercial and Service words (police, politi,
	// bus, verksted) matched every item after the merge; item names still carry most of them.
	service: ["service", "services", "tjeneste", "tjenester", "tjenestekjøretøy"],
	mammals: ["mammal", "mammals", "animal", "animals", "pattedyr", "dyr"],
	"reptiles-amphibians": [
		"reptiles & amphibians",
		"reptile",
		"reptiles",
		"amphibian",
		"amphibians",
		"animal",
		"animals",
		"krypdyr og amfibier",
		"krypdyr",
		"amfibie",
		"dyr",
	],
	birds: ["bird", "birds", "animal", "animals", "fugl", "fugler", "dyr"],
	aquatic: [
		"aquatic",
		"fish",
		"sea",
		"marine life",
		"animal",
		"animals",
		"vanndyr",
		"fisk",
		"sjødyr",
		"hav",
		"dyr",
	],
	exploration: [
		"exploration",
		"hidden",
		"collectible",
		"collectibles",
		"utforsking",
		"skjult",
		"samleobjekt",
		"hidden item",
		"hidden items",
		"skjult gjenstand",
		"skjulte gjenstander",
	],
	racing: [
		"racing",
		"race",
		"races",
		"time trial",
		"løp",
		"tidsløp",
		"challenge",
		"challenges",
		"utfordring",
		"utfordringer",
	],
	stunts: ["stunt", "stunts", "jump", "base jump", "hopp"],
	cities: ["city", "cities", "by", "byer"],
	keys: ["keys", "island", "islands", "øy", "øyer"],
	regions: ["region", "regions", "regioner"],
	landmarks: ["landmark", "landmarks", "landemerke", "landemerker"],
	businesses: ["business", "businesses", "shop", "store", "bedrift", "bedrifter", "butikk"],
	neighborhoods: ["neighborhood", "neighborhoods", "district", "bydel", "bydeler"],
}

/** Every group needs an entry that contains each locale's label. Returns the problems, if any. */
export function missingTerms(
	groups: string[],
	terms: SearchTerms,
	labels: Record<string, Record<string, string | undefined>>
): string[] {
	const problems: string[] = []
	for (const group of groups) {
		const entry = terms[group]
		if (!entry) {
			problems.push(`${group}: no terms`)
			continue
		}
		const normalized = entry.map(normalize)
		for (const [locale, byGroup] of Object.entries(labels)) {
			const label = byGroup[group]
			if (label === undefined || !normalized.includes(normalize(label)))
				problems.push(`${group}: no ${locale} label "${label ?? ""}"`)
		}
	}
	return problems
}
