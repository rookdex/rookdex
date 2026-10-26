import { describe, expect, it } from "vitest"
import { locales } from "../i18n/locales"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import type { Allowlist } from "./schema"
import {
	allowlist,
	categoryIds,
	facts,
	groupItems,
	isVideo,
	loadAll,
	matchesPrefix,
	resolveTier,
	rumours,
	seedItems,
	tierErrors,
	validateFacts,
	validateRumours,
	validateSeedFile,
} from "./seed"

const list: Allowlist = {
	official: ["rockstargames.com", "youtube.com/@RockstarGames/"],
	press: ["ign.com"],
	blocklist: ["leaksite.example"],
}
const official = { url: "https://www.rockstargames.com/VI", title: "GTA VI site" }
const trailer = { url: "https://www.youtube.com/@RockstarGames/videos", title: "Trailer 1" }
const press = { url: "https://nordic.ign.com/gta-6/1", title: "IGN on wildlife" }

function item(overrides: Record<string, unknown>) {
	return {
		id: "wildlife/american-alligator",
		category: "wildlife",
		group: "reptiles",
		name: "American alligator",
		status: "confirmed",
		sources: [official],
		...overrides,
	}
}

describe("matchesPrefix", () => {
	it("bare domain covers www and subdomains, case-insensitively", () => {
		expect(matchesPrefix(new URL("https://www.IGN.com/a"), "ign.com")).toBe(true)
		expect(matchesPrefix(new URL("https://nordic.ign.com/a"), "ign.com")).toBe(true)
		expect(matchesPrefix(new URL("https://notign.com/a"), "ign.com")).toBe(false)
	})
	it("a prefix with a path covers that path only", () => {
		const prefix = "youtube.com/@RockstarGames/"
		expect(matchesPrefix(new URL("https://www.youtube.com/@rockstargames/videos"), prefix)).toBe(
			true
		)
		expect(matchesPrefix(new URL("https://www.youtube.com/@someoneelse/videos"), prefix)).toBe(
			false
		)
	})
	it("a prefix with a query names one exact page, which is how a trailer gets allowlisted", () => {
		const prefix = "youtube.com/watch?v=abc123"
		expect(matchesPrefix(new URL("https://www.youtube.com/watch?v=abc123"), prefix)).toBe(true)
		expect(matchesPrefix(new URL("https://www.youtube.com/watch?v=abc123&t=5"), prefix)).toBe(true)
		expect(matchesPrefix(new URL("https://www.youtube.com/watch?v=abc1234"), prefix)).toBe(false)
		expect(matchesPrefix(new URL("https://www.youtube.com/watch?v=other"), prefix)).toBe(false)
	})
})

describe("resolveTier", () => {
	it("derives official, press, blocked and unlisted", () => {
		expect(resolveTier(official.url, list)).toBe("official")
		expect(resolveTier(press.url, list)).toBe("press")
		expect(resolveTier("https://leaksite.example/dump", list)).toBe("blocked")
		expect(resolveTier("https://random.example/post", list)).toBe("unlisted")
	})
	it("blocklist wins over an allow entry", () => {
		const both = { ...list, blocklist: ["ign.com"] }
		expect(resolveTier(press.url, both)).toBe("blocked")
	})
})

describe("tier rules", () => {
	it("confirmed needs an official source", () => {
		const { errors } = validateSeedFile("wildlife", [item({ sources: [press] })], list)
		expect(errors).toEqual(["wildlife/american-alligator: confirmed needs an official source"])
	})
	it("a video-only official source needs a press source naming the item", () => {
		expect(isVideo(trailer.url)).toBe(true)
		const only = validateSeedFile("wildlife", [item({ sources: [trailer] })], list)
		expect(only.errors[0]).toMatch(/video-only/)
		const both = validateSeedFile("wildlife", [item({ sources: [trailer, press] })], list)
		expect(both.errors).toEqual([])
	})
	it("expected needs a precedent", () => {
		const { errors } = validateSeedFile(
			"wildlife",
			[item({ status: "expected", sources: [press] })],
			list
		)
		expect(errors).toEqual(["wildlife/american-alligator: expected needs a precedent"])
		const ok = validateSeedFile(
			"wildlife",
			[item({ status: "expected", precedent: "GTA V", sources: [press] })],
			list
		)
		expect(ok.errors).toEqual([])
		expect(tierErrors(ok.items[0])).toEqual([])
	})
	it("rejects blocked and unlisted sources", () => {
		const { errors } = validateSeedFile(
			"wildlife",
			[item({ sources: [official, { url: "https://leaksite.example/x", title: "Dump" }] })],
			list
		)
		expect(errors).toEqual([
			"wildlife/american-alligator: source https://leaksite.example/x is blocked",
		])
	})
})

describe("validateSeedFile", () => {
	it("attaches tiers to valid items", () => {
		const { items, errors } = validateSeedFile("wildlife", [item({})], list)
		expect(errors).toEqual([])
		expect(items[0].sources[0].tier).toBe("official")
	})
	it("reports schema errors with the path", () => {
		const { errors } = validateSeedFile("wildlife", [item({ name: "<b>Gator</b>" })], list)
		expect(errors[0]).toMatch(/^wildlife\[0\]\.name: /)
	})
	it("requires category and id prefix to match the file", () => {
		const { errors } = validateSeedFile("vehicles", [item({})], list)
		expect(errors).toContain("wildlife/american-alligator: category must be vehicles")
		expect(errors).toContain("wildlife/american-alligator: id must start with vehicles/")
	})
})

