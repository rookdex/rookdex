import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync(new URL("./ChipNav.astro", import.meta.url), "utf8")

/** The body of the scoped rule whose selector is exactly `selector`. */
function rule(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ""
}

describe("ChipNav at 200 % text on a 320 px phone", () => {
	it("lets a long chip label break instead of widening the page", () => {
		// "Tjenestekjøretøy" and "Neighborhoods" each pushed a Dex page past 320 px.
		expect(rule(".chip-list li")).toMatch(/max-width:\s*100%/)
		expect(rule(".chip-list a")).toMatch(/max-width:\s*100%/)
		expect(rule(".chip-list a")).toMatch(/overflow-wrap:\s*anywhere/)
	})
})
