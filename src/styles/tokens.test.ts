import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const srcDir = fileURLToPath(new URL("../", import.meta.url))
const tokensCss = readFileSync(join(srcDir, "styles/tokens.css"), "utf8")

/** Files under src/ with one of the extensions, as posix paths relative to src/. */
function srcFiles(extensions: string[]): string[] {
	return readdirSync(srcDir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
		.map((entry) => relative(srcDir, join(entry.parentPath, entry.name)).split(sep).join("/"))
		.sort()
}

function tokenValue(name: string): string {
	const match = tokensCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6});`))
	if (!match) throw new Error(`${name} is not a hex token in tokens.css`)
	return match[1]
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
	const channel = (offset: number) => {
		const v = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

describe("token set (spec §4.1)", () => {
	it("declares exactly the brand tokens, each once, the glow pair twice", () => {
		const counts: Record<string, number> = {}
		for (const match of tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) {
			counts[match[1]] = (counts[match[1]] ?? 0) + 1
		}
		expect(counts).toEqual({
			"--bg": 1,
			"--bg-raised": 1,
			"--border": 1,
			"--text": 1,
			"--text-muted": 1,
			"--accent": 1,
			"--accent-text": 1,
			"--accent-2": 1,
			"--gradient": 1,
			"--link": 1,
			"--tier-confirmed": 1,
			"--tier-expected": 1,
			"--glow": 2,
			"--glow-filter": 2,
			"--font-sans": 1,
			"--font-heading": 1,
			"--font-display": 1,
			"--space-1": 1,
			"--space-2": 1,
			"--space-3": 1,
			"--space-4": 1,
			"--space-5": 1,
			"--space-6": 1,
			"--radius": 1,
			"--measure": 1,
			"--tap": 1,
		})
	})

	it("clears both glow tokens under reduced motion", () => {
		expect(tokensCss).toMatch(
			/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{\s*--glow: none;\s*--glow-filter: none;\s*\}\s*\}/
		)
	})

	it("is the only file that declares tokens on :root", () => {
		const others = srcFiles([".css", ".astro"]).filter((f) => f !== "styles/tokens.css")
		for (const file of others) {
			expect(readFileSync(join(srcDir, file), "utf8"), file).not.toContain(":root")
		}
	})
})

describe("no raw hex outside tokens.css (spec §13.1)", () => {
	const themeColorLine = '<meta name="theme-color" content="#000000" />'

	it("scans css, astro and tsx under src/", () => {
		const files = srcFiles([".css", ".astro", ".tsx"]).filter((f) => f !== "styles/tokens.css")
		expect(files.length).toBeGreaterThan(10)
		for (const file of files) {
			let text = readFileSync(join(srcDir, file), "utf8")
			if (file === "layouts/Base.astro") {
				expect(text, "the theme-color line must stay literal").toContain(themeColorLine)
				text = text.replace(themeColorLine, "")
			}
			expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
		}
	})
})

describe("contrast (spec §4.3)", () => {
	it.each([
		["--text", "--bg", 7],
		["--text-muted", "--bg", 7],
		["--text-muted", "--bg-raised", 7],
		["--accent", "--bg", 4.5],
		["--accent", "--bg-raised", 4.5],
		["--accent-text", "--accent", 4.5],
		["--accent", "--border", 3],
		["--link", "--bg", 7],
		["--link", "--bg-raised", 7],
		["--accent-2", "--bg", 4.5],
	])("%s on %s is at least %s:1", (fg, bg, minimum) => {
		expect(contrast(tokenValue(fg), tokenValue(bg))).toBeGreaterThanOrEqual(minimum)
	})
})
