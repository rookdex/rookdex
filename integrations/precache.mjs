// Astro integration. After the static build it lists every file in dist/, writes the list
// and a content hash into the service worker, and saves it as dist/sw.js.
import { createHash } from "node:crypto"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const SKIP = new Set(["404.html", "sw.js", "_headers", "_redirects"])
/** A face's latin subset, matched on the part of the basename before the first dot, because
 *  Astro's base64url hashes can contain "-" themselves. "-latin-ext-" is not "-latin-". */
const LATIN_FONT = /^[^.]*-latin-(?!ext-)/

/** Which built files the worker precaches: pages and assets, minus the worker's own files, the
 *  OG banner (crawlers only) and every non-latin font subset (they load on demand online). */
export function shouldPrecache(file) {
	if (SKIP.has(file)) return false
	if (/^og\./.test(file)) return false
	if (file.startsWith("_astro/") && file.endsWith(".woff2")) {
		return LATIN_FONT.test(file.slice("_astro/".length))
	}
	return true
}

/** Posix-relative file paths from dist/ → URLs the worker precaches. */
export function precacheUrls(files) {
	return files
		.filter(shouldPrecache)
		.map((file) => {
			if (file === "index.html") return "/"
			if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`
			return `/${file}`
		})
		.sort()
}

async function listFiles(root) {
	const entries = await readdir(root, { recursive: true, withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
}

export default function precache() {
	return {
		name: "rookdex-precache",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const root = fileURLToPath(dir)
				const files = await listFiles(root)
				const urls = precacheUrls(files)

				const hash = createHash("sha256")
				for (const file of files.filter(shouldPrecache)) {
					hash.update(file)
					hash.update(await readFile(join(root, file)))
				}
				const version = hash.digest("hex").slice(0, 12)

				const template = await readFile(new URL("../src/sw/sw.js", import.meta.url), "utf8")
				const worker = template
					.replace('"__VERSION__"', JSON.stringify(version))
					.replace('"__PRECACHE__"', JSON.stringify(urls))
				await writeFile(join(root, "sw.js"), worker)
				logger.info(`sw.js written: ${urls.length} URLs, version ${version}`)
			},
		},
	}
}
