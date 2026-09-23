/**
 * Keyboard and pointer polish for the language <details> (spec §6). Without it the disclosure
 * still opens and closes; with it, Escape, a tap outside and focus leaving all close the panel,
 * the arrow keys move between links, and opening focuses the current language.
 */
export function wireLanguageMenu(details: HTMLDetailsElement, doc: Document): () => void {
	const summary = details.querySelector("summary")
	const links = () => [...details.querySelectorAll<HTMLAnchorElement>("ul a")]

	const close = (refocus: boolean) => {
		if (!details.open) return
		details.open = false
		if (refocus) summary?.focus()
	}

	const onToggle = () => {
		if (!details.open) return
		const current = details.querySelector<HTMLAnchorElement>('ul a[aria-current="page"]')
		const target = current ?? links()[0]
		target?.focus()
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (!details.open) return
		if (event.key === "Escape") {
			event.preventDefault()
			close(true)
			return
		}
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
		event.preventDefault()
		const list = links()
		const step = event.key === "ArrowDown" ? 1 : -1
		const at = list.indexOf(doc.activeElement as HTMLAnchorElement)
		const next =
			at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length
		list[next]?.focus()
	}

	const onDocumentClick = (event: MouseEvent) => {
		if (!details.contains(event.target as Node)) close(false)
	}

	// A null relatedTarget (the window lost focus) is left to the outside-click handler.
	const onFocusout = (event: FocusEvent) => {
		const to = event.relatedTarget as Node | null
		if (to && !details.contains(to)) close(false)
	}

	details.addEventListener("toggle", onToggle)
	details.addEventListener("keydown", onKeydown)
	details.addEventListener("focusout", onFocusout)
	doc.addEventListener("click", onDocumentClick)
	return () => {
		details.removeEventListener("toggle", onToggle)
		details.removeEventListener("keydown", onKeydown)
		details.removeEventListener("focusout", onFocusout)
		doc.removeEventListener("click", onDocumentClick)
	}
}
