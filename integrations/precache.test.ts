import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
	computeVersion,
	fillWorker,
	precacheUrls,
	shouldPrecache,
	withVersionHeader,
} from "./precache.mjs"

describe("precacheUrls", () => {
	it("maps built files to URLs and skips the files the worker must not cache", () => {
		const files = [
			"404.html",
			"_astro/Countdown.abc123.js",
			"_headers",
			"_redirects",
			"en/guides/before-you-start/index.html",
			"en/index.html",
			"index.html",
			"manifest.webmanifest",
			"pwa-192x192.png",
			"sw.js",
		]
		expect(precacheUrls(files)).toEqual([
			"/",
			"/_astro/Countdown.abc123.js",
			"/en/",
			"/en/guides/before-you-start/",
			"/manifest.webmanifest",
			"/pwa-192x192.png",
		])
	})

	it("precaches the tracker and rumours pages like any other page", () => {
		expect(precacheUrls(["en/tracker/index.html", "nb/tracker/rumours/index.html"])).toEqual([
			"/en/tracker/",
			"/nb/tracker/rumours/",
		])
	})

	it("precaches only the latin subset of each face, matched on the basename (spec §13.4)", () => {
		expect(
			precacheUrls([
				"_astro/inter-latin-wght-normal.Dx4kXJAl.woff2",
				"_astro/inter-cyrillic-wght-normal.DqGufNeO.woff2",
				"_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2",
				"_astro/bebas-neue-latin-400-normal.Ab-12cd_.woff2",
				"_astro/bebas-neue-latin-ext-400-normal.Ef34ghI-.woff2",
				"_astro/dm-sans-latin-wght-normal.Jk56lmN_.woff2",
			])
		).toEqual([
			"/_astro/bebas-neue-latin-400-normal.Ab-12cd_.woff2",
			"/_astro/dm-sans-latin-wght-normal.Jk56lmN_.woff2",
			"/_astro/inter-latin-wght-normal.Dx4kXJAl.woff2",
		])
	})

	it("never precaches the OG banner", () => {
		expect(precacheUrls(["og.png", "en/index.html"])).toEqual(["/en/"])
	})

	it("precaches the root page, so the installed app resolves offline", () => {
		expect(precacheUrls(["index.html", "en/index.html", "nb/index.html"])).toContain("/")
	})
})

describe("shouldPrecache", () => {
	it("is the one predicate both the URL list and the version hash use", () => {
		expect(shouldPrecache("index.html")).toBe(true)
		expect(shouldPrecache("sw.js")).toBe(false)
		expect(shouldPrecache("og.png")).toBe(false)
		expect(shouldPrecache("_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2")).toBe(false)
	})

	it("skips the crawler-only files (SEO spec §4.7)", () => {
		for (const file of ["robots.txt", "sitemap.xml", "indexnow-key.txt"]) {
			expect(shouldPrecache(file), file).toBe(false)
		}
	})
})

describe("withVersionHeader (feedback spec §10.2)", () => {
	const headers = [
		"/*",
		"  X-Content-Type-Options: nosniff",
		"",
		"/sw.js",
		"  Cache-Control: no-cache",
		"",
		"https://:version.:subdomain.workers.dev/*",
		"  X-Robots-Tag: noindex",
		"",
	].join("\n")

	it("adds the version line inside the /* block only", () => {
		const lines = withVersionHeader(headers, "abc123def456").split("\n")
		expect(lines.slice(0, 3)).toEqual([
			"/*",
			"  X-Rookdex-Version: abc123def456",
			"  X-Content-Type-Options: nosniff",
		])
		expect(lines.filter((line: string) => line.includes("X-Rookdex-Version"))).toHaveLength(1)
	})

	it("handles a CRLF checkout", () => {
		const out = withVersionHeader(headers.replace(/\n/g, "\r\n"), "v1")
		expect(out.split(/\r?\n/).slice(0, 2)).toEqual(["/*", "  X-Rookdex-Version: v1"])
	})

	it("fails without exactly one /* block", () => {
		expect(() => withVersionHeader("/sw.js\n  Cache-Control: no-cache\n", "v1")).toThrow(
			/exactly one/
		)
		expect(() => withVersionHeader("/*\n  A: b\n\n/*\n  C: d\n", "v1")).toThrow(/exactly one/)
	})

	it("accepts the real public/_headers", async () => {
		const real = await readFile(new URL("../public/_headers", import.meta.url), "utf8")
		expect(withVersionHeader(real, "v1")).toContain("X-Rookdex-Version: v1")
	})
})

describe("computeVersion", () => {
	it("ignores _headers, so writing the version line can't change the version", async () => {
		const root = await mkdtemp(join(tmpdir(), "rookdex-"))
		await mkdir(join(root, "en"))
		await writeFile(join(root, "en/index.html"), "<p>page</p>")
		await writeFile(join(root, "_headers"), "/*\n")
		const files = ["en/index.html", "_headers"]
		const before = await computeVersion(root, files)
		await writeFile(join(root, "_headers"), "/*\n  X-Rookdex-Version: x\n")
		expect(await computeVersion(root, files)).toBe(before)
		await writeFile(join(root, "en/index.html"), "<p>changed</p>")
		expect(await computeVersion(root, files)).not.toBe(before)
	})
})

describe("computeVersion and build stamps", () => {
	async function version(html: string, asset = "body{}") {
		const root = await mkdtemp(join(tmpdir(), "rookdex-"))
		await mkdir(join(root, "en"))
		await mkdir(join(root, "_astro"))
		await writeFile(join(root, "en/index.html"), html)
		await writeFile(join(root, "_astro/app.js"), asset)
		return computeVersion(root, ["en/index.html", "_astro/app.js"])
	}
	const page = (stamped: string, outside = "static") =>
		`<html><body><p>${outside}</p><div data-build-stamp>${stamped}</div></body></html>`

	it("gives the same version when HTML differs only inside a build stamp", async () => {
		const a = await version(page('<astro-island props="12:00:01"><b>12:00:01</b></astro-island>'))
		const b = await version(page('<astro-island props="12:00:09"><b>12:00:09</b></astro-island>'))
		expect(a).toBe(b)
	})

	it("changes the version when HTML differs outside every build stamp", async () => {
		expect(await version(page("x", "one"))).not.toBe(await version(page("x", "two")))
	})

	it("changes the version when the stamp element itself is added, removed or renamed", async () => {
		const stamped = await version(page("x"))
		const bare = await version("<html><body><p>static</p><div>x</div></body></html>")
		expect(stamped).not.toBe(bare)
	})

	it("still hashes a non-HTML file byte for byte", async () => {
		expect(await version(page("x"), "a")).not.toBe(await version(page("x"), "b"))
		// Stamp markup in a non-HTML file is just bytes, so it is not emptied.
		const withStamp = (id: string) => `<div data-build-stamp>${id}</div>`
		expect(await version(page("x"), withStamp("1"))).not.toBe(
			await version(page("x"), withStamp("2"))
		)
	})
})

describe("fillWorker", () => {
	it("fills both placeholders", () => {
		const out = fillWorker('const VERSION = "__VERSION__"\nconst PRECACHE = "__PRECACHE__"', "v1", [
			"/en/",
		])
		expect(out).toBe('const VERSION = "v1"\nconst PRECACHE = ["/en/"]')
	})
})
