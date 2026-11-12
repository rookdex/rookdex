import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { JSDOM, VirtualConsole } from "jsdom"
import { afterEach, describe, expect, it, vi } from "vitest"
import pkg from "../../package.json"
import Settings from "../pages/[locale]/settings.astro"
import { renderDoc } from "./render"

const settings = (locale: "en" | "nb") => renderDoc(Settings, { params: { locale } })

afterEach(() => vi.unstubAllEnvs())

// As on the privacy page: axe-core in its own JSDOM window, colour contrast left to Lighthouse.
// Resolved through Node, so a worktree without its own node_modules finds the shared one.
type Axe = { run(context: Document, options?: object): Promise<{ violations: { id: string }[] }> }
const axeSource = readFileSync(
	createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
	"utf8"
)
async function axeViolations(html: string): Promise<string[]> {
	const { window } = new JSDOM(html, {
		runScripts: "outside-only",
		virtualConsole: new VirtualConsole(),
	})
	window.eval(axeSource)
	const axe = (window as unknown as { axe: Axe }).axe
	const results = await axe.run(window.document, {
		rules: { "color-contrast": { enabled: false } },
	})
	return results.violations.map((v) => v.id)
}

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
		expect(doc.title).toBe("Innstillinger: språk, oppdateringer og data · Rookdex")
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
		expect(doc.querySelector("[data-usage-row]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-backup-date]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-backup-row]")?.hasAttribute("hidden")).toBe(true)
	})

	const dataTerms = (doc: Document) =>
		[...doc.querySelectorAll('section[aria-labelledby="settings-data"] dl > .row > dt')].map((dt) =>
			dt.textContent?.trim()
		)

	it("lists the backup rows before the one-profile link", async () => {
		expect(dataTerms(await settings("en"))).toEqual([
			"Stored",
			"Language choice",
			"Protected from clearing",
			"Space used",
			"Last backup",
			"All profiles",
			"One profile",
			"Privacy",
		])
		expect(dataTerms(await settings("nb"))).toEqual([
			"Lagret",
			"Språkvalg",
			"Beskyttet mot sletting",
			"Plass brukt",
			"Siste sikkerhetskopi",
			"Alle profiler",
			"Én profil",
			"Personvern",
		])
	})

	it("ships the Protect button hidden, described by the note that says what it does", async () => {
		const doc = await settings("en")
		const row = doc.querySelector<HTMLElement>("[data-storage-row]")
		const button = row?.querySelector("button[data-persist-button]")
		expect(button?.textContent?.trim()).toBe("Protect")
		expect(button?.hasAttribute("hidden")).toBe(true)
		const note = doc.getElementById(button?.getAttribute("aria-describedby") ?? "")
		expect(note?.closest("[data-storage-row]")).toBe(row)
		expect(note?.hasAttribute("hidden")).toBe(true)
		expect(note?.textContent).toBe(
			"Asks your browser not to clear your progress when the device runs low on space. Installed apps usually get a yes."
		)
		expect(row?.querySelector('[role="status"]')?.textContent).toBe("")
		expect(row?.dataset.granted).toBe("Protected. Your browser will keep your data.")
		expect(row?.dataset.refused).toBe("Your browser said no. Install Rookdex or back up often.")
	})

	it("ships Back up and Restore with an empty status and every message", async () => {
		const doc = await settings("nb")
		const root = doc.querySelector<HTMLElement>("[data-backup]")
		const row = root?.querySelector("[data-backup-row]")
		expect(row?.querySelector("[data-backup-button]")?.textContent?.trim()).toBe("Ta kopi")
		expect(row?.querySelector("[data-restore-button]")?.textContent?.trim()).toBe("Gjenopprett")
		expect(row?.querySelector('[role="status"]')?.textContent).toBe("")
		expect(row?.querySelector('input[type="file"]')?.getAttribute("accept")).toBe(
			".json,application/json"
		)
		expect(root?.dataset.never).toBe("Aldri")
		expect(root?.dataset.saved).toBe("Sikkerhetskopien er lagret som {file}.")
		expect(root?.dataset.errorNewerVersion).toBe(
			"Filen kommer fra en nyere Rookdex. Last inn siden på nytt for å oppdatere, og prøv igjen."
		)
		for (const key of [
			"nothing",
			"errorStorage",
			"errorTooLarge",
			"errorNotJson",
			"errorNotExport",
			"errorTooMany",
			"importedOne",
			"importedOther",
			"restoredOne",
			"restoredOther",
		]) {
			expect(root?.dataset[key], key).toBeTruthy()
		}
	})

	it.each([
		[
			"en",
			"Android app",
			"Coming to Google Play soon. Until then, install Rookdex from your browser.",
		],
		[
			"nb",
			"Android-app",
			"Kommer snart på Google Play. Til da kan du installere Rookdex fra nettleseren.",
		],
	] as const)("says the Android app is coming to Google Play in %s", async (locale, term, note) => {
		const doc = await settings(locale)
		const row = [...doc.querySelectorAll("#about dl > div")][1]
		expect(row?.querySelector("dt")?.textContent).toBe(term)
		expect(row?.querySelector("dd")?.textContent?.trim()).toBe(note)
		expect(row?.hasAttribute("hidden")).toBe(false)
	})

	it("stacks rows with long buttons on a phone, so no label wraps inside its button", async () => {
		const doc = await settings("nb")
		for (const selector of ["[data-update-check]", "[data-backup-row]"]) {
			const row = doc.querySelector(selector)
			expect(row?.classList.contains("row-long"), selector).toBe(true)
			expect(row?.querySelector(".row-buttons > button.row-button"), selector).not.toBeNull()
		}
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
			"Android app",
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
		expect(href(5)).toBe("mailto:feedback@rookdex.app")
		expect(href(6)).toBe("https://github.com/rookdex/rookdex")
		expect(rows[7].querySelector("dd")?.textContent?.trim()).toBe("MIT")
		expect(href(8)).toBe("https://creativecommons.org/licenses/by-sa/4.0/")
		expect(href(9)).toBe("mailto:legal@rookdex.app")
		expect(rows.map(label).slice(3)).toEqual([
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
		const dd = rowsOf(doc)[2].querySelector("dd")
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
		const dd = rowsOf(doc)[2].querySelector("dd")
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

	it.each(["en", "nb"] as const)(
		"passes axe in %s with every browser-dependent row and button shown",
		async (locale) => {
			const doc = await settings(locale)
			for (const el of doc.querySelectorAll("main [hidden]")) {
				if (!el.closest("[data-picker]")) el.removeAttribute("hidden")
			}
			expect(await axeViolations(doc.documentElement.outerHTML)).toEqual([])
		}
	)
})
