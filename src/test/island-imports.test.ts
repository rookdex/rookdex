// Spec §5: the browser never parses the seed again. Walks every island's and browser script's
// value imports and fails if one reaches a forbidden module. Type-only imports are erased and
// skipped. `import { type A }` counts, because verbatimModuleSyntax keeps it as a side-effect import.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ROOT = resolve(import.meta.dirname, "../..")
/** Never in the browser, not even behind import(): the seed, its build checks, the source rules. */
const NEVER = new Set([
	"src/model/seed.ts",
	"src/model/seedBuild.ts",
	"src/model/seedDelivery.ts",
	"src/model/seedDelivered.ts",
	"src/model/tiers.ts",
	"allowlist.json",
])
/** Allowed only behind import(), so no page loads them up front. Task 6b fills this. */
const NOT_UP_FRONT = new Set<string>([])

interface Edge {
	specifier: string
	/** Reached through import(), so it loads only when that code runs. */
	lazy: boolean
}

function importsOf(file: string, text: string): Edge[] {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
	const found: Edge[] = []
	const visit = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
			if (ts.isStringLiteral(node.moduleSpecifier))
				found.push({ specifier: node.moduleSpecifier.text, lazy: false })
		} else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
			if (ts.isStringLiteral(node.moduleSpecifier))
				found.push({ specifier: node.moduleSpecifier.text, lazy: false })
		} else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [arg] = node.arguments
			if (arg && ts.isStringLiteral(arg)) found.push({ specifier: arg.text, lazy: true })
		}
		ts.forEachChild(node, visit)
	}
	visit(source)
	return found
}

/** A module path relative to the root, or a bare package name, that this edge may not reach. */
function blocked(target: string, lazy: boolean): boolean {
	return NEVER.has(target) || (!lazy && NOT_UP_FRONT.has(target))
}

function resolveLocal(from: string, specifier: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined
	const base = resolve(dirname(from), specifier.split("?")[0])
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
	}
	return undefined
}

const rel = (file: string) => relative(ROOT, file).split("\\").join("/")

/** Islands and browser scripts (amendment 8), without their tests. */
function browserEntries(): string[] {
	return ["src/islands", "src/scripts"].flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
			.filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
			.map((e) => join(e.parentPath, e.name))
	)
}

/** "<forbidden> via <importer>" for every forbidden edge, sorted. Each file is walked once up
 *  front and once behind import(), because the two walks forbid different modules. */
function reachedForbidden(): string[] {
	const seen = new Set<string>()
	const reached = new Set<string>()
	const queue = browserEntries().map((file) => ({ file, lazy: false }))
	while (queue.length > 0) {
		const { file, lazy } = queue.shift() as { file: string; lazy: boolean }
		const key = `${lazy ? "lazy" : "eager"} ${rel(file)}`
		if (seen.has(key)) continue
		seen.add(key)
		if (!/\.tsx?$/.test(file)) continue
		for (const edge of importsOf(file, readFileSync(file, "utf8"))) {
			const nextLazy = lazy || edge.lazy
			const local = resolveLocal(file, edge.specifier)
			const target = local ? rel(local) : edge.specifier
			if (blocked(target, nextLazy)) {
				reached.add(`${target} via ${rel(file)}`)
				continue
			}
			if (local) queue.push({ file: local, lazy: nextLazy })
		}
	}
	return [...reached].sort()
}

describe("island imports (spec §5)", () => {
	it("reads value imports and marks import() as lazy (self-test)", () => {
		const source = [
			'import { a } from "./a"',
			'import type { B } from "./b"',
			'import { type C } from "./c"',
			'export { d } from "./d"',
			'export type { E } from "./e"',
			'const f = () => import("./f")',
		].join("\n")
		expect(importsOf("x.ts", source)).toEqual([
			{ specifier: "./a", lazy: false },
			{ specifier: "./c", lazy: false },
			{ specifier: "./d", lazy: false },
			{ specifier: "./f", lazy: true },
		])
	})

	it("blocks the seed even behind import() (self-test)", () => {
		expect(blocked("src/model/seed.ts", true)).toBe(true)
		expect(blocked("src/model/seed.ts", false)).toBe(true)
		expect(blocked("src/model/stats.ts", false)).toBe(false)
	})

	it("never reach the seed, its build checks or the source rules", () => {
		expect(reachedForbidden()).toEqual([])
	})
})
