import { pathToFileURL } from "node:url"
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri"
import { describe, expect, it } from "vitest"
import pricePlugin from "./markdown-price.mjs"

const guide = (folder: string) => pathToFileURL(`/repo/src/content/guides/${folder}/x.md`)

async function render(markdown: string, fileURL?: URL) {
	const processor = await createSatteriMarkdownProcessor({
		mdastPlugins: [pricePlugin({ locales: ["en", "no"] })],
	})
	return (await processor.render(markdown, { fileURL })).code
}

describe("markdown-price (locale spec §5.4)", () => {
	it("swaps tokens for the formatted price, per locale folder", async () => {
		expect(
			await render("Standard at {price:standard} and {price:ultimate}.", guide("en"))
		).toContain("Standard at NOK\u00a0949 and NOK\u00a01,189.")
		expect(await render("koster {price:standard}", guide("no"))).toContain("koster 949\u00a0kr")
	})

	it("reaches text inside emphasis and leaves inline code alone", async () => {
		const html = await render("**{price:standard}** and `{price:standard}`", guide("en"))
		expect(html).toContain("<strong>NOK\u00a0949</strong>")
		expect(html).toContain("<code>{price:standard}</code>")
	})

	it("fails the build on an unknown id", async () => {
		await expect(render("{price:deluxe}", guide("en"))).rejects.toThrow(/deluxe/)
	})

	it("fails on a token outside a locale folder, and ignores files without tokens", async () => {
		const notes = pathToFileURL("/repo/src/content/notes/x.md")
		await expect(render("{price:standard}", notes)).rejects.toThrow(/locale folder/)
		await expect(render("{price:standard}", guide("xx"))).rejects.toThrow(/locale folder/)
		await expect(render("{price:standard}")).rejects.toThrow(/locale folder/)
		await expect(render("No price here.")).resolves.toContain("No price here.")
	})
})
