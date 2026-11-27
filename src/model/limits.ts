// The size limits and id patterns that seed text and user data share. No imports, so browser code
// can read them without loading Zod (data delivery plan, Task 6b). schema.ts and transfer.ts
// re-export them. Not to be confused with src/islands/hub/limits.ts, the dashboard's row counts.

export const TEXT = {
	name: 80,
	description: 300,
	summary: 300,
	sourceTitle: 120,
	note: 500,
	profileName: 40,
	tip: 300,
	area: 120,
} as const

export const MAX_RECORDS = 10_000
/** Far above any real household; it only stops a crafted file from creating thousands. */
export const MAX_BACKUP_PROFILES = 100
/** Exactly `<category>/<kebab-name>`: one slash, so an id can also serve as a DOM id. */
export const ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/
export const SLUG = /^[a-z][a-z0-9-]{0,39}$/
/** An import file larger than this is refused before it is read. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
