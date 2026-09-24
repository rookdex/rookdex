import { isStandalone, type StandaloneWindow } from "./standalone"

/** The slice of `window` the history buttons read. `window` satisfies it; the tests pass a fake. */
export interface HistoryWindow extends StandaloneWindow {
	navigation?: { canGoBack: boolean; canGoForward: boolean }
	history: { back(): void; forward(): void }
	addEventListener(type: "pageshow", listener: () => void): void
}

/**
 * Reveals back and forward in the installed app only; a browser tab has its own (spec §4). The
 * state comes from the Navigation API where it exists, and without it both stay enabled. It is
 * read again on `pageshow`, because a page restored from the back/forward cache keeps the state it
 * had when it was left. Nothing is stored.
 */
export function wireHistoryButtons(group: HTMLElement, win: HistoryWindow): void {
	const back = group.querySelector<HTMLButtonElement>("[data-history-back]")
	const forward = group.querySelector<HTMLButtonElement>("[data-history-forward]")
	if (!back || !forward) return
	if (!isStandalone(win)) return

	group.hidden = false
	const update = () => {
		const nav = win.navigation
		back.disabled = nav ? !nav.canGoBack : false
		forward.disabled = nav ? !nav.canGoForward : false
	}
	update()
	win.addEventListener("pageshow", update)
	back.addEventListener("click", () => win.history.back())
	forward.addEventListener("click", () => win.history.forward())
}
