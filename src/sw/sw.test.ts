import { readFileSync } from "node:fs"
import vm from "node:vm"
import { describe, expect, it, type Mock, vi } from "vitest"
import { fillWorker } from "../../integrations/precache.mjs"

const template = readFileSync(new URL("./sw.js", import.meta.url), "utf8")
type Listener = (event: unknown) => void

type FakeCache = {
	add: Mock<(url: string) => Promise<void>>
	match: Mock<(key: string) => Promise<Response | undefined>>
	put: Mock<(key: string, response: Response) => Promise<void>>
	store: Map<string, Response>
}

/** Runs the worker in a sandbox with fake self, caches and fetch (feedback spec §15.3). `old` seeds
 *  caches that an earlier version left behind. */
function loadWorker(
	network: (url: string) => Promise<Response>,
	{ precache = ["/en/"], old = {} as Record<string, Record<string, Response>> } = {}
) {
	const listeners = new Map<string, Listener>()
	const fetch = vi.fn(network)
	const caches = new Map<string, FakeCache>()
	const open = (name: string): FakeCache => {
		const existing = caches.get(name)
		if (existing) return existing
		const store = new Map<string, Response>()
		const cache: FakeCache = {
			store,
			match: vi.fn(async (key: string) => store.get(key)),
			put: vi.fn(async (key: string, response: Response) => {
				store.set(key, response)
			}),
			add: vi.fn(async (url: string) => {
				const response = await fetch(url)
				if (!response.ok) throw new TypeError(`Request failed: ${url}`)
				store.set(url, response)
			}),
		}
		caches.set(name, cache)
		return cache
	}
	for (const [name, entries] of Object.entries(old)) {
		for (const [url, response] of Object.entries(entries)) open(name).store.set(url, response)
	}
	const self = {
		location: { origin: "https://rookdex.app" },
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		skipWaiting: vi.fn(async () => {}),
		clients: { claim: vi.fn(async () => {}) },
	}
	const cacheStorage = {
		open: vi.fn(async (name: string) => open(name)),
		keys: vi.fn(async () => [...caches.keys()]),
		delete: vi.fn(async (name: string) => caches.delete(name)),
		match: vi.fn(async (key: string) => {
			for (const cache of caches.values()) {
				const hit = cache.store.get(key)
				if (hit) return hit
			}
			return undefined
		}),
	}
	vm.runInNewContext(fillWorker(template, "v1", precache), {
		self,
		caches: cacheStorage,
		fetch,
		URL,
		Response,
		Promise,
	})
	const cache = open("rookdex-v1")
	return { listeners, self, cache, put: cache.put, fetch }
}

async function install(worker: ReturnType<typeof loadWorker>) {
	const pending: Promise<unknown>[] = []
	worker.listeners.get("install")?.({ waitUntil: (p: Promise<unknown>) => pending.push(p) })
	await Promise.all(pending)
}

async function navigate(
	worker: ReturnType<typeof loadWorker>,
	url = "https://rookdex.app/en/news/"
) {
	let responded: Promise<Response> | undefined
	const pending: Promise<unknown>[] = []
	worker.listeners.get("fetch")?.({
		request: { method: "GET", url, mode: "navigate" },
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
		await install(worker)
		expect(worker.cache.store.has("/en/")).toBe(true)
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

describe("install copies unchanged hashed files (spec §5)", () => {
	const chunk = "/data/vehicles.0123456789.json"
	const index = "/data/seed-index.0123456789.json"
	const script = "/_astro/Tracker.Ab12Cd34.js"
	const fresh = async (url: string) => new Response(`new ${url}`)

	it("copies an unchanged chunk, index file and script from the old cache instead of fetching them", async () => {
		const worker = loadWorker(fresh, {
			precache: [chunk, index, script, "/en/"],
			old: {
				"rookdex-v0": {
					[chunk]: new Response("old chunk"),
					[index]: new Response("old index"),
					[script]: new Response("old js"),
				},
			},
		})
		await install(worker)
		expect(worker.fetch.mock.calls.map(([url]) => url)).toEqual(["/en/"])
		expect(await worker.cache.store.get(chunk)?.text()).toBe("old chunk")
		expect(await worker.cache.store.get(index)?.text()).toBe("old index")
		expect(await worker.cache.store.get(script)?.text()).toBe("old js")
	})

	it("fetches a page even when the old cache has it, because a page's URL never changes", async () => {
		const worker = loadWorker(fresh, {
			old: { "rookdex-v0": { "/en/": new Response("old page") } },
		})
		await install(worker)
		expect(await worker.cache.store.get("/en/")?.text()).toBe("new /en/")
	})

	it("fetches the file when copying it from an old cache fails", async () => {
		const worker = loadWorker(fresh, {
			precache: [chunk],
			old: { "rookdex-v0": { [chunk]: new Response("old chunk") } },
		})
		worker.cache.put.mockRejectedValueOnce(new Error("quota"))
		await install(worker)
		expect(worker.fetch.mock.calls.map(([url]) => url)).toEqual([chunk])
		expect(await worker.cache.store.get(chunk)?.text()).toBe(`new ${chunk}`)
	})

	it("never copies a failed response or one from a cache that is not Rookdex's", async () => {
		const worker = loadWorker(fresh, {
			precache: [chunk, script],
			old: {
				"rookdex-v0": { [chunk]: new Response("gone", { status: 404 }) },
				"other-v0": { [script]: new Response("foreign") },
			},
		})
		await install(worker)
		expect(await worker.cache.store.get(chunk)?.text()).toBe(`new ${chunk}`)
		expect(await worker.cache.store.get(script)?.text()).toBe(`new ${script}`)
	})

	it("rejects install when one fetch fails, so a half-filled cache never activates", async () => {
		const worker = loadWorker(
			async (url) => new Response("", { status: url === "/en/" ? 500 : 200 }),
			{
				precache: [chunk, "/en/"],
			}
		)
		await expect(install(worker)).rejects.toThrow("Request failed: /en/")
	})
})

describe("offline fallback (locale spec §6.5)", () => {
	const offline = () => Promise.reject(new TypeError("offline"))

	it("answers an old /no/ page with the cached root, which resolves the language itself", async () => {
		const worker = loadWorker(offline)
		await worker.put("/en/", new Response("english home"))
		await worker.put("/", new Response("root"))
		const response = await navigate(worker, "https://rookdex.app/no/x/")
		expect(await response?.text()).toBe("root")
	})

	it("still prefers the same language's home when it is cached", async () => {
		const worker = loadWorker(offline)
		await worker.put("/nb/", new Response("norsk"))
		await worker.put("/", new Response("root"))
		const response = await navigate(worker, "https://rookdex.app/nb/unknown/")
		expect(await response?.text()).toBe("norsk")
	})
})
