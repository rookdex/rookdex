import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The before view must not pull in the tracker model (dashboard spec §10, desktop spec §3).
const BEFORE_VIEW = [
	"Hub.tsx",
	"Hero.tsx",
	"CategoryBars.tsx",
	"NewsTile.tsx",
	"LinkTiles.tsx",
	"ExternalTile.tsx",
	"PrelaunchChecklist.tsx",
	"Chev.tsx",
	"StatPair.tsx",
	"CountdownView.tsx",
]
const HEAVY = /from "\.\.\/\.\.\/model\/(seed|stats|dashboard|tracker)"/

/** Lines that pull the tracker model in at runtime. A multi-line import counts by its `from` line. */
function runtimeModelImports(source: string): string[] {
	return source.split("\n").filter((line) => HEAVY.test(line) && !/^import type /.test(line))
}

describe("before-view imports", () => {
	it("catches a runtime import, so the guard can go red", () => {
		expect(runtimeModelImports('import { seedItems } from "../../model/seed"')).toHaveLength(1)
		expect(runtimeModelImports('import { type Count } from "../../model/stats"')).toHaveLength(1)
		expect(runtimeModelImports('} from "../../model/dashboard"')).toHaveLength(1)
		expect(runtimeModelImports('import type { Count } from "../../model/stats"')).toEqual([])
	})

	it.each(BEFORE_VIEW)("%s imports the tracker model as types only", (file) => {
		const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8")
		expect(runtimeModelImports(source)).toEqual([])
	})
})
