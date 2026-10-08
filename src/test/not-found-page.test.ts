import { describe, expect, it } from "vitest"
import NotFound from "../pages/404.astro"
import { renderDoc } from "./render"

describe("404 page", () => {
	it("keeps its English title with the site name", async () => {
		const doc = await renderDoc(NotFound)
		expect(doc.title).toBe("Page not found · Rookdex")
		expect(doc.querySelector("h1")?.textContent).toBe("Page not found")
	})

	it("claims no address of its own but keeps its language links", async () => {
		const doc = await renderDoc(NotFound)
		expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
		expect(doc.querySelector('link[rel="alternate"][hreflang]')).toBeNull()
		expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
		expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
		expect(
			[...doc.querySelectorAll("main a[hreflang]")].map((a) => a.getAttribute("hreflang"))
		).toEqual(["en", "nb"])
	})
})
