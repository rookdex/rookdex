import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"

const bundles = { en, nb } as const
const all: [string, string][] = Object.entries(bundles).flatMap(([lang, bundle]) =>
	Object.entries(bundle).map(([key, value]): [string, string] => [`${lang}.${key}`, value])
)
const titles = (bundle: Record<string, string>) =>
	Object.entries(bundle)
		.filter(([key]) => key.startsWith("seo.titles."))
		.map(([, v]) => v)

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
		expect(nb["seo.titles.privacy"]).toBe("Personvernerklæring · Rookdex")
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
	] as const)("%s home description is at most 165 characters", (_locale, bundle) => {
		expect([...bundle["seo.homeDescription"]].length).toBeLessThanOrEqual(165)
	})

	it("keeps the visible headings as they were", () => {
		expect(en["tracker.title"]).toBe("Tracker")
		expect(nb["tracker.title"]).toBe("Oversikt")
		expect(en["seo.titles.home"]).toBe("Rookdex: GTA 6 countdown, tracker and launch guide")
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
