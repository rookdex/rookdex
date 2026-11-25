import { describe, expect, it } from "vitest"
import { locales } from "../i18n/locales"
import en from "../locales/en.json"
import nb from "../locales/nb.json"
import type { Allowlist } from "./schema"
import {
	allowlist,
	categoryIds,
	facts,
	matchesPrefix,
	resolveTier,
	rumours,
	seedItems,
	validateFacts,
	validateRumours,
} from "./seed"
import { sortKey } from "./seedBuild"

const list: Allowlist = {
	official: ["rockstargames.com", "youtube.com/@RockstarGames/"],
	press: ["ign.com"],
	blocklist: ["leaksite.example"],
}
const official = { url: "https://www.rockstargames.com/VI", title: "GTA VI site" }
const trailer = { url: "https://www.youtube.com/@RockstarGames/videos", title: "Trailer 1" }
const press = { url: "https://nordic.ign.com/gta-6/1", title: "IGN on wildlife" }

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

describe("shipped seed", () => {
	it("validates against the shipped allowlist (this is the CI gate)", () => {
		expect(Array.isArray(seedItems)).toBe(true)
		expect(Array.isArray(rumours)).toBe(true)
		expect(facts.length).toBeGreaterThan(0)
		expect(allowlist.blocklist).toBeDefined()
	})
	it("finds the four renamed vehicles by their old names (#149)", () => {
		const byAlias = (alias: string) => seedItems.find((i) => i.aliases?.includes(alias))?.name
		expect(byAlias("Pegassi Zorrusso")).toBe("Granforma Zorrusso")
		expect(byAlias("Brute Ambulance")).toBe("Interstate Ambulance")
		expect(byAlias("Western Zombie Chopper")).toBe("Western Zombie Bobber")
		expect(byAlias("Vapid Ganado")).toBe("'70 Vapid Ganado")
	})
	it("follows categories.json and keeps every shipped id", () => {
		expect(categoryIds(seedItems)).toEqual([
			"vehicles",
			"animals",
			"collections",
			"activities",
			"places",
		])
		expect(seedItems).toHaveLength(216)
		expect(seedItems.find((i) => i.id === "wildlife/pelican")).toMatchObject({
			category: "animals",
			group: "birds",
		})
		expect(seedItems.find((i) => i.id === "collectibles/stunt-jumps")).toMatchObject({
			category: "activities",
			group: "stunts",
		})
	})
	it("sorts '70 Vapid Ganado under V, not at the top", () => {
		const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })
		const names = seedItems.filter((i) => i.group === "cars").map((i) => i.name)
		const ganado = names.indexOf("'70 Vapid Ganado")
		expect(ganado).toBeGreaterThan(0)
		expect(collator.compare(sortKey(names[ganado - 1]), "Vapid Ganado")).toBeLessThan(0)
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
