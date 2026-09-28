import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")

describe("crawler files (SEO spec §4.3, §4.6)", () => {
	it("robots.txt allows everything and names the sitemap", () => {
		const lines = read("public/robots.txt").split(/\r?\n/)
		expect(lines).toContain("User-agent: *")
		expect(lines).toContain("Allow: /")
		expect(lines).toContain("Sitemap: https://rookdex.app/sitemap.xml")
	})

	it("the IndexNow key is 32 lowercase hex characters and nothing else", () => {
		expect(read("public/indexnow-key.txt")).toMatch(/^[a-f0-9]{32}$/)
	})

	it("keeps line-ending conversion off the key file", () => {
		expect(read(".gitattributes").split(/\r?\n/)).toContain("public/indexnow-key.txt -text")
	})
})
