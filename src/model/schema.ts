// Every shape that crosses a boundary: seed JSON at build, imports at runtime, IndexedDB records.
// Zod 4 via astro/zod, so no extra dependency.
import { z } from "astro/zod"
import { ID_PATTERN, MAX_BACKUP_PROFILES, MAX_RECORDS, SLUG, TEXT } from "./limits"

// Zod probes for eval with a caught Function("") before compiling fast parsers. Our CSP has no
// 'unsafe-eval', so the browser blocks the probe and reports it as an issue on every page whose
// island parses. Jitless skips the probe; the CSP would block the fast path anyway.
z.config({ jitless: true })

export { ID_PATTERN, MAX_BACKUP_PROFILES, MAX_RECORDS, SLUG, TEXT } from "./limits"

const FORBIDDEN = /[<>]|http/i
export const slugSchema = z.string().regex(SLUG)

/** Plain text: trimmed, non-empty, capped, no URLs, no markup. */
export function text(max: number) {
	return z
		.string()
		.trim()
		.min(1)
		.max(max)
		.refine((value) => !FORBIDDEN.test(value), { message: "no URLs or markup" })
}

export const idSchema = z.string().max(80).regex(ID_PATTERN)

/** As authored in JSON. The tier is derived from the allowlist, never written by hand. */
export const sourceInputSchema = z.strictObject({
	url: z.url({ protocol: /^https$/ }),
	title: text(TEXT.sourceTitle),
})
export const tierSchema = z.enum(["official", "press"])
export const sourceSchema = sourceInputSchema.extend({ tier: tierSchema })

/** Category model spec §8.7: a reading off a game screen. It has no URL. The screen is its menu
 *  path, one entry per level (["Progress", "Vehicles", "Cars"]): `text()` forbids `>`. */
export const gameSourceSchema = z.strictObject({
	kind: z.literal("game"),
	screen: z.array(text(TEXT.name)).min(1).max(4),
})
export const itemSourceInputSchema = z.union([sourceInputSchema, gameSourceSchema])

export const SPOILERS = ["story", "gate"] as const
export const PLATFORMS = ["ps5", "xbox", "pc"] as const

/** Spec §8.2: one or two sentences in my own words, never pasted guide text. */
const tipSchema = z.strictObject({
	text: text(TEXT.tip),
	spoiler: z.enum(SPOILERS).optional(),
	sources: z.array(itemSourceInputSchema).min(1),
})

/** Spec §8.3: words plus a link to a guide page. No x/y until the map spec. */
const locationSchema = z.strictObject({
	area: text(TEXT.area),
	kind: z.enum(["find", "spawn", "buy", "unlock"]),
	link: sourceInputSchema.optional(),
})

/** Spec §8.7: a bar read off the screen as 1 to 10, or exact text from the screen. Which keys a
 *  group takes is checked in seedBuild.ts (SPEC_KEYS). */
export const specValueSchema = z.union([z.int().min(1).max(10), text(TEXT.name)])

/** One item as authored in a group file. The folder and file give its category and group. */
export const itemInputSchema = z.strictObject({
	id: idSchema,
	set: slugSchema.optional(),
	name: text(TEXT.name),
	status: z.enum(["confirmed", "expected"]),
	precedent: text(TEXT.name).optional(),
	description: text(TEXT.description).optional(),
	/** May be empty only when the group header has sources (seedBuild checks it). */
	sources: z.array(itemSourceInputSchema),
	retired: z.boolean().optional(),
	/** Retired ids this item is the same thing as, so a twin name is allowed (spec §6). */
	replaces: z.array(idSchema).min(1).optional(),
	/** Old or common names. Search matches them; they are never shown (spec §8.1). */
	aliases: z.array(text(TEXT.name)).min(1).max(5).optional(),
	tips: z.array(tipSchema).min(1).max(3).optional(),
	locations: z.array(locationSchema).min(1).max(10).optional(),
	spoiler: z.enum(SPOILERS).optional(),
	edition: z.enum(["ultimate", "plus"]).optional(),
	mode: z.enum(["story", "online"]).optional(),
	platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
	specs: z.record(z.string().regex(/^[a-z][a-zA-Z]{0,39}$/), specValueSchema).optional(),
})

/** `src/seed/categories/<category>/<group>.json` (spec §3). */
export const groupFileSchema = z.strictObject({
	group: slugSchema,
	/** Position among the category's groups: the game's tab order. */
	order: z.int().min(1),
	/** The game's count. Absent while it is unsettled (spec §2) and for my own groups. */
	total: z.int().min(1).optional(),
	sort: z.enum(["name", "file"]),
	/** false: shown but never counted. Absent means true. */
	counts: z.boolean().optional(),
	spoiler: z.enum(SPOILERS).optional(),
	sets: z.array(z.strictObject({ id: slugSchema, total: z.int().min(1).optional() })).optional(),
	sources: z.array(itemSourceInputSchema).optional(),
	items: z.array(itemInputSchema),
})

