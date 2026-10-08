// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fillSystemRows, remember, systemLanguage, wireLanguageChoice } from "./language-choice"

const nav = (languages: string[] | undefined, language?: string) =>
	({ languages, language }) as unknown as Pick<Navigator, "languages" | "language">

function fakeStorage() {
	const store = new Map<string, string>()
	const storage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: vi.fn((k: string, v: string) => store.set(k, v)),
		removeItem: vi.fn((k: string) => store.delete(k)),
	}
	return { store, storage: storage as unknown as Storage, setItem: storage.setItem }
}

const header = `
	<details data-picker="lang"><summary>x</summary><ul class="picker-list">
		<li data-system-item hidden><a href="/en/news/" data-picker-row="" data-hrefs='{"en":"/en/news/","nb":"/nb/news/"}'><span>System (<span data-system-name></span>)</span></a></li>
		<li><a class="picker-row" href="/en/news/" data-picker-row="en">English</a></li>
		<li><a class="picker-row" href="/nb/news/" data-picker-row="nb">Norsk bokmål</a></li>
	</ul></details>`

afterEach(() => {
	document.body.innerHTML = ""
})

describe("systemLanguage", () => {
	it("resolves the browser languages, ignoring any stored choice", () => {
		expect(systemLanguage(nav(["nb-NO", "en"]))).toBe("nb")
		expect(systemLanguage(nav(["sv-SE"]))).toBe("en")
		expect(systemLanguage(nav([], undefined))).toBe("en")
		expect(systemLanguage(nav(undefined, "nn-NO"))).toBe("nb")
	})
})

describe("remember (locale spec §7.2)", () => {
	it("stores a language row's tag and removes the key for System", () => {
		const { store, storage } = fakeStorage()
		remember(storage, "nb")
		expect(store.get("lang")).toBe("nb")
		remember(storage, "")
		expect(store.has("lang")).toBe(false)
	})

	it("never stores something that is not a configured language", () => {
		const { storage, setItem } = fakeStorage()
		remember(storage, "no")
		remember(storage, "system")
		expect(setItem).not.toHaveBeenCalled()
	})

	it("swallows storage errors and missing storage", () => {
		const throwing = {
			setItem: () => {
				throw new Error("QuotaExceededError")
			},
			removeItem: () => {
				throw new Error("SecurityError")
			},
		} as unknown as Storage
		expect(() => remember(throwing, "nb")).not.toThrow()
		expect(() => remember(throwing, "")).not.toThrow()
		expect(() => remember(undefined, "nb")).not.toThrow()
	})
})

describe("fillSystemRows (locale spec §7.1)", () => {
	it("shows the System row with the resolved autonym, its lang and the matching URL", () => {
		document.body.innerHTML = header
		fillSystemRows(document, nav(["nb-NO"]))
		const item = document.querySelector<HTMLElement>("[data-system-item]")
		const link = item?.querySelector("a")
		const name = item?.querySelector<HTMLElement>("[data-system-name]")
		expect(item?.hidden).toBe(false)
		expect(link?.getAttribute("href")).toBe("/nb/news/")
		expect(link?.classList.contains("picker-row")).toBe(true)
		expect(name?.textContent).toBe("Norsk bokmål")
		expect(name?.lang).toBe("nb")
	})

	it("leaves the row hidden when the URL map is broken", () => {
		document.body.innerHTML = header.replace(/data-hrefs='[^']*'/, "data-hrefs='{nope'")
		fillSystemRows(document, nav(["nb-NO"]))
		expect(document.querySelector<HTMLElement>("[data-system-item]")?.hidden).toBe(true)
	})

	it("does not add the picker class outside a picker (Settings rows)", () => {
		document.body.innerHTML = `<ul><li data-system-item hidden><a href="/en/settings/" data-picker-row="" data-hrefs='{"en":"/en/settings/","nb":"/nb/settings/"}'><span>System (<span data-system-name></span>)</span></a></li></ul>`
		fillSystemRows(document, nav(["en-GB"]))
		expect(document.querySelector("a")?.classList.contains("picker-row")).toBe(false)
		expect(document.querySelector<HTMLElement>("[data-system-item]")?.hidden).toBe(false)
	})
})

describe("wireLanguageChoice", () => {
	it("stores on a row click and lets the link navigate", () => {
		document.body.innerHTML = header
		const { store, storage } = fakeStorage()
		wireLanguageChoice(document, () => storage)
		const event = new MouseEvent("click", { bubbles: true, cancelable: true })
		document.querySelector<HTMLElement>('[data-picker-row="nb"]')?.dispatchEvent(event)
		expect(store.get("lang")).toBe("nb")
		expect(event.defaultPrevented).toBe(false)
	})

	// jsdom ignores cross-document navigation, so comparing location.href could never go red. The real
	// D10 property is that language pages never read the key, so that is what this pins.
	it("never reads the stored choice, so it cannot act on it (D10)", () => {
		document.body.innerHTML = header
		const { storage } = fakeStorage()
		const getItem = vi.spyOn(storage, "getItem")
		wireLanguageChoice(document, () => storage)
		fillSystemRows(document, nav(["en"]))
		document.querySelector<HTMLElement>('[data-picker-row="nb"]')?.click()
		expect(getItem).not.toHaveBeenCalled()
		const source = readFileSync(resolve(process.cwd(), "src/scripts/language-choice.ts"), "utf8")
		expect(source).not.toMatch(/\blocation\b|getItem/)
	})
})
