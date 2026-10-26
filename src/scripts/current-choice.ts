// Shows System as the current choice when no language is stored. The server can only tick the URL's
// language, so after picking System both pickers still said English. This reads the key to draw
// the tick and never acts on it: a language page does not redirect (locale spec D10).
import { LANG_KEY } from "../i18n/locales"

/** Run after fillSystemRows: it needs the System row shown and filled. */
export function markCurrentChoice(doc: Document, storage: () => Storage | undefined): void {
	let stored: string | null
	try {
		const store = storage()
		if (!store) return
		stored = store.getItem(LANG_KEY)
	} catch {
		return
	}
	if (stored !== null) return

	for (const details of doc.querySelectorAll<HTMLElement>("details[data-picker]")) {
		const item = details.querySelector<HTMLElement>("[data-system-item]")
		const system = item?.querySelector<HTMLAnchorElement>("a[data-picker-row]")
		if (!item || item.hidden || !system) continue
		const page = details.querySelector<HTMLElement>('[aria-current="page"]')
		const tick = page?.querySelector(".lang-check")
		page?.removeAttribute("aria-current")
		// "true", not "page": System's link can lead to the other language's URL.
		system.setAttribute("aria-current", "true")
		if (tick) system.append(tick)
		const value = details.querySelector<HTMLElement>("[data-choice-value]")
		if (value) value.textContent = system.textContent?.trim() ?? ""
	}
}