describe("validateRumours", () => {
	const rumour = {
		id: "rumours/stock-market",
		name: "Stock market",
		claim_key: "stock-market",
		summary: "A returning stock market has been reported.",
		added: "2026-09-18",
		sources: [press],
	}
	it("needs one press source", () => {
		expect(validateRumours([rumour], list).errors).toEqual([])
		expect(validateRumours([{ ...rumour, sources: [official] }], list).errors).toEqual([
			"rumours/stock-market: rumour needs a press source",
		])
	})

	it("needs an added date as YYYY-MM-DD (dashboard spec §6.3)", () => {
		const { added: _added, ...undated } = rumour
		expect(validateRumours([undated], list).errors).not.toEqual([])
		expect(validateRumours([{ ...rumour, added: "18.09.2026" }], list).errors).not.toEqual([])
		expect(validateRumours([{ ...rumour, added: "2026-02-30" }], list).errors).not.toEqual([])
	})
})

describe("validateFacts", () => {
	const fact = {
		id: "facts/stock-market",
		claim_key: "stock-market",
		name: { en: "Stock market", nb: "Aksjemarked" },
		summary: { en: "Rockstar confirmed a stock market.", nb: "Rockstar bekreftet et aksjemarked." },
		announced: "2026-10-15",
		sources: [official],
	}
	it("needs an official source, like a confirmed item (spec §4)", () => {
		expect(validateFacts([fact], list).errors).toEqual([])
		expect(validateFacts([{ ...fact, sources: [press] }], list).errors).toEqual([
			"facts/stock-market: confirmed needs an official source",
		])
	})
	it("needs a press source next to an official video", () => {
		expect(validateFacts([{ ...fact, sources: [trailer] }], list).errors).toEqual([
			"facts/stock-market: video-only official source needs a press source naming the item",
		])
		expect(validateFacts([{ ...fact, sources: [trailer, press] }], list).errors).toEqual([])
	})
	it("needs both languages and an announced date as YYYY-MM-DD", () => {
		expect(validateFacts([{ ...fact, name: { en: "Stock market" } }], list).errors).not.toEqual([])
		expect(validateFacts([{ ...fact, announced: "15.10.2026" }], list).errors).not.toEqual([])
	})
})

describe("loadAll", () => {
	it("maps file names to categories, skips rumours, and rejects duplicate ids", () => {
		const files = {
			"../seed/wildlife.json": [item({})],
			"../seed/vehicles.json": [item({ id: "wildlife/american-alligator", category: "vehicles" })],
			"../seed/rumours.json": [],
			"../seed/facts.json": [],
		}
		const result = loadAll(files, list)
		expect(result.errors).toContain("duplicate id wildlife/american-alligator")
		expect(result.errors).toContain("wildlife/american-alligator: id must start with vehicles/")
	})
	it("orders categories alphabetically and groups items", () => {
		const files = {
			"../seed/wildlife.json": [item({})],
			"../seed/vehicles.json": [
				item({ id: "vehicles/bike", category: "vehicles", group: "bikes", name: "Bike" }),
			],
		}
		const { items, errors } = loadAll(files, list)
		expect(errors).toEqual([])
		expect(categoryIds(items)).toEqual(["vehicles", "wildlife"])
		expect([...groupItems(items).keys()]).toEqual(["bikes", "reptiles"])
	})
})

describe("shipped seed", () => {
	it("validates against the shipped allowlist (this is the CI gate)", () => {
		expect(Array.isArray(seedItems)).toBe(true)
		expect(Array.isArray(rumours)).toBe(true)
		expect(facts.length).toBeGreaterThan(0)
		expect(allowlist.blocklist).toBeDefined()
	})
	it("has an English name and a label in both languages for every category and group", () => {
		for (const item of seedItems) {
			expect(item.name, item.id).toMatch(/^[\x20-\x7E]+$/)
			for (const [lang, bundle] of [
				["en", en],
				["nb", nb],
			] as const) {
				const keys = bundle as Record<string, string>
				expect(keys[`category.${item.category}`], `${lang} category ${item.category}`).toBeTruthy()
				expect(keys[`group.${item.group}`], `${lang} group ${item.group}`).toBeTruthy()
			}
		}
	})
	it("writes every fact in every shipped language", () => {
		for (const fact of facts) {
			expect(Object.keys(fact.name).sort(), fact.id).toEqual([...locales].sort())
			expect(Object.keys(fact.summary).sort(), fact.id).toEqual([...locales].sort())
		}
	})
	it("keeps brand tokens out of item, rumour and fact ids (whole segment only)", () => {
		const banned = ["gta", "gta6", "gtavi", "rockstar", "leonida", "vice"]
		for (const { id } of [...seedItems, ...rumours, ...facts]) {
			for (const segment of id.split(/[/-]/)) {
				expect(banned, id).not.toContain(segment)
			}
		}
	})
})
