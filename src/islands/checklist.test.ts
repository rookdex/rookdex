// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CHECKLIST_KEY, readChecklist, writeChecklistItem } from "./seenFlag"

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

/** Storage that refuses every call, like a browser with storage blocked. */
function blockStorage(): void {
	const refuse = () => {
		throw new Error("SecurityError")
	}
	vi.stubGlobal("localStorage", { getItem: refuse, setItem: refuse, removeItem: refuse })
}

describe("readChecklist (desktop dashboard spec §5)", () => {
	it.each([
		["nothing stored", null],
		["garbage", "{not json"],
		["an object", '{"edition":true}'],
		["a string", '"edition"'],
		["unknown ids only", '["evil","preload-x"]'],
	])("reads %s as empty", (_name, raw) => {
		if (raw !== null) localStorage.setItem(CHECKLIST_KEY, raw)
		expect(readChecklist()).toEqual([])
	})

	it("keeps known ids and drops unknown ones and duplicates", () => {
		localStorage.setItem(CHECKLIST_KEY, '["space","evil","edition","space"]')
		expect(readChecklist()).toEqual(["edition", "space"])
	})

	it("reads blocked storage as null, so the island can say so", () => {
		blockStorage()
		expect(readChecklist()).toBeNull()
	})
})

describe("writeChecklistItem", () => {
	it("round-trips a tick and an untick", () => {
		expect(writeChecklistItem("preload", true, [])).toEqual({ list: ["preload"], saved: true })
		expect(readChecklist()).toEqual(["preload"])
		expect(writeChecklistItem("preload", false, ["preload"])).toEqual({ list: [], saved: true })
		expect(readChecklist()).toEqual([])
	})

	it("reads storage again first, so a tick from another tab is kept", () => {
		localStorage.setItem(CHECKLIST_KEY, '["edition"]') // written by another tab
		expect(writeChecklistItem("space", true, []).list).toEqual(["edition", "space"])
		expect(JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "")).toEqual(["edition", "space"])
	})

	it("works from the shown list when storage is blocked, and never throws", () => {
		blockStorage()
		expect(writeChecklistItem("space", true, ["edition"])).toEqual({
			list: ["edition", "space"],
			saved: false,
		})
	})
})
