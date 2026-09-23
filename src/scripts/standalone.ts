/** The slice of `window` the installed-app check reads. */
export interface StandaloneWindow {
	matchMedia(query: string): { matches: boolean }
	navigator: { standalone?: boolean }
}

/** True in the installed app: `display-mode: standalone`, or iOS's `navigator.standalone`. */
export function isStandalone(win: StandaloneWindow): boolean {
	return win.matchMedia("(display-mode: standalone)").matches || win.navigator.standalone === true
}
