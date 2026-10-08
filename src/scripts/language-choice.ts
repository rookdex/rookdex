// The stored language (locale spec §7.2, standard §5). Picking a language row stores its tag, picking
// System removes the key, and the link then navigates as normal. Language pages never read the key:
// only the root page does (D10). Imports the language list, not the bundles, to stay small.
import { LANG_KEY, locales } from "../i18n/locales"
import { createTranslator } from "../lib/i18n/index.js"

const resolver = createTranslator(
	Object.fromEntries(locales.map((tag) => [tag, {}])) as Record<string, Record<string, string>>
)

type Nav = Pick<Navigator, "languages" | "language">

/** What System means right now: the browser's languages, never the stored choice. */
export function systemLanguage(nav: Nav): string {
	return resolver.resolveLang(nav.languages?.length ? nav.languages : [nav.language])
}

/** Stores a row's tag, or removes the key for System (""). Errors are swallowed: the link still goes. */
export function remember(storage: Storage | undefined, tag: string): void {
	try {
		if (tag === "") storage?.removeItem(LANG_KEY)
		else if ((locales as readonly string[]).includes(tag)) storage?.setItem(LANG_KEY, tag)
	} catch {
		// Private mode or blocked storage: the choice holds for this navigation only.
	}
}

/** Shows every System row with the resolved autonym (in its own lang) and that language's URL. */
export function fillSystemRows(doc: Document, nav: Nav): void {
	const tag = systemLanguage(nav)
	for (const item of doc.querySelectorAll<HTMLElement>("[data-system-item]")) {
		const link = item.querySelector<HTMLAnchorElement>("a[data-hrefs]")
		const name = item.querySelector<HTMLElement>("[data-system-name]")
		if (!link || !name) continue
		let hrefs: unknown
		try {
			hrefs = JSON.parse(link.dataset.hrefs ?? "")
		} catch {
			continue
		}
		const href = (hrefs as Record<string, unknown> | null)?.[tag]
		if (typeof href !== "string") continue
		link.setAttribute("href", href)
		name.lang = tag
		name.textContent = resolver.displayName(tag)
		// Only inside a picker does the row join picker.js's arrow-key list.
		if (link.closest("details[data-picker]")) link.classList.add("picker-row")
		item.hidden = false
	}
}

/** One delegated listener for every language row on the page, header and Settings alike. */
export function wireLanguageChoice(doc: Document, storage: () => Storage | undefined): () => void {
	const onClick = (event: MouseEvent) => {
		const target = event.target instanceof Element ? event.target : null
		const row = target?.closest<HTMLElement>("a[data-picker-row]")
		if (row) remember(storage(), row.dataset.pickerRow ?? "")
	}
	doc.addEventListener("click", onClick)
	return () => doc.removeEventListener("click", onClick)
}
