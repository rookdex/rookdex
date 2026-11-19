import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { SHORTCUT_TABS } from "../model/tabs"

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

const monochrome = readFileSync(
	new URL("../../assets/icon-monochrome.svg", import.meta.url),
	"utf8"
)

describe("monochrome mark parity", () => {
	/** The trimmed lines of the element that opens with `open`, without its own two tags. */
	function inner(svg: string, open: string): string[] {
		const start = svg.indexOf(open)
		expect(start, open).toBeGreaterThanOrEqual(0)
		const tag = open.slice(1).split(/[\s>]/)[0]
		const body = svg.slice(svg.indexOf(">", start) + 1, svg.indexOf(`</${tag}>`, start))
		return lines(body)
	}

	it("cuts the icon's own stripes and palm out of the shape", () => {
		const cuts = inner(monochrome, '<mask id="ink"').slice(1) // after the white keep-all rect
		const stripes = lines(icon).slice(
			lines(icon).indexOf('<g fill="#000000" clip-path="url(#disc)">'),
			lines(icon).indexOf("</g>") + 1
		)
		const palm = lines(
			icon.slice(icon.lastIndexOf('<g fill="#000000">'), icon.lastIndexOf("</svg>"))
		)
		expect(stripes).toHaveLength(5)
		expect(palm).toHaveLength(10)
		expect(cuts).toEqual([...stripes, ...palm])
	})

	it("fills the icon's sun and horizon bar, and nothing else", () => {
		expect(inner(monochrome, '<g fill="#000000" mask="url(#ink)">')).toEqual([
			'<circle cx="256" cy="236" r="150"/>',
			'<rect x="96" y="398" width="320" height="14" rx="7"/>',
		])
		expect(icon).toContain('<circle cx="256" cy="236" r="150" fill="url(#sun)"/>')
		expect(icon).toContain('<rect x="96" y="398" width="320" height="14" rx="7" fill="#22e0ff"/>')
	})

	it("carries no color and no background: only the alpha channel is used", () => {
		const colors = new Set([...monochrome.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]))
		expect([...colors].sort()).toEqual(["#000000", "#ffffff"])
		expect(monochrome).not.toContain("Gradient")
		expect(monochrome).not.toContain('<rect width="512" height="512" rx="96"')
	})
})

const tabIcon = readFileSync(new URL("./TabIcon.astro", import.meta.url), "utf8")

describe("app shortcut icon parity", () => {
	/** Each drawing element as `tag attributes`, so `<path d="…" />` and `<path d="…"/>` compare. */
	function shapes(markup: string): string[] {
		return [...markup.matchAll(/<(path|rect|circle)\s+([^>]*?)\s*\/>/g)].map(
			(m) => `${m[1]} ${m[2].replace(/\s+/g, " ")}`
		)
	}

	it.each(SHORTCUT_TABS)("draws the %s tab's own icon", (tab) => {
		const start = tabIcon.indexOf(`name === "${tab}" && (`)
		expect(start).toBeGreaterThanOrEqual(0)
		const fragment = tabIcon.slice(start, tabIcon.indexOf("</>", start))
		const svg = readFileSync(new URL(`../../assets/shortcut-${tab}.svg`, import.meta.url), "utf8")
		const glyph = svg.slice(svg.indexOf('<g transform="translate(12 12)"'), svg.lastIndexOf("</g>"))
		expect(shapes(fragment).length).toBeGreaterThan(0)
		expect(shapes(glyph)).toEqual(shapes(fragment))
		// The same stroke as the tab bar, on the 24-unit grid the tab icons are drawn on.
		expect(glyph).toContain('stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')
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

/** The favicon source without its scale wrapper — the wrapper is the only element the icon lacks. */
function withoutScaleWrapper(svg: string): string {
	const open = svg.indexOf("<g transform=")
	const close = svg.lastIndexOf("</g>")
	return (
		svg.slice(0, open) +
		svg.slice(svg.indexOf(">", open) + 1, close) +
		svg.slice(close + "</g>".length)
	)
}

describe("favicon source parity (Task 7 ruling)", () => {
	it("is the icon with the palm removed and nothing else changed", () => {
		expect(lines(withoutScaleWrapper(favicon))).toEqual(lines(withoutPalm(icon)))
	})

	it("scales the drawing up, so the mark carries at 16 px", () => {
		expect(Number(favicon.match(/scale\(([\d.]+)\)/)?.[1])).toBeGreaterThan(1)
	})

	it("keeps the scaled drawing inside the 512 box", () => {
		const m = favicon.match(/translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)/)
		const [tx, ty, s] = [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])]
		// Untransformed extents: the horizon bar is widest (96–416); the sun top and the bar bottom are the ends (86–412).
		const edges = [96 * s + tx, 416 * s + tx, 86 * s + ty, 412 * s + ty]
		for (const edge of edges) {
			expect(edge).toBeGreaterThanOrEqual(0)
			expect(edge).toBeLessThanOrEqual(512)
		}
	})

	it("drops the palm, which is noise at 16 px", () => {
		expect(favicon).not.toContain("<path")
		expect(paths(favicon)).toHaveLength(0)
	})
})
