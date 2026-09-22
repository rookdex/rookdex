import { describe, expect, it } from "vitest"
import { precacheUrls, shouldPrecache } from "./precache.mjs"

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
		expect(precacheUrls(["en/tracker/index.html", "no/tracker/rumours/index.html"])).toEqual([
			"/en/tracker/",
			"/no/tracker/rumours/",
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
})

describe("shouldPrecache", () => {
	it("is the one predicate both the URL list and the version hash use", () => {
		expect(shouldPrecache("index.html")).toBe(true)
		expect(shouldPrecache("sw.js")).toBe(false)
		expect(shouldPrecache("og.png")).toBe(false)
		expect(shouldPrecache("_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2")).toBe(false)
	})
})
