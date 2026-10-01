import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import ExternalLink from "./ExternalLink.astro"

const link = (props: Record<string, unknown>, text = "GitHub") =>
	renderDoc(ExternalLink, { props, slots: { default: text } })

describe("ExternalLink (feedback spec §3.1)", () => {
	it("opens in a new tab without leaking the opener or the referrer", async () => {
		const doc = await link({ href: "https://github.com/rookdex/rookdex", locale: "en" })
		const a = doc.querySelector("a")
		expect(a?.getAttribute("href")).toBe("https://github.com/rookdex/rookdex")
		expect(a?.getAttribute("target")).toBe("_blank")
		expect(a?.getAttribute("rel")).toBe("noopener noreferrer")
		expect(a?.hasAttribute("aria-label")).toBe(false)
	})

	it("shows a hidden ↗ icon and says the tab opens, in each language", async () => {
		const en = await link({ href: "https://example.com/", locale: "en" })
		expect(en.querySelector("a svg.ext-icon")?.getAttribute("aria-hidden")).toBe("true")
		expect(en.querySelector(".visually-hidden.new-tab-note")?.textContent).toBe(
			" (opens in a new tab)"
		)
		const no = await link({ href: "https://example.com/", locale: "no" })
		expect(no.querySelector(".new-tab-note")?.textContent).toBe(" (åpnes i ny fane)")
	})

	it("drops the icon but keeps the note with icon={false}", async () => {
		const doc = await link({ href: "https://example.com/", locale: "en", icon: false })
		expect(doc.querySelector("svg.ext-icon")).toBeNull()
		expect(doc.querySelector(".new-tab-note")).not.toBeNull()
	})

	it("passes a class through", async () => {
		const doc = await link({ href: "https://example.com/", locale: "en", class: "icon-link" })
		expect(doc.querySelector("a")?.classList.contains("icon-link")).toBe(true)
	})

	it.each(["http://example.com/", "javascript:alert(1)", "/en/", "//example.com/"])(
		"refuses %s at build time",
		async (href) => {
			await expect(link({ href, locale: "en" })).rejects.toThrow(/https:\/\//)
		}
	)
})
