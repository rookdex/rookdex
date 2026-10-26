// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { markCurrentChoice } from "./current-choice"
import { fillSystemRows } from "./language-choice"

const nav = (languages: string[]) =>
	({ languages, language: languages[0] }) as unknown as Pick<Navigator, "languages" | "language">

const storageWith = (value: string | null) =>
	({ getItem: (key: string) => (key === "lang" ? value : null) }) as unknown as Storage

const check = `<svg class="lang-check" aria-hidden="true"></svg>`

/** A picker as the server renders it on an English page: English ticked, System hidden. */
const picker = (name: string) => `
	<details data-picker="${name}"><summary>Language <span data-choice-value>English</span></summary>
	<ul class="picker-list">
		<li data-system-item hidden><a href="/en/settings/" data-picker-row="" data-hrefs='{"en":"/en/settings/","nb":"/nb/settings/"}'><span>System (<span data-system-name></span>)</span></a></li>
		<li><a class="picker-row" href="/en/settings/" data-picker-row="en" aria-current="page"><span>English</span>${check}</a></li>
		<li><a class="picker-row" href="/nb/settings/" data-picker-row="nb"><span>Norsk bokmål</span></a></li>
	</ul></details>`

afterEach(() => {
	document.body.innerHTML = ""
})

const rows = (root: ParentNode) => ({
	system: root.querySelector<HTMLAnchorElement>('a[data-picker-row=""]'),
	en: root.querySelector<HTMLAnchorElement>('a[data-picker-row="en"]'),
	nb: root.querySelector<HTMLAnchorElement>('a[data-picker-row="nb"]'),
})

describe("markCurrentChoice (System shows as the choice when no key is stored)", () => {
	it("ticks System in every picker and shows the URL's language as a normal option", () => {
		document.body.innerHTML = picker("lang") + picker("settings-lang")
		fillSystemRows(document, nav(["en-GB"]))
		markCurrentChoice(document, () => storageWith(null))
		for (const details of document.querySelectorAll("details")) {
			const { system, en } = rows(details)
			expect(system?.getAttribute("aria-current")).toBe("true")
			expect(system?.querySelector(".lang-check")).not.toBeNull()
			expect(en?.hasAttribute("aria-current")).toBe(false)
			expect(en?.querySelector(".lang-check")).toBeNull()
			expect(details.querySelectorAll(".lang-check")).toHaveLength(1)
			expect(details.querySelector("[data-choice-value]")?.textContent).toBe("System (English)")
		}
	})

	it("keeps the URL's language ticked when a language is stored", () => {
		document.body.innerHTML = picker("lang")
		fillSystemRows(document, nav(["nb-NO"]))
		markCurrentChoice(document, () => storageWith("en"))
		const { system, en } = rows(document)
		expect(en?.getAttribute("aria-current")).toBe("page")
		expect(en?.querySelector(".lang-check")).not.toBeNull()
		expect(system?.hasAttribute("aria-current")).toBe(false)
		expect(document.querySelector("[data-choice-value]")?.textContent).toBe("English")
	})

	it("changes nothing when storage is missing or throws", () => {
		for (const storage of [
			() => undefined,
			() => {
				throw new Error("SecurityError")
			},
		]) {
			document.body.innerHTML = picker("lang")
			fillSystemRows(document, nav(["en"]))
			markCurrentChoice(document, storage)
			expect(rows(document).en?.getAttribute("aria-current")).toBe("page")
			expect(rows(document).system?.hasAttribute("aria-current")).toBe(false)
		}
	})

	it("changes nothing while the System row is still hidden", () => {
		document.body.innerHTML = picker("lang")
		markCurrentChoice(document, () => storageWith(null))
		expect(rows(document).en?.getAttribute("aria-current")).toBe("page")
		expect(rows(document).system?.hasAttribute("aria-current")).toBe(false)
	})

	// Locale spec D10: a language page never redirects on the stored key. Reading it to draw a tick
	// is fine; acting on it is not.
	it("never navigates", () => {
		const source = readFileSync(resolve(process.cwd(), "src/scripts/current-choice.ts"), "utf8")
		expect(source).not.toMatch(/\blocation\b/)
	})
})
