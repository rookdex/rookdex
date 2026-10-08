import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, locales, type Translate } from "./index"

export interface SystemRow {
	/** Locale tag to this page's relative URL in that locale. */
	hrefs: Record<Locale, string>
	/** The System label before and after the `{value}` slot, which the page script fills. */
	before: string
	after: string
}

/** What the "System ({value})" row needs, shared by the header picker and Settings so the two
 *  cannot drift. `path` is the page without its locale, as `getRelativeLocaleUrl` takes it. */
export function systemRow(t: Translate, path: string): SystemRow {
	const hrefs = Object.fromEntries(
		locales.map((l) => [l, getRelativeLocaleUrl(l, path)])
	) as Record<Locale, string>
	const [before, after = ""] = t("picker.system").split("{value}")
	return { hrefs, before, after }
}
