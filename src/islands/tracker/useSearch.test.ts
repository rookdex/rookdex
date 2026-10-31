// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { Records } from "../../model/stats"
import { fixtures } from "../../test/tracker-fixtures"
import { HIDE_FOUND_KEY } from "../seenFlag"
import { type SearchSource, useSearch } from "./useSearch"

const PELICAN = "wildlife/pelican"
const GATOR = "wildlife/american-alligator"

function found(...ids: string[]): Records {
	return Object.fromEntries(
		ids.map((id) => [id, { item_id: id, done: true }])
	) as unknown as Records
}

const base: SearchSource = {
	status: "ready",
	profileId: "p1",
	items: fixtures,
	records: {},
	selected: [],
}

function setup(source: Partial<SearchSource> = {}) {
	return renderHook((props: SearchSource) => useSearch(props), {
		initialProps: { ...base, ...source },
	})
}

const visibleIds = (r: { current: ReturnType<typeof useSearch> }) =>
	r.current.view.visible.map((item) => item.id)

beforeEach(() => localStorage.clear())

describe("useSearch (tracker search spec §3.4)", () => {
	it("starts with an empty query and the remembered flag", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result } = setup()
		expect(result.current.query).toBe("")
		expect(result.current.hideFound).toBe(true)
	})

	it("remembers the toggle and forgets it when switched off", () => {
		const { result } = setup()
		act(() => result.current.toggleHideFound())
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBe("1")
		act(() => result.current.toggleHideFound())
		expect(localStorage.getItem(HIDE_FOUND_KEY)).toBeNull()
	})

	it("hides nothing while Hide found is off", () => {
		const { result } = setup({ records: found(PELICAN) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(result.current.view.hiddenCount).toBe(0)
	})

	it("takes the first snapshot when the tracker becomes ready", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup({ status: "loading" })
		expect(visibleIds(result)).toContain(PELICAN)
		rerender({ ...base, status: "ready", records: found(PELICAN) })
		expect(visibleIds(result)).not.toContain(PELICAN)
		expect(result.current.view.hiddenCount).toBe(1)
	})

	it("keeps a ticked item visible until the query changes", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		// A tick, an untick or a change from anywhere else: only the records move.
		rerender({ ...base, records: found(PELICAN) })
		expect(visibleIds(result)).toContain(PELICAN)
		act(() => result.current.setQuery("a"))
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("takes a new snapshot when the chips change", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		rerender({ ...base, records: found(PELICAN) })
		rerender({ ...base, records: found(PELICAN), selected: ["wildlife"] })
		expect(visibleIds(result)).toEqual([GATOR])
	})

	it("takes a new snapshot when Hide found is switched on", () => {
		const { result } = setup({ records: found(PELICAN) })
		act(() => result.current.toggleHideFound())
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("takes a new snapshot when the profile changes", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup({ records: found(PELICAN) })
		rerender({ ...base, profileId: "p2", records: found(GATOR) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(visibleIds(result)).not.toContain(GATOR)
	})

	it("takes a new snapshot on resnapshot (a confirmed import)", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = setup()
		rerender({ ...base, records: found(GATOR) })
		expect(visibleIds(result)).toContain(GATOR)
		act(() => result.current.resnapshot())
		expect(visibleIds(result)).not.toContain(GATOR)
	})

	it("clears the query", () => {
		const { result } = setup()
		act(() => result.current.setQuery("peli"))
		expect(visibleIds(result)).toEqual([PELICAN])
		act(() => result.current.clearQuery())
		expect(result.current.query).toBe("")
		expect(visibleIds(result)).toHaveLength(3)
	})

	it("spares the item a Sources back link points at, in the first snapshot only", () => {
		localStorage.setItem(HIDE_FOUND_KEY, "1")
		const { result, rerender } = renderHook((props: SearchSource) => useSearch(props, PELICAN), {
			initialProps: { ...base, status: "loading" },
		})
		rerender({ ...base, records: found(PELICAN, GATOR) })
		expect(visibleIds(result)).toContain(PELICAN)
		expect(visibleIds(result)).not.toContain(GATOR)
		act(() => result.current.setQuery("a"))
		expect(visibleIds(result)).not.toContain(PELICAN)
	})

	it("previews the view a change would give, with that change's snapshot", () => {
		const { result } = setup({ records: found(PELICAN), selected: ["vehicles"] })
		expect(result.current.viewFor({ hideFound: true }).hiddenCount).toBe(0)
		expect(result.current.viewFor({ hideFound: true, selected: [] }).hiddenCount).toBe(1)
		expect(result.current.viewFor({ query: "pelican" }).elsewhere).toBe(1)
		// A preview changes nothing.
		expect(result.current.hideFound).toBe(false)
		expect(result.current.query).toBe("")
	})
})
