import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import { hasPrice } from "../test/price-patterns"
import { locales } from "./locales"

type Bundle = Record<string, string>

/** Every way a set of bundles breaks the standard's §7.2 rules, as readable messages. */
function bundleProblems(bundles: Record<string, Bundle>): string[] {
	const problems: string[] = []
	const all = new Set(Object.values(bundles).flatMap((bundle) => Object.keys(bundle)))
	for (const [lang, bundle] of Object.entries(bundles)) {
		for (const key of all) {
			if (!Object.hasOwn(bundle, key)) problems.push(`${lang} is missing ${key}`)
			else if (!bundle[key].trim()) problems.push(`${lang}.${key} is empty`)
		}
		for (const key of Object.keys(bundle)) {
			const base = key.replace(/\.(one|other)$/, "")
			if (base === key) continue
			for (const form of ["one", "other"]) {
				if (!Object.hasOwn(bundle, `${base}.${form}`)) {
					problems.push(`${lang} has ${key} without ${base}.${form}`)
				}
			}
		}
	}
	return problems
}

describe("bundle parity (locale spec §5.5)", () => {
	it("matches the locale list in astro.config.mjs", () => {
		const config = readFileSync(new URL("../../astro.config.mjs", import.meta.url), "utf8")
		expect(config).toContain(`const locales = ${JSON.stringify([...locales]).replace(",", ", ")}`)
	})

	it("en and nb carry the same keys, none empty, plurals complete", () => {
		expect(bundleProblems({ en, nb })).toEqual([])
	})

	it("goes red on a missing key, an empty value and a half plural", () => {
		expect(bundleProblems({ en: { a: "A", b: "B" }, nb: { a: "A" } })).toEqual(["nb is missing b"])
		expect(bundleProblems({ en: { a: "A" }, nb: { a: " " } })).toEqual(["nb.a is empty"])
		expect(bundleProblems({ en: { "x.one": "1" }, nb: { "x.one": "1" } })).toEqual([
			"en has x.one without x.other",
			"nb has x.one without x.other",
		])
	})
})

describe("no prices in copy (locale spec §5.5, standard §13)", () => {
	it.each([
		"949 kr",
		"1 189 kr",
		"949\u00a0kr",
		"949 NOK",
		"NOK 949",
		"NOK\u00a0949",
		"€5",
		"5 kroner",
		"kr. 949",
		"949,-",
	])("flags %s", (text) => {
		expect(hasPrice(text)).toBe(true)
	})

	it.each([
		"{price}",
		"{price:standard}",
		"The standard digital edition is {standard}.",
		"19 Nov 2026",
		"That file is larger than 5 MB.",
		"Give the profile a name of 1 to 40 characters.",
		"30 sekunder",
		"2 europeiske land",
	])("passes %s", (text) => {
		expect(hasPrice(text)).toBe(false)
	})

	it.each([
		["en", en],
		["nb", nb],
	] as const)("%s has no price in any value", (_lang, bundle) => {
		const priced = Object.entries(bundle).filter(([, value]) => hasPrice(value))
		expect(priced).toEqual([])
	})
})
