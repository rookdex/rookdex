// @vitest-environment jsdom
import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import type { BackupLog } from "../islands/seenFlag"
import { openStore } from "../model/store"
import type { DeleteResult } from "./delete-all"
import {
	type BackupDeps,
	type InstallWindow,
	wireBackupRows,
	wireDeleteDialog,
	wireInstallRow,
	wireShareRow,
	wireStorageRow,
	wireUsageRow,
} from "./settings"

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
				<h2 id="delete-all-title" tabindex="-1">Delete all data on this device?</h2>
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
		heading: get<HTMLElement>("#delete-all-title"),
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
			expect(document.activeElement).toBe(box.cancel)
		}
	)

	it("moves focus to the dialog heading once a delete starts, so it stays inside the dialog", () => {
		const box = dangerBox()
		wireDeleteDialog(box.root, pendingRun().run)
		box.open.click()
		box.confirm.click()
		expect(document.activeElement).toBe(box.heading)
	})

	it("disables Cancel and blocks Escape while a delete is pending (spec §7.2 step 6)", () => {
		const box = dangerBox()
		wireDeleteDialog(box.root, pendingRun().run)
		box.open.click()
		box.confirm.click()
		expect(box.cancel.disabled).toBe(true)
		const escapeKey = new Event("cancel", { cancelable: true })
		box.dialog.dispatchEvent(escapeKey)
		expect(escapeKey.defaultPrevented).toBe(true)
		expect(box.dialog.open).toBe(true)
	})

	it("speaks a result that arrives after the dialog was already forced shut", async () => {
		const box = dangerBox()
		const { run, settle } = pendingRun()
		wireDeleteDialog(box.root, run)
		box.open.click()
		box.confirm.click()
		// Some browsers' close watcher forces the dialog shut on a second Escape despite pending.
		box.dialog.close()
		expect(box.status.textContent).toBe("Close other Rookdex tabs to finish.")
		settle("deleted")
		await vi.waitFor(() =>
			expect(box.status.textContent).toBe("All data on this device is deleted.")
		)
	})
})

function shareRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-share-row data-url="https://rookdex.app" data-title="Rookdex" data-text="Tagline" hidden>
				<dt>Share</dt><dd><button type="button" data-share-button>Share Rookdex</button></dd>
			</div>
		</dl>`
	return document.querySelector("[data-share-row]") as HTMLElement
}

describe("wireShareRow", () => {
	it("leaves the row out when the browser has no share sheet", () => {
		const row = shareRow()
		wireShareRow(row, {})
		expect(row.isConnected).toBe(false)
	})

	it("shows the row and shares the site's address, title and text", async () => {
		const row = shareRow()
		const share = vi.fn(() => Promise.resolve())
		wireShareRow(row, { share })
		expect(row.hidden).toBe(false)
		row.querySelector<HTMLButtonElement>("[data-share-button]")?.click()
		expect(share).toHaveBeenCalledWith({
			title: "Rookdex",
			text: "Tagline",
			url: "https://rookdex.app",
		})
	})

	it("treats a closed share sheet as nothing to report", async () => {
		const row = shareRow()
		const rejection = Promise.reject(new DOMException("Share canceled", "AbortError"))
		const share = vi.fn(() => rejection)
		wireShareRow(row, { share })
		row.querySelector<HTMLButtonElement>("[data-share-button]")?.click()
		await expect(rejection).rejects.toThrow()
		await Promise.resolve()
		expect(row.hidden).toBe(false)
	})
})

function protectRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-storage-row data-yes="Yes" data-no="No" data-granted="Protected." data-refused="Browser said no." hidden>
				<dt>Protected from clearing</dt>
				<dd>
					<span role="status" data-persist-status></span>
					<span data-value></span>
					<button type="button" data-persist-button hidden>Protect</button>
				</dd>
				<dd data-persist-note hidden>Asks your browser not to clear.</dd>
			</div>
		</dl>`
	return document.querySelector("[data-storage-row]") as HTMLElement
}

