// Seed loading. The item rules live in seedBuild.ts, the source rules in tiers.ts. Runs at build
// (Astro pages), in tests, and in the island (which only reads the exported constants). Throws at
// module load when the shipped seed is invalid, so a bad seed fails the build and CI.
import { z } from "astro/zod"
import allowlistJson from "../../allowlist.json"
import categoriesJson from "../seed/categories.json"
import factsJson from "../seed/facts.json"
import rumoursJson from "../seed/rumours.json"
import shippedIds from "../seed/shipped-ids.txt?raw"
import {
	type Allowlist,
	allowlistSchema,
	type Fact,
	factInputSchema,
	type Rumour,
	rumourInputSchema,
	type SeedItem,
} from "./schema"
import { buildSeed, duplicates, idsIn } from "./seedBuild"
import { attachTiers, officialErrors } from "./tiers"

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

/** Category ids in seed order (categories.json). */
export function categoryIds(items: SeedItem[]): string[] {
	return [...new Set(items.map((i) => i.category))]
}

/** Items by group in seed order: groups by their header's `order`, items by the group's `sort`.
 *  seedBuild sorts once, so every page and the tracker list items the same way. */
export function groupItems(items: SeedItem[]): Map<string, SeedItem[]> {
	const groups = new Map<string, SeedItem[]>()
	for (const item of items) {
		const list = groups.get(item.group)
		if (list) list.push(item)
		else groups.set(item.group, [item])
	}
	return groups
}

// Every JSON file at any depth, so a misplaced one reaches buildSeed's path check instead of
// being skipped without a word.
const groupFiles = import.meta.glob<{ default: unknown }>("../seed/categories/**/*.json", {
	eager: true,
})
const built = buildSeed({
	categories: categoriesJson,
	groups: Object.fromEntries(
		Object.entries(groupFiles).map(([path, mod]) => [
			path.replace("../seed/categories/", ""),
			mod.default,
		])
	),
	shipped: shippedIds,
	allowlist,
})
const news = {
	rumours: validateRumours(rumoursJson, allowlist),
	facts: validateFacts(factsJson, allowlist),
}
const crossIds = [
	...new Set(built.items.map((i) => i.id)),
	...idsIn(rumoursJson),
	...idsIn(factsJson),
]
const crossErrors = duplicates(crossIds).map((id) => `duplicate id ${id}`)
const errors = [...built.errors, ...news.rumours.errors, ...news.facts.errors, ...crossErrors]
if (errors.length > 0) throw new Error(`Seed invalid:\n${errors.join("\n")}`)

export const seedItems: SeedItem[] = built.items
export const rumours: Rumour[] = news.rumours.rumours
export const facts: Fact[] = news.facts.facts
