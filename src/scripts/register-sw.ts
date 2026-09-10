// Registers the service worker once the page has loaded, so it never competes with first paint.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// No service worker is a degraded mode, not an error the visitor can act on.
		})
	})
}
