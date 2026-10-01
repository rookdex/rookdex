import { readFileSync } from "node:fs"
import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"
import { fillWorker } from "../../integrations/precache.mjs"

const template = readFileSync(new URL("./sw.js", import.meta.url), "utf8")
type Listener = (event: unknown) => void

/** Runs the worker in a sandbox with fake self, caches and fetch (feedback spec §15.3). */
function loadWorker(network: () => Promise<Response>) {
	const listeners = new Map<string, Listener>()
	const store = new Map<string, Response>()
	const put = vi.fn(async (key: string, response: Response) => {
		store.set(key, response)
	})
	const cache = {
		addAll: vi.fn(async () => {}),
		match: vi.fn(async (key: string) => store.get(key)),
		put,
	}
	const self = {
		location: { origin: "https://rookdex.app" },
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		skipWaiting: vi.fn(async () => {}),
		clients: { claim: vi.fn(async () => {}) },
	}
	const caches = {
		open: vi.fn(async () => cache),
		keys: vi.fn(async () => []),
		delete: vi.fn(async () => true),
		match: vi.fn(async () => undefined),
	}
	vm.runInNewContext(fillWorker(template, "v1", ["/en/"]), {
		self,
		caches,
		fetch: vi.fn(network),
		URL,
		Response,
		Promise,
	})
	return { listeners, self, cache, put }
}

async function navigate(worker: ReturnType<typeof loadWorker>) {
	let responded: Promise<Response> | undefined
	const pending: Promise<unknown>[] = []
	worker.listeners.get("fetch")?.({
		request: { method: "GET", url: "https://rookdex.app/en/news/", mode: "navigate" },
		respondWith: (p: Promise<Response>) => {
			responded = p
		},
		waitUntil: (p: Promise<unknown>) => pending.push(p),
	})
	const response = await responded
	await Promise.all(pending)
	return response
}

const page = (headers: Record<string, string>) => async () => new Response("page", { headers })

describe("service worker (feedback spec §10.1)", () => {
	it("precaches on install but waits instead of taking over", async () => {
		const worker = loadWorker(page({}))
		const pending: Promise<unknown>[] = []
		worker.listeners.get("install")?.({ waitUntil: (p: Promise<unknown>) => pending.push(p) })
		await Promise.all(pending)
		expect(worker.cache.addAll).toHaveBeenCalledWith(["/en/"])
		expect(worker.self.skipWaiting).not.toHaveBeenCalled()
	})

	it("takes over on SKIP_WAITING and ignores other messages", () => {
		const worker = loadWorker(page({}))
		worker.listeners.get("message")?.({ data: { type: "PING" } })
		worker.listeners.get("message")?.({ data: null })
		expect(worker.self.skipWaiting).not.toHaveBeenCalled()
		worker.listeners.get("message")?.({ data: { type: "SKIP_WAITING" } })
		expect(worker.self.skipWaiting).toHaveBeenCalledOnce()
	})

	it("shows a page from another version but never stores it", async () => {
		const worker = loadWorker(page({ "X-Rookdex-Version": "v2" }))
		const response = await navigate(worker)
		expect(await response?.text()).toBe("page")
		expect(worker.put).not.toHaveBeenCalled()
	})

	it("stores a page from its own version", async () => {
		const worker = loadWorker(page({ "X-Rookdex-Version": "v1" }))
		await navigate(worker)
		expect(worker.put).toHaveBeenCalledWith("https://rookdex.app/en/news/", expect.anything())
	})

	it("stores a page without the header (dev servers, and a Worker that forgot it)", async () => {
		const worker = loadWorker(page({}))
		await navigate(worker)
		expect(worker.put).toHaveBeenCalledOnce()
	})
})
