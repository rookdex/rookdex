import { describe, expect, it } from "vitest"
import { createTranslator } from "../lib/i18n/index.js"
import { prices } from "../model/prices"
import { hasKey, seedLabel, translator } from "./index"

const en = translator("en")
const nb = translator("nb")

describe("translator (locale spec §5.2)", () => {
	it("fills placeholders and leaves unknown ones visible", () => {
		expect(en.t("tracker.count", { done: 3, total: 9 })).toBe("3 of 9")
		expect(en.t("tracker.count")).toBe("{done} of {total}")
	})

	it("picks one and other by each language's plural rules", () => {
		expect(en.plural("hub.daysToGo", 1)).toBe("1 day to go")
		expect(en.plural("hub.daysToGo", 70)).toBe("70 days to go")
		expect(nb.plural("footer.daysToLaunch", 1)).toBe("1 dag til lansering")
		expect(nb.plural("footer.daysToLaunch", 0)).toBe("0 dager til lansering")
	})

	it("falls back to English for a key a bundle lacks (library contract)", () => {
		const fixture = createTranslator({ en: { a: "A" }, nb: {} })
		expect(fixture.t("nb", "a" as never)).toBe("A")
	})

	it("formats prices without .00, by language", () => {
		expect(nb.money(prices.standard)).toBe("949\u00a0kr")
		expect(nb.money(prices.ultimate)).toBe("1\u00a0189\u00a0kr")
		expect(nb.money({ amount: 949.5, currency: "NOK" })).toBe("949,50\u00a0kr")
		// Read off Node's Intl on 2026-10-02: "symbol" display shows the code abroad.
		expect(en.money(prices.standard)).toBe("NOK\u00a0949")
	})

	it("names languages by their autonym", () => {
		expect(en.displayName("en")).toBe("English")
		expect(en.displayName("nb")).toBe("Norsk bokmål")
		expect(nb.displayName("en")).toBe("English")
	})

	it("labels seed ids and shows an unknown id as itself", () => {
		expect(seedLabel(en.t, "category", "wildlife")).toBe("Wildlife")
		expect(seedLabel(nb.t, "group", "hidden-items")).toBe(nb.t("group.hidden-items"))
		expect(seedLabel(en.t, "group", "dragons")).toBe("dragons")
	})

	it("knows its keys", () => {
		expect(hasKey("hub.buyBody")).toBe(true)
		expect(hasKey("hub.nope")).toBe(false)
		expect(hasKey("constructor")).toBe(false)
	})

	it("types plural keys", () => {
		// @ts-expect-error hub.days has no .one/.other pair
		expect(en.plural("hub.days", 2)).toBe("hub.days.other")
	})
})
