// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import type { DeleteResult } from "./delete-all"
import { type InstallWindow, wireDeleteDialog, wireInstallRow, wireStorageRow } from "./settings"

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

function dangerBox() {
	document.body.innerHTML = `
		<div data-delete>
			<button type="button" data-delete-open>Delete all data on this device</button>
			<p role="status" data-delete-status></p>
			<dialog
				data-blocked="Close other Rookdex tabs to finish."
				data-failed="Something went wrong. Nothing was deleted."
				data-done="All data on this device is deleted."
			>
				<p role="alert" data-delete-alert></p>
				<button type="button" data-delete-cancel>Cancel</button>
				<button type="button" data-delete-confirm>Delete everything</button>
			</dialog>
		</div>`
	const root = document.querySelector("[data-delete]") as HTMLElement
	const get = <T extends HTMLElement>(selector: string) => root.querySelector(selector) as T
	return {
		root,
		open: get<HTMLButtonElement>("[data-delete-open]"),
		status: get<HTMLElement>("[data-delete-status]"),
		dialog: get<HTMLDialogElement>("dialog"),
		alert: get<HTMLElement>("[data-delete-alert]"),
		cancel: get<HTMLButtonElement>("[data-delete-cancel]"),
		confirm: get<HTMLButtonElement>("[data-delete-confirm]"),
	}
}

/** A delete that settles when the test says so. */
function pendingRun() {
	let settle: (result: DeleteResult) => void = () => {}
	let blocked: () => void = () => {}
	const run = vi.fn(
		(onBlocked: () => void) =>
			new Promise<DeleteResult>((resolve) => {
				blocked = onBlocked
				settle = resolve
			})
	)
	return { run, settle: (result: DeleteResult) => settle(result), block: () => blocked() }
}

describe("wireDeleteDialog (spec §7.2)", () => {
	it("opens with Cancel focused, and Cancel closes it and returns focus", () => {
		const box = dangerBox()
		wireDeleteDialog(box.root, pendingRun().run)
		box.open.click()
		expect(box.dialog.open).toBe(true)
		expect(document.activeElement).toBe(box.cancel)
		box.cancel.click()
		expect(box.dialog.open).toBe(false)
		expect(document.activeElement).toBe(box.open)
	})

	it("disables the confirm button while the request is pending, so a double tap sends one", async () => {
		const box = dangerBox()
		const { run, settle } = pendingRun()
		wireDeleteDialog(box.root, run)
		box.open.click()
		box.confirm.click()
		box.confirm.click()
		expect(box.confirm.disabled).toBe(true)
		expect(run).toHaveBeenCalledOnce()
		settle("deleted")
		await vi.waitFor(() => expect(box.dialog.open).toBe(false))
		expect(box.status.textContent).toBe("All data on this device is deleted.")
		expect(document.activeElement).toBe(box.open)
	})

	it("asks to close other tabs when blocked, stays open, then finishes on success", async () => {
		const box = dangerBox()
		const { run, settle, block } = pendingRun()
		wireDeleteDialog(box.root, run)
		box.open.click()
		box.confirm.click()
		block()
		expect(box.alert.textContent).toBe("Close other Rookdex tabs to finish.")
		expect(box.dialog.open).toBe(true)
		expect(box.confirm.disabled).toBe(true)
		settle("deleted")
		await vi.waitFor(() => expect(box.dialog.open).toBe(false))
	})

	it.each(["failed", "unsupported"] as const)(
		"says nothing was deleted when the result is %s, and allows a retry",
		async (result) => {
			const box = dangerBox()
			const { run, settle } = pendingRun()
			wireDeleteDialog(box.root, run)
			box.open.click()
			box.confirm.click()
			settle(result)
			await vi.waitFor(() =>
				expect(box.alert.textContent).toBe("Something went wrong. Nothing was deleted.")
			)
			expect(box.dialog.open).toBe(true)
			expect(box.confirm.disabled).toBe(false)
			expect(box.status.textContent).toBe("")
		}
	)
})
