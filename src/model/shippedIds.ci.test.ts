// Runs only in the CI job that sets MAIN_SHIPPED_IDS (ci.yml, shipped-ids). Locally it is skipped.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import headText from "../seed/shipped-ids.txt?raw"
import { seedItems } from "./seed"
import { ciShippedErrors } from "./seedBuild"

const mainPath = process.env.MAIN_SHIPPED_IDS

describe.skipIf(!mainPath)("shipped ids against main", () => {
	it("drops no id that is on main, and every new id starts with its category", () => {
		const mainText = readFileSync(mainPath ?? "", "utf8")
		expect(ciShippedErrors(mainText, headText, seedItems)).toEqual([])
	})
})
