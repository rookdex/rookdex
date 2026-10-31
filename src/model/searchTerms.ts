// Search words per seed group, in both languages (tracker search spec §3.2). They carry no page
// language: "car" and "bil" find the same items on /en/ and /nb/. Each entry holds the group's en
// and nb labels (searchTerms.test.ts holds that) plus singulars and common words, because a
// Norwegian plural changes the stem ("motorsykkel" is not inside "Motorsykler").
import { normalize, type SearchTerms } from "./search"

export const SEARCH_TERMS: SearchTerms = {
	cars: ["car", "cars", "bil", "biler"],
	motorcycles: [
		"motorcycle",
		"motorcycles",
		"motorbike",
		"bike",
		"motorsykkel",
		"motorsykler",
		"mc",
	],
	boats: ["boat", "boats", "båt", "båter"],
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
	emergency: ["emergency", "police", "ambulance", "utrykning", "politi", "ambulanse"],
	commercial: ["commercial", "van", "truck", "bus", "nyttekjøretøy", "varebil", "lastebil", "buss"],
	service: ["service", "services", "garage", "shop", "tjeneste", "tjenester", "verksted"],
	vehicles: ["vehicle", "vehicles", "kjøretøy"],
	reptiles: ["reptile", "reptiles", "animal", "animals", "krypdyr", "dyr"],
	birds: ["bird", "birds", "animal", "animals", "fugl", "fugler", "dyr"],
	mammals: ["mammal", "mammals", "animal", "animals", "pattedyr", "dyr"],
	marine: ["marine life", "fish", "sea", "animal", "animals", "sjødyr", "fisk", "hav", "dyr"],
	cities: ["city", "cities", "by", "byer"],
	keys: ["keys", "island", "islands", "øy", "øyer"],
	regions: ["region", "regions", "regioner"],
	landmarks: ["landmark", "landmarks", "landemerke", "landemerker"],
	businesses: ["business", "businesses", "shop", "store", "bedrift", "bedrifter", "butikk"],
	neighborhoods: ["neighborhood", "neighborhoods", "district", "bydel", "bydeler"],
	"hidden-items": ["hidden item", "hidden items", "skjult gjenstand", "skjulte gjenstander"],
	stunts: ["stunt", "stunts", "jump", "hopp"],
	challenges: ["challenge", "challenges", "utfordring", "utfordringer"],
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
