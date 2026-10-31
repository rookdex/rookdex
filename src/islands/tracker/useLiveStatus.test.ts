// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SETTLE_MS, useLiveStatus } from "./useLiveStatus"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useLiveStatus (tracker search spec §5)", () => {
	it("writes a typing result once typing has settled for 500 ms", () => {
		const { result } = renderHook(() => useLiveStatus())
		expect(SETTLE_MS).toBe(500)
		act(() => result.current.sayLater("3 results"))
		act(() => vi.advanceTimersByTime(499))
		expect(result.current.message).toBe("")
		act(() => vi.advanceTimersByTime(1))
		expect(result.current.message).toBe("3 results")
	})

	it("restarts the wait on every keystroke and keeps the last result", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("12 results"))
		act(() => vi.advanceTimersByTime(300))
		act(() => result.current.sayLater("1 result"))
		act(() => vi.advanceTimersByTime(300))
		expect(result.current.message).toBe("")
		act(() => vi.advanceTimersByTime(200))
		expect(result.current.message).toBe("1 result")
	})

	it("lets a tick cancel a pending result", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		act(() => result.current.say("Wildlife: 1 of 2"))
		act(() => vi.advanceTimersByTime(1000))
		expect(result.current.message).toBe("Wildlife: 1 of 2")
	})

	it("drops a pending result on cancel", () => {
		const { result } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		act(() => result.current.cancel())
		act(() => vi.advanceTimersByTime(1000))
		expect(result.current.message).toBe("")
	})

	it("leaves no timer behind after unmount", () => {
		const { result, unmount } = renderHook(() => useLiveStatus())
		act(() => result.current.sayLater("1 result"))
		expect(vi.getTimerCount()).toBe(1)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	})
})
