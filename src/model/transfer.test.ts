import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import { activeProfiles, listProfiles } from "./profiles"
import { listRecords, replaceRecords } from "./progress"
import { type ExportFile, MAX_BACKUP_PROFILES, MAX_RECORDS, type ProgressRecord } from "./schema"
import { openStore } from "./store"
import {
	backupEntries,
	buildBackup,
	buildExport,
	collectBackup,
	importAsNewProfile,
	importRecords,
	MAX_IMPORT_BYTES,
	parseImport,
	restoreBackup,
} from "./transfer"

const now = new Date("2026-09-16T10:00:00.000Z")
const profile = { id: "p1", name: "Malin & Dad", created_at: "2026-09-01T00:00:00.000Z" }
const record: ProgressRecord = {
	item_id: "wildlife/a",
	done: true,
	updated_at: "2026-09-10T00:00:00.000Z",
	origin: "manual",
	note: "near the marina",
}

describe("buildExport", () => {
	it("holds only version, timestamp, profile name and records", () => {
		const { filename, file } = buildExport(profile, [record], now)
		expect(file).toEqual({
			version: 1,
			exported_at: now.toISOString(),
			profile_name: "Malin & Dad",
			records: [record],
		})
		expect(Object.keys(file)).toEqual(["version", "exported_at", "profile_name", "records"])
		expect(filename).toBe("rookdex-malin-dad-2026-09-16.json")
	})
})

describe("parseImport", () => {
	const valid: ExportFile = buildExport(profile, [record], now).file
	it("accepts a valid export", () => {
		expect(parseImport(JSON.stringify(valid))).toEqual({ ok: true, file: valid })
	})
	it("rejects by size before parsing", () => {
		expect(parseImport("{}", MAX_IMPORT_BYTES + 1)).toEqual({ ok: false, error: "too-large" })
	})
	it("rejects bad JSON", () => {
		expect(parseImport("{not json")).toEqual({ ok: false, error: "not-json" })
	})
	it("rejects wrong version, unknown fields, over-long fields", () => {
		expect(parseImport(JSON.stringify({ ...valid, device: "x" }))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(JSON.stringify({ ...valid, profile_name: "x".repeat(41) }))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(JSON.stringify([]))).toEqual({ ok: false, error: "not-export" })
	})
})

describe("importRecords", () => {
	it("merges newest-wins and swaps in one transaction", async () => {
		const store = await openStore(new IDBFactory())
		await replaceRecords(store, "p1", [
			{
				item_id: "wildlife/a",
				done: false,
				updated_at: "2026-09-12T00:00:00.000Z",
				origin: "manual",
			},
			{
				item_id: "wildlife/b",
				done: true,
				updated_at: "2026-09-01T00:00:00.000Z",
				origin: "manual",
			},
		])
		const { records: merged } = await importRecords(store, "p1", [
			record,
			{ ...record, item_id: "wildlife/c" },
		])
		const byId = Object.fromEntries(merged.map((r) => [r.item_id, r]))
		expect(byId["wildlife/a"].done).toBe(false)
		expect(byId["wildlife/b"].done).toBe(true)
		expect(byId["wildlife/c"].note).toBe("near the marina")
		expect(await listRecords(store, "p1")).toHaveLength(3)
	})
})

const tick = (item_id: string, updated_at: string, done = true): ProgressRecord => ({
	item_id,
	done,
	updated_at,
	origin: "manual",
})

const counter = () => {
	let n = 0
	return () => `new-${++n}`
}

