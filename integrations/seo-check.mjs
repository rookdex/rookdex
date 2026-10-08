// Astro integration. After the static build it checks the SEO rules that span several built files
// (SEO spec §4.8) and fails the build when one breaks. CI runs tests before the build, so a check
// of dist/ has to live here. Regex and substring checks only: Astro emits the head in a known shape.
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { listFiles } from "./precache.mjs"

/** Built pages kept out of the sitemap on purpose (spec D4), as locale-less paths. */
export const NOT_IN_SITEMAP = ["settings"]

const LOCALES = ["en", "nb"]
const PAGE = /^(en|nb)\/(.+\/)?index\.html$/
const ROOT_FILES = ["index.html", "404.html", "sitemap.xml", "robots.txt", "indexnow-key.txt"]
const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

/** The entities Astro writes in text and attributes, decoded so lengths count characters. */
function decode(text) {
	return text
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&#x27;/g, "'")
		.replace(/&amp;/g, "&")
}

function tags(html, name) {
	return html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? []
}

function attr(tag, name) {
	return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
}

function metas(html, key, value) {
	return tags(html, "meta").filter((tag) => attr(tag, key) === value)
}

function head(html) {
	const end = html.indexOf("</head>")
	return end === -1 ? html : html.slice(0, end)
}

/** The `url` of the page's one JSON-LD block, or undefined when it has none, several or bad JSON. */
function jsonLdUrl(html) {
	const blocks = [...html.matchAll(LD_BLOCK)]
	try {
		return blocks.length === 1 ? JSON.parse(blocks[0][1]).url : undefined
	} catch {
		return undefined
	}
}

/**
 * The link-preview problems of a page, tagged with its rule: one og:image at /og.png and one
 * twitter:card.
 */
function previewErrors(rule, file, html, base) {
	const errors = []
	const image = metas(html, "property", "og:image")
	if (image.length !== 1 || attr(image[0], "content") !== `${base}/og.png`) {
		errors.push(`[seo ${rule}] ${file} needs one og:image at ${base}/og.png`)
	}
	if (metas(html, "name", "twitter:card").length !== 1) {
		errors.push(`[seo ${rule}] ${file} needs one twitter:card`)
	}
	return errors
}

/**
 * Every broken rule, as "[seo N] …" messages. `files` maps a dist-relative posix path to its text:
 * every page under en/ and nb/, plus index.html (the root page), 404.html, sitemap.xml, robots.txt
 * and indexnow-key.txt. A missing entry counts as a missing file.
 */
