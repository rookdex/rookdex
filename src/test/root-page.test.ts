import { describe, expect, it } from "vitest"
import RootPage from "../pages/index.astro"
import { renderDoc } from "./render"

describe("root page (locale spec §6.4)", () => {
	it("is English, named Rookdex, with the canonical root and the full hreflang set", async () => {
		const doc = await renderDoc(RootPage)
		expect(doc.documentElement.lang).toBe("en")
		expect(doc.title).toBe("Rookdex")
		expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
			"https://rookdex.app/"
		)
		const alternates = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
			l.getAttribute("hreflang"),
			l.getAttribute("href"),
		])
		expect(alternates).toEqual([
			["en", "https://rookdex.app/en/"],
			["nb", "https://rookdex.app/nb/"],
			["x-default", "https://rookdex.app/"],
		])
	})

	it("carries the language-neutral WebSite JSON-LD", async () => {
		const doc = await renderDoc(RootPage)
		const blocks = doc.querySelectorAll('script[type="application/ld+json"]')
		expect(blocks).toHaveLength(1)
		expect(JSON.parse(blocks[0].textContent ?? "")).toEqual({
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "Rookdex",
			url: "https://rookdex.app/",
		})
	})

	it("puts the resolver first in head, right after the charset (stylesheet order is seo-check rule 8)", async () => {
		const doc = await renderDoc(RootPage)
		const head = [...doc.head.children]
		expect(head[0].matches("meta[charset]")).toBe(true)
		expect(head[1].tagName).toBe("SCRIPT")
		expect(head[1].hasAttribute("type")).toBe(false)
		expect(head[1].textContent).toContain("location.replace")
	})

	it("keeps the link preview for the bare domain, which unfurlers fetch without JavaScript", async () => {
		const doc = await renderDoc(RootPage)
		const meta = (selector: string) => doc.querySelector(selector)?.getAttribute("content")
		expect(meta('meta[property="og:image"]')).toBe("https://rookdex.app/og.png")
		expect(meta('meta[property="og:url"]')).toBe("https://rookdex.app/")
		expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image")
	})

	it("works without JavaScript: one plain link per language, by autonym", async () => {
		const doc = await renderDoc(RootPage)
		expect(doc.querySelector("main h1")).not.toBeNull()
		const links = [...doc.querySelectorAll("main a")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
			a.textContent?.trim(),
		])
		expect(links).toEqual([
			["/en/", "en", "en", "English"],
			["/nb/", "nb", "nb", "Norsk bokmål"],
		])
	})
})