describe("wireStorageRow: Protect button", () => {
	const parts = (row: HTMLElement) => ({
		value: row.querySelector("[data-value]")?.textContent,
		button: row.querySelector("[data-persist-button]") as HTMLButtonElement,
		note: row.querySelector("[data-persist-note]") as HTMLElement,
		status: row.querySelector("[data-persist-status]")?.textContent,
	})

	it("offers the button and its note only while the answer is No", async () => {
		const yes = protectRow()
		await wireStorageRow(yes, { persisted: async () => true, persist: async () => true })
		expect(parts(yes).button.hidden).toBe(true)
		const no = protectRow()
		await wireStorageRow(no, { persisted: async () => false, persist: async () => true })
		expect(parts(no).button.hidden).toBe(false)
		expect(parts(no).note.hidden).toBe(false)
	})

	it("leaves the button out where the browser cannot ask", async () => {
		const row = protectRow()
		await wireStorageRow(row, { persisted: async () => false })
		expect(parts(row).button.hidden).toBe(true)
		expect(parts(row).value).toBe("No")
	})

	it("turns the row to Yes when the browser agrees, and says so", async () => {
		const row = protectRow()
		await wireStorageRow(row, { persisted: async () => false, persist: async () => true })
		parts(row).button.click()
		await vi.waitFor(() => expect(parts(row).value).toBe("Yes"))
		expect(parts(row).button.hidden).toBe(true)
		expect(parts(row).note.hidden).toBe(true)
		expect(parts(row).status).toBe("Protected.")
	})

	it("keeps No and says why when the browser refuses or fails", async () => {
		for (const persist of [async () => false, () => Promise.reject(new Error("x"))]) {
			const row = protectRow()
			await wireStorageRow(row, { persisted: async () => false, persist })
			parts(row).button.click()
			await vi.waitFor(() => expect(parts(row).status).toBe("Browser said no."))
			expect(parts(row).value).toBe("No")
			expect(parts(row).button.hidden).toBe(true)
		}
	})
})

function usageRow(): HTMLElement {
	document.body.innerHTML = `
		<dl><div data-usage-row hidden><dt>Space used</dt><dd data-value></dd></div></dl>`
	return document.querySelector("[data-usage-row]") as HTMLElement
}

describe("wireUsageRow", () => {
	it.each([
		["en", 4_200_000, "4.2 MB"],
		["nb", 4_200_000, "4,2 MB"],
		["en", 320_000, "320 kB"],
		["en", 0, "0 kB"],
	])("shows %s usage of %i bytes as %s", async (locale, usage, text) => {
		const row = usageRow()
		await wireUsageRow(row, { estimate: async () => ({ usage }) }, locale)
		expect(row.hidden).toBe(false)
		expect(row.querySelector("[data-value]")?.textContent?.replace(/\s/g, " ")).toBe(text)
	})

	it("leaves the row out without the API, a number or a working call", async () => {
		for (const storage of [
			undefined,
			{},
			{ estimate: async () => ({}) },
			{ estimate: () => Promise.reject(new Error("x")) },
		]) {
			const row = usageRow()
			await wireUsageRow(row, storage, "en")
			expect(row.isConnected).toBe(false)
		}
	})
})

const MESSAGES = `
	data-never="Never"
	data-saved="Backup saved as {file}."
	data-nothing="Nothing to back up yet."
	data-error-storage="Saving failed."
	data-error-too-large="Too large."
	data-error-not-json="Damaged."
	data-error-not-export="Not a Rookdex file."
	data-error-newer-version="Newer Rookdex."
	data-error-too-many="Too many."
	data-imported-one="Imported 1 item into {name}."
	data-imported-other="Imported {count} items into {name}."
	data-restored-one="Restored {profiles} profiles: {names}. 1 item came in."
	data-restored-other="Restored {profiles} profiles: {names}. {count} items came in."`

function backupSection(): HTMLElement {
	document.body.innerHTML = `
		<section data-backup ${MESSAGES}>
			<dl>
				<div data-backup-date hidden><dt>Last backup</dt><dd data-value></dd></div>
				<div data-backup-row hidden>
					<dt>All profiles</dt>
					<dd>
						<span role="status" data-backup-status></span>
						<button type="button" data-backup-button>Back up</button>
						<button type="button" data-restore-button>Restore</button>
						<input type="file" data-restore-input />
					</dd>
				</div>
			</dl>
		</section>`
	return document.querySelector("[data-backup]") as HTMLElement
}

