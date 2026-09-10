/**
 * Fills a polite live region once when the connection drops and empties it when it returns.
 * Setting the same text twice would not re-announce, so the second "offline" is a no-op anyway.
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
	hide()
	win.addEventListener("offline", show)
	win.addEventListener("online", hide)
	return () => {
		win.removeEventListener("offline", show)
		win.removeEventListener("online", hide)
	}
}
