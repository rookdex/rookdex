import { describe, expect, it } from "vitest"
import { openingView, parseSavedView } from "./savedView"

describe("saved tracker view", () => {
	const saved = { params: "show=wildlife&group=wildlife%2Fbirds", query: "peli", scroll: 640 }
	const bare = { search: "", hash: "" }

	it("parseSavedView keeps a well-formed view and rejects anything else", () => {
		expect(parseSavedView(JSON.stringify(saved))).toEqual(saved)
		expect(parseSavedView(null)).toBeNull()
		expect(parseSavedView("show=wildlife")).toBeNull()
		expect(parseSavedView("[]")).toBeNull()
		expect(parseSavedView(JSON.stringify({ ...saved, query: 3 }))).toBeNull()
		expect(parseSavedView(JSON.stringify({ ...saved, params: null }))).toBeNull()
		expect(parseSavedView(JSON.stringify({ ...saved, scroll: "9" }))).toBeNull()
	})

	it("parseSavedView caps the query like the field does and keeps the scroll sane", () => {
		const long = parseSavedView(JSON.stringify({ ...saved, query: "a".repeat(150) }))
		expect(long?.query).toHaveLength(100)
		expect(parseSavedView(JSON.stringify({ ...saved, scroll: -20 }))?.scroll).toBe(0)
		expect(parseSavedView(JSON.stringify({ ...saved, scroll: 12.6 }))?.scroll).toBe(13)
		expect(parseSavedView('{"params":"","query":"","scroll":1e999}')).toBeNull()
	})

	it("openingView restores the whole saved view on a bare tracker URL", () => {
		expect(openingView(bare, saved)).toEqual({
			search: saved.params,
			query: "peli",
			scroll: 640,
		})
		expect(openingView({ search: "?phase=after", hash: "" }, saved).query).toBe("peli")
		expect(openingView(bare, null)).toEqual({ search: "", query: "", scroll: null })
	})

	it("openingView keeps the search and scroll when the URL names the saved filters (reload, Back)", () => {
		const url = { search: "?show=wildlife&group=wildlife%2Fbirds", hash: "" }
		expect(openingView(url, saved)).toEqual({ search: url.search, query: "peli", scroll: 640 })
	})

	it("openingView starts fresh when a link names other filters or an item", () => {
		const other = { search: "?show=vehicles", hash: "" }
		expect(openingView(other, saved)).toEqual({ search: other.search, query: "", scroll: null })
		const item = { search: "", hash: "#item-wildlife/pelican" }
		expect(openingView(item, saved)).toEqual({ search: "", query: "", scroll: null })
	})
})
