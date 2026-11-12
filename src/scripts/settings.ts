// Settings page wiring (spec §7). Every row that depends on the browser ships in the page with
// `hidden` and all its variants already rendered; these functions only decide what to show.

import type { BackupLog } from "../islands/seenFlag"
import { dottedDate } from "../model/days"
import type { Store } from "../model/store"
import type { ImportError, ImportResult } from "../model/transfer"
import type { DeleteResult } from "./delete-all"
import { isStandalone, type StandaloneWindow } from "./standalone"

/** `{name}` placeholders in a message the page ships in a data attribute. */
function fill(template: string, vars: Record<string, string | number> = {}): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in vars ? String(vars[key]) : match
	)
}

/**
 * "Protected from clearing": Yes or No from `navigator.storage.persisted()`. Asking shows no
 * prompt. The row is left out when the API is missing or the call rejects. While the answer is
 * No and the browser can be asked, the Protect button and its note show. One press asks once;
 * the button goes either way, because asking again gets the same answer.
 */
export async function wireStorageRow(
	row: HTMLElement,
	storage: { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> } | undefined
): Promise<void> {
	const value = row.querySelector<HTMLElement>("[data-value]")
	if (!value || typeof storage?.persisted !== "function") {
		row.remove()
		return
	}
	let persisted: boolean
	try {
		persisted = await storage.persisted()
	} catch {
		row.remove()
		return
	}
	const show = (yes: boolean) => {
		value.textContent = (yes ? row.dataset.yes : row.dataset.no) ?? ""
	}
	show(persisted)
	row.hidden = false

	const button = row.querySelector<HTMLButtonElement>("[data-persist-button]")
	const note = row.querySelector<HTMLElement>("[data-persist-note]")
	const status = row.querySelector<HTMLElement>("[data-persist-status]")
	const persist = storage.persist
	if (persisted || !button || typeof persist !== "function") return
	const offer = (on: boolean) => {
		button.hidden = !on
		if (note) note.hidden = !on
	}
	offer(true)
	button.addEventListener("click", async () => {
		let granted = false
		try {
			granted = await persist.call(storage)
		} catch {
			// A failed request is a No as far as the player is concerned.
		}
		show(granted)
		offer(false)
		// The button is gone, so focus lands on the answer it changed instead of on <body>.
		value.tabIndex = -1
		value.focus()
		if (status) status.textContent = (granted ? row.dataset.granted : row.dataset.refused) ?? ""
	})
}

/** Bytes in kB under 1 MB, else in MB with one decimal, in the page's language. */
function formatBytes(bytes: number, locale: string): string {
	const mega = bytes >= 1_000_000
	return new Intl.NumberFormat(locale, {
		style: "unit",
		unit: mega ? "megabyte" : "kilobyte",
		maximumFractionDigits: mega ? 1 : 0,
	}).format(mega ? bytes / 1_000_000 : bytes / 1000)
}

/**
 * "Space used" from `navigator.storage.estimate()`: progress plus the offline copy of the site.
 * Left out when the API is missing, gives no number or rejects.
 */
export async function wireUsageRow(
	row: HTMLElement,
	storage: { estimate?: () => Promise<{ usage?: number }> } | undefined,
	locale: string
): Promise<void> {
	const value = row.querySelector<HTMLElement>("[data-value]")
	if (!value || typeof storage?.estimate !== "function") {
		row.remove()
		return
	}
	try {
		const { usage } = await storage.estimate()
		if (typeof usage !== "number") {
			row.remove()
			return
		}
		value.textContent = formatBytes(usage, locale)
		row.hidden = false
	} catch {
		row.remove()
	}
}

export interface BackupDeps {
	openStore: () => Promise<Store>
	/** Loaded on the first press, so the page doesn't ship the import validator up front. */
	transfer: () => Promise<typeof import("../model/transfer")>
	now: () => Date
	download: (filename: string, json: string) => void
	log: { read(): BackupLog; record(now: Date): void }
	locale: string
}

/** `not-json` becomes the `data-error-not-json` attribute's dataset key, `errorNotJson`. */
function errorKey(error: ImportError | "storage"): string {
	return `error-${error}`.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
}

/**
 * "Last backup" and the Back up / Restore row. Back up saves every profile in one file and stamps
 * the date. Restore takes a backup or a one-profile export and merges each profile into the one
 * with the same name, creating the missing ones, in one transaction. Every outcome is one line in
 * the row's status. The database opens per press and closes after, so a visit alone creates
 * nothing and never blocks Delete all.
 */
