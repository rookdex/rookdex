// A version 1 export file for one profile. Its own module with type-only imports, so the tracker
// exports synchronously without loading Zod (data delivery plan, Task 6b). transfer.ts re-exports it.
import type { ExportFileV1, Profile, ProgressRecord } from "./schema"

/** The day in an export or backup file name: the UTC date of `now`. */
export function exportDay(now: Date): string {
	return now.toISOString().slice(0, 10)
}

export function buildExport(
	profile: Profile,
	records: ProgressRecord[],
	now: Date
): { filename: string; file: ExportFileV1 } {
	const file: ExportFileV1 = {
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
	return { filename: `rookdex-${slug}-${exportDay(now)}.json`, file }
}
