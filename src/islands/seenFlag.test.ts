import { afterEach, describe, expect, it, vi } from "vitest"
import {
	ACTIVE_PROFILE_KEY,
	activeProfileStorage,
	clearFlag,
	HIDE_FOUND_KEY,
	readFlag,
	writeFlag,
} from "./seenFlag"

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

describe("Hide found flag (tracker search spec §3.3)", () => {
	it("writes, reads and clears one key", () => {
		const map = new Map<string, string>()
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => map.get(key) ?? null,
			setItem: (key: string, value: string) => map.set(key, value),
			removeItem: (key: string) => map.delete(key),
		})
		expect(HIDE_FOUND_KEY).toBe("rookdex.hide-found")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		writeFlag(HIDE_FOUND_KEY)
		expect(map.get(HIDE_FOUND_KEY)).toBe("1")
		expect(readFlag(HIDE_FOUND_KEY)).toBe(true)
		clearFlag(HIDE_FOUND_KEY)
		expect(map.has(HIDE_FOUND_KEY)).toBe(false)
	})

	it("never throws when storage is blocked", () => {
		const blocked = () => {
			throw new Error("SecurityError")
		}
		vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked })
		expect(readFlag(HIDE_FOUND_KEY)).toBe(false)
		expect(() => clearFlag(HIDE_FOUND_KEY)).not.toThrow()
	})
})
