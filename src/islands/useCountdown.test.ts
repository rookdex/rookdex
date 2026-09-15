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
