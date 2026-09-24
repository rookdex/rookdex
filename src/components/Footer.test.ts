import { describe, expect, it } from "vitest"
import { t } from "../i18n"
import { renderDoc } from "../test/render"
import Footer from "./Footer.astro"

describe.each(["en", "no"] as const)("footer in %s (spec §10)", (locale) => {
	it("has the disclaimer as its one sentence, then four label/value pairs", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelectorAll("footer > p")).toHaveLength(1)
		expect(doc.querySelector("footer > p")?.textContent).toBe(t(locale).footer.disclaimer)
		const pairs = [...doc.querySelectorAll("footer > dl > div")]
		expect(pairs).toHaveLength(4)
		for (const pair of pairs) {
			expect(pair.querySelectorAll(":scope > dt")).toHaveLength(1)
			expect(pair.querySelectorAll(":scope > dd")).toHaveLength(1)
		}
	})
})

describe("footer values (spec §10)", () => {
	it("labels the pairs in Norwegian and links the legal address and the code", async () => {
		const doc = await renderDoc(Footer, { props: { locale: "no" } })
		expect([...doc.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual([
			"Fjerning og juridisk",
			"Kodelisens",
			"Guidelisens",
			"Kildekode",
		])
		expect([...doc.querySelectorAll("dd")].map((dd) => dd.textContent?.trim())).toEqual([
			"legal@rookdex.app",
			"MIT",
			"CC BY-SA 4.0",
			"GitHub",
		])
		expect([...doc.querySelectorAll("dd a")].map((a) => a.getAttribute("href"))).toEqual([
			"mailto:legal@rookdex.app",
			"https://github.com/rookdex/rookdex",
		])
	})
})