describe("wireBackupRows", () => {
	const now = new Date(2026, 10, 12, 13, 20)
	const record = {
		item_id: "wildlife/a",
		done: true,
		updated_at: "2026-11-12T09:00:00.000Z",
		origin: "manual" as const,
	}

	function setup(options: { at?: string | null; profiles?: boolean; broken?: boolean } = {}) {
		const factory = new IDBFactory()
		let log: BackupLog = { at: options.at ?? null, ticks: 7 }
		const download = vi.fn()
		const deps: BackupDeps = {
			openStore: options.broken
				? () => Promise.reject(new Error("blocked"))
				: () => openStore(factory),
			transfer: () => import("../model/transfer"),
			now: () => now,
			download,
			log: {
				read: () => log,
				record: (at) => {
					log = { at: at.toISOString(), ticks: 0 }
				},
			},
			locale: "en",
		}
		const root = backupSection()
		const ready = (async () => {
			if (options.profiles) {
				const store = await openStore(factory)
				await store.put("profiles", { id: "p1", name: "Malin", created_at: now.toISOString() })
				await store.put("progress", { ...record, profile_id: "p1" })
				store.close()
			}
			wireBackupRows(root, deps)
		})()
		const q = (selector: string) => root.querySelector(selector) as HTMLElement
		return {
			ready,
			root,
			download,
			log: () => log,
			date: () => q("[data-backup-date] [data-value]").textContent,
			status: () => q("[data-backup-status]").textContent,
			backUp: () => q("[data-backup-button]").click(),
			pick: (contents: string) => {
				const input = q("[data-restore-input]") as HTMLInputElement
				const file = { size: contents.length, text: async () => contents }
				Object.defineProperty(input, "files", { value: [file], configurable: true })
				input.dispatchEvent(new Event("change"))
			},
		}
	}

	it("shows the rows, with Never before the first backup", async () => {
		const page = setup()
		await page.ready
		expect(page.root.querySelector<HTMLElement>("[data-backup-date]")?.hidden).toBe(false)
		expect(page.root.querySelector<HTMLElement>("[data-backup-row]")?.hidden).toBe(false)
		expect(page.date()).toBe("Never")
	})

	it("shows the last backup as a dotted date", async () => {
		const page = setup({ at: new Date(2026, 10, 10, 9, 0).toISOString() })
		await page.ready
		expect(page.date()).toBe("10.11.2026")
	})

	it("Back up saves every profile, stamps the date and says the file name", async () => {
		const page = setup({ profiles: true })
		await page.ready
		page.backUp()
		await vi.waitFor(() => expect(page.download).toHaveBeenCalled())
		const [filename, json] = page.download.mock.calls[0]
		expect(filename).toBe(`rookdex-backup-${now.toISOString().slice(0, 10)}.json`)
		expect(JSON.parse(json)).toMatchObject({ version: 2, profiles: [{ name: "Malin" }] })
		expect(page.log().ticks).toBe(0)
		expect(page.date()).toBe("12.11.2026")
		expect(page.status()).toBe(`Backup saved as ${filename}.`)
	})

	it("says there is nothing to back up on a fresh device", async () => {
		const page = setup()
		await page.ready
		page.backUp()
		await vi.waitFor(() => expect(page.status()).toBe("Nothing to back up yet."))
		expect(page.download).not.toHaveBeenCalled()
		expect(page.date()).toBe("Never")
	})

	it("says saving failed when the database will not open", async () => {
		const page = setup({ broken: true })
		await page.ready
		page.backUp()
		await vi.waitFor(() => expect(page.status()).toBe("Saving failed."))
	})

	it("restores a backup by name and says how many items came in", async () => {
		const page = setup({ profiles: true })
		await page.ready
		page.pick(
			JSON.stringify({
				version: 2,
				exported_at: now.toISOString(),
				profiles: [
					{ name: "Malin", records: [{ ...record, item_id: "wildlife/b" }] },
					{ name: "Dad", records: [record, { ...record, item_id: "wildlife/c" }] },
				],
			})
		)
		await vi.waitFor(() =>
			expect(page.status()).toBe("Restored 2 profiles: Malin, Dad. 3 items came in.")
		)
	})

	it("restores a one-profile export into the profile of that name", async () => {
		const page = setup({ profiles: true })
		await page.ready
		page.pick(
			JSON.stringify({
				version: 1,
				exported_at: now.toISOString(),
				profile_name: "Malin",
				records: [{ ...record, item_id: "wildlife/b" }],
			})
		)
		await vi.waitFor(() => expect(page.status()).toBe("Imported 1 item into Malin."))
	})

	it.each([
		["{oops", "Damaged."],
		[JSON.stringify({ version: 7 }), "Newer Rookdex."],
		[JSON.stringify({ any: "thing" }), "Not a Rookdex file."],
	])("gives the reason a file is refused", async (contents, reason) => {
		const page = setup({ profiles: true })
		await page.ready
		page.pick(contents)
		await vi.waitFor(() => expect(page.status()).toBe(reason))
	})
})