export function seoErrors(files, site) {
	const base = site.replace(/\/$/, "")
	const errors = []
	const pages = new Map(
		Object.keys(files)
			.filter((file) => PAGE.test(file))
			.map((file) => [`${base}/${file.slice(0, -"index.html".length)}`, file])
	)

	// Rules 0 and 1: the sitemap exists, stays on the site, and matches the built pages.
	const listed = [...(files["sitemap.xml"] ?? "").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
	if (listed.length === 0) errors.push("[seo 0] sitemap.xml is missing or lists no URLs")
	for (const url of listed) {
		if (!url.startsWith(`${base}/`)) errors.push(`[seo 0] ${url} is not on ${base}`)
		else if (!pages.has(url)) errors.push(`[seo 1] ${url} is in the sitemap but has no built page`)
	}
	const excluded = new Set(LOCALES.flatMap((l) => NOT_IN_SITEMAP.map((p) => `${base}/${l}/${p}/`)))
	for (const url of pages.keys()) {
		if (!excluded.has(url) && !listed.includes(url)) {
			errors.push(
				`[seo 0] ${url} is built but not in the sitemap; add it to indexablePaths or NOT_IN_SITEMAP`
			)
		}
	}

	// Rule 2: every locale page has exactly one canonical, pointing at itself.
	for (const [url, file] of pages) {
		const canonical = tags(files[file], "link").filter((tag) => attr(tag, "rel") === "canonical")
		if (canonical.length !== 1 || attr(canonical[0], "href") !== url) {
			errors.push(`[seo 2] ${file} needs exactly one canonical link, to ${url}`)
		}
	}

	// Rule 3: the 404 claims no address and carries no JSON-LD. Its body links each language with
	// hreflang, so only the head is searched; substrings can't be dodged by attribute order.
	const notFoundHead = head(files["404.html"] ?? "")
	for (const needle of ['rel="canonical"', "hreflang=", "og:url", "application/ld+json"]) {
		if (notFoundHead.includes(needle)) errors.push(`[seo 3] 404.html head contains ${needle}`)
	}

	// Rule 4: listed pages have a preview image, a card, a description and a title that fits.
	for (const url of listed) {
		const file = pages.get(url)
		if (!file) continue
		const html = files[file]
		errors.push(...previewErrors(4, file, html, base))
		const description = metas(html, "name", "description")[0]
		if (!decode(attr(description ?? "", "content") ?? "").trim()) {
			errors.push(`[seo 4] ${file} has no description`)
		}
		const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").trim()
		if (!title || [...title].length > 65) {
			errors.push(`[seo 4] ${file} title is empty or over 65 characters: "${title}"`)
		}
	}

	// Rule 5: robots.txt names the sitemap (CRLF tolerated).
	if (!(files["robots.txt"] ?? "").split(/\r?\n/).includes(`Sitemap: ${base}/sitemap.xml`)) {
		errors.push(`[seo 5] robots.txt lacks "Sitemap: ${base}/sitemap.xml"`)
	}

	// Rule 6: the key file is the key and nothing else, untrimmed.
	if (!/^[a-f0-9]{32}$/.test(files["indexnow-key.txt"] ?? "")) {
		errors.push("[seo 6] indexnow-key.txt must be exactly 32 lowercase hex characters")
	}

	// Rule 7: each home page has one WebSite block at the domain root.
	for (const locale of LOCALES) {
		const file = `${locale}/index.html`
		if (jsonLdUrl(files[file] ?? "") !== `${base}/`) {
			errors.push(`[seo 7] ${file} needs one JSON-LD block with url ${base}/`)
		}
	}

	// Rule 8: the root page (locale spec §6.4). It names itself, both languages and x-default,
	// carries the site-name block, and its resolver runs before any stylesheet, with its exact hash
	// in the CSP. A stale hash would leave every JavaScript visitor on the link page.
	const rootHtml = files["index.html"]
	if (rootHtml === undefined) {
		errors.push("[seo 8] index.html (the root page) is missing")
	} else {
		const rootHead = head(rootHtml)
		const links = tags(rootHead, "link")
		const canonical = links.filter((tag) => attr(tag, "rel") === "canonical")
		if (canonical.length !== 1 || attr(canonical[0], "href") !== `${base}/`) {
			errors.push(`[seo 8] index.html needs exactly one canonical link, to ${base}/`)
		}
		const alternates = new Map(
			links
				.filter((tag) => attr(tag, "rel") === "alternate")
				.map((tag) => [attr(tag, "hreflang"), attr(tag, "href")])
		)
		for (const locale of LOCALES) {
			if (alternates.get(locale) !== `${base}/${locale}/`) {
				errors.push(`[seo 8] index.html needs hreflang ${locale} pointing at ${base}/${locale}/`)
			}
		}
		if (alternates.get("x-default") !== `${base}/`) {
			errors.push(`[seo 8] index.html needs hreflang x-default pointing at ${base}/`)
		}
		if (jsonLdUrl(rootHtml) !== `${base}/`) {
			errors.push(`[seo 8] index.html needs one JSON-LD block with url ${base}/`)
		}
		// Unfurlers fetch the bare domain without JavaScript, so the root carries the link preview.
		errors.push(...previewErrors(8, "index.html", rootHead, base))
		const resolver = /<script\s*>([\s\S]*?)<\/script\b[^>]*>/i.exec(rootHead)
		if (!resolver) {
			errors.push("[seo 8] index.html has no inline resolver script")
		} else {
			const hash = `'sha256-${createHash("sha256").update(resolver[1], "utf8").digest("base64")}'`
			const csp = metas(rootHead, "http-equiv", "content-security-policy")[0]
			if (!decode(attr(csp ?? "", "content") ?? "").includes(hash)) {
				errors.push("[seo 8] index.html's CSP lacks the resolver's hash")
			}
			const sheet = rootHead.search(/<link\b[^>]*rel="stylesheet"|<style\b/i)
			if (sheet !== -1 && sheet < resolver.index) {
				errors.push(
					"[seo 8] index.html loads a stylesheet before the resolver, so the link page can flash"
				)
			}
		}
	}
	if (listed.includes(`${base}/`)) {
		errors.push("[seo 8] the root is in the sitemap; Google treats its jump as a redirect")
	}

	// Rule 9: each home page names the root as x-default (locale spec §6.3).
	for (const locale of LOCALES) {
		const file = `${locale}/index.html`
		const xDefault = tags(head(files[file] ?? ""), "link").filter(
			(tag) => attr(tag, "rel") === "alternate" && attr(tag, "hreflang") === "x-default"
		)
		if (xDefault.length !== 1 || attr(xDefault[0], "href") !== `${base}/`) {
			errors.push(`[seo 9] ${file} needs one hreflang x-default pointing at ${base}/`)
		}
	}

	return errors
}

export default function seoCheck() {
	let site = ""
	return {
		name: "rookdex-seo-check",
		hooks: {
			"astro:config:done": ({ config }) => {
				site = String(config.site ?? "")
			},
			"astro:build:done": async ({ dir, logger }) => {
				if (!site) throw new Error("seo check: astro.config.mjs has no site")
				const root = fileURLToPath(dir)
				const wanted = (await listFiles(root)).filter(
					(file) => PAGE.test(file) || ROOT_FILES.includes(file)
				)
				const files = {}
				for (const file of wanted) files[file] = await readFile(join(root, file), "utf8")
				const errors = seoErrors(files, site)
				if (errors.length > 0) throw new Error(`SEO check failed:\n${errors.join("\n")}`)
				logger.info(`seo check passed: ${wanted.length} files`)
			},
		},
	}
}
