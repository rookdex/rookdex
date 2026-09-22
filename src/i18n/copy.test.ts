import { describe, expect, it } from "vitest"
import { en } from "./en"
import { no } from "./no"

/** Every string value with its path, walking nested objects (spec §13.6: values, not file text). */
function strings(value: unknown, path: string): [string, string][] {
	if (typeof value === "string") return [[path, value]]
	if (value && typeof value === "object") {
		return Object.entries(value).flatMap(([key, v]) => strings(v, `${path}.${key}`))
	}
	return []
}

const all = [...strings(en, "en"), ...strings(no, "no")]

describe("copy rules (spec §9)", () => {
	it("walks a real number of strings", () => {
		expect(all.length).toBeGreaterThan(150)
	})

	it.each(all)("%s keeps the tier vocabulary and the tone", (_path, text) => {
		// Word boundaries: "bleak" is fine, "leak" is not. "lekk" covers lekk/lekket in Norwegian.
		expect(text).not.toMatch(/\b(leak|leaked|lekk)\b/i)
		expect(text).not.toContain("!")
		// One capital in prose; all caps belongs to the wordmark only, and that is markup, not a string.
		expect(text).not.toContain("ROOKDEX")
	})
})
