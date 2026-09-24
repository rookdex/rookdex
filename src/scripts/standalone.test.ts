import { describe, expect, it } from "vitest"
import { isStandalone } from "./standalone"

describe("isStandalone (spec §4)", () => {
	it("is true when display-mode: standalone matches", () => {
		const win = {
			matchMedia: (query: string) => ({ matches: query === "(display-mode: standalone)" }),
			navigator: {},
		}
		expect(isStandalone(win)).toBe(true)
	})

	it("is true on iOS home-screen mode, without the media query matching", () => {
		const win = {
			matchMedia: () => ({ matches: false }),
			navigator: { standalone: true },
		}
		expect(isStandalone(win)).toBe(true)
	})

	it("is false in an ordinary browser tab", () => {
		const win = {
			matchMedia: () => ({ matches: false }),
			navigator: {},
		}
		expect(isStandalone(win)).toBe(false)
	})
})
