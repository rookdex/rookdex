import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"
import { describe, expect, it, vi } from "vitest"
import { seedIndexFile } from "../model/seedDelivered"
import Hub from "../pages/[locale]/index.astro"

// Vitest has no content layer, so the guide entries the page links to are stubbed in each language.
vi.mock("astro:content", () => {
	const guide = (id: string, title: string) => ({ id, data: { title, summary: `${title}.` } })
	return {
		getCollection: async () => [
			guide("en/first-hour", "Your first hour"),
			guide("en/before-you-start", "Before you start"),
			guide("nb/before-you-start", "Før du begynner"),
			guide("nb/first-hour", "Den første timen"),
		],
	}
})

describe("Hub page", () => {
	it("links the seed index file for the dashboard and preloads it", async () => {
		const container = await AstroContainer.create()
		container.addServerRenderer({ renderer: reactRenderer })
		container.addClientRenderer({ name: "@astrojs/react", entrypoint: "@astrojs/react/client.js" })
		const html = await container.renderToString(
			Hub as unknown as Parameters<typeof container.renderToString>[0],
			{ params: { locale: "en" } }
		)
		const doc = new JSDOM(html).window.document
		expect(JSON.parse(doc.getElementById("seed-index")?.textContent ?? "")).toEqual({
			url: seedIndexFile.url,
		})
		const preload = doc.querySelector('link[rel="preload"][as="fetch"]')
		expect(preload?.getAttribute("href")).toBe(seedIndexFile.url)
		expect(preload?.getAttribute("crossorigin")).toBe("anonymous")
	})
})
