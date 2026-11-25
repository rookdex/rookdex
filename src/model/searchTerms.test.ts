import { describe, expect, it } from "vitest"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import { ITEM_TERMS, missingTerms, SEARCH_TERMS } from "./searchTerms"
import { seedItems } from "./seed"

function groupLabels(bundle: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(bundle)
			.filter(([key]) => key.startsWith("group."))
			.map(([key, value]) => [key.slice("group.".length), value])
	)
}

describe("search terms (spec §3.2)", () => {
	it("cover every seed group with both of its labels", () => {
		const groups = [...new Set(seedItems.map((item) => item.group))]
		expect(groups.length).toBeGreaterThan(0)
		expect(
			missingTerms(groups, SEARCH_TERMS, { en: groupLabels(en), nb: groupLabels(nb) })
		).toEqual([])
	})

	it("report a group with no entry and an entry missing a label", () => {
		const labels = {
			en: { boats: "Boats", bikes: "Bikes" },
			nb: { boats: "Båter", bikes: "Sykler" },
		}
		expect(missingTerms(["boats", "bikes"], { boats: ["boat", "boats"] }, labels)).toEqual([
			'boats: no nb label "Båter"',
			"bikes: no terms",
		])
	})

	it("key item words by ids the seed holds, so a rename cannot drop them silently", () => {
		const ids = new Set(seedItems.map((item) => item.id))
		const keys = Object.keys(ITEM_TERMS)
		expect(keys.length).toBeGreaterThan(0)
		expect(keys.filter((id) => !ids.has(id))).toEqual([])
	})

	it("give every merged service item its own type words", () => {
		const service = seedItems.filter((item) => item.group === "service" && !item.retired)
		expect(service.length).toBeGreaterThan(0)
		expect(
			service.filter((item) => (ITEM_TERMS[item.id] ?? []).length === 0).map((item) => item.id)
		).toEqual([])
	})

	it("compare labels the way search does, ignoring case and accents", () => {
		const labels = { en: { boats: "Boats" }, nb: { boats: "Båter" } }
		expect(missingTerms(["boats"], { boats: ["BOATS", "bater"] }, labels)).toEqual([])
	})
})
