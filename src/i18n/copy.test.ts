import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import { dexKeys } from "../model/dex"
import { categoryIds, seedItems } from "../model/seed"

const bundles = { en, nb } as const
const all: [string, string][] = Object.entries(bundles).flatMap(([lang, bundle]) =>
	Object.entries(bundle).map(([key, value]): [string, string] => [`${lang}.${key}`, value])
)
const titles = (bundle: Record<string, string>) =>
	Object.entries(bundle)
		.filter(([key]) => key.startsWith("seo.titles."))
		.map(([, v]) => v)
// The meta descriptions of the indexable pages other than home (Bing flags short ones).
const descriptionKeys = [
	"tracker.description",
	"news.description",
	"sources.description",
	"settings.description",
	"privacy.description",
	"dex.indexDescription",
] as const

describe("copy rules (spec §9)", () => {
	it("walks a real number of strings", () => {
		expect(all.length).toBeGreaterThan(150)
	})

	it.each(all)("%s keeps the tier vocabulary and the tone", (_path, text) => {
		// Word boundaries: "bleak" is fine, "leak" is not. The Norwegian suffix covers lekk, lekket and lekkasje.
		expect(text).not.toMatch(/\b(leak|leaked|lekk\w*)\b/i)
		expect(text).not.toContain("!")
		// One capital in prose; all caps belongs to the wordmark only, and that is markup, not a string.
		expect(text).not.toContain("ROOKDEX")
	})
})

describe("soft hyphens (spec §5, §11)", () => {
	it("appear only in the Norwegian Settings tab label and the privacy heading", () => {
		const withShy = all.filter(([, text]) => text.includes("\u00ad")).map(([path]) => path)
		expect(withShy).toEqual(["nb.nav.settings", "nb.privacy.title"])
	})

	it("leave the page title whole", () => {
		expect(nb["settings.title"]).toBe("Innstillinger")
		expect(nb["nav.settings"].replace("\u00ad", "")).toBe(nb["settings.title"])
	})

	it("break the Norwegian privacy heading at its joint, never the search title", () => {
		// "Personvernerklæring" is wider than a 320 px phone at h1 size (Android spec §3).
		expect(nb["privacy.title"]).toBe("Personvern\u00aderklæring")
		expect(nb["seo.titles.privacy"]).toMatch(/^Personvernerklæring: /)
	})
})

describe("search titles and description (SEO spec §4.4)", () => {
	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s titles fit in a result and name the site", (_locale, bundle) => {
		for (const title of titles(bundle)) {
			expect([...title].length, title).toBeLessThanOrEqual(65)
			expect(title).toContain("Rookdex")
		}
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)(
		"%s titles of indexable pages are long enough to describe them",
		(_locale, bundle) => {
			for (const title of titles(bundle).filter((t) => t !== bundle["seo.titles.notFound"])) {
				expect([...title].length, title).toBeGreaterThanOrEqual(40)
			}
		}
	)

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s page descriptions are 120 to 160 characters", (_locale, bundle) => {
		for (const key of descriptionKeys) {
			const length = [...bundle[key]].length
			expect(length, key).toBeGreaterThanOrEqual(120)
			expect(length, key).toBeLessThanOrEqual(160)
		}
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s home description is at most 165 characters", (_locale, bundle) => {
		expect([...bundle["seo.homeDescription"]].length).toBeLessThanOrEqual(165)
	})

	it("keeps the visible headings as they were", () => {
		expect(en["tracker.title"]).toBe("Tracker")
		expect(nb["tracker.title"]).toBe("Oversikt")
		expect(en["seo.titles.home"]).toBe("Rookdex: GTA 6 companion app, countdown and tracker")
	})
})

describe("countdown templates (brand Task 5, locale spec §5.2)", () => {
	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s keeps its placeholder and no other digit", (_lang, s) => {
		const plurals = [
			s["hub.daysToGo.one"],
			s["hub.daysToGo.other"],
			s["footer.daysToLaunch.one"],
			s["footer.daysToLaunch.other"],
		]
		for (const template of plurals) expect(template).toContain("{count}")
		expect(s["hub.daySince"]).toContain("{n}")
		for (const template of [...plurals, s["hub.daySince"]]) {
			// DaysLine finds the number in the filled sentence, so no other digit may appear.
			expect(template.replace(/\{\w+\}/g, "")).not.toMatch(/\d/)
		}
	})
})