export function wireBackupRows(root: HTMLElement, deps: BackupDeps): void {
	const dateRow = root.querySelector<HTMLElement>("[data-backup-date]")
	const row = root.querySelector<HTMLElement>("[data-backup-row]")
	const date = dateRow?.querySelector<HTMLElement>("[data-value]")
	const status = row?.querySelector<HTMLElement>("[data-backup-status]")
	const backUp = row?.querySelector<HTMLButtonElement>("[data-backup-button]")
	const restore = row?.querySelector<HTMLButtonElement>("[data-restore-button]")
	const input = row?.querySelector<HTMLInputElement>("[data-restore-input]")
	if (!dateRow || !row || !date || !status || !backUp || !restore || !input) return
	const dateValue: HTMLElement = date
	const statusLine: HTMLElement = status

	const text = (key: string, vars?: Record<string, string | number>) =>
		fill(root.dataset[key] ?? "", vars)
	const plural = new Intl.PluralRules(deps.locale)
	const form = (count: number) => (plural.select(count) === "one" ? "One" : "Other")

	function showDate() {
		const { at } = deps.log.read()
		dateValue.textContent = at ? dottedDate(new Date(at)) : text("never")
	}
	showDate()
	dateRow.hidden = false
	row.hidden = false

	async function withStore<T>(fn: (store: Store) => Promise<T>): Promise<T> {
		const store = await deps.openStore()
		try {
			return await fn(store)
		} finally {
			store.close()
		}
	}

	function resultText(results: ImportResult[]): string {
		const count = results.reduce((sum, r) => sum + r.count, 0)
		if (results.length === 1)
			return text(`imported${form(count)}`, { count, name: results[0].name })
		const names = results.map((r) => r.name).join(", ")
		return text(`restored${form(count)}`, { count, profiles: results.length, names })
	}

	// One task at a time; the status empties first so the same message twice is still spoken.
	let busy = false
	async function run(task: () => Promise<string>) {
		if (busy) return
		busy = true
		statusLine.textContent = ""
		let message: string
		try {
			message = await task()
		} catch {
			message = text(errorKey("storage"))
		}
		statusLine.textContent = message
		busy = false
	}

	backUp.addEventListener("click", () =>
		run(async () => {
			const { collectBackup } = await deps.transfer()
			const backup = await withStore((store) => collectBackup(store, deps.now()))
			if (!backup) return text("nothing")
			deps.download(backup.filename, JSON.stringify(backup.file, null, "\t"))
			deps.log.record(deps.now())
			showDate()
			return text("saved", { file: backup.filename })
		})
	)

	restore.addEventListener("click", () => input.click())
	input.addEventListener("change", () => {
		const file = input.files?.[0]
		// Cleared so picking the same file again still fires `change`.
		input.value = ""
		if (!file) return
		run(async () => {
			const transfer = await deps.transfer()
			if (file.size > transfer.MAX_IMPORT_BYTES) return text(errorKey("too-large"))
			let contents: string
			try {
				contents = await file.text()
			} catch {
				return text(errorKey("not-json"))
			}
			const parsed = transfer.parseImport(contents, file.size)
			if (!parsed.ok) return text(errorKey(parsed.error))
			const entries = transfer.backupEntries(parsed.file)
			return resultText(
				await withStore((store) => transfer.restoreBackup(store, entries, deps.now()))
			)
		})
	})
}

/** The slice of `window` the install row reads. `window` satisfies it; the tests pass a fake. */
export interface InstallWindow extends StandaloneWindow {
	addEventListener(
		type: "beforeinstallprompt" | "appinstalled",
		listener: (event: Event) => void
	): void
}

/**
 * Install row: "Installed" in the installed app, the Share how-to in iOS Safari (which defines
 * `navigator.standalone` and never fires `beforeinstallprompt`), the button once the browser
 * offers installation, and nothing otherwise. The prompt works once, so the button goes after it.
 */
