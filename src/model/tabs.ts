// The four tabs (spec §5). The current one is worked out at build from the page's path, so the
// tab bar needs no JavaScript.

export const TABS = ["home", "tracker", "news", "settings"] as const
export type Tab = (typeof TABS)[number]

/** Route of each tab without the locale prefix, the same shape `Base.astro`'s `path` prop has. */
export const TAB_PATHS: Record<Tab, string> = {
	home: "",
	tracker: "tracker",
	news: "news",
	settings: "settings",
}

/** The tab the page belongs to, from the first path segment. Guides belong to none. */
export function currentTab(path: string, tab?: Tab | null): Tab | null {
	if (tab !== undefined) return tab
	const first = path.split("/")[0]
	return TABS.find((id) => TAB_PATHS[id] === first) ?? null
}
