// Settings page wiring (spec §7). Every row that depends on the browser ships in the page with
// `hidden` and all its variants already rendered; these functions only decide what to show.

import type { DeleteResult } from "./delete-all"
import { isStandalone, type StandaloneWindow } from "./standalone"

/**
 * "Protected from clearing": Yes or No from `navigator.storage.persisted()`. Asking shows no
 * prompt. The row is left out when the API is missing or the call rejects.
 */
export async function wireStorageRow(
	row: HTMLElement,
	storage: { persisted?: () => Promise<boolean> } | undefined
): Promise<void> {
	const value = row.querySelector<HTMLElement>("[data-value]")
	if (!value || typeof storage?.persisted !== "function") {
		row.remove()
		return
	}
	try {
		const persisted = await storage.persisted()
		value.textContent = (persisted ? row.dataset.yes : row.dataset.no) ?? ""
		row.hidden = false
	} catch {
		row.remove()
	}
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
 * "Delete all data on this device" (spec §7.2). Native <dialog> with Cancel first, so showModal()
 * focuses it and a stray Enter cancels. The confirm button stays disabled until the request
 * settles, including while other tabs block it. Success closes the dialog and speaks through the
 * page's status line; anything else keeps the dialog open and says nothing was deleted.
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

	open.addEventListener("click", () => {
		alert.textContent = ""
		status.textContent = ""
		dialog.showModal()
	})
	cancel.addEventListener("click", () => dialog.close())
	// Fires for Cancel, Escape and success alike.
	dialog.addEventListener("close", () => open.focus())

	confirm.addEventListener("click", async () => {
		if (confirm.disabled) return
		confirm.disabled = true
		alert.textContent = ""
		const result = await run(() => {
			alert.textContent = dialog.dataset.blocked ?? ""
		})
		confirm.disabled = false
		if (result === "deleted") {
			dialog.close()
			status.textContent = dialog.dataset.done ?? ""
		} else {
			alert.textContent = dialog.dataset.failed ?? ""
		}
	})
}
