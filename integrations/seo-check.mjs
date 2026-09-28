// Astro integration. After the static build it checks the SEO rules that span several built files
// (SEO spec §4.8) and fails the build when one breaks. CI runs tests before the build, so a check
// of dist/ has to live here. Regex and substring checks only: Astro emits the head in a known shape.
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { listFiles } from "./precache.mjs"

/** Built pages kept out of the sitemap on purpose (spec D4), as locale-less paths. */
export const NOT_IN_SITEMAP = ["settings"]

const LOCALES = ["en", "no"]
const PAGE = /^(en|no)\/(.+\/)?index\.html$/
const ROOT_FILES = ["404.html", "sitemap.xml", "robots.txt", "indexnow-key.txt"]
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

/**
 * Every broken rule, as "[seo N] …" messages. `files` maps a dist-relative posix path to its text:
 * every page under en/ and no/, plus 404.html, sitemap.xml, robots.txt and indexnow-key.txt. A
 * missing entry counts as a missing file.
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
		const image = metas(html, "property", "og:image")
		if (image.length !== 1 || attr(image[0], "content") !== `${base}/og.png`) {
			errors.push(`[seo 4] ${file} needs one og:image at ${base}/og.png`)
		}
		if (metas(html, "name", "twitter:card").length !== 1) {
			errors.push(`[seo 4] ${file} needs one twitter:card`)
		}
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
		const blocks = [...(files[file] ?? "").matchAll(LD_BLOCK)]
		let url
		try {
			url = blocks.length === 1 ? JSON.parse(blocks[0][1]).url : undefined
		} catch {
			url = undefined
		}
		if (url !== `${base}/`) errors.push(`[seo 7] ${file} needs one JSON-LD block with url ${base}/`)
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