describe("export format v2 (backup of every profile)", () => {
	it("builds one file with every profile's name and records", () => {
		const { filename, file } = buildBackup(
			[
				{ name: "Malin", records: [record] },
				{ name: "Dad", records: [] },
			],
			now
		)
		expect(file).toEqual({
			version: 2,
			exported_at: now.toISOString(),
			profiles: [
				{ name: "Malin", records: [record] },
				{ name: "Dad", records: [] },
			],
		})
		expect(filename).toBe("rookdex-backup-2026-09-16.json")
	})

	it("parses a backup it built", () => {
		const { file } = buildBackup([{ name: "Malin", records: [record] }], now)
		expect(parseImport(JSON.stringify(file))).toEqual({ ok: true, file })
	})

	it("still accepts a version 1 file unchanged", () => {
		const v1 = buildExport(profile, [record], now).file
		expect(parseImport(JSON.stringify(v1))).toEqual({ ok: true, file: v1 })
	})

	it("collects every active profile with its records, oldest first", async () => {
		const store = await openStore(new IDBFactory())
		await store.put("profiles", { id: "b", name: "Dad", created_at: "2026-09-02T00:00:00.000Z" })
		await store.put("profiles", { id: "a", name: "Malin", created_at: "2026-09-01T00:00:00.000Z" })
		await store.put("profiles", {
			id: "c",
			name: "Gone",
			created_at: "2026-09-03T00:00:00.000Z",
			deleted_at: "2026-09-04T00:00:00.000Z",
		})
		await replaceRecords(store, "a", [record])
		const backup = await collectBackup(store, now)
		expect(backup?.file.profiles).toEqual([
			{ name: "Malin", records: [record] },
			{ name: "Dad", records: [] },
		])
	})

	it("collects nothing when there is no profile yet", async () => {
		const store = await openStore(new IDBFactory())
		expect(await collectBackup(store, now)).toBeUndefined()
	})
})

describe("parseImport reasons (import feedback)", () => {
	const v2 = (profiles: unknown[]) =>
		JSON.stringify({ version: 2, exported_at: now.toISOString(), profiles })

	it("names a file from a newer Rookdex as newer, not as foreign", () => {
		expect(parseImport(JSON.stringify({ version: 3 }))).toEqual({
			ok: false,
			error: "newer-version",
		})
	})

	it("names too many records in a version 1 file", () => {
		const records = Array.from({ length: MAX_RECORDS + 1 }, () => record)
		const text = JSON.stringify({ ...buildExport(profile, [], now).file, records })
		expect(parseImport(text, 1)).toEqual({ ok: false, error: "too-many" })
	})

	it("counts records across every profile in a backup", () => {
		const half = Array.from({ length: MAX_RECORDS / 2 + 1 }, () => record)
		const text = v2([
			{ name: "A", records: half },
			{ name: "B", records: half },
		])
		expect(parseImport(text, 1)).toEqual({ ok: false, error: "too-many" })
	})

	it("names too many profiles in a backup", () => {
		const profiles = Array.from({ length: MAX_BACKUP_PROFILES + 1 }, (_, i) => ({
			name: `P${i}`,
			records: [],
		}))
		expect(parseImport(v2(profiles))).toEqual({ ok: false, error: "too-many" })
	})

	it("rejects a backup with no profiles, unknown fields or a bad record", () => {
		expect(parseImport(v2([]))).toEqual({ ok: false, error: "not-export" })
		expect(parseImport(v2([{ name: "A", records: [], id: "x" }]))).toEqual({
			ok: false,
			error: "not-export",
		})
		expect(parseImport(v2([{ name: "A", records: [{ item_id: "bad" }] }]))).toEqual({
			ok: false,
			error: "not-export",
		})
	})
})

describe("importRecords count", () => {
	it("counts only the records that came in", async () => {
		const store = await openStore(new IDBFactory())
		await replaceRecords(store, "p1", [tick("wildlife/a", "2026-09-12T00:00:00.000Z")])
		const result = await importRecords(store, "p1", [
			tick("wildlife/a", "2026-09-01T00:00:00.000Z", false),
			tick("wildlife/b", "2026-09-01T00:00:00.000Z"),
		])
		expect(result.count).toBe(1)
		expect(result.records.map((r) => r.item_id).sort()).toEqual(["wildlife/a", "wildlife/b"])
	})
})

