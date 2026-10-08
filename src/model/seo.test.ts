import { describe, expect, it } from "vitest"
import { indexablePaths, jsonLd, SITE, sitemapXml, validSlugs } from "./seo"

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

describe("indexablePaths (SEO spec §4.1)", () => {
	it("lists home, tracker, its sources, news, then each guide once under guides/", () => {
		expect(indexablePaths(["before-you-start", "before-you-start"])).toEqual([
			"",
			"tracker",
			"tracker/sources",
			"news",
			"guides/before-you-start",
		])
	})

	it("never lists settings", () => {
		expect(indexablePaths(["before-you-start"])).not.toContain("settings")
	})

	it("throws on a bad guide slug", () => {
		expect(() => indexablePaths(["Bad Slug"])).toThrow()
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
