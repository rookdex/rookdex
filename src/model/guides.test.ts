import { describe, expect, it } from "vitest"
import { guideSlugs, publishedSlugs, resolveGuide, splitGuideId } from "./guides"

const entries = [{ id: "en/before-you-start" }, { id: "no/before-you-start" }, { id: "en/regions" }]

describe("splitGuideId", () => {
	it("splits locale and slug", () => {
		expect(splitGuideId("no/before-you-start")).toEqual({ locale: "no", slug: "before-you-start" })
	})
})

describe("guideSlugs", () => {
	it("lists every slug once, across languages", () => {
		expect(guideSlugs(entries)).toEqual(["before-you-start", "regions"])
	})
})

describe("publishedSlugs", () => {
	it("keeps only slugs with a copy in the fallback language, so every locale can resolve", () => {
		const withNorwegianOnly = [...entries, { id: "no/kun-norsk" }]
		expect(publishedSlugs(withNorwegianOnly, "en")).toEqual(["before-you-start", "regions"])
	})
})

describe("resolveGuide", () => {
	it("returns the entry in the requested language", () => {
		expect(resolveGuide(entries, "no", "before-you-start")).toEqual({
			entry: { id: "no/before-you-start" },
			fellBack: false,
		})
	})
	it("falls back to English and says so", () => {
		expect(resolveGuide(entries, "no", "regions")).toEqual({
			entry: { id: "en/regions" },
			fellBack: true,
		})
	})
	it("is undefined when no language has the guide", () => {
		expect(resolveGuide(entries, "en", "missing")).toBeUndefined()
	})
})
