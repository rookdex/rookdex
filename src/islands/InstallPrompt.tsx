import { useEffect, useRef, useState } from "react"
import { type Locale, t } from "../i18n"

export const SEEN_KEY = "rookdex.install-prompt-seen"

function readSeen(): boolean {
	try {
		return localStorage.getItem(SEEN_KEY) === "1"
	} catch {
		return false
	}
}

function writeSeen(): void {
	try {
		localStorage.setItem(SEEN_KEY, "1")
	} catch {
		// Private mode or blocked storage: the prompt simply shows again next visit.
	}
}

interface Props {
	locale: Locale
}

/** Native <dialog> shown once when the browser offers installation. Escape closes it. */
export function InstallPrompt({ locale }: Props) {
	const s = t(locale).install
	const dialogRef = useRef<HTMLDialogElement>(null)
	const returnFocus = useRef<HTMLElement | null>(null)
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

	useEffect(() => {
		const onPrompt = (event: BeforeInstallPromptEvent) => {
			if (readSeen()) return
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
		writeSeen()
		setDeferred(null)
		dialogRef.current?.close()
	}

	async function install() {
		await deferred?.prompt()
		dismiss()
	}

	function onClose() {
		// Fires for the buttons and for Escape alike.
		writeSeen()
		setDeferred(null)
		returnFocus.current?.focus()
	}

	return (
		<dialog ref={dialogRef} className="install" aria-labelledby="install-title" onClose={onClose}>
			<h2 id="install-title">{s.title}</h2>
			<p>{s.body}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={install}>
					{s.accept}
				</button>
				<button type="button" onClick={dismiss}>
					{s.dismiss}
				</button>
			</div>
		</dialog>
	)
}
