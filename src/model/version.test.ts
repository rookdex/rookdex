import { describe, expect, it } from "vitest"
import { appVersion } from "./version"

describe("appVersion (spec §7.3)", () => {
	it("joins the package version and the short commit", () => {
		expect(appVersion("0.1.0", "3b4dd8e0c1f2a3b4c5d6e7f8091a2b3c4d5e6f70")).toBe("0.1.0 · 3b4dd8e")
	})

	it("says dev when the build has no commit", () => {
		expect(appVersion("0.1.0", undefined)).toBe("0.1.0 · dev")
		expect(appVersion("0.1.0", "")).toBe("0.1.0 · dev")
	})
})