export function wireInstallRow(row: HTMLElement, win: InstallWindow): void {
	const button = row.querySelector<HTMLButtonElement>("[data-install-button]")
	const installed = row.querySelector<HTMLElement>("[data-install-installed]")
	const ios = row.querySelector<HTMLElement>("[data-install-ios]")
	if (!button || !installed || !ios) return
	const parts = [button, installed, ios]
	const show = (part: HTMLElement | null) => {
		for (const each of parts) each.hidden = each !== part
		row.hidden = part === null
	}

	let isInstalled = isStandalone(win)
	if (isInstalled) {
		show(installed)
		return
	}
	show(win.navigator.standalone === false ? ios : null)

	let deferred: BeforeInstallPromptEvent | undefined
	win.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault()
		deferred = event as BeforeInstallPromptEvent
		show(button)
	})
	win.addEventListener("appinstalled", () => {
		isInstalled = true
		show(installed)
	})
	button.addEventListener("click", async () => {
		const offer = deferred
		if (!offer) return
		deferred = undefined
		await offer.prompt().catch(() => {})
		button.remove()
		show(isInstalled ? installed : null)
	})
}

/**
 * Share row: the system share sheet with the site's address. Left out where the browser has no
 * share sheet. Closing the sheet rejects with AbortError, which is not an error to report.
 */
export function wireShareRow(
	row: HTMLElement,
	nav: { share?: (data: ShareData) => Promise<void> }
) {
	const button = row.querySelector<HTMLButtonElement>("[data-share-button]")
	const share = nav.share
	if (!button || typeof share !== "function") {
		row.remove()
		return
	}
	row.hidden = false
	const { url, title, text } = row.dataset
	button.addEventListener("click", () => {
		share.call(nav, { title, text, url }).catch(() => {})
	})
}

/**
 * "Delete all data on this device" (spec §7.2). Native <dialog> with Cancel first, so showModal()
 * focuses it and a stray Enter cancels. The confirm button stays disabled until the request
 * settles, including while other tabs block it. Success closes the dialog and speaks through the
 * page's status line; anything else keeps the dialog open and says nothing was deleted.
 *
 * Once a delete starts, it can't be cancelled: the underlying `indexedDB.deleteDatabase()` call
 * keeps running even if the dialog closes. Escape is blocked while pending (spec §7.2 step 6), but
 * some browsers' close watcher still forces the dialog shut on a second Escape; if that happens the
 * eventual result is spoken through the page's status line instead of the now-hidden dialog.
 */
export function wireDeleteDialog(
	root: HTMLElement,
	run: (onBlocked: () => void) => Promise<DeleteResult>
): void {
	const open = root.querySelector<HTMLButtonElement>("[data-delete-open]")
	const status = root.querySelector<HTMLElement>("[data-delete-status]")
	const dialog = root.querySelector("dialog")
	const alert = root.querySelector<HTMLElement>("[data-delete-alert]")
	const cancel = root.querySelector<HTMLButtonElement>("[data-delete-cancel]")
	const confirm = root.querySelector<HTMLButtonElement>("[data-delete-confirm]")
	if (!open || !status || !dialog || !alert || !cancel || !confirm) return
	// Takes focus while Cancel and Confirm are both disabled, so focus never falls out of the
	// dialog and back to the document body.
	const heading = dialog.querySelector<HTMLElement>("#delete-all-title")

	let pending = false

	open.addEventListener("click", () => {
		if (!pending) {
			alert.textContent = ""
			status.textContent = ""
		}
		dialog.showModal()
	})

	cancel.addEventListener("click", () => {
		if (cancel.disabled) return
		dialog.close()
	})

	// Escape fires "cancel" before "close"; block it while a delete is in flight.
	dialog.addEventListener("cancel", (event) => {
		if (pending) event.preventDefault()
	})

	// Fires for Cancel, Escape and success alike, and for a close forced despite the line above.
	dialog.addEventListener("close", () => {
		open.focus()
		if (pending) status.textContent = dialog.dataset.blocked ?? ""
	})

	confirm.addEventListener("click", async () => {
		if (confirm.disabled) return
		pending = true
		heading?.focus()
		confirm.disabled = true
		cancel.disabled = true
		alert.textContent = ""
		const result = await run(() => {
			alert.textContent = dialog.dataset.blocked ?? ""
		})
		pending = false
		confirm.disabled = false
		cancel.disabled = false
		if (result === "deleted") {
			if (dialog.open) dialog.close()
			status.textContent = dialog.dataset.done ?? ""
		} else if (dialog.open) {
			alert.textContent = dialog.dataset.failed ?? ""
			cancel.focus()
		} else {
			status.textContent = dialog.dataset.failed ?? ""
		}
	})
}
