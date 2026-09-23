// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { type InstallWindow, wireInstallRow, wireStorageRow } from "./settings"

function storageRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-storage-row data-yes="Yes" data-no="No" hidden>
				<dt>Protected from clearing</dt><dd data-value></dd>
			</div>
		</dl>`
	return document.querySelector("[data-storage-row]") as HTMLElement
}

describe("wireStorageRow (spec §7.2)", () => {
	it.each([
		[true, "Yes"],
		[false, "No"],
	])("shows persisted() = %s as %s", async (persisted, text) => {
		const row = storageRow()
		await wireStorageRow(row, { persisted: () => Promise.resolve(persisted) })
		expect(row.hidden).toBe(false)
		expect(row.querySelector("[data-value]")?.textContent).toBe(text)
	})

	it("leaves the row out without the API", async () => {
		const row = storageRow()
		await wireStorageRow(row, undefined)
		expect(row.isConnected).toBe(false)
		const other = storageRow()
		await wireStorageRow(other, {})
		expect(other.isConnected).toBe(false)
	})

	it("leaves the row out when persisted() rejects", async () => {
		const row = storageRow()
		await wireStorageRow(row, { persisted: () => Promise.reject(new Error("denied")) })
		expect(row.isConnected).toBe(false)
	})
})

function installRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-install-row hidden>
				<dt>Install</dt>
				<dd>
					<button type="button" data-install-button hidden>Install Rookdex</button>
					<span data-install-installed hidden>Installed</span>
					<span data-install-ios hidden>Share, then Add to Home Screen</span>
				</dd>
			</div>
		</dl>`
	return document.querySelector("[data-install-row]") as HTMLElement
}

function fakeWindow(options: { standalone?: boolean; iosStandalone?: boolean } = {}) {
	const listeners: Record<string, ((event: Event) => void)[]> = {}
	const win: InstallWindow = {
		matchMedia: (query) => ({
			matches: options.standalone === true && query === "(display-mode: standalone)",
		}),
		navigator: options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone },
		addEventListener: (type, listener) => {
			listeners[type] ??= []
			listeners[type].push(listener)
		},
	}
	const fire = (type: string, event: Event) => {
		for (const listener of listeners[type] ?? []) listener(event)
	}
	return { win, fire }
}

function promptEvent() {
	return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
		prompt: vi.fn(() => Promise.resolve()),
		userChoice: Promise.resolve({ outcome: "dismissed" as const }),
	})
}

/** The texts a sighted user sees in the row's value cell. */
function shown(row: HTMLElement): (string | null)[] {
	return [...row.querySelectorAll<HTMLElement>("dd > *")]
		.filter((el) => !el.hidden)
		.map((el) => el.textContent)
}

describe("wireInstallRow (spec §7.3)", () => {
	it("says Installed in the installed app", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow({ standalone: true }).win)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Installed"])
	})

	it("shows the how-to in Safari on iOS", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow({ iosStandalone: false }).win)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Share, then Add to Home Screen"])
	})

	it("stays hidden when nothing applies", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow().win)
		expect(row.hidden).toBe(true)
	})

	it("offers the button after beforeinstallprompt and removes it after prompt(), whatever the outcome", async () => {
		const row = installRow()
		const { win, fire } = fakeWindow()
		wireInstallRow(row, win)
		const event = promptEvent()
		fire("beforeinstallprompt", event)
		expect(event.defaultPrevented).toBe(true)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Install Rookdex"])
		row.querySelector("button")?.click()
		await vi.waitFor(() => expect(row.querySelector("button")).toBeNull())
		expect(event.prompt).toHaveBeenCalledOnce()
		expect(row.hidden).toBe(true)
	})

	it("switches to Installed on appinstalled", async () => {
		const row = installRow()
		const { win, fire } = fakeWindow()
		wireInstallRow(row, win)
		fire("beforeinstallprompt", promptEvent())
		row.querySelector("button")?.click()
		fire("appinstalled", new Event("appinstalled"))
		await vi.waitFor(() => expect(row.querySelector("button")).toBeNull())
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Installed"])
	})
})
