import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import { homeSeoKeys, indexablePaths, jsonLd, SITE, sitemapXml, validSlugs } from "./seo"

describe("SITE", () => {
	it("is the production origin without a trailing slash", () => {
		expect(SITE).toBe("https://rookdex.app")
	})
})

describe("validSlugs (SEO spec §4.1)", () => {
	it("dedupes and sorts", () => {
		expect(validSlugs(["regions", "before-you-start", "regions"])).toEqual([
			"before-you-start",
			"regions",
		])
	})

	it.each(["Launch", "launch_day", "sub/x", "", "før"])("throws on %j, naming it", (slug) => {
		expect(() => validSlugs(["ok", slug])).toThrow(`"${slug}"`)
	})
})

describe("indexablePaths (SEO spec §4.1, category pages spec §9)", () => {
	it("lists home, the tracker pages, the Dex, news, privacy, then each guide once", () => {
		expect(
			indexablePaths(["before-you-start", "before-you-start"], ["wildlife", "places"])
		).toEqual([
			"",
			"tracker",
			"tracker/sources",
			"dex",
			"dex/places",
			"dex/wildlife",
			"news",
			"privacy",
			"guides/before-you-start",
		])
	})

	it("never lists settings", () => {
		expect(indexablePaths(["before-you-start"], ["wildlife"])).not.toContain("settings")
	})

	it("throws on a bad guide slug", () => {
		expect(() => indexablePaths(["Bad Slug"], ["wildlife"])).toThrow("src/content/guides/")
	})

	it("throws on a bad category slug, pointing at the seed", () => {
		expect(() => indexablePaths(["before-you-start"], ["Wild Life"])).toThrow(
			/"Wild Life".*src\/seed\//
		)
	})
})

describe("jsonLd (SEO spec §4.4)", () => {
	it("can't close the script tag, and still parses back to the same value", () => {
		const value = { name: "</script><script>alert(1)</script>" }
		const out = jsonLd(value)
		expect(out).not.toContain("<")
		expect(JSON.parse(out)).toEqual(value)
	})
})

describe("sitemapXml (SEO spec §4.2)", () => {
	it("writes one sorted <url><loc> per URL, and nothing else per entry", () => {
		const xml = sitemapXml([`${SITE}/nb/`, `${SITE}/en/`])
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
		expect([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])).toEqual([
			`${SITE}/en/`,
			`${SITE}/nb/`,
		])
		expect(xml).not.toMatch(/lastmod|priority|changefreq|hreflang/)
	})

	it("is byte-stable whatever order the URLs come in", () => {
		const urls = [`${SITE}/en/`, `${SITE}/en/news/`, `${SITE}/nb/`]
		expect(sitemapXml([...urls].reverse())).toBe(sitemapXml(urls))
	})
})

describe("homeSeoKeys (launch rebuild)", () => {
	it("keeps the countdown copy before launch", () => {
		expect(homeSeoKeys("before")).toEqual({
			title: "seo.titles.home",
			description: "seo.homeDescription",
		})
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)(
		"%s after-launch copy drops the countdown and never says the game is out",
		(_l, bundle) => {
			const { title, description } = homeSeoKeys("after")
			for (const text of [bundle[title], bundle[description]]) {
				expect(text).not.toMatch(/countdown|nedtelling|out now|ute nå|19/i)
			}
		}
	)
})
