// Source tiers and the status rules (spec §4, category model spec §9). A leaf below seed.ts and
// seedBuild.ts, so neither imports the other.
import { normalizeHost } from "./outlet"
import type {
	Allowlist,
	GameSource,
	ItemSource,
	ItemSourceInput,
	SeedItem,
	Source,
	SourceInput,
	Tier,
} from "./schema"

const VIDEO_HOSTS = ["youtube.com", "youtu.be"]

/**
 * `prefix` is a URL without scheme: a bare domain covers the domain and its subdomains,
 * `host/path` covers that host and paths under `/path`, and `host/path?query` names one exact
 * page (a trailer's watch URL; a channel prefix cannot cover `/watch`). Case-insensitive,
 * `www.` ignored.
 */
export function matchesPrefix(url: URL, prefix: string): boolean {
	const [rawHost = "", ...rest] = prefix.toLowerCase().split("/")
	const host = normalizeHost(rawHost)
	const urlHost = normalizeHost(url.hostname)
	if (urlHost !== host && !(rest.length === 0 && urlHost.endsWith(`.${host}`))) return false
	if (rest.length === 0) return true
	const path = `/${rest.join("/")}`
	if (!path.includes("?")) return url.pathname.toLowerCase().startsWith(path)
	const page = `${url.pathname}${url.search}`.toLowerCase()
	return page === path || page.startsWith(`${path}&`)
}

export type TierResult = Tier | "blocked" | "unlisted"

export function resolveTier(urlString: string, list: Allowlist): TierResult {
	const url = new URL(urlString)
	if (list.blocklist.some((p) => matchesPrefix(url, p))) return "blocked"
	if (list.official.some((p) => matchesPrefix(url, p))) return "official"
	if (list.press.some((p) => matchesPrefix(url, p))) return "press"
	return "unlisted"
}

export function isVideo(urlString: string): boolean {
	const url = new URL(urlString)
	return VIDEO_HOSTS.some((host) => matchesPrefix(url, host))
}

export function isGameSource(source: ItemSource | ItemSourceInput): source is GameSource {
	return "kind" in source
}

export function attachTiers(
	id: string,
	sources: SourceInput[],
	list: Allowlist
): { sources: Source[]; errors: string[] } {
	const errors: string[] = []
	const tiered: Source[] = []
	for (const source of sources) {
		const tier = resolveTier(source.url, list)
		if (tier === "blocked" || tier === "unlisted") {
			errors.push(`${id}: source ${source.url} is ${tier}`)
		} else {
			tiered.push({ ...source, tier })
		}
	}
	return { sources: tiered, errors }
}

/** As attachTiers, for item sources: a game screen has no URL and passes through. */
export function tierItemSources(
	id: string,
	sources: ItemSourceInput[],
	list: Allowlist
): { sources: ItemSource[]; errors: string[] } {
	const errors: string[] = []
	const tiered: ItemSource[] = []
	for (const source of sources) {
		if (isGameSource(source)) {
			tiered.push(source)
			continue
		}
		const result = attachTiers(id, [source], list)
		errors.push(...result.errors)
		tiered.push(...result.sources)
	}
	return { sources: tiered, errors }
}

/** Spec §4: confirmed needs an official source, and an official video alone needs press too.
 *  Facts keep this rule as it is. */
export function officialErrors(id: string, sources: Source[]): string[] {
	const official = sources.filter((s) => s.tier === "official")
	if (official.length === 0) return [`${id}: confirmed needs an official source`]
	if (official.every((s) => isVideo(s.url)) && !sources.some((s) => s.tier === "press"))
		return [`${id}: video-only official source needs a press source naming the item`]
	return []
}

/** The first press entry on the allowlist that covers `url`. Two press sources are independent
 *  when their entries differ, so ign.com and nordic.ign.com count as one outlet (spec §9). */
export function pressEntry(url: string, list: Allowlist): string | undefined {
	const parsed = new URL(url)
	return list.press.find((prefix) => matchesPrefix(parsed, prefix))
}

/** Category model spec §9: a game screen, the official rule above, or two press sources on
 *  different allowlist entries. */
export function confirmedItemErrors(id: string, sources: ItemSource[], list: Allowlist): string[] {
	if (sources.some(isGameSource)) return []
	const urls = sources.filter((s): s is Source => !isGameSource(s))
	const official = officialErrors(id, urls)
	if (official.length === 0) return []
	const entries = new Set(
		urls.filter((s) => s.tier === "press").flatMap((s) => pressEntry(s.url, list) ?? [])
	)
	if (entries.size >= 2) return []
	return urls.some((s) => s.tier === "official")
		? official
		: [
				`${id}: confirmed needs an official source, a game screen or two press sources on different allowlist entries`,
			]
}

/** What each status needs from its sources. */
export function tierErrors(item: SeedItem, list: Allowlist): string[] {
	if (item.status === "confirmed") return confirmedItemErrors(item.id, item.sources, list)
	return item.precedent ? [] : [`${item.id}: expected needs a precedent`]
}