describe("importAsNewProfile", () => {
	it("creates the profile and its records together", async () => {
		const store = await openStore(new IDBFactory())
		const result = await importAsNewProfile(store, "Dad", [record], now, counter())
		expect(result).toMatchObject({ profile: { id: "new-1", name: "Dad" }, count: 1 })
		expect(await listRecords(store, "new-1")).toEqual([record])
	})

	it("leaves no empty profile behind when a record fails to write", async () => {
		const store = await openStore(new IDBFactory())
		const broken = { ...record, item_id: undefined } as unknown as ProgressRecord
		await expect(
			importAsNewProfile(store, "Dad", [record, broken], now, counter())
		).rejects.toThrow()
		expect(await listProfiles(store)).toEqual([])
		expect(await listRecords(store, "new-1")).toEqual([])
	})
})

describe("restoreBackup", () => {
	const seed = async () => {
		const store = await openStore(new IDBFactory())
		await store.put("profiles", { id: "m", name: "Malin", created_at: "2026-09-01T00:00:00.000Z" })
		await store.put("profiles", { id: "d", name: "Dad", created_at: "2026-09-02T00:00:00.000Z" })
		await replaceRecords(store, "d", [tick("wildlife/a", "2026-09-12T00:00:00.000Z")])
		return store
	}

	it("merges into the profile with the same name and creates the missing ones", async () => {
		const store = await seed()
		const results = await restoreBackup(
			store,
			[
				{
					name: "Dad",
					records: [
						tick("wildlife/a", "2026-09-01T00:00:00.000Z", false),
						tick("wildlife/b", "2026-09-13T00:00:00.000Z"),
					],
				},
				{ name: "Kid", records: [tick("wildlife/c", "2026-09-13T00:00:00.000Z")] },
			],
			now,
			counter()
		)
		expect(results).toEqual([
			{ profileId: "d", name: "Dad", count: 1, created: false },
			{ profileId: "new-1", name: "Kid", count: 1, created: true },
		])
		const dad = await listRecords(store, "d")
		expect(dad.find((r) => r.item_id === "wildlife/a")?.done).toBe(true)
		expect(dad).toHaveLength(2)
		expect(await listRecords(store, "new-1")).toHaveLength(1)
		expect(await listRecords(store, "m")).toEqual([])
	})

	it("pairs profiles that share a name in order, and creates the extra one", async () => {
		const store = await seed()
		const results = await restoreBackup(
			store,
			[
				{ name: "Dad", records: [] },
				{ name: "Dad", records: [] },
			],
			now,
			counter()
		)
		expect(results.map((r) => [r.profileId, r.created])).toEqual([
			["d", false],
			["new-1", true],
		])
	})

	it("brings a deleted profile's name back as a new profile", async () => {
		const store = await seed()
		await store.put("profiles", {
			id: "d",
			name: "Dad",
			created_at: "2026-09-02T00:00:00.000Z",
			deleted_at: "2026-09-10T00:00:00.000Z",
		})
		const [result] = await restoreBackup(store, [{ name: "Dad", records: [] }], now, counter())
		expect(result).toMatchObject({ profileId: "new-1", created: true })
	})

	it("keeps the file's order for profiles it creates", async () => {
		const store = await openStore(new IDBFactory())
		await restoreBackup(
			store,
			[
				{ name: "B", records: [] },
				{ name: "A", records: [] },
			],
			now,
			counter()
		)
		expect(activeProfiles(await listProfiles(store)).map((p) => p.name)).toEqual(["B", "A"])
	})

	it("writes nothing when one record fails", async () => {
		const store = await seed()
		const broken = { ...record, item_id: undefined } as unknown as ProgressRecord
		await expect(
			restoreBackup(
				store,
				[
					{ name: "Kid", records: [record] },
					{ name: "Dad", records: [broken] },
				],
				now,
				counter()
			)
		).rejects.toThrow()
		expect((await listProfiles(store)).map((p) => p.name).sort()).toEqual(["Dad", "Malin"])
	})

	it("reads a version 1 file as one entry", () => {
		const v1 = buildExport(profile, [record], now).file
		expect(backupEntries(v1)).toEqual([{ name: "Malin & Dad", records: [record] }])
		const v2 = buildBackup([{ name: "A", records: [] }], now).file
		expect(backupEntries(v2)).toEqual([{ name: "A", records: [] }])
	})
})
