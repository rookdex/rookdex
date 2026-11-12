// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HUB_PENDING_ATTR, HUB_PENDING_MAX_MS, hubPrepaintScript } from "./hub-prepaint"

const at = (iso: string) => new Date(iso)
const root = document.documentElement

/** Runs the inline script the way the browser does: as a classic script with currentScript set. */
function runAs(phase: string | null) {
	const script = document.createElement("script")
	if (phase !== null) script.dataset.phase = phase
	document.body.append(script)
	const spy = vi.spyOn(document, "currentScript", "get").mockReturnValue(script)
	new Function(hubPrepaintScript())()
	spy.mockRestore()
}

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
	root.removeAttribute(HUB_PENDING_ATTR)
	document.body.innerHTML = ""
})

describe("hubPrepaintScript", () => {
	it("hides the hub in New York when the rebuilt page says after but it is still 18.11 there", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-18T19:00:00-05:00")) // 01:00 CET, after the 00:05 rebuild
		runAs("after")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(true)
	})

	it("hides the hub in Tokyo when the page still says before but it is 19.11 there", () => {
		vi.stubEnv("TZ", "Asia/Tokyo")
		vi.setSystemTime(at("2026-11-19T03:00:00+09:00")) // 19:00 CET on 18.11
		runAs("before")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(true)
	})

	it("leaves the hub alone in London when the page and the device agree", () => {
		vi.stubEnv("TZ", "Europe/London")
		vi.setSystemTime(at("2026-11-19T00:30:00Z"))
		runAs("after")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(false)
		expect(vi.getTimerCount()).toBe(0)
	})

	it("leaves the hub alone before launch when both say before", () => {
		vi.setSystemTime(at("2026-11-12T12:00:00+01:00"))
		runAs("before")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(false)
	})

	it("flips at the device's midnight, not Oslo's", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-18T23:59:59-05:00"))
		runAs("before")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(false)
		vi.setSystemTime(at("2026-11-19T00:00:00-05:00"))
		runAs("before")
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(true)
	})

	it("shows the static hub again if the island never hydrates", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-18T19:00:00-05:00"))
		runAs("after")
		vi.advanceTimersByTime(HUB_PENDING_MAX_MS - 1)
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(true)
		vi.advanceTimersByTime(1)
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(false)
	})

	it("does nothing without its phase mark", () => {
		vi.stubEnv("TZ", "America/New_York")
		vi.setSystemTime(at("2026-11-18T19:00:00-05:00"))
		runAs(null)
		expect(root.hasAttribute(HUB_PENDING_ATTR)).toBe(false)
	})

	it("is the same text whatever zone the build runs in, so its CSP hash never changes", () => {
		vi.stubEnv("TZ", "UTC")
		const utc = hubPrepaintScript()
		vi.stubEnv("TZ", "Pacific/Kiritimati")
		expect(hubPrepaintScript()).toBe(utc)
	})
})
