import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import SourceList from "./SourceList.astro"

describe("SourceList", () => {
	it("shows a game screen as the in-game menu, its parts split by a hidden ›, and no link", async () => {
		const doc = await renderDoc(SourceList, {
			props: {
				locale: "en",
				sources: [{ kind: "game", screen: ["Progress", "Vehicles", "Cars"] }],
			},
		})
		expect(doc.querySelector(".game-source")?.textContent).toBe("In-game Progress menu")
		const screen = doc.querySelector(".outlet")
		expect(screen?.textContent?.replace(/\s+/g, " ").trim()).toBe("Progress › Vehicles › Cars")
		const marks = [...(screen?.querySelectorAll('span[aria-hidden="true"]') ?? [])]
		expect(marks.map((m) => m.textContent)).toEqual(["›", "›"])
		expect(doc.querySelector("a")).toBeNull()
	})
})
