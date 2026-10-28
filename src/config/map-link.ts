import type { Key } from "../i18n"

export interface MapLink {
	readonly url: string
	readonly label: Key
	readonly title: Key
	readonly body: Key
}

// The dashboard's map card (desktop dashboard spec §4.7). It links out to Rockstar and never shows
// their map. When Rockstar publishes an official web map, change this entry and nothing else.
export const MAP_LINK: MapLink = {
	url: "https://www.rockstargames.com/VI",
	label: "hub.mapLabel",
	title: "hub.mapTitle",
	body: "hub.mapBody",
}

/** True only for https:// on rockstargames.com or a subdomain, so a typo or lookalike can't ship. */
export function isRockstarUrl(url: string): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return false
	}
	const host = parsed.hostname
	return (
		parsed.protocol === "https:" &&
		(host === "rockstargames.com" || host.endsWith(".rockstargames.com"))
	)
}
