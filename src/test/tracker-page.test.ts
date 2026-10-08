import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
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
})
