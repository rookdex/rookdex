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
			"Language",
			"Your data",
			"About",
		])
	})

	it("uses the whole word in the title, without the tab label's soft hyphen", async () => {
		const doc = await settings("nb")
		expect(doc.querySelector("h1")?.textContent).toBe("Innstillinger")
		expect(doc.title).toBe("Innstillinger · Rookdex")
	})

	it("marks the current language and links the other to its own Settings page", async () => {
		const doc = await settings("nb")
		const group = doc.querySelector('section[aria-labelledby="settings-language"]')
		expect(group?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("Norsk bokmål")
		expect(group?.querySelector("a")?.getAttribute("href")).toBe("/en/settings/")
	})

	it("ships the browser-dependent rows hidden until the script decides", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("[data-storage-row]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-install-row]")?.hasAttribute("hidden")).toBe(true)
	})

	it("points export and import at the Tracker's profile menu", async () => {
		const doc = await settings("en")
		const link = [...doc.querySelectorAll("main a")].find(
			(a) => a.textContent === "Profile menu in Tracker"
		)
		expect(link?.getAttribute("href")).toBe("/en/tracker/")
	})

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
		expect(href(2)).toBe("https://github.com/rookdex/rookdex")
		expect(rows[3].querySelector("dd")?.textContent?.trim()).toBe("MIT")
		expect(href(4)).toBe("https://creativecommons.org/licenses/by-sa/4.0/")
		expect(href(5)).toBe("mailto:legal@rookdex.app")
		expect(rows.map(label).slice(2)).toEqual([
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

	it("lets the other language's link fill its row", async () => {
		const doc = await settings("en")
		const link = doc.querySelector('section[aria-labelledby="settings-language"] a')
		expect(link?.classList.contains("row-link")).toBe(true)
		expect(link?.closest("li")?.classList.contains("row-has-link")).toBe(true)
	})

	it("tells people the install and hint choices stay", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("dialog")?.textContent).toContain(
			"Your choices about the install prompt and hints stay, so they do not return."
		)
	})
})
