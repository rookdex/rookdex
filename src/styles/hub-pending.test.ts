import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { HUB_PENDING_ATTR } from "../model/hub-prepaint"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8")

describe("the hub's pending style (model/hub-prepaint.ts)", () => {
	it("hides the hub with visibility only, so its space stays reserved and nothing shifts", () => {
		const rule = new RegExp(`\\[${HUB_PENDING_ATTR}\\]\\s+\\.hub-live\\s*\\{([^}]*)\\}`).exec(css)
		expect(rule?.[1].trim()).toBe("visibility: hidden;")
	})
})
