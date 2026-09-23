import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const lines = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim())
	.filter(Boolean)

describe("_redirects (spec §3)", () => {
	it("moves the old rumours pages to News with a 301, above the root redirect", () => {
		const root = lines.indexOf("/ /en/ 302")
		expect(root).toBeGreaterThanOrEqual(0)
		for (const locale of ["en", "no"]) {
			const line = lines.indexOf(`/${locale}/tracker/rumours/ /${locale}/news/ 301`)
			expect(line, locale).toBeGreaterThanOrEqual(0)
			expect(line, locale).toBeLessThan(root)
		}
	})
})
