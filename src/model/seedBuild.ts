// The seed pipeline (category model spec §3, §5, §6, §8). Pure: it gets the parsed files and
// returns the items in display order plus every error, so Vitest runs it on fixtures and seed.ts
// runs it on the shipped files. The build fails on any error.
import type { z } from "astro/zod"
import {
	type Allowlist,
	categoriesFileSchema,
	type GroupFile,
	groupFileSchema,
	type ItemInput,
	type ItemLocation,
	type ItemSource,
	idSchema,
	type SeedItem,
	type Spoiler,
	type Tip,
} from "./schema"
import { resolveTier, tierErrors, tierItemSources } from "./tiers"

export interface SeedInput {
	/** categories.json, parsed. */
	categories: unknown
	/** "<category>/<group>.json" to that file's parsed JSON. */
	groups: Record<string, unknown>
	/** shipped-ids.txt as text. */
	shipped: string
	allowlist: Allowlist
}
export interface SeedCategory {
	id: string
	spoiler?: "story"
}
export interface SeedGroup {
	category: string
	id: string
	order: number
	total?: number
	sets: { id: string; total?: number }[]
	counts: boolean
	spoiler?: Spoiler
}
export interface SeedResult {
	categories: SeedCategory[]
	groups: SeedGroup[]
	items: SeedItem[]
	errors: string[]
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

/** Spec §3: a leading model year ("1955 ", "'70 " or "’70 ") and leading punctuation are
 *  ignored, so "'70 Vapid Ganado" and "1955 Vapid Stanier" sort under V. The collator compares
 *  numbers by value. */
export function sortKey(name: string): string {
	return name
		.replace(/^(19|20)\d{2}\s+/, "")
		.replace(/^['’]\d{2}\s+/, "")
		.replace(/^[^\p{L}\p{N}]+/u, "")
}

function byName(a: SeedItem, b: SeedItem): number {
	return collator.compare(sortKey(a.name), sortKey(b.name))
}

export function parseShipped(text: string): { ids: string[]; errors: string[] } {
	const ids: string[] = []
	const errors: string[] = []
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim()
		if (line === "" || line.startsWith("#")) continue
		if (idSchema.safeParse(line).success) ids.push(line)
		else errors.push(`shipped-ids.txt: "${line}" is not an id`)
	}
	return { ids, errors }
}

function issues(prefix: string, error: z.ZodError): string[] {
	return error.issues.map(
		(issue) => `${prefix} ${issue.path.map(String).join(".")}: ${issue.message}`
	)
}

/** Ids straight off a raw JSON items array, so a duplicate is caught even when one copy fails
 *  validation. Anything that is not an array gives no ids. */
export function idsIn(items: unknown): string[] {
	if (!Array.isArray(items)) return []
	return items
		.map((entry) =>
			entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined
		)
		.filter((id): id is string => typeof id === "string")
}

/** Each value that occurs more than once, listed once, in the order its second copy appears. */
export function duplicates(values: string[]): string[] {
	const seen = new Set<string>()
	const twice = new Set<string>()
	for (const value of values) {
		if (seen.has(value)) twice.add(value)
		seen.add(value)
	}
	return [...twice]
}

function sourceKey(source: ItemSource): string {
	return "kind" in source ? `game:${source.screen.join("/")}` : source.url
}

/** The item's own sources first, then the header's it does not already cite. */
function joinSources(own: ItemSource[], header: ItemSource[]): ItemSource[] {
	const seen = new Set(own.map(sourceKey))
	return [...own, ...header.filter((s) => !seen.has(sourceKey(s)))]
}

function buildItem(
	category: string,
	group: string,
	input: ItemInput,
	header: ItemSource[],
	setIds: Set<string>,
	counts: boolean,
	list: Allowlist
): { item?: SeedItem; errors: string[] } {
	const { id } = input
	const errors: string[] = []
	if (input.set !== undefined && !setIds.has(input.set))
		errors.push(`${id}: unknown set ${input.set}`)
	const own = tierItemSources(id, input.sources, list)
	errors.push(...own.errors)
	if (input.sources.length === 0 && header.length === 0)
		errors.push(`${id}: no sources, and the group header has none`)
	errors.push(...extrasErrors(category, group, input))
	const tips: Tip[] | undefined = input.tips?.map((tip, index) => {
		const tiered = tierItemSources(`${id} tip ${index + 1}`, tip.sources, list)
		errors.push(...tiered.errors)
		return { ...tip, sources: tiered.sources }
	})
	const locations: ItemLocation[] | undefined = input.locations?.map((location) => {
		if (!location.link) return { area: location.area, kind: location.kind }
		const tier = resolveTier(location.link.url, list)
		if (tier === "blocked" || tier === "unlisted") {
			errors.push(`${id}: location link ${location.link.url} is ${tier}`)
			return { area: location.area, kind: location.kind }
		}
		return { ...location, link: { ...location.link, tier } }
	})
	if (errors.length > 0) return { errors }
	// Built from the rest, so the untiered sources, tips and locations never reach a SeedItem.
	const { sources: _sources, tips: _tips, locations: _locations, ...rest } = input
	const item: SeedItem = {
		...rest,
		category,
		group,
		sources: joinSources(own.sources, header),
		...(tips ? { tips } : {}),
		...(locations ? { locations } : {}),
		...(!counts || input.edition ? { uncounted: true as const } : {}),
	}
	const ruleErrors = tierErrors(item, list)
	return ruleErrors.length > 0 ? { errors: ruleErrors } : { item, errors: [] }
}

/** Task 4 fills this in; until then nothing is checked here. */
function extrasErrors(_category: string, _group: string, _input: ItemInput): string[] {
	return []
}

function totalErrors(where: string, file: GroupFile, items: SeedItem[]): string[] {
	const errors: string[] = []
	const listed = items.filter((item) => !item.retired && !item.uncounted)
	if (file.total !== undefined && listed.length > file.total)
		errors.push(`${where}: listed ${listed.length} above total ${file.total}`)
	for (const set of file.sets ?? []) {
		const count = listed.filter((item) => item.set === set.id).length
		if (set.total !== undefined && count > set.total)
			errors.push(`${where} set ${set.id}: listed ${count} above total ${set.total}`)
	}
	return errors
}

function buildGroup(
	category: string,
	file: GroupFile,
	list: Allowlist
): { group: SeedGroup; items: SeedItem[]; errors: string[] } {
	const where = `${category}/${file.group}`
	const errors: string[] = []
	const header = tierItemSources(where, file.sources ?? [], list)
	errors.push(...header.errors)
	const sets = file.sets ?? []
	errors.push(
		...duplicates(sets.map((s) => s.id)).map((id) => `${where}: set ${id} is listed twice`)
	)
	const setIds = new Set(sets.map((s) => s.id))
	const counts = file.counts !== false
	const built: SeedItem[] = []
	for (const input of file.items) {
		const result = buildItem(category, file.group, input, header.sources, setIds, counts, list)
		errors.push(...result.errors)
		if (result.item) built.push(result.item)
	}
	const items = file.sort === "name" ? [...built].sort(byName) : built
	errors.push(...totalErrors(where, file, items))
	const group: SeedGroup = { category, id: file.group, order: file.order, sets, counts }
	if (file.total !== undefined) group.total = file.total
	if (file.spoiler !== undefined) group.spoiler = file.spoiler
	return { group, items, errors }
}

function shippedErrors(shipped: string[], seedIds: string[]): string[] {
	const inSeed = new Set(seedIds)
	const inFile = new Set(shipped)
	return [
		...shipped
			.filter((id) => !inSeed.has(id))
			.map((id) => `${id}: shipped id is missing from the seed; retire it instead (spec §6)`),
		...[...inSeed]
			.filter((id) => !inFile.has(id))
			.map((id) => `${id}: not in shipped-ids.txt; add its line`),
	]
}

/** Task 4 fills this in: twin names and alias collisions within a category. */
function nameErrors(_category: string, _items: SeedItem[]): string[] {
	return []
}

export function buildSeed(input: SeedInput): SeedResult {
	const parsed = categoriesFileSchema.safeParse(input.categories)
	if (!parsed.success)
		return {
			categories: [],
			groups: [],
			items: [],
			errors: issues("categories.json", parsed.error),
		}
	const errors: string[] = []
	const categoryList = parsed.data.categories.map((c) => c.id)
	errors.push(...duplicates(categoryList).map((id) => `categories.json: ${id} is listed twice`))
	const known = new Set(categoryList)
	const files = new Map<string, GroupFile[]>()
	const allIds: string[] = []
	for (const [path, data] of Object.entries(input.groups).sort(([a], [b]) => a.localeCompare(b))) {
		allIds.push(
			...idsIn(data && typeof data === "object" ? (data as { items?: unknown }).items : undefined)
		)
		const parts = path.replace(/\.json$/, "").split("/")
		const [category = "", name = ""] = parts
		if (parts.length !== 2) {
			errors.push(`${path}: a group file sits at <category>/<group>.json`)
			continue
		}
		if (!known.has(category)) {
			errors.push(`${path}: ${category} is not in categories.json`)
			continue
		}
		const file = groupFileSchema.safeParse(data)
		if (!file.success) {
			errors.push(...issues(path, file.error))
			continue
		}
		if (file.data.group !== name) {
			errors.push(`${path}: group must be ${name}`)
			continue
		}
		files.set(category, [...(files.get(category) ?? []), file.data])
	}
	const categories: SeedCategory[] = []
	const groups: SeedGroup[] = []
	const items: SeedItem[] = []
	for (const category of parsed.data.categories) {
		// A second line for the same id is already an error above; build the category once.
		if (categories.some((c) => c.id === category.id)) continue
		const list = [...(files.get(category.id) ?? [])].sort((a, b) => a.order - b.order)
		if (list.length === 0) continue
		for (let i = 1; i < list.length; i++) {
			if (list[i].order === list[i - 1].order)
				errors.push(
					`${category.id}: groups ${list[i - 1].group} and ${list[i].group} share order ${list[i].order}`
				)
		}
		categories.push(category)
		const own: SeedItem[] = []
		for (const file of list) {
			const built = buildGroup(category.id, file, input.allowlist)
			errors.push(...built.errors)
			groups.push(built.group)
			own.push(...built.items)
		}
		errors.push(...nameErrors(category.id, own))
		items.push(...own)
	}
	errors.push(...duplicates(allIds).map((id) => `duplicate id ${id}`))
	const shipped = parseShipped(input.shipped)
	errors.push(...shipped.errors, ...shippedErrors(shipped.ids, allIds))
	return { categories, groups, items, errors }
}
