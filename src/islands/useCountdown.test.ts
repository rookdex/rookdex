// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCountdown } from "./useCountdown"

const now = "2026-09-10T10:00:00Z"

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(now))
})

afterEach(() => {
	vi.useRealTimers()
})

describe("useCountdown", () => {
	it("ticks once a second from the device clock", () => {
		const initialNow = new Date(new Date(now).getTime() - 5_000)
		const { result } = renderHook(() => useCountdown(initialNow))

		const firstSeconds = result.current.parts.seconds
		act(() => vi.advanceTimersByTime(1_000))
		expect(result.current.parts.seconds).not.toBe(firstSeconds)

		const secondSeconds = result.current.parts.seconds
		act(() => vi.advanceTimersByTime(1_000))
		expect(result.current.parts.seconds).not.toBe(secondSeconds)
	})

	it("updates once a minute under prefers-reduced-motion", () => {
		const original = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(() => false),
		}))

		try {
			const initialNow = new Date(new Date(now).getTime() - 5_000)
			const { result } = renderHook(() => useCountdown(initialNow))

			// `seconds` cycles every 60s, so a full-minute advance leaves it looking
			// unchanged either way; `minutes` decrements by exactly one, unambiguously.
			const firstMinutes = result.current.parts.minutes
			act(() => vi.advanceTimersByTime(59_000))
			expect(result.current.parts.minutes).toBe(firstMinutes)

			act(() => vi.advanceTimersByTime(1_000))
			expect(result.current.parts.minutes).not.toBe(firstMinutes)
		} finally {
			window.matchMedia = original
		}
	})
})

// The page is built against the CET instant; the device then counts to its own midnight.
describe("useCountdown across time zones", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("matches the server on the first render, then shows Tokyo's launch before the CET rebuild", () => {
		vi.stubEnv("TZ", "Asia/Tokyo")
		// Built at noon UTC on 18 November: a "before" page. 16:00 UTC is 01:00 in Tokyo.
		const built = new Date("2026-11-18T12:00:00Z")
		vi.setSystemTime(new Date("2026-11-18T16:00:00Z"))
		const seen: string[] = []
		const { result } = renderHook(() => {
			const state = useCountdown(built)
			seen.push(state.phase)
			return state
		})
		expect(seen[0]).toBe("before")
		expect(result.current.phase).toBe("after")
		expect(result.current.daysSince).toBe(0)
	})

	it("matches the rebuilt page on the first render, then counts to New York's midnight", () => {
		vi.stubEnv("TZ", "America/New_York")
		const rebuilt = new Date("2026-11-18T23:05:00Z")
		vi.setSystemTime(new Date("2026-11-19T04:59:58Z"))
		const seen: string[] = []
		const { result } = renderHook(() => {
			const state = useCountdown(rebuilt)
			seen.push(state.phase)
			return state
		})
		expect(seen[0]).toBe("after")
		expect(result.current.phase).toBe("before")
		expect(result.current.parts).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 2 })
		expect(result.current.daysToGo).toBe(1)
		act(() => vi.advanceTimersByTime(2_000))
		expect(result.current.phase).toBe("after")
		expect(result.current.daysSince).toBe(0)
	})
})
