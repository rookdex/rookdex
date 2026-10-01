// Astro integration. After the static build it parses every built page and fails the build on an
// external link that could leak the opener or the referrer, open in the same tab without saying
// so, or carry a scheme other than https: or mailto: (feedback spec §11). CI runs tests before
// the build, so a check of dist/ lives here, like the SEO check.
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { JSDOM } from "jsdom"
import { listFiles } from "./precache.mjs"

/** Every `<a href>` in `html` that must not ship, with the reason. `<link>` is never checked. */
export function findUnsafeLinks(html, site) {
	const base = `${site.replace(/\/$/, "")}/`
	const siteHost = new URL(base).host
	const { document } = new JSDOM(html).window
	const problems = []
	for (const a of document.querySelectorAll("a[href]")) {
		const href = a.getAttribute("href") ?? ""
		let url
		try {
			// The URL parser strips the whitespace and tabs a browser would, so " java\tscript:" is
			// seen as the javascript: scheme it really is.
			url = new URL(href, base)
		} catch {
			problems.push({ href, reason: "unparseable" })
			continue
		}
		if (url.protocol === "mailto:") continue
		// Relative links resolve against https://rookdex.app, so any other scheme was written out.
		if (url.protocol !== "https:") {
			problems.push({ href, reason: "scheme not allowed" })
			continue
		}
		if (url.host === siteHost) continue
		const rel = (a.getAttribute("rel") ?? "").toLowerCase().split(/\s+/)
		if ((a.getAttribute("target") ?? "").toLowerCase() !== "_blank") {
			problems.push({ href, reason: "no target=_blank" })
		} else if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
			problems.push({ href, reason: "rel lacks noopener or noreferrer" })
		} else if (!a.querySelector(".new-tab-note")) {
			problems.push({ href, reason: "no new-tab note" })
		}
	}
	return problems
}

export default function externalLinks() {
	let site = ""
	return {
		name: "rookdex-external-links",
		hooks: {
			"astro:config:done": ({ config }) => {
				site = String(config.site ?? "")
			},
			"astro:build:done": async ({ dir, logger }) => {
				if (!site) throw new Error("external-link check: astro.config.mjs has no site")
				const root = fileURLToPath(dir)
				const pages = (await listFiles(root)).filter((file) => file.endsWith(".html"))
				const errors = []
				for (const file of pages) {
					for (const { href, reason } of findUnsafeLinks(
						await readFile(join(root, file), "utf8"),
						site
					)) {
						errors.push(`${file}: ${href} (${reason})`)
					}
				}
				if (errors.length > 0) {
					throw new Error(`External-link check failed:\n${errors.join("\n")}`)
				}
				logger.info(`external-link check passed: ${pages.length} pages`)
			},
		},
	}
}
