import { describe, expect, it } from "vitest"
import { isRockstarUrl, MAP_LINK } from "./map-link"

describe("MAP_LINK (desktop dashboard spec §4.7)", () => {
	it("ships an https link on rockstargames.com", () => {
		expect(isRockstarUrl(MAP_LINK.url)).toBe(true)
	})

	it.each([
		"http://www.rockstargames.com/VI",
		"https://rockstargames.com.evil.example/VI",
		"https://evilrockstargames.com/VI",
		"https://www.rockstargames.co/VI",
		"javascript:alert(1)",
		"not a url",
	])("rejects %s", (url) => {
		expect(isRockstarUrl(url)).toBe(false)
	})

	it("accepts the bare domain and its subdomains", () => {
		expect(isRockstarUrl("https://rockstargames.com/")).toBe(true)
		expect(isRockstarUrl("https://www.rockstargames.com/VI")).toBe(true)
	})
})