describe("tracker search copy (tracker search spec §6)", () => {
	const keys = [
		"tracker.search.label",
		"tracker.search.placeholder",
		"tracker.search.clear",
		"tracker.search.hideFound",
		"tracker.search.hiddenCount",
		"tracker.search.elsewhere.one",
		"tracker.search.elsewhere.other",
		"tracker.search.showAll",
		"tracker.search.noMatch",
		"tracker.search.allFound",
		"tracker.search.results.one",
		"tracker.search.results.other",
		"tracker.search.resultsElsewhere",
		"tracker.search.hideFoundOn",
		"tracker.search.hideFoundOff",
		"tracker.search.cleared",
	]

	it.each(keys)("%s exists in en and nb", (key) => {
		expect(en).toHaveProperty([key])
		expect(nb).toHaveProperty([key])
	})

	it("quotes the query the way each language does", () => {
		expect(en["tracker.search.noMatch"]).toBe('No match for "{query}".')
		expect(nb["tracker.search.noMatch"]).toBe("Ingen treff på «{query}».")
	})
})

describe("Dex copy (category pages spec §8, §12)", () => {
	const categories = categoryIds(seedItems.filter((item) => !item.retired))
	const missing = (bundle: Record<string, string>, category: string) =>
		dexKeys(category).filter((key) => !Object.hasOwn(bundle, key))

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s has every live category's title, lede and description", (_locale, bundle) => {
		for (const category of categories) expect(missing(bundle, category), category).toEqual([])
	})

	it("goes red on a category without its keys", () => {
		expect(missing(en, "fixture")).toEqual(dexKeys("fixture"))
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s category descriptions are 120 to 160 characters at any count", (_l, bundle) => {
		const strings: Record<string, string> = bundle
		for (const category of categories) {
			for (const form of ["one", "other"]) {
				const key = `dex.description.${category}.${form}`
				for (const count of [1, 999]) {
					const length = [...strings[key].replace("{count}", String(count))].length
					expect(length, `${key} at ${count}`).toBeGreaterThanOrEqual(120)
					expect(length, `${key} at ${count}`).toBeLessThanOrEqual(160)
				}
			}
		}
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s ledes carry all three numbers", (_locale, bundle) => {
		const strings: Record<string, string> = bundle
		for (const category of categories) {
			for (const form of ["one", "other"]) {
				const lede = strings[`dex.lede.${category}.${form}`]
				for (const name of ["{count}", "{confirmed}", "{expected}"]) expect(lede).toContain(name)
			}
		}
	})
})

describe("filter copy (tracker refresh spec §14.1)", () => {
	it.each([
		["tracker.groupChips", "Groups: {category}", "Grupper: {category}"],
		["tracker.search.elsewhere.one", "1 more outside your filters", "1 til utenfor filtrene dine"],
		[
			"tracker.search.elsewhere.other",
			"{count} more outside your filters",
			"{count} til utenfor filtrene dine",
		],
		["tracker.search.showAll", "Clear filters", "Fjern filtrene"],
		[
			"tracker.search.resultsElsewhere",
			"No results inside your filters. {count} outside them.",
			"Ingen treff innenfor filtrene dine. {count} utenfor.",
		],
	] as const)("%s reads as the spec says in English and Norwegian", (key, english, norwegian) => {
		expect(en[key]).toBe(english)
		expect(nb[key]).toBe(norwegian)
	})
})

describe("News jump tile copy (News redesign spec §5, feedback round 2)", () => {
	it.each([
		["news.jumpGuides.one", "1 guide", "1 guide"],
		["news.jumpGuides.other", "{count} guides", "{count} guider"],
		["news.jumpChannels.one", "1 link", "1 lenke"],
		["news.jumpChannels.other", "{count} links", "{count} lenker"],
	] as const)("%s reads as the spec says in English and Norwegian", (key, english, norwegian) => {
		expect(en[key]).toBe(english)
		expect(nb[key]).toBe(norwegian)
	})
})
