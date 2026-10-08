import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"
import { createTranslator } from "../lib/i18n/index.js"
import { rootScript, scriptHash } from "./root-resolver"

const TAGS = ["en", "nb"]
const source = rootScript(TAGS, "en", "lang")

interface Env {
	stored?: string
	languages?: string[]
	language?: string
	blocked?: boolean
}

/** Runs the shipped script text with fake storage, navigator and location. */
function run({ stored, languages, language, blocked }: Env) {
	const store = new Map<string, string>(stored === undefined ? [] : [["lang", stored]])
	const fail = () => {
		throw new Error("SecurityError")
	}
	const localStorage = blocked
		? { getItem: fail, removeItem: fail }
		: { getItem: (k: string) => store.get(k) ?? null, removeItem: (k: string) => store.delete(k) }
	const location = { replace: vi.fn() }
	vm.runInNewContext(source, { localStorage, navigator: { languages, language }, location })
	expect(location.replace).toHaveBeenCalledOnce()
	return { target: location.replace.mock.calls[0][0] as string, store }
}

describe("root resolver (locale spec §6.4, §7.4)", () => {
	it("follows a stored choice over the browser", () => {
		expect(run({ stored: "nb", languages: ["en-US"] }).target).toBe("/nb/")
		expect(run({ stored: "en", languages: ["nb-NO"] }).target).toBe("/en/")
	})

	it("reads navigator.languages when nothing is stored", () => {
		expect(run({ languages: ["nb-NO", "en"] }).target).toBe("/nb/")
		expect(run({ languages: ["sv-SE"] }).target).toBe("/en/")
		expect(run({ languages: ["nn-NO"] }).target).toBe("/nb/")
		expect(run({ languages: ["xx", "no"] }).target).toBe("/nb/")
	})

	it("removes a stored value that is not a configured language, then falls through", () => {
		for (const stale of ["no", "system", "", "NB", "<script>"]) {
			const { target, store } = run({ stored: stale, languages: ["nb-NO"] })
			expect(target, stale).toBe("/nb/")
			expect(store.has("lang"), stale).toBe(false)
		}
	})

	it("treats blocked storage as nothing stored", () => {
		expect(run({ blocked: true, languages: ["nb"] }).target).toBe("/nb/")
	})

	it("survives an empty languages list and a missing navigator.language", () => {
		expect(run({ languages: [], language: undefined }).target).toBe("/en/")
		expect(run({ languages: undefined, language: "nb-NO" }).target).toBe("/nb/")
	})

	it("agrees with the i18n library's resolveLang on every case", () => {
		const lib = createTranslator({ en: {}, nb: {} })
		const cases: Env[] = [
			{ languages: ["nb-NO", "en"] },
			{ languages: ["sv-SE"] },
			{ stored: "nb", languages: ["en-US"] },
			{ stored: "no", languages: ["no"] },
			{ stored: "system", languages: ["sv"] },
			{ languages: ["nn-NO"] },
			{ languages: ["EN-gb"] },
			{ languages: ["xx", "no"] },
			{ languages: [] },
			{ stored: "", languages: ["nb"] },
		]
		for (const env of cases) {
			const stored = env.stored !== undefined && TAGS.includes(env.stored) ? env.stored : null
			const wanted = env.languages?.length ? env.languages : [env.language]
			expect(run(env).target, JSON.stringify(env)).toBe(`/${lib.resolveLang(stored, wanted)}/`)
		}
	})

	it("hashes the exact text for the CSP", () => {
		expect(scriptHash("a")).toBe("sha256-ypeBEsobvcr6wjGzmiPcTaeG7/gUfE5yuYB3ha/uSLs=")
	})
})
