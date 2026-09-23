import { describe, expect, it } from "vitest"
import { guideSchema, guideSlugs, resolveGuide, splitGuideId } from "./guides"

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

describe("guideSchema (spec §9)", () => {
	const guide = { title: "T", summary: "S", updated: "2026-09-23" }

	it("accepts one page per outlet", () => {
		const result = guideSchema.safeParse({
			...guide,
			sources: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
		})
		expect(result.success).toBe(true)
	})

	it("defaults to no sources", () => {
		expect(guideSchema.parse(guide).sources).toEqual([])
	})

	it("fails a guide that cites one outlet twice, naming the outlet", () => {
		const result = guideSchema.safeParse({
			...guide,
			sources: ["https://www.ign.com/articles/a", "https://ign.com/articles/b"],
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toContain("ign.com")
	})
})
