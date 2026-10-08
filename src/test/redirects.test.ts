import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const lines = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim().replace(/\s+/g, " "))
	.filter(Boolean)

describe("_redirects (locale spec §6.2)", () => {
	it("sends every old Norwegian URL to /nb/ in one 301, the specific rumours rule first", () => {
		expect(lines).toEqual([
			"/no/tracker/rumours/ /nb/news/ 301",
			"/en/tracker/rumours/ /en/news/ 301",
			"/no /nb/ 301",
			"/no/* /nb/:splat 301",
		])
	})

	it("has no rule for the root, which is a real page now", () => {
		expect(lines.filter((line) => line.split(" ")[0] === "/")).toEqual([])
	})
})
