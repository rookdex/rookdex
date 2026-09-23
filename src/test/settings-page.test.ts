import { describe, expect, it } from "vitest"
import Settings from "../pages/[locale]/settings.astro"
import { renderDoc } from "./render"

const settings = (locale: "en" | "no") => renderDoc(Settings, { params: { locale } })

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
			"App",
		])
	})

	it("uses the whole word in the title, without the tab label's soft hyphen", async () => {
		const doc = await settings("no")
		expect(doc.querySelector("h1")?.textContent).toBe("Innstillinger")
		expect(doc.title).toBe("Innstillinger · Rookdex")
	})

	it("marks the current language and links the other to its own Settings page", async () => {
		const doc = await settings("no")
		const group = doc.querySelector('section[aria-labelledby="settings-language"]')
		expect(group?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("Norsk")
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

	it("shows the version and links the source", async () => {
		const doc = await settings("en")
		const rows = [...doc.querySelectorAll("main dl > div")]
		const value = (label: string) =>
			rows.find((row) => row.querySelector("dt")?.textContent === label)?.querySelector("dd")
		expect(value("Version")?.textContent?.trim()).toMatch(/^0\.1\.0 · ([0-9a-f]{7}|dev)$/)
		expect(value("Source code")?.querySelector("a")?.getAttribute("href")).toBe(
			"https://github.com/rookdex/rookdex"
		)
	})
})
