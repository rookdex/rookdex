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
	// bus, verksted) would match every item after the merge, so they live per item in ITEM_TERMS.
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

// Words true of one item only, keyed by item id. Emergency, Commercial and Service merged into one
// Service group, and a group word matches every item in the group, so "politi" on the group would
// find Pay 'n' Spray. Each item carries its own type words instead, so "politi", "buss" and
// "verksted" still find the right vehicles and places. searchTerms.test.ts checks that every id is
// in the seed and that every Service item has words.
const EMERGENCY = ["emergency", "utrykning", "utrykningskjøretøy"]
const COMMERCIAL = ["commercial", "nyttekjøretøy"]
const TRUCK = [...COMMERCIAL, "truck", "lastebil"]

const BY_TYPE: ReadonlyArray<readonly [words: readonly string[], ids: readonly string[]]> = [
	[
		[...EMERGENCY, "police", "politi", "politibil"],
		[
			"vehicles/declasse-granger-police",
			"vehicles/dundreary-landstalker-xl-police",
			"vehicles/vapid-stanier-le-police-cruiser",
			"vehicles/bravado-buffalo-police-cruiser",
			"vehicles/bravado-buffalo-stx-pursuit",
			"vehicles/bravado-gauntlet-interceptor",
			"vehicles/vapid-lowline-police-interceptor",
			"vehicles/vapid-montagne-police",
			"vehicles/vapid-stanier-le-police-ghost",
			"vehicles/brute-police-riot",
		],
	],
	[[...EMERGENCY, "ambulance", "ambulanse"], ["vehicles/brute-ambulance"]],
	[
		TRUCK,
		[
			"vehicles/brute-stockade",
			"vehicles/vapid-benson",
			"vehicles/hvy-biff",
			"vehicles/jobuilt-flatbed",
			"vehicles/brute-tipper",
			"vehicles/brute-utility-truck",
			"vehicles/jobuilt-phantom",
			"vehicles/maibatsu-mule",
			"vehicles/jobuilt-rubble",
			"vehicles/mtl-packer",
		],
	],
	[[...TRUCK, "tow truck", "slepebil", "bergingsbil"], ["vehicles/vapid-tow-truck"]],
	[
		[...COMMERCIAL, "van", "varebil"],
		[
			"vehicles/vapid-speedo",
			"vehicles/declasse-burrito",
			"vehicles/bravado-rumpo",
			"vehicles/bravado-youga-classic",
		],
	],
	[
		[...COMMERCIAL, "bus", "buss"],
		["vehicles/dashound", "vehicles/brute-rental-shuttle-bus"],
	],
	[
		[...COMMERCIAL, "taxi", "drosje"],
		["vehicles/declasse-granger-taxi", "vehicles/vapid-stanier-taxi"],
	],
	[[...COMMERCIAL, "golf cart", "golfbil"], ["vehicles/nagasaki-caddy"]],
	[COMMERCIAL, ["vehicles/hvy-airtug"]],
	[["garage", "garasje"], ["vehicles/vehicle-garages"]],
	[
		["garage", "shop", "workshop", "verksted"],
		[
			"vehicles/vehicle-customization",
			"vehicles/rideout-customs",
			"vehicles/one-eyed-willies-mod-shop",
			"vehicles/pay-n-spray",
		],
	],
]

export const ITEM_TERMS: SearchTerms = BY_TYPE.reduce<Record<string, string[]>>(
	(byId, [words, ids]) => {
		for (const id of ids) byId[id] = [...(byId[id] ?? []), ...words]
		return byId
	},
	{}
)

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
