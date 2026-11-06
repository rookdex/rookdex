// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { relativeTime } from "../model/relativeTime"
import { renderReady, resetBrowser } from "../test/tracker-fixtures"
import { Tracker } from "./Tracker"

const renders = vi.hoisted(() => ({ list: 0 }))

vi.mock("../model/seed", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../model/seed")>()
	const { fixtures } = await import("../test/tracker-fixtures")
	return { ...actual, seedItems: fixtures }
})

// Counts the list's renders. The real list renders inside, unchanged.
vi.mock("./tracker/ItemList", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./tracker/ItemList")>()
	return {
		...actual,
		ItemList: (props: Parameters<typeof actual.ItemList>[0]) => {
			renders.list += 1
			return createElement(actual.ItemList, props)
		},
	}
})

beforeEach(resetBrowser)

afterEach(() => {
	vi.useRealTimers()
})

it("updates the time on a tick without re-rendering the list (tracker refresh spec §5.4)", async () => {
	// Only Date is faked: fake intervals stall fake-indexeddb and waitFor (search plan P7).
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-20T10:00:00Z"))
	await renderReady(<Tracker locale="en" />)
	fireEvent.click(screen.getByRole("checkbox", { name: "Pelican" }))
	const row = await screen.findByRole("button", { name: /^Last found Pelican/ })
	const time = row.querySelector("time") as HTMLTimeElement
	const before = time.textContent
	// The tick's announcement lands after the IndexedDB write and renders the list once more. Count
	// from after it, or a slow run takes the baseline one render early.
	await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement())
	const listRenders = renders.list

	vi.setSystemTime(new Date("2026-11-20T10:05:00Z"))
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"))
	})

	expect(time.textContent).not.toBe(before)
	expect(time.textContent).toBe(relativeTime(time.getAttribute("datetime") ?? "", new Date(), "en"))
	expect(renders.list).toBe(listRenders)
})
