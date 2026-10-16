import { readFileSync } from "node:fs"
import { JSDOM, VirtualConsole } from "jsdom"
import { describe, expect, it } from "vitest"
import { translator } from "../i18n"
import Privacy from "../pages/[locale]/privacy.astro"
import { renderDoc } from "./render"

const page = (locale: "en" | "nb") => renderDoc(Privacy, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

// axe-core runs inside its own JSDOM window: renderDoc's tests run in the node environment, where
// vitest-axe has no global document. Colour contrast needs layout, which jsdom lacks; Lighthouse CI
// checks it on the built page instead.
type Axe = { run(context: Document, options?: object): Promise<{ violations: { id: string }[] }> }
const axeSource = readFileSync(
	new URL("../../node_modules/axe-core/axe.min.js", import.meta.url),
	"utf8"
)
async function axeViolations(html: string): Promise<string[]> {
	const { window } = new JSDOM(html, {
		runScripts: "outside-only",
		virtualConsole: new VirtualConsole(),
	})
	window.eval(axeSource)
	const axe = (window as unknown as { axe: Axe }).axe
	const results = await axe.run(window.document, { rules: { "color-contrast": { enabled: false } } })
	return results.violations.map((v) => v.id)
}

describe("Privacy page (Android spec §3)", () => {
	it("is a sub-page of Settings, so the Settings tab stays lit", async () => {
		const doc = await page("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Privacy policy")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Settings")
		expect(lit?.getAttribute("aria-current")).toBe("true")
	})

	it("is labelled a privacy policy in its heading and search title (Play User Data policy)", async () => {
		expect((await page("en")).title).toBe("Privacy policy · Rookdex")
		const nb = await page("nb")
		expect(nb.title).toBe("Personvernerklæring · Rookdex")
		expect(nb.querySelector("h1")?.textContent).toBe("Personvernerklæring")
	})

	it.each(["en", "nb"] as const)("names the legal basis, processor and right to complain in %s", async (locale) => {
		const { t } = translator(locale)
		const doc = await page(locale)
		expect(doc.querySelector('section[aria-labelledby="privacy-hosting"]')?.textContent).toContain(
			t("privacy.hostingBasis")
		)
		expect(doc.querySelector('section[aria-labelledby="privacy-who"]')?.textContent).toContain(
			t("privacy.rights")
		)
	})

	it.each(["en", "nb"] as const)("has the seven sections in order in %s", async (locale) => {
		const { t } = translator(locale)
		const doc = await page(locale)
		expect([...doc.querySelectorAll("main section > h2")].map((h) => h.textContent)).toEqual([
			t("privacy.storedTitle"),
			t("privacy.leavesTitle"),
			t("privacy.hostingTitle"),
			t("privacy.linksTitle"),
			t("privacy.androidTitle"),
			t("privacy.deleteTitle"),
			t("privacy.whoTitle"),
		])
		for (const section of doc.querySelectorAll("main section")) {
			const id = section.getAttribute("aria-labelledby")
			expect(id && doc.getElementById(id)?.tagName).toBe("H2")
		}
	})

	it("dates the text in each language's own format", async () => {
		expect(text((await page("en")).querySelector(".meta"))).toMatch(
			/^Last updated \d{1,2} [A-Z][a-z]+ 20\d\d$/
		)
		expect(text((await page("nb")).querySelector(".meta"))).toMatch(
			/^Sist oppdatert \d{1,2}\. [a-zæøå]+ 20\d\d$/
		)
	})

	it("lists the three things stored on the device", async () => {
		const doc = await page("en")
		const items = [...doc.querySelectorAll('section[aria-labelledby="privacy-stored"] li')]
		expect(items.map((li) => li.textContent)).toEqual([
			"Your profiles and what you have ticked off (IndexedDB).",
			'Which profile is active, the language you picked, and three notes that a message was already shown: the install prompt, the storage hint and "update later" (localStorage).',
			"An offline copy of the site, so it works without a network (the service worker cache).",
		])
	})

	it.each(["en", "nb"] as const)(
		"names the Settings button by its own label and links to it in %s",
		async (locale) => {
			const { t } = translator(locale)
			const doc = await page(locale)
			const section = doc.querySelector('section[aria-labelledby="privacy-delete"]')
			expect(section?.textContent).toContain(t("settings.deleteAll"))
			expect(section?.querySelector("a")?.getAttribute("href")).toBe(
				`/${locale}/settings/#settings-data`
			)
		}
	)

	it("links Cloudflare's and Chrome's policies out in a new tab", async () => {
		const doc = await page("nb")
		const hrefs = [...doc.querySelectorAll('main a[target="_blank"]')].map((a) =>
			a.getAttribute("href")
		)
		expect(hrefs).toEqual([
			"https://www.cloudflare.com/privacypolicy/",
			"https://www.google.com/chrome/privacy/",
		])
		expect(text(doc.querySelector('a[href="https://www.cloudflare.com/privacypolicy/"]'))).toContain(
			"(på engelsk)"
		)
	})

	it("names who runs Rookdex and gives the contact address", async () => {
		const doc = await page("en")
		const section = doc.querySelector('section[aria-labelledby="privacy-who"]')
		expect(section?.textContent).toContain("Rookdex is run by Malin Fossum in Norway.")
		expect(section?.querySelector('a[href="mailto:legal@rookdex.app"]')?.textContent).toBe(
			"legal@rookdex.app"
		)
	})

	it("has no axe violations in either language", async () => {
		for (const locale of ["en", "nb"] as const) {
			const doc = await page(locale)
			expect(await axeViolations(`<!doctype html>${doc.documentElement.outerHTML}`)).toEqual([])
		}
	})

	it("uses an axe harness that can go red", async () => {
		expect(
			await axeViolations('<!doctype html><html lang="en"><title>x</title><main><img src="a.png"></main></html>')
		).toContain("image-alt")
	})
})
