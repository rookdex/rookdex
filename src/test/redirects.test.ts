import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const lines = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim().replace(/\s+/g, " "))
	.filter(Boolean)

describe("_redirects (locale spec §6.2, category model spec §6)", () => {
	it("sends every old URL to its new home in one 301, the specific rules before /no/*", () => {
		expect(lines).toEqual([
			"/no/tracker/rumours/ /nb/news/ 301",
			"/en/tracker/rumours/ /en/news/ 301",
			"/no/dex/wildlife/ /nb/dex/animals/ 301",
			"/no/dex/collectibles/ /nb/dex/collections/ 301",
			"/en/dex/wildlife/ /en/dex/animals/ 301",
			"/nb/dex/wildlife/ /nb/dex/animals/ 301",
			"/en/dex/collectibles/ /en/dex/collections/ 301",
			"/nb/dex/collectibles/ /nb/dex/collections/ 301",
			"/no /nb/ 301",
			"/no/* /nb/:splat 301",
		])
	})

	it("has no rule for the root, which is a real page now", () => {
		expect(lines.filter((line) => line.split(" ")[0] === "/")).toEqual([])
	})
})
