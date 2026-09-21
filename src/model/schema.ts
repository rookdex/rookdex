// Every shape that crosses a boundary: seed JSON at build, imports at runtime, IndexedDB records.
// Zod 4 via astro/zod, so no extra dependency.
import { z } from "astro/zod"

export const TEXT = {
	name: 80,
	description: 300,
	summary: 300,
	sourceTitle: 120,
	note: 500,
	profileName: 40,
} as const

export const MAX_RECORDS = 10_000
/** Exactly `<category>/<kebab-name>`: one slash, so an id can also serve as a DOM id. */
export const ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/
const FORBIDDEN = /[<>]|http/i
const SLUG = /^[a-z][a-z0-9-]{0,39}$/

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

export const seedItemInputSchema = z.strictObject({
	id: idSchema,
	category: z.string().regex(SLUG),
	group: z.string().regex(SLUG),
	name: text(TEXT.name),
	status: z.enum(["confirmed", "expected"]),
	precedent: text(TEXT.name).optional(),
	description: text(TEXT.description).optional(),
	location: z
		.strictObject({ x: z.number(), y: z.number(), region: z.string().regex(SLUG) })
		.optional(),
	sources: z.array(sourceInputSchema).min(1),
	retired: z.boolean().optional(),
})
export const seedItemSchema = seedItemInputSchema.extend({ sources: z.array(sourceSchema).min(1) })

export const rumourInputSchema = z.strictObject({
	id: idSchema,
	name: text(TEXT.name),
	claim_key: z.string().regex(/^[a-z0-9-]{1,80}$/),
	summary: text(TEXT.summary),
	sources: z.array(sourceInputSchema).min(1),
})
export const rumourSchema = rumourInputSchema.extend({ sources: z.array(sourceSchema).min(1) })

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

export const exportFileSchema = z.strictObject({
	version: z.literal(1),
	exported_at: z.iso.datetime(),
	profile_name: z.string().trim().min(1).max(TEXT.profileName),
	records: z.array(progressRecordSchema).max(MAX_RECORDS),
})

export const allowlistSchema = z.strictObject({
	official: z.array(z.string().min(1)),
	press: z.array(z.string().min(1)),
	blocklist: z.array(z.string().min(1)),
})

export type Tier = z.infer<typeof tierSchema>
export type SourceInput = z.infer<typeof sourceInputSchema>
export type Source = z.infer<typeof sourceSchema>
export type SeedItemInput = z.infer<typeof seedItemInputSchema>
export type SeedItem = z.infer<typeof seedItemSchema>
export type RumourInput = z.infer<typeof rumourInputSchema>
export type Rumour = z.infer<typeof rumourSchema>
export type ProgressRecord = z.infer<typeof progressRecordSchema>
export type Profile = z.infer<typeof profileSchema>
export type ExportFile = z.infer<typeof exportFileSchema>
export type Allowlist = z.infer<typeof allowlistSchema>
