import { describe, expect, it } from "vitest"
import { precacheUrls } from "./precache.mjs"

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
})
