/**
 * Fills a polite live region when offline (immediately at init if already offline, or when the
 * connection drops later) and empties it when online. Setting the same text twice would not
 * re-announce, so the second "offline" is a no-op anyway.
 */
export function wireOfflineNotice(el: HTMLElement, win: Window, text: string): () => void {
	const show = () => {
		el.hidden = false
		el.textContent = text
	}
	const hide = () => {
		el.textContent = ""
		el.hidden = true
	}
	if (win.navigator.onLine) hide()
	else show()
	win.addEventListener("offline", show)
	win.addEventListener("online", hide)
	return () => {
		win.removeEventListener("offline", show)
		win.removeEventListener("online", hide)
	}
}
