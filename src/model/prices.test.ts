import { describe, expect, it } from "vitest"
import { PREFERENCES } from "../config/preferences"
import { prices } from "./prices"

describe("prices (locale spec §5.1)", () => {
	it("uses only currencies the project config lists", () => {
		for (const [id, price] of Object.entries(prices)) {
			expect(PREFERENCES.currencies, id).toContain(price.currency)
		}
	})
})
