import { describe, expect, it } from "vitest"
import NotFound from "../pages/404.astro"
import { renderDoc } from "./render"

describe("404 page", () => {
	it("keeps its English title with the site name", async () => {
		const doc = await renderDoc(NotFound)
		expect(doc.title).toBe("Page not found · Rookdex")
		expect(doc.querySelector("h1")?.textContent).toBe("Page not found")
	})
})
