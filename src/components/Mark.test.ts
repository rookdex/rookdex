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

const favicon = readFileSync(new URL("../../assets/favicon-source.svg", import.meta.url), "utf8")

/** Non-empty trimmed lines, so a CRLF checkout compares the same as an LF one. */
function lines(svg: string): string[] {
	return svg
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

/** The icon without its palm group — the palm is the only thing the favicon source drops. */
function withoutPalm(svg: string): string {
	const start = svg.lastIndexOf('<g fill="#000000">')
	const end = svg.lastIndexOf("</g>") + "</g>".length
	return svg.slice(0, start) + svg.slice(end)
}

describe("favicon source parity (Task 7 ruling)", () => {
	it("is the icon with the palm removed and nothing else changed", () => {
		expect(lines(favicon)).toEqual(lines(withoutPalm(icon)))
	})

	it("drops the palm, which is noise at 16 px", () => {
		expect(favicon).not.toContain("<path")
		expect(paths(favicon)).toHaveLength(0)
	})
})