/** `src/seed/categories.json`: category order, and which one is a spoiler. */
export const categoriesFileSchema = z.strictObject({
	categories: z
		.array(z.strictObject({ id: slugSchema, spoiler: z.literal("story").optional() }))
		.min(1),
})

export const rumourInputSchema = z.strictObject({
	id: idSchema,
	name: text(TEXT.name),
	claim_key: z.string().regex(/^[a-z0-9-]{1,80}$/),
	summary: text(TEXT.summary),
	/** The day the rumour was added, `YYYY-MM-DD`. Latest and News sort by it (dashboard spec §6.3). */
	added: z.iso.date(),
	sources: z.array(sourceInputSchema).min(1),
})
export const rumourSchema = rumourInputSchema.extend({ sources: z.array(sourceSchema).min(1) })

/** One string per shipped locale: a fact is written in every language, unlike a rumour. */
function localized(max: number) {
	return z.strictObject({ en: text(max), nb: text(max) })
}

/** A confirmed fact on News, hand-curated until the phase 1c facts feed takes over. */
export const factInputSchema = z.strictObject({
	id: idSchema,
	claim_key: z.string().regex(/^[a-z0-9-]{1,80}$/),
	name: localized(TEXT.name),
	summary: localized(TEXT.summary),
	/** The day Rockstar or Take-Two announced it, `YYYY-MM-DD`. News sorts by it, newest first. */
	announced: z.iso.date(),
	sources: z.array(sourceInputSchema).min(1),
})
export const factSchema = factInputSchema.extend({ sources: z.array(sourceSchema).min(1) })

export const progressRecordSchema = z.strictObject({
	item_id: idSchema,
	done: z.boolean(),
	updated_at: z.iso.datetime(),
	note: z.string().max(TEXT.note).optional(),
	origin: z.literal("manual"),
})

export const profileSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(TEXT.profileName),
	created_at: z.iso.datetime(),
	deleted_at: z.iso.datetime().optional(),
})

const profileNameSchema = z.string().trim().min(1).max(TEXT.profileName)

/** Version 1: one profile, from the Tracker's profile menu. Still read unchanged. */
export const exportFileV1Schema = z.strictObject({
	version: z.literal(1),
	exported_at: z.iso.datetime(),
	profile_name: profileNameSchema,
	records: z.array(progressRecordSchema).max(MAX_RECORDS),
})

/** Version 2: every profile, from Back up in Settings. MAX_RECORDS caps the whole file. */
export const backupFileSchema = z
	.strictObject({
		version: z.literal(2),
		exported_at: z.iso.datetime(),
		profiles: z
			.array(z.strictObject({ name: profileNameSchema, records: z.array(progressRecordSchema) }))
			.min(1)
			.max(MAX_BACKUP_PROFILES),
	})
	.refine((file) => recordCount(file.profiles) <= MAX_RECORDS, { message: "too many records" })

export const exportFileSchema = z.discriminatedUnion("version", [
	exportFileV1Schema,
	backupFileSchema,
])

export function recordCount(profiles: { records: unknown[] }[]): number {
	return profiles.reduce((sum, p) => sum + p.records.length, 0)
}

export const allowlistSchema = z.strictObject({
	official: z.array(z.string().min(1)),
	press: z.array(z.string().min(1)),
	blocklist: z.array(z.string().min(1)),
})

export type Tier = z.infer<typeof tierSchema>
export type SourceInput = z.infer<typeof sourceInputSchema>
export type Source = z.infer<typeof sourceSchema>
export type GameSource = z.infer<typeof gameSourceSchema>
export type ItemSourceInput = z.infer<typeof itemSourceInputSchema>
export type ItemSource = Source | GameSource
export type Spoiler = (typeof SPOILERS)[number]
export type ItemInput = z.infer<typeof itemInputSchema>
export type GroupFile = z.infer<typeof groupFileSchema>
export interface Tip {
	text: string
	spoiler?: Spoiler
	sources: ItemSource[]
}
export interface ItemLocation {
	area: string
	kind: "find" | "spawn" | "buy" | "unlock"
	link?: Source
}
/** An item after the build: category and group from its file, sources tiered and joined with the
 *  header's, `uncounted` when its group has `counts: false` or it is edition-only. */
export type SeedItem = Omit<ItemInput, "sources" | "tips" | "locations"> & {
	category: string
	group: string
	sources: ItemSource[]
	tips?: Tip[]
	locations?: ItemLocation[]
	uncounted?: true
}
export type RumourInput = z.infer<typeof rumourInputSchema>
export type Rumour = z.infer<typeof rumourSchema>
export type FactInput = z.infer<typeof factInputSchema>
export type Fact = z.infer<typeof factSchema>
export type ProgressRecord = z.infer<typeof progressRecordSchema>
export type Profile = z.infer<typeof profileSchema>
export type ExportFileV1 = z.infer<typeof exportFileV1Schema>
export type BackupFile = z.infer<typeof backupFileSchema>
export type ExportFile = z.infer<typeof exportFileSchema>
export type Allowlist = z.infer<typeof allowlistSchema>
