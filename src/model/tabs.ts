// The five tabs (spec §5; Dex added in November). The current one is worked out at build from the page's path, so the
// tab bar needs no JavaScript.

export const TABS = ["dashboard", "dex", "tracker", "news", "settings"] as const
export type Tab = (typeof TABS)[number]

/** Route of each tab without the locale prefix, the same shape `Base.astro`'s `path` prop has. */
export const TAB_PATHS: Record<Tab, string> = {
	dashboard: "",
	dex: "dex",
	tracker: "tracker",
	news: "news",
	settings: "settings",
}

/** The tabs the manifest's app shortcuts open, in menu order (public/manifest.webmanifest). A
 *  shortcut's URL is `/?tab=<id>`: the root page sends it to that tab in the reader's language.
 *  Never the dashboard: its path is empty, and the root page opens it already. */
export const SHORTCUT_TABS = ["tracker", "dex", "news"] as const satisfies readonly Exclude<
	Tab,
	"dashboard"
>[]

/** The tab the page belongs to, from the first path segment. Guides belong to none. */
export function currentTab(path: string, tab?: Tab | null): Tab | null {
	if (tab !== undefined) return tab
	const first = path.split("/")[0]
	return TABS.find((id) => TAB_PATHS[id] === first) ?? null
}
