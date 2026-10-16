import { afterEach, describe, expect, it, vi } from "vitest"
import { ACTIVE_PROFILE_KEY, activeProfileStorage } from "./seenFlag"

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("activeProfileStorage (dashboard spec §5)", () => {
	it("reads and writes one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
		})
		expect(ACTIVE_PROFILE_KEY).toBe("rookdex.active-profile")
		expect(activeProfileStorage.read()).toBeNull()
		activeProfileStorage.write("p1")
		expect(map.get(ACTIVE_PROFILE_KEY)).toBe("p1")
		expect(activeProfileStorage.read()).toBe("p1")
	})

	it("reads null and writes nothing when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked })
		expect(activeProfileStorage.read()).toBeNull()
		expect(() => activeProfileStorage.write("p1")).not.toThrow()
	})
})
