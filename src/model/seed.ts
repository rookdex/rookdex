// Seed loading and the source-tier rules. Runs at build (Astro pages), in tests, and in the
// island (which only reads the exported constants). Throws at module load when the shipped
// seed is invalid, so a bad seed fails the build and CI.
import { z } from "astro/zod"
import allowlistJson from "../../allowlist.json"
import { normalizeHost } from "./outlet"
import {
	type Allowlist,
	allowlistSchema,
	type Rumour,
	rumourInputSchema,
	type SeedItem,
	type Source,
	type SourceInput,
	seedItemInputSchema,
	type Tier,
} from "./schema"

export const allowlist: Allowlist = allowlistSchema.parse(allowlistJson)

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

function attachTiers(
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

/** Spec §4: what each status needs from its sources. */
export function tierErrors(item: SeedItem): string[] {
	const errors: string[] = []
	const official = item.sources.filter((s) => s.tier === "official")
	const press = item.sources.filter((s) => s.tier === "press")
	if (item.status === "confirmed") {
		if (official.length === 0) errors.push(`${item.id}: confirmed needs an official source`)
		else if (official.every((s) => isVideo(s.url)) && press.length === 0)
			errors.push(`${item.id}: video-only official source needs a press source naming the item`)
	} else if (!item.precedent) {
		errors.push(`${item.id}: expected needs a precedent`)
	}
	return errors
}

function issueMessages(prefix: string, error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const [index, ...rest] = issue.path
		const field = rest.length > 0 ? `.${rest.map(String).join(".")}` : ""
		return `${prefix}[${String(index)}]${field}: ${issue.message}`
	})
}

export function validateSeedFile(
	category: string,
	data: unknown,
	list: Allowlist
): { items: SeedItem[]; errors: string[] } {
	const parsed = z.array(seedItemInputSchema).safeParse(data)
	if (!parsed.success) return { items: [], errors: issueMessages(category, parsed.error) }
	const items: SeedItem[] = []
	const errors: string[] = []
	for (const input of parsed.data) {
		let mismatched = false
		if (input.category !== category) {
			errors.push(`${input.id}: category must be ${category}`)
			mismatched = true
		}
		if (!input.id.startsWith(`${category}/`)) {
			errors.push(`${input.id}: id must start with ${category}/`)
			mismatched = true
		}
		if (mismatched) continue
		const tiered = attachTiers(input.id, input.sources, list)
		errors.push(...tiered.errors)
		if (tiered.errors.length > 0) continue
		const item: SeedItem = { ...input, sources: tiered.sources }
		const ruleErrors = tierErrors(item)
		errors.push(...ruleErrors)
		if (ruleErrors.length === 0) items.push(item)
	}
	return { items, errors }
}

export function validateRumours(
	data: unknown,
	list: Allowlist
): { rumours: Rumour[]; errors: string[] } {
	const parsed = z.array(rumourInputSchema).safeParse(data)
	if (!parsed.success) return { rumours: [], errors: issueMessages("rumours", parsed.error) }
	const rumours: Rumour[] = []
	const errors: string[] = []
	for (const input of parsed.data) {
		const tiered = attachTiers(input.id, input.sources, list)
		errors.push(...tiered.errors)
		if (tiered.errors.length > 0) continue
		if (!tiered.sources.some((s) => s.tier === "press")) {
			errors.push(`${input.id}: rumour needs a press source`)
			continue
		}
		rumours.push({ ...input, sources: tiered.sources })
	}
	return { rumours, errors }
}

function categoryOf(path: string): string {
	return (path.split("/").pop() ?? "").replace(/\.json$/, "")
}

/**
 * Ids present in a raw seed file, read straight off the unvalidated JSON. Used only for the
 * cross-file duplicate check, which must catch a collision even when one of the two entries
 * also has a category/id-prefix error and is therefore dropped from the validated `items`.
 */
function idsIn(data: unknown): string[] {
	if (!Array.isArray(data)) return []
	return data
		.map((entry) =>
			entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined
		)
		.filter((id): id is string => typeof id === "string")
}

/** `files` maps a path ending in `<category>.json` to that file's parsed JSON. */
export function loadAll(
	files: Record<string, unknown>,
	list: Allowlist
): { items: SeedItem[]; rumours: Rumour[]; errors: string[] } {
	const items: SeedItem[] = []
	let rumours: Rumour[] = []
	const errors: string[] = []
	const allIds: string[] = []
	const categories = Object.entries(files)
		.map(([path, data]) => [categoryOf(path), data] as const)
		.sort(([a], [b]) => a.localeCompare(b))
	for (const [category, data] of categories) {
		allIds.push(...idsIn(data))
		if (category === "rumours") {
			const result = validateRumours(data, list)
			rumours = result.rumours
			errors.push(...result.errors)
			continue
		}
		const result = validateSeedFile(category, data, list)
		items.push(...result.items)
		errors.push(...result.errors)
	}
	const seen = new Set<string>()
	for (const id of allIds) {
		if (seen.has(id)) errors.push(`duplicate id ${id}`)
		seen.add(id)
	}
	return { items, rumours, errors }
}

/** Category ids in the order items appear (alphabetical by file name). */
export function categoryIds(items: SeedItem[]): string[] {
	return [...new Set(items.map((i) => i.category))]
}

/** Items by group, groups alphabetical, items alphabetical by name within a group. */
export function groupItems(items: SeedItem[]): Map<string, SeedItem[]> {
	const groups = new Map<string, SeedItem[]>()
	for (const item of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
		const list = groups.get(item.group) ?? []
		list.push(item)
		groups.set(item.group, list)
	}
	return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

const seedFiles = import.meta.glob<{ default: unknown }>("../seed/*.json", { eager: true })
const loaded = loadAll(
	Object.fromEntries(Object.entries(seedFiles).map(([path, mod]) => [path, mod.default])),
	allowlist
)
if (loaded.errors.length > 0) throw new Error(`Seed invalid:\n${loaded.errors.join("\n")}`)

export const seedItems: SeedItem[] = loaded.items
export const rumours: Rumour[] = loaded.rumours
