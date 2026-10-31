import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	""
)

/** The first `@media <query> {` block at or after `from`, braces balanced. */
function mediaBlock(query: string, from = 0): string {
	const start = css.indexOf(`@media ${query} {`, from)
	if (start < 0) return ""
	let depth = 0
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++
		else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1)
	}
	return ""
}

/** Every `@media <query> {` block, in source order. */
function mediaBlocks(query: string): string[] {
	const blocks: string[] = []
	for (let block = mediaBlock(query); block; ) {
		blocks.push(block)
		block = mediaBlock(query, css.indexOf(block) + block.length)
	}
	return blocks
}

describe("search row CSS (tracker search spec §5)", () => {
	it("is sticky only where the screen is at least 500 px tall", () => {
		const tall = mediaBlock("(min-height: 500px)")
		expect(tall).toMatch(/\.search-row\s*\{[^}]*position:\s*sticky/)
		expect(tall).toMatch(/scroll-padding-top:[^;]*var\(--search-row-h\)/)
		expect(css.replace(tall, "")).not.toMatch(/position:\s*sticky/)
	})

	// On html, not on the row: scroll-padding-top is read from html and custom properties only
	// inherit downwards, so a declaration on the row would leave the padding at 0.
	it("declares the row height once, where html can read it", () => {
		expect(css).toMatch(/html:has\(\.search-row\)\s*\{[^}]*--search-row-h:/)
		expect(css.match(/--search-row-h:/g)).toHaveLength(1)
	})

	it("sits in a flex column, so stickiness reaches the end of the list", () => {
		expect(css).toMatch(/\.tracker-main\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/)
	})

	it("lifts the profile menu above the sticky row", () => {
		expect(css).toMatch(/\.menu\s*\{[^}]*z-index:\s*8/)
	})

	it("hides the browser's own clear button and keeps the placeholder opaque", () => {
		expect(css).toMatch(/::-webkit-search-cancel-button\s*\{[^}]*appearance:\s*none/)
		expect(css).toMatch(/::placeholder\s*\{[^}]*color:\s*var\(--text-muted\)[^}]*opacity:\s*1/)
	})

	it("wraps a long unbroken query inside the empty-state message", () => {
		expect(css).toMatch(/\.item-empty\s*\{[^}]*overflow-wrap:\s*anywhere/)
	})

	// forced-color-adjust: none also keeps the authored light outline, which vanishes on a light
	// high-contrast theme, so the focus ring gets a system colour of its own.
	it("marks pressed chips and the toggle in forced colours, focus ring included", () => {
		const pressed = '.tracker .search-toggle[aria-pressed="true"]'
		const block = mediaBlocks("(forced-colors: active)").find((b) => b.includes(pressed)) ?? ""
		expect(block).toMatch(
			/\.chips button\[aria-pressed="true"\],\s*\.tracker \.search-toggle\[aria-pressed="true"\]\s*\{[^}]*background:\s*Highlight/
		)
		expect(block).toMatch(
			/\.chips button\[aria-pressed="true"\]:focus-visible,\s*\.tracker \.search-toggle\[aria-pressed="true"\]:focus-visible\s*\{[^}]*outline-color:\s*CanvasText/
		)
	})

	it("hides the toggle label on phones and restores it from 768 px", () => {
		const wide = mediaBlock("(min-width: 768px)")
		const base = css.replace(wide, "")
		expect(base).toMatch(
			/\.search-toggle-label\s*\{[^}]*position:\s*absolute[^}]*clip-path:\s*inset\(50%\)/
		)
		expect(base).toMatch(/\.search-count::before\s*\{[^}]*content:\s*none/)
		expect(wide).toMatch(/\.search-toggle-label\s*\{[^}]*position:\s*static[^}]*clip-path:\s*none/)
		expect(wide).toMatch(/\.search-count::before\s*\{[^}]*content:\s*"· " \/ ""/)
	})

	it("adds no max-width queries", () => {
		expect(css).not.toMatch(/@media[^{]*max-width[^{]*\{[^}]*search/)
	})
})
