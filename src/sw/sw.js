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
	// Pages: network first so a deploy shows on the next load; cache when offline.
	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request, url))
		return
	}
	event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
	const cached = await caches.match(request)
	if (cached) return cached
	const response = await fetch(request)
	if (response.ok) {
		const cache = await caches.open(CACHE)
		cache.put(request, response.clone())
	}
	return response
}

async function networkFirst(request, url) {
	try {
		const response = await fetch(request)
		if (response.ok) {
			const cache = await caches.open(CACHE)
			cache.put(request, response.clone())
		}
		return response
	} catch {
		const cached = await caches.match(request)
		if (cached) return cached
		// Unknown page while offline: fall back to the home page of the same language.
		const localeHome = `/${url.pathname.split("/")[1] || "en"}/`
		return (await caches.match(localeHome)) ?? (await caches.match("/en/")) ?? Response.error()
	}
}
