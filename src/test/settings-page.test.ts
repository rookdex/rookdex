import { afterEach, describe, expect, it, vi } from "vitest"
import pkg from "../../package.json"
import Settings from "../pages/[locale]/settings.astro"
import { renderDoc } from "./render"

const settings = (locale: "en" | "nb") => renderDoc(Settings, { params: { locale } })

afterEach(() => vi.unstubAllEnvs())

describe("Settings page (spec §7)", () => {
	it("is the Settings tab, with three groups", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Settings")
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("Settings")
		expect([...doc.querySelectorAll("main section > h2")].map((h) => h.textContent)).toEqual([
			"General",
			"Your data",
			"About",
		])
	})

	it("uses the whole word in the title, without the tab label's soft hyphen", async () => {
		const doc = await settings("nb")
		expect(doc.querySelector("h1")?.textContent).toBe("Innstillinger")
		expect(doc.title).toBe("Innstillinger · Rookdex")
	})

	const languageGroup = (doc: Document) =>
		doc.querySelector('section[aria-labelledby="settings-general"]')

	it("shows the language as one row that opens the header's picker", async () => {
		const doc = await settings("nb")
		const group = languageGroup(doc)
		const pickers = group?.querySelectorAll("details[data-picker]")
		expect(pickers).toHaveLength(1)
		const summary = pickers?.[0].querySelector(":scope > summary")
		expect(summary?.querySelector(".row-label")?.textContent).toBe("Språk")
		expect(summary?.querySelector("[data-choice-value]")?.textContent).toBe("Norsk bokmål")
		expect(summary?.querySelector("svg.row-chevron")?.getAttribute("aria-hidden")).toBe("true")
		expect(group?.querySelector('[role="menu"], [role="menuitem"], select')).toBeNull()
	})

	it("lists System, English and Norsk bokmål, with this page's language current", async () => {
		const doc = await settings("nb")
		const list = languageGroup(doc)?.querySelector("details[data-picker] > ul.picker-list")
		expect(list?.getAttribute("aria-label")).toBe("Språk")
		const rows = [...(list?.querySelectorAll("a[data-picker-row]") ?? [])]
		expect(rows.map((a) => [a.getAttribute("data-picker-row"), a.getAttribute("href")])).toEqual([
			["", "/en/settings/"],
			["en", "/en/settings/"],
			["nb", "/nb/settings/"],
		])
		const current = list?.querySelectorAll('[aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current?.[0].textContent?.trim()).toBe("Norsk bokmål")
		expect(current?.[0].querySelector(".lang-check")).not.toBeNull()
	})

	it("ships the browser-dependent rows hidden until the script decides", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("[data-storage-row]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-install-row]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-update-check]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-share-row]")?.hasAttribute("hidden")).toBe(true)
	})

	it("gives the update check a button and an empty status line with its messages", async () => {
		const doc = await settings("nb")
		const row = doc.querySelector<HTMLElement>("[data-update-check]")
		expect(row?.querySelector("button[data-update-check-button]")?.textContent?.trim()).toBe(
			"Se etter oppdateringer"
		)
		expect(row?.querySelector('[role="status"]')?.textContent).toBe("")
		expect(row?.dataset.checking).toBe("Sjekker …")
		expect(row?.dataset.current).toBe("Du har nyeste versjon")
		expect(row?.dataset.ready).toBe("Ny versjon er klar")
		expect(row?.dataset.failed).toBe("Kunne ikke sjekke. Prøv igjen når du er på nett.")
	})

	it("shares the site's address, with the tagline as the text", async () => {
		const doc = await settings("en")
		const row = doc.querySelector<HTMLElement>("[data-share-row]")
		expect(row?.querySelector("button")?.textContent?.trim()).toBe("Share Rookdex")
		expect(row?.dataset.url).toBe("https://rookdex.app")
		expect(row?.dataset.title).toBe("Rookdex")
		expect(row?.dataset.text).toBe(
			"A launch-night companion for GTA VI. Track what you find, see what is confirmed."
		)
	})

	it("ends the page with the delete box, after About and the trademark note", async () => {
		const doc = await settings("en")
		const last = doc.querySelector("main")?.lastElementChild
		expect(last?.id).toBe("delete-data")
		expect(last?.hasAttribute("data-delete")).toBe(true)
		expect(last?.previousElementSibling?.id).toBe("about")
		expect(doc.querySelector('section[aria-labelledby="settings-data"] [data-delete]')).toBeNull()
	})

	it("lets each row's one link fill the row", async () => {
		const doc = await settings("en")
		const linked = [...doc.querySelectorAll("main dl > .row")].filter((row) =>
			row.querySelector("dd a")
		)
		expect(linked.length).toBeGreaterThan(0)
		for (const row of linked) {
			expect(row.classList.contains("row-linked")).toBe(true)
			expect(row.querySelectorAll("dd a")).toHaveLength(1)
		}
	})

	it("ends internal and mail links with a chevron and keeps the ↗ on external ones", async () => {
		const doc = await settings("en")
		for (const link of doc.querySelectorAll("main dl > .row dd a")) {
			const external = link.getAttribute("target") === "_blank"
			expect(link.querySelector(".ext-icon") !== null).toBe(external)
			expect(link.querySelector(".row-chevron") !== null).toBe(!external)
		}
	})

	it("points export and import at the Tracker's profile menu", async () => {
		const doc = await settings("en")
		const link = [...doc.querySelectorAll("main a")].find(
			(a) => a.textContent === "Profile menu in Tracker"
		)
		expect(link?.getAttribute("href")).toBe("/en/tracker/")
	})

	it.each(["en", "nb"] as const)(
		"ends Your data with a link to the privacy page in %s",
		async (locale) => {
			const doc = await settings(locale)
			const rows = [...doc.querySelectorAll('section[aria-labelledby="settings-data"] dl > .row')]
			const last = rows.at(-1)
			expect(last?.querySelector("dt")?.textContent).toBe(
				locale === "en" ? "Privacy" : "Personvern"
			)
			const link = last?.querySelector("dd a")
			expect(link?.textContent).toBe(locale === "en" ? "Privacy policy" : "Personvernerklæring")
			expect(link?.getAttribute("href")).toBe(`/${locale}/privacy/`)
		}
	)

	it("puts Cancel first in the delete dialog, with an alert for its messages", async () => {
		const doc = await settings("en")
		const buttons = [...doc.querySelectorAll("dialog button")].map((b) => b.textContent?.trim())
		expect(buttons).toEqual(["Cancel", "Delete everything"])
		expect(doc.querySelector('dialog [role="alert"]')?.textContent).toBe("")
	})

	it("keeps the success status in the page, empty, outside the dialog", async () => {
		const doc = await settings("en")
		const status = doc.querySelector('[role="status"][data-delete-status]')
		expect(status?.textContent).toBe("")
		expect(status?.closest("dialog")).toBeNull()
	})

	const rowsOf = (doc: Document) => [...doc.querySelectorAll("#about dl > div")]
	const label = (row: Element) => row.querySelector("dt")?.textContent

	it("names the About group and gives it the #about anchor, install first", async () => {
		const doc = await settings("en")
		const about = doc.getElementById("about")
		expect(about?.tagName).toBe("SECTION")
		expect(doc.getElementById(about?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe(
			"About"
		)
		expect(rowsOf(doc).map(label)).toEqual([
			"Install",
			"Version",
			"Updates",
			"Share",
			"Feedback",
			"Source code",
			"Code licence",
			"Guide licence",
			"Takedown and legal",
		])
		expect(rowsOf(doc)[0].hasAttribute("data-install-row")).toBe(true)
		expect(about?.querySelector("p.note")?.textContent).toBe(
			"All trademarks belong to their owners."
		)
	})

	it("links the licence, the repository and the legal address", async () => {
		const doc = await settings("nb")
		const rows = rowsOf(doc)
		const href = (i: number) => rows[i].querySelector("dd a")?.getAttribute("href")
		expect(href(4)).toBe("mailto:feedback@rookdex.app")
		expect(href(5)).toBe("https://github.com/rookdex/rookdex")
		expect(rows[6].querySelector("dd")?.textContent?.trim()).toBe("MIT")
		expect(href(7)).toBe("https://creativecommons.org/licenses/by-sa/4.0/")
		expect(href(8)).toBe("mailto:legal@rookdex.app")
		expect(rows.map(label).slice(2)).toEqual([
			"Oppdateringer",
			"Del",
			"Tilbakemelding",
			"Kildekode",
			"Kodelisens",
			"Guidelisens",
			"Fjerning og juridisk",
		])
	})

	it("links the version's commit when the build has a sha", async () => {
		const sha = "0123456789abcdef0123456789abcdef01234567"
		vi.stubEnv("GITHUB_SHA", sha)
		const doc = await settings("en")
		const dd = rowsOf(doc)[1].querySelector("dd")
		expect(dd?.textContent?.replace(/\s+/g, " ").trim()).toBe(
			`${pkg.version} · 0123456 (opens in a new tab)`
		)
		expect(dd?.querySelector("a")?.getAttribute("href")).toBe(
			`https://github.com/rookdex/rookdex/commit/${sha}`
		)
	})

	it("keeps a dev build's version as plain text", async () => {
		vi.stubEnv("GITHUB_SHA", "")
		const doc = await settings("en")
		const dd = rowsOf(doc)[1].querySelector("dd")
		expect(dd?.textContent?.trim()).toBe(`${pkg.version} · dev`)
		expect(dd?.querySelector("a")).toBeNull()
	})

	it("ships the System row first and hidden, with each language's Settings URL", async () => {
		const doc = await settings("en")
		const first = languageGroup(doc)?.querySelector(".picker-list > li")
		expect(first?.hasAttribute("data-system-item")).toBe(true)
		expect(first?.hasAttribute("hidden")).toBe(true)
		expect(JSON.parse(first?.querySelector("a")?.getAttribute("data-hrefs") ?? "")).toEqual({
			en: "/en/settings/",
			nb: "/nb/settings/",
		})
	})

	it("names the language choice among what this browser keeps", async () => {
		const doc = await settings("en")
		const terms = [...doc.querySelectorAll('section[aria-labelledby="settings-data"] dt')].map(
			(dt) => dt.textContent?.trim()
		)
		expect(terms).toContain("Language choice")
	})

	it("tells people the install and hint choices stay", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("dialog")?.textContent).toContain(
			"Your choices about the install prompt and hints stay, so they do not return."
		)
	})
})
