import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const icon = readFileSync(new URL("../../public/icon.svg", import.meta.url), "utf8")
const mark = readFileSync(new URL("./Mark.astro", import.meta.url), "utf8")

/** Every path `d` attribute in document order, whitespace-normalised (spec §13.3). */
function paths(svg: string): string[] {
	return [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, " ").trim())
}

describe("mark parity (spec §5)", () => {
	it("draws the same eight paths in the icon file and the component", () => {
		expect(paths(icon)).toHaveLength(8) // trunk + seven fronds
		expect(paths(mark)).toEqual(paths(icon))
	})

	it("keeps the crown at 312,214 and the foot at 352,404", () => {
		const [trunk, ...fronds] = paths(icon)
		expect(trunk).toBe("M352 404 C 344 340, 334 280, 312 214")
		for (const frond of fronds) expect(frond).toMatch(/^M312 214 Q .* 312 214 z$/)
	})

	it("keeps the icon file's title, role and background, and has no glow filter anywhere", () => {
		expect(icon).toContain('<title id="t">Rookdex</title>')
		expect(icon).toContain('role="img"')
		expect(icon).toContain('<rect width="512" height="512" rx="96" fill="#000000"')
		expect(icon).not.toContain("<filter")
		expect(mark).not.toContain("<filter")
		expect(mark).not.toContain('<rect width="512"')
		expect(mark).toContain('aria-hidden="true"')
	})
})
