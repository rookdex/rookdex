import { describe, expect, it } from "vitest"
import type { Allowlist, ItemSource, SeedItem } from "./schema"
import {
	confirmedItemErrors,
	officialErrors,
	pressEntry,
	tierErrors,
	tierItemSources,
} from "./tiers"

const list: Allowlist = {
	official: ["rockstargames.com", "youtube.com/@RockstarGames/"],
	press: ["ign.com", "gamesradar.com"],
	blocklist: ["leaksite.example"],
}
const official = {
	url: "https://www.rockstargames.com/VI",
	title: "GTA VI site",
	tier: "official" as const,
}
const trailer = {
	url: "https://www.youtube.com/@RockstarGames/videos",
	title: "Trailer 1",
	tier: "official" as const,
}
const ign = { url: "https://www.ign.com/gta-6/1", title: "IGN guide", tier: "press" as const }
const ignBare = { url: "https://ign.com/gta-6/3", title: "IGN", tier: "press" as const }
const ignNordic = {
	url: "https://nordic.ign.com/gta-6/2",
	title: "IGN Nordic",
	tier: "press" as const,
}
const radar = {
	url: "https://www.gamesradar.com/gta-6/1",
	title: "GamesRadar guide",
	tier: "press" as const,
}
const game = { kind: "game" as const, screen: ["Progress", "Vehicles", "Cars"] }

function item(sources: ItemSource[], overrides: Partial<SeedItem> = {}): SeedItem {
	return {
		id: "vehicles/a",
		category: "vehicles",
		group: "cars",
		name: "A",
		status: "confirmed",
		sources,
		...overrides,
	}
}

describe("officialErrors (facts and the old item rule)", () => {
	it("needs an official source, and a video alone needs press too", () => {
		expect(officialErrors("x/a", [official])).toEqual([])
		expect(officialErrors("x/a", [ign])).toEqual(["x/a: confirmed needs an official source"])
		expect(officialErrors("x/a", [trailer])).toHaveLength(1)
		expect(officialErrors("x/a", [trailer, ign])).toEqual([])
	})
})

describe("pressEntry", () => {
	it("names the first press entry that covers the url, subdomains included", () => {
		expect(pressEntry(ign.url, list)).toBe("ign.com")
		expect(pressEntry(ignNordic.url, list)).toBe("ign.com")
		expect(pressEntry(radar.url, list)).toBe("gamesradar.com")
		expect(pressEntry(official.url, list)).toBeUndefined()
	})
})

describe("confirmedItemErrors (category model spec §9)", () => {
	const pairError =
		/vehicles\/a: confirmed needs an official source, a game screen or two press sources/
	it("accepts a game screen on its own", () => {
		expect(confirmedItemErrors("vehicles/a", [game], list)).toEqual([])
	})
	it("accepts two press sources on different allowlist entries", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, radar], list)).toEqual([])
	})
	it("rejects two press sources under one allowlist entry, even on different hosts", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, ignNordic], list).join()).toMatch(pairError)
	})
	it("rejects www.ign.com and ign.com as one entry", () => {
		expect(confirmedItemErrors("vehicles/a", [ign, ignBare], list).join()).toMatch(pairError)
	})
	it("keeps the official rule for items that already ship", () => {
		expect(confirmedItemErrors("vehicles/a", [official], list)).toEqual([])
		expect(confirmedItemErrors("vehicles/a", [trailer, ign], list)).toEqual([])
		expect(confirmedItemErrors("vehicles/a", [trailer], list).join()).toMatch(/video-only/)
	})
})

describe("tierErrors", () => {
	it("expected needs a precedent", () => {
		expect(tierErrors(item([ign], { status: "expected" }), list)).toEqual([
			"vehicles/a: expected needs a precedent",
		])
		expect(tierErrors(item([ign], { status: "expected", precedent: "GTA V" }), list)).toEqual([])
	})
})

describe("tierItemSources", () => {
	it("passes a game source through and tiers url sources", () => {
		const result = tierItemSources(
			"vehicles/a",
			[game, { url: "https://www.ign.com/x", title: "IGN" }],
			list
		)
		expect(result.errors).toEqual([])
		expect(result.sources).toEqual([
			game,
			{ url: "https://www.ign.com/x", title: "IGN", tier: "press" },
		])
	})
	it("reports blocked and unlisted hosts", () => {
		const result = tierItemSources(
			"vehicles/a",
			[
				{ url: "https://leaksite.example/x", title: "Leak" },
				{ url: "https://example.com/x", title: "Other" },
			],
			list
		)
		expect(result.errors).toEqual([
			"vehicles/a: source https://leaksite.example/x is blocked",
			"vehicles/a: source https://example.com/x is unlisted",
		])
	})
})
