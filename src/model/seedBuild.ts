// The seed pipeline (category model spec §3, §5, §6, §8). Pure: it gets the parsed files and
// returns the items in display order plus every error, so Vitest runs it on fixtures and seed.ts
// runs it on the shipped files. The build fails on any error.
import type { z } from "astro/zod"
import { normalize } from "./normalize"
import {
	type Allowlist,
	categoriesFileSchema,
	type GroupFile,
	groupFileSchema,
	type ItemInput,
	type ItemLocation,
	type ItemSource,
	idSchema,
	PLATFORMS,
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

type SpecKind = "text" | "bar"
const BASE_VEHICLE = { style: "text", era: "text", modShop: "text" } as const
const STANDOUT = {
	rating: "text",
	speed: "bar",
	acceleration: "bar",
	asphaltHandling: "bar",
	offRoadHandling: "bar",
	strength: "bar",
} as const
const WEAPON = { damage: "bar", accuracy: "bar", handling: "bar", range: "bar" } as const

/** Spec §8.7: the spec keys each group's Progress screen shows. Any other key fails the build. */
export const SPEC_KEYS: Readonly<
	Record<string, Readonly<Record<string, Readonly<Record<string, SpecKind>>>>>
> = {
	vehicles: {
		cars: BASE_VEHICLE,
		bikes: BASE_VEHICLE,
		watercraft: BASE_VEHICLE,
		aircraft: BASE_VEHICLE,
		service: BASE_VEHICLE,
		standout: STANDOUT,
	},
	weapons: { guns: WEAPON, melee: WEAPON, explosives: WEAPON, variants: WEAPON },
}

function specErrors(
	id: string,
	category: string,
	group: string,
	specs: Record<string, string | number>
): string[] {
	const byGroup = Object.hasOwn(SPEC_KEYS, category) ? SPEC_KEYS[category] : undefined
	const allowed = byGroup && Object.hasOwn(byGroup, group) ? byGroup[group] : undefined
	if (!allowed) return [`${id}: ${category}/${group} takes no specs`]
	return Object.entries(specs).flatMap(([key, value]) => {
		if (!Object.hasOwn(allowed, key))
			return [`${id}: unknown spec key ${key} for ${category}/${group}`]
		if (allowed[key] === "bar" && typeof value !== "number")
			return [`${id}: spec ${key} must be a 1 to 10 bar`]
		if (allowed[key] === "text" && typeof value !== "string")
			return [`${id}: spec ${key} must be text from the screen`]
		return []
	})
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

/** Spec §8.4, §8.6, §8.7: what the schema cannot see on its own. */
function extrasErrors(category: string, group: string, input: ItemInput): string[] {
	const { id } = input
	const errors: string[] = []
	if (input.spoiler === "story")
		errors.push(`${id}: story spoilers wait for the Hide spoilers switch (spec §8.4)`)
	if (input.spoiler === "gate")
		errors.push(`${id}: gate spoilers wait for their disclosure (spec §8.4)`)
	const limited = input.platforms !== undefined && new Set(input.platforms).size < PLATFORMS.length
	if (input.mode === "online" || limited)
		errors.push(
			`${id}: online and platform-limited items wait for the Settings preference (spec §8.6)`
		)
	if (input.specs) errors.push(...specErrors(id, category, group, input.specs))
	return errors
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
	if (file.spoiler === "story")
		errors.push(`${where}: story spoilers wait for the Hide spoilers switch (spec §8.4)`)
	if (file.spoiler === "gate")
		errors.push(`${where}: gate spoilers wait for their disclosure (spec §8.4)`)
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

/** Spec §6 and §8.1, within one category: a live item may not take a retired item's name unless
 *  it replaces it, and an alias may not be another live item's name or alias. */
function nameErrors(category: string, items: SeedItem[]): string[] {
	const errors: string[] = []
	const retired = new Map<string, string[]>()
	for (const item of items)
		if (item.retired) {
			const key = normalize(item.name)
			retired.set(key, [...(retired.get(key) ?? []), item.id])
		}
	const live = items.filter((item) => !item.retired)
	const owner = new Map<string, string>()
	for (const item of live) owner.set(normalize(item.name), item.id)
	for (const item of live) {
		for (const name of [item.name, ...(item.aliases ?? [])]) {
			const twins = retired.get(normalize(name)) ?? []
			if (twins.length > 0 && !twins.some((twin) => (item.replaces ?? []).includes(twin)))
				errors.push(`${item.id}: same name as retired ${twins.join(", ")}; add replaces`)
		}
		for (const alias of item.aliases ?? []) {
			const key = normalize(alias)
			const other = owner.get(key)
			if (other && other !== item.id)
				errors.push(`${item.id}: alias ${alias} is already a name or alias in ${category}`)
			else owner.set(key, item.id)
		}
	}
	return errors
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
	const story = new Set(
		parsed.data.categories.filter((c) => c.spoiler === "story").map((c) => c.id)
	)
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
		if (story.has(category)) {
			errors.push(`${path}: story content waits for the Hide spoilers switch (spec §8.4)`)
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

/** Spec §6 checks 2 and 3, which need main's list, so CI runs them (shippedIds.ci.test.ts). */
export function shippedIdErrors(
	main: string[],
	head: string[],
	seed: { id: string; category: string }[]
): string[] {
	const onMain = new Set(main)
	const atHead = new Set(head)
	return [
		...main
			.filter((id) => !atHead.has(id))
			.map((id) => `shipped-ids.txt drops ${id}, which is on main`),
		...seed
			.filter((item) => !onMain.has(item.id) && !item.id.startsWith(`${item.category}/`))
			.map((item) => `${item.id}: a new id must start with ${item.category}/`),
	]
}

/** Empty main text means main has no list yet: the PR that adds the file passes. */
export function ciShippedErrors(
	mainText: string,
	headText: string,
	seed: { id: string; category: string }[]
): string[] {
	if (mainText.trim() === "") return []
	return shippedIdErrors(parseShipped(mainText).ids, parseShipped(headText).ids, seed)
}
