import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** True when git would refuse to track `path`. check-ignore exits 1 for "not ignored", which throws. */
function ignored(path: string): boolean {
	try {
		execFileSync("git", ["check-ignore", "--quiet", "--no-index", path], { cwd: root })
		return true
	} catch {
		return false
	}
}

describe("signing key guard (Android spec §6 step 3)", () => {
	it.each(["x.keystore", "x.jks", "signing-key-info.txt", "x.aab", "x.apk", "x.idsig", "nested/app/x.aab"])(
		"refuses %s",
		(path) => {
			expect(ignored(path)).toBe(true)
		}
	)

	it("still tracks an ordinary file, so the guard can go red", () => {
		expect(ignored("x.json")).toBe(false)
	})
})
