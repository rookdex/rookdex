import { describe, expect, it } from "vitest"
import { seoErrors } from "./seo-check.mjs"

const SITE = "https://rookdex.app"
const LD = `<script type="application/ld+json">{"@type":"WebSite","url":"https://rookdex.app/"}</script>`

function page(url: string, head = "", title = "GTA 6 news and rumours · Rookdex") {
	return `<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="D"><link rel="canonical" href="${url}"><meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image">${head}</head><body></body></html>`
}

function sitemap(paths: string[]) {
	return `<?xml version="1.0" encoding="UTF-8"?><urlset>${paths.map((p) => `<url><loc>${SITE}/${p}</loc></url>`).join("")}</urlset>`
}

/** A dist/ that passes every rule. Settings is built but left out of the sitemap on purpose. */
function good(): Record<string, string> {
	return {
		"en/index.html": page(`${SITE}/en/`, LD),
		"nb/index.html": page(`${SITE}/nb/`, LD),
		"en/news/index.html": page(`${SITE}/en/news/`),
		"nb/news/index.html": page(`${SITE}/nb/news/`),
		"en/settings/index.html": page(`${SITE}/en/settings/`),
		"nb/settings/index.html": page(`${SITE}/nb/settings/`),
		// The body's language links carry hreflang; only the head is checked (rule 3).
		"404.html": `<html><head><title>Page not found · Rookdex</title></head><body><a href="/en/" hreflang="en">English</a></body></html>`,
		"sitemap.xml": sitemap(["en/", "nb/", "en/news/", "nb/news/"]),
		// CRLF, as a Windows checkout may have it.
		"robots.txt": "User-agent: *\r\nAllow: /\r\n\r\nSitemap: https://rookdex.app/sitemap.xml\r\n",
		"indexnow-key.txt": "0123456789abcdef0123456789abcdef",
	}
}

const rules = (files: Record<string, string>) =>
	seoErrors(files, SITE).map((message) => message.slice(0, 7))

describe("seoErrors (SEO spec §4.8)", () => {
	it("passes a good build, CRLF robots.txt and 404 body hreflang included", () => {
		expect(seoErrors(good(), SITE)).toEqual([])
	})

	it("accepts the site with a trailing slash", () => {
		expect(seoErrors(good(), `${SITE}/`)).toEqual([])
	})

	it("rule 0: a missing or empty sitemap", () => {
		const missing = good()
		delete missing["sitemap.xml"]
		expect(rules(missing)).toContain("[seo 0]")
		expect(rules({ ...good(), "sitemap.xml": sitemap([]) })).toContain("[seo 0]")
	})

	it("rule 0: a URL on another host", () => {
		const files = good()
		files["sitemap.xml"] = files["sitemap.xml"].replace(
			`${SITE}/en/news/`,
			"https://rookdex.malinfossum-dev.workers.dev/en/news/"
		)
		expect(rules(files)).toContain("[seo 0]")
	})

	it("rule 0: a built page nobody added to the sitemap", () => {
		const files = { ...good(), "en/tracker/index.html": page(`${SITE}/en/tracker/`) }
		expect(seoErrors(files, SITE).join("\n")).toContain("[seo 0] https://rookdex.app/en/tracker/")
	})

	it("rule 1: a sitemap URL with no built page", () => {
		const files = good()
		delete files["nb/news/index.html"]
		expect(rules(files)).toContain("[seo 1]")
	})

	it("rule 2: a page with no canonical, two, or the wrong one", () => {
		const none = {
			...good(),
			"en/news/index.html": page(`${SITE}/en/news/`).replace(/<link[^>]*>/, ""),
		}
		const two = {
			...good(),
			"en/news/index.html": page(
				`${SITE}/en/news/`,
				`<link rel="canonical" href="${SITE}/en/news/">`
			),
		}
		const wrong = { ...good(), "en/news/index.html": page(`${SITE}/en/`) }
		for (const files of [none, two, wrong]) expect(rules(files)).toContain("[seo 2]")
	})

	it("rule 2 also covers pages kept out of the sitemap", () => {
		const files = { ...good(), "en/settings/index.html": page(`${SITE}/en/`) }
		expect(rules(files)).toContain("[seo 2]")
	})

	it.each([
		'<link rel="canonical" href="https://rookdex.app/en/">',
		'<link href="https://rookdex.app/en/" hreflang="en" rel="alternate">',
		'<meta content="https://rookdex.app/en/" property="og:url">',
		'<script type="application/ld+json">{}</script>',
	])("rule 3: the 404 head contains %s", (tag) => {
		const files = good()
		files["404.html"] = files["404.html"].replace("</head>", `${tag}</head>`)
		expect(rules(files)).toContain("[seo 3]")
	})

	it("rule 4: a listed page without og:image, twitter:card or description", () => {
		for (const strip of [/<meta property="og:image"[^>]*>/, /<meta name="twitter:card"[^>]*>/]) {
			const files = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`).replace(strip, "") }
			expect(rules(files)).toContain("[seo 4]")
		}
		const empty = {
			...good(),
			"en/news/index.html": page(`${SITE}/en/news/`).replace('content="D"', 'content=" "'),
		}
		expect(rules(empty)).toContain("[seo 4]")
	})

	it("rule 4: og:image on another host", () => {
		const files = {
			...good(),
			"en/news/index.html": page(`${SITE}/en/news/`).replace(
				`${SITE}/og.png`,
				"https://x.workers.dev/og.png"
			),
		}
		expect(rules(files)).toContain("[seo 4]")
	})

	it("rule 4: an empty title or one over 65 characters", () => {
		const empty = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", "") }
		const long = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", "x".repeat(66)) }
		expect(rules(empty)).toContain("[seo 4]")
		expect(rules(long)).toContain("[seo 4]")
	})

	it("rule 4 counts decoded text: 65 characters written with &amp; pass", () => {
		const title = `${"x".repeat(63)} &amp;` // 65 characters once decoded, 69 as written
		const files = { ...good(), "en/news/index.html": page(`${SITE}/en/news/`, "", title) }
		expect(seoErrors(files, SITE)).toEqual([])
	})

	it("rule 5: robots.txt missing or without the sitemap line", () => {
		const missing = good()
		delete missing["robots.txt"]
		expect(rules(missing)).toContain("[seo 5]")
		expect(rules({ ...good(), "robots.txt": "User-agent: *\nAllow: /\n" })).toContain("[seo 5]")
	})

	it.each([
		["missing", undefined],
		["trailing LF", "0123456789abcdef0123456789abcdef\n"],
		["trailing CRLF", "0123456789abcdef0123456789abcdef\r\n"],
		["upper case", "0123456789ABCDEF0123456789ABCDEF"],
		["too short", "0123456789abcdef"],
	])("rule 6: key file %s", (_label, key) => {
		const files = good()
		if (key === undefined) delete files["indexnow-key.txt"]
		else files["indexnow-key.txt"] = key
		expect(rules(files)).toContain("[seo 6]")
	})

	it("rule 7: a home page with no JSON-LD, two blocks, bad JSON or the wrong url", () => {
		const variants = [
			page(`${SITE}/en/`),
			page(`${SITE}/en/`, LD + LD),
			page(`${SITE}/en/`, '<script type="application/ld+json">{not json</script>'),
			page(`${SITE}/en/`, LD.replace("https://rookdex.app/", "https://rookdex.app/en/")),
		]
		for (const html of variants) {
			expect(rules({ ...good(), "en/index.html": html })).toContain("[seo 7]")
		}
	})
})
