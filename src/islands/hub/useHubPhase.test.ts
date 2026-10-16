// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { overrideAllowed, useHubPhase, wantsAfter } from "./useHubPhase"

const built = new Date("2026-09-10T10:00:00Z")

describe("where ?phase=after may count (dashboard spec §3)", () => {
	it.each([
		["localhost", false, true],
		["127.0.0.1", false, true],
		["rookdex-preview.malin.workers.dev", false, true],
		["rookdex.app", false, false],
		["workers.dev.example.com", false, false],
		["notworkers.dev", false, false],
		["rookdex.app", true, true],
	])("%s (dev %s) allows it: %s", (host, dev, allowed) => {
		expect(overrideAllowed(host, dev)).toBe(allowed)
	})

	it.each([
		["?phase=after", true],
		["?phase=AFTER", false],
		["?phase=after%20", false],
		["?phase=after&phase=before", false],
		["?phase=after&phase=after", false],
		["?phase=", false],
		["", false],
	])("%s asks for the after state: %s", (search, wanted) => {
		expect(wantsAfter(search)).toBe(wanted)
	})
})

describe("useHubPhase", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		window.history.replaceState(null, "", "/en/")
	})
	afterEach(() => {
		vi.useRealTimers()
		window.history.replaceState(null, "", "/")
	})

	it("starts on the build clock, then follows the device clock and flips at zero", () => {
		vi.setSystemTime(new Date("2026-11-18T22:59:59Z"))
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("before")
		act(() => {
			vi.advanceTimersByTime(2_000)
		})
		expect(result.current.phase).toBe("after")
		expect(result.current.now.toISOString()).toBe("2026-11-18T23:00:01.000Z")
	})

	it("keeps the initialNow object as now until the device clock takes over", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		const seen: Date[] = []
		renderHook(() => {
			const state = useHubPhase(built, false)
			seen.push(state.now)
			return state
		})
		expect(seen[0]).toBe(built)
		expect(seen.at(-1)).not.toBe(built)
	})

	it("honours ?phase=after on localhost before launch", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		window.history.replaceState(null, "", "/en/?phase=after")
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("after")
	})

	it("ignores any other value", () => {
		vi.setSystemTime(new Date("2026-10-14T10:00:00Z"))
		window.history.replaceState(null, "", "/en/?phase=AFTER")
		const { result } = renderHook(() => useHubPhase(built, false))
		expect(result.current.phase).toBe("before")
	})
})
