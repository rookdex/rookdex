import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

describe("assetlinks.json (Android spec §7)", () => {
	const statements = JSON.parse(
		readFileSync(new URL("../../public/.well-known/assetlinks.json", import.meta.url), "utf8")
	)

	it("has one statement that hands app.rookdex every URL", () => {
		expect(statements).toHaveLength(1)
		expect(statements[0].relation).toEqual(["delegate_permission/common.handle_all_urls"])
		expect(statements[0].target.namespace).toBe("android_app")
		expect(statements[0].target.package_name).toBe("app.rookdex")
	})

	it("lists two distinct SHA-256 fingerprints: the app signing key and the upload key", () => {
		const prints: string[] = statements[0].target.sha256_cert_fingerprints
		expect(prints).toHaveLength(2)
		expect(new Set(prints).size).toBe(2)
		for (const print of prints) expect(print).toMatch(FINGERPRINT)
	})
})
