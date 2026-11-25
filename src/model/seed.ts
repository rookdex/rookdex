// Seed loading and the source-tier rules. Runs at build (Astro pages), in tests, and in the
// island (which only reads the exported constants). Throws at module load when the shipped
// seed is invalid, so a bad seed fails the build and CI.
import { z } from "astro/zod"
import allowlistJson from "../../allowlist.json"
import {
	type Allowlist,
	allowlistSchema,
	type Fact,
	factInputSchema,
	type Rumour,
	rumourInputSchema,
	type SeedItem,
	seedItemInputSchema,
} from "./schema"
import { attachTiers, officialErrors, tierErrors } from "./tiers"

export const allowlist: Allowlist = allowlistSchema.parse(allowlistJson)

export {
	isVideo,
	matchesPrefix,
	resolveTier,
	type TierResult,
	tierErrors,
} from "./tiers"

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
		const ruleErrors = tierErrors(item, list)
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

/** Facts follow the same source rule as a confirmed seed item. */
export function validateFacts(data: unknown, list: Allowlist): { facts: Fact[]; errors: string[] } {
	const parsed = z.array(factInputSchema).safeParse(data)
	if (!parsed.success) return { facts: [], errors: issueMessages("facts", parsed.error) }
	const facts: Fact[] = []
	const errors: string[] = []
	for (const input of parsed.data) {
		const tiered = attachTiers(input.id, input.sources, list)
		errors.push(...tiered.errors)
		if (tiered.errors.length > 0) continue
		const ruleErrors = officialErrors(input.id, tiered.sources)
		errors.push(...ruleErrors)
		if (ruleErrors.length === 0) facts.push({ ...input, sources: tiered.sources })
	}
	return { facts, errors }
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
): { items: SeedItem[]; rumours: Rumour[]; facts: Fact[]; errors: string[] } {
	const items: SeedItem[] = []
	let rumours: Rumour[] = []
	let facts: Fact[] = []
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
		if (category === "facts") {
			const result = validateFacts(data, list)
			facts = result.facts
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
	return { items, rumours, facts, errors }
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
export const facts: Fact[] = loaded.facts
