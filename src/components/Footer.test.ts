import { describe, expect, it } from "vitest"
import { t } from "../i18n"
import { renderDoc } from "../test/render"
import Footer from "./Footer.astro"

const hiddenName = (a: Element) =>
	a.querySelector(".visually-hidden:not(.new-tab-note)")?.textContent?.trim()

describe.each(["en", "no"] as const)("footer in %s (feedback spec §6)", (locale) => {
	const s = t(locale)

	it("has the one-sentence disclaimer", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelectorAll("footer p.footer-disclaimer")).toHaveLength(1)
		expect(doc.querySelector(".footer-disclaimer")?.textContent).toBe(s.footer.disclaimer)
	})

	it("has three icon links named by hidden text, with hidden tooltips", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		const icons = [...doc.querySelectorAll(".footer-icons a")]
		expect(icons.map((a) => a.getAttribute("href"))).toEqual([
			"https://github.com/rookdex/rookdex",
			"mailto:legal@rookdex.app",
			`/${locale}/settings/#about`,
		])
		expect(icons.map(hiddenName)).toEqual([s.footer.github, s.footer.legal, s.footer.about])
		for (const a of icons) {
			expect(a.hasAttribute("aria-label")).toBe(false)
			expect(a.classList.contains("has-tip")).toBe(true)
			expect(a.querySelector(".tip")?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
		}
		// GitHub leaves the site: new tab, the note, and the ↗ in its tooltip instead of an icon.
		expect(icons[0].getAttribute("target")).toBe("_blank")
		expect(icons[0].querySelector(".new-tab-note")).not.toBeNull()
		expect(icons[0].querySelector(".ext-icon")).toBeNull()
		expect(icons[0].querySelector(".tip")?.textContent).toBe(`${s.footer.github} ↗`)
	})

	it("ships the launch date in the status chip, with the live templates beside it", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		const chip = doc.querySelector<HTMLElement>("a.status-chip")
		expect(chip?.getAttribute("href")).toBe(`/${locale}/`)
		expect(chip?.querySelector("[data-status-text]")?.textContent).toBe("19 Nov 2026")
		expect(chip?.dataset.days).toBe(s.footer.daysToLaunch)
		expect(chip?.dataset.oneDay).toBe(s.footer.oneDayToLaunch)
		expect(chip?.dataset.out).toBe(s.footer.outNow)
		expect(chip?.querySelector(".status-dot")?.getAttribute("aria-hidden")).toBe("true")
	})

	it("ends with the © line and the build year", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelector(".footer-copy")?.textContent?.trim()).toBe(
			`© Rookdex ${new Date().getFullYear()}`
		)
		expect(doc.querySelector("footer dl")).toBeNull()
	})
})
