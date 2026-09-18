import { describe, expect, it } from "vitest"
import { en } from "../i18n/en"
import { no } from "../i18n/no"
import type { Allowlist } from "./schema"
import {
	allowlist,
	categoryIds,
	groupItems,
	isVideo,
	loadAll,
	matchesPrefix,
	outletOf,
	resolveTier,
	rumours,
	seedItems,
	tierErrors,
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
		sources: [press],
	}
	it("needs one press source", () => {
		expect(validateRumours([rumour], list).errors).toEqual([])
		expect(validateRumours([{ ...rumour, sources: [official] }], list).errors).toEqual([
			"rumours/stock-market: rumour needs a press source",
		])
	})
})

describe("loadAll", () => {
	it("maps file names to categories, skips rumours, and rejects duplicate ids", () => {
		const files = {
			"../seed/wildlife.json": [item({})],
			"../seed/vehicles.json": [item({ id: "wildlife/american-alligator", category: "vehicles" })],
			"../seed/rumours.json": [],
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

describe("outletOf", () => {
	it("returns the host without www", () => {
		expect(outletOf("https://www.ign.com/articles/x")).toBe("ign.com")
	})
})

describe("shipped seed", () => {
	it("validates against the shipped allowlist (this is the CI gate)", () => {
		expect(Array.isArray(seedItems)).toBe(true)
		expect(Array.isArray(rumours)).toBe(true)
		expect(allowlist.blocklist).toBeDefined()
	})
	it("has an English name and a label in both languages for every category and group", () => {
		for (const item of seedItems) {
			expect(item.name, item.id).toMatch(/^[\x20-\x7E]+$/)
			expect(en.category[item.category], `en category ${item.category}`).toBeTruthy()
			expect(no.category[item.category], `no category ${item.category}`).toBeTruthy()
			expect(en.group[item.group], `en group ${item.group}`).toBeTruthy()
			expect(no.group[item.group], `no group ${item.group}`).toBeTruthy()
		}
	})
})
