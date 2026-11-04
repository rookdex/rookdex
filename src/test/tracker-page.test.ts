import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../model/seed"
import Tracker from "../pages/[locale]/tracker/index.astro"

// The shared renderDoc container has no renderers, and a client:only island needs React's.
async function renderPage(
	page: Parameters<AstroContainer["renderToString"]>[0]
): Promise<Document> {
	const container = await AstroContainer.create()
	container.addServerRenderer({ renderer: reactRenderer })
	container.addClientRenderer({ name: "@astrojs/react", entrypoint: "@astrojs/react/client.js" })
	const html = await container.renderToString(page, { params: { locale: "en" } })
	return new JSDOM(html).window.document
}

describe("Tracker page", () => {
	it("holds the island's space until React mounts, so the footer can't paint in view", async () => {
		const island = (await renderPage(Tracker)).querySelector("astro-island")
		expect(island?.querySelector(".tracker-fallback")).not.toBeNull()
	})

	it("ends with a Browse by category row linking to each Dex page", async () => {
		const doc = await renderPage(Tracker)
		const nav = doc.querySelector('nav[aria-labelledby="dex-browse"]')
		expect(nav?.querySelector("h2")?.id).toBe("dex-browse")
		expect(nav?.querySelector("h2")?.textContent).toBe("Browse by category")
		const categories = categoryIds(seedItems.filter((item) => !item.retired))
		expect([...(nav?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual(
			categories.map((c) => `/en/dex/${c}/`)
		)
		// Server-rendered after the island, so it sits under the fallback's reserved height.
		const island = doc.querySelector("astro-island")
		expect(island?.compareDocumentPosition(nav as Node)).toBe(4) // DOCUMENT_POSITION_FOLLOWING
	})

	it("reserves the profile slot after the title, in one row (tracker refresh spec §5.5)", async () => {
		const head = (await renderPage(Tracker)).querySelector(".tracker-head")
		expect(head?.firstElementChild?.tagName).toBe("H1")
		expect(head?.lastElementChild?.id).toBe("tracker-profile")
		expect(head?.lastElementChild?.childElementCount).toBe(0)
	})
})
