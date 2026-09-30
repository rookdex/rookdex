import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8")

/** Top-level rules as [prelude, body] pairs, comments removed. */
function topLevel(text: string): [string, string][] {
	const source = text.replace(/\/\*[\s\S]*?\*\//g, "")
	const rules: [string, string][] = []
	let depth = 0
	let start = 0
	let open = 0
	for (let i = 0; i < source.length; i++) {
		if (source[i] === "{") {
			if (depth === 0) open = i
			depth++
		} else if (source[i] === "}") {
			depth--
			if (depth === 0) {
				rules.push([source.slice(start, open).trim(), source.slice(open + 1, i)])
				start = i + 1
			}
		}
	}
	return rules
}

describe("hover and focus rules (feedback spec §3.2)", () => {
	it("keeps every :hover rule behind (hover: hover), so touch never sticks", () => {
		const outside = topLevel(css).filter(
			([prelude, body]) =>
				!prelude.startsWith("@media (hover: hover)") && `${prelude}${body}`.includes(":hover")
		)
		expect(outside.map(([prelude]) => prelude)).toEqual([])
	})

	it("uses the --bg-hover token instead of hover colours mixed by hand", () => {
		expect(css).not.toContain("var(--text) 9%")
		expect(css).toContain("var(--bg-hover)")
	})

	it("switches every transition off under reduced motion", () => {
		const reduced = topLevel(css).filter(([prelude]) =>
			prelude.startsWith("@media (prefers-reduced-motion: reduce)")
		)
		// The universal rule, not any rule: `.bar-fill` already has `transition: none` today.
		const universal = /\*,\s*\*::before,\s*\*::after\s*\{\s*transition: none !important;/
		expect(reduced.some(([, body]) => universal.test(body))).toBe(true)
	})
})
