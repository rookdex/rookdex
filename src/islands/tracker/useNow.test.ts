// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNow } from "./useNow"

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date("2026-11-20T08:00:00Z"))
})

afterEach(() => {
	vi.useRealTimers()
})

describe("useNow (tracker refresh spec §5.4)", () => {
	it("ticks once a minute", () => {
		const { result } = renderHook(() => useNow())
		const first = result.current.getTime()
		act(() => vi.advanceTimersByTime(59_999))
		expect(result.current.getTime()).toBe(first)
		act(() => vi.advanceTimersByTime(1))
		expect(result.current.getTime()).toBe(first + 60_000)
	})

	it("catches up when the page is shown again, so a slept tab is never stale", () => {
		const { result } = renderHook(() => useNow())
		vi.setSystemTime(new Date("2026-11-20T09:30:00Z"))
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"))
		})
		expect(result.current.toISOString()).toBe("2026-11-20T09:30:00.000Z")
	})

	it("clears its timer and its listener on unmount", () => {
		const remove = vi.spyOn(document, "removeEventListener")
		const { unmount } = renderHook(() => useNow())
		expect(vi.getTimerCount()).toBe(1)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
		expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
	})
})
