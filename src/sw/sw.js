// Service worker. The two placeholders are filled by integrations/precache.mjs at build.
const VERSION = "__VERSION__"
const PRECACHE = "__PRECACHE__"
const CACHE = `rookdex-${VERSION}`

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	)
})

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	)
})

self.addEventListener("fetch", (event) => {
	const { request } = event
	if (request.method !== "GET") return
	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return

	// Hashed build assets never change under the same name.
	if (url.pathname.startsWith("/_astro/")) {
		event.respondWith(cacheFirst(request))
		return
	}
	// Pages: cached copy at once, refreshed in the background; a deploy shows on the next load.
	if (request.mode === "navigate") {
		event.respondWith(staleWhileRevalidate(event, url))
		return
	}
	event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
	const cached = await caches.match(request)
	if (cached) return cached
	const response = await fetch(request)
	if (response.ok) {
		try {
			const cache = await caches.open(CACHE)
			await cache.put(request, response.clone())
		} catch {
			// A full cache (QuotaExceededError) must not fail a response the network already gave us.
		}
	}
	return response
}

async function staleWhileRevalidate(event, url) {
	// The query string is dropped from the key so /en/tracker/?show=wildlife hits the precached page.
	const key = url.origin + url.pathname
	const cache = await caches.open(CACHE)
	const cached = await cache.match(key)
	const refresh = fetch(event.request)
		.then(async (response) => {
			if (response.ok) {
				try {
					await cache.put(key, response.clone())
				} catch {
					// A full cache must not turn a good network response into the home-page fallback.
				}
			}
			return response
		})
		.catch(() => undefined)
	if (cached) {
		event.waitUntil(refresh)
		return cached
	}
	const response = await refresh
	if (response) return response
	// Unknown page while offline: fall back to the home page of the same language.
	const localeHome = `/${url.pathname.split("/")[1] || "en"}/`
	return (await cache.match(localeHome)) ?? (await cache.match("/en/")) ?? Response.error()
}
