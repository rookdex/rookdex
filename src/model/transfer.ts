// Export file build and import validation. The file carries the profile name and records only.
import { listRecords, mergeRecords, replaceRecords } from "./progress"
import { type ExportFile, exportFileSchema, type Profile, type ProgressRecord } from "./schema"
import type { Store } from "./store"

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export type ImportError = "too-large" | "not-json" | "not-export"
export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: ImportError }

export function buildExport(
	profile: Profile,
	records: ProgressRecord[],
	now: Date
): { filename: string; file: ExportFile } {
	const file: ExportFile = {
		version: 1,
		exported_at: now.toISOString(),
		profile_name: profile.name,
		records,
	}
	const slug =
		profile.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "profile"
	return { filename: `rookdex-${slug}-${now.toISOString().slice(0, 10)}.json`, file }
}

/** `bytes` is the file size checked before reading; it defaults to the text length. */
export function parseImport(text: string, bytes = text.length): ParseResult {
	if (bytes > MAX_IMPORT_BYTES) return { ok: false, error: "too-large" }
	let data: unknown
	try {
		data = JSON.parse(text)
	} catch {
		return { ok: false, error: "not-json" }
	}
	const parsed = exportFileSchema.safeParse(data)
	return parsed.success ? { ok: true, file: parsed.data } : { ok: false, error: "not-export" }
}

/** Merges the file's records into the profile's and swaps the set in one transaction. */
export async function importRecords(
	store: Store,
	profileId: string,
	file: ExportFile
): Promise<ProgressRecord[]> {
	const merged = mergeRecords(await listRecords(store, profileId), file.records)
	await replaceRecords(store, profileId, merged)
	return merged
}
