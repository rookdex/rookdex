import { useEffect, useRef, useState } from "react"
import { type Locale, translator } from "../i18n"
import { isStandalone } from "../scripts/standalone"
import { INSTALL_SEEN_KEY, readFlag, writeFlag } from "./seenFlag"

export const SEEN_KEY = INSTALL_SEEN_KEY

interface Props {
	locale: Locale
}

/** Native <dialog> shown once when the browser offers installation. Escape closes it. */
export function InstallPrompt({ locale }: Props) {
	const { t } = translator(locale)
	const dialogRef = useRef<HTMLDialogElement>(null)
	const returnFocus = useRef<HTMLElement | null>(null)
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

	useEffect(() => {
		const onPrompt = (event: BeforeInstallPromptEvent) => {
			// Inside the handler, not before the hooks: an early return there breaks the rules of hooks.
			if (isStandalone(window) || readFlag(SEEN_KEY)) return
			event.preventDefault()
			setDeferred(event)
		}
		window.addEventListener("beforeinstallprompt", onPrompt)
		return () => window.removeEventListener("beforeinstallprompt", onPrompt)
	}, [])

	useEffect(() => {
		const dialog = dialogRef.current
		if (deferred && dialog && !dialog.open) {
			returnFocus.current = document.activeElement as HTMLElement | null
			dialog.showModal()
		}
	}, [deferred])

	function dismiss() {
		writeFlag(SEEN_KEY)
		setDeferred(null)
		dialogRef.current?.close()
	}

	async function install() {
		await deferred?.prompt()
		dismiss()
	}

	function onClose() {
		// Fires for the buttons and for Escape alike.
		writeFlag(SEEN_KEY)
		setDeferred(null)
		returnFocus.current?.focus()
	}

	return (
		<dialog ref={dialogRef} className="install" aria-labelledby="install-title" onClose={onClose}>
			<h2 id="install-title">{t("install.title")}</h2>
			<p>{t("install.body")}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={install}>
					{t("install.accept")}
				</button>
				<button type="button" onClick={dismiss}>
					{t("install.dismiss")}
				</button>
			</div>
		</dialog>
	)
}
