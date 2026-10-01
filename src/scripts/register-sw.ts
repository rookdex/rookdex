// Registers the service worker once the page has loaded, so it never competes with first paint,
// then hands the registration to the update notice (feedback spec §10.3).
import { wireUpdateNotice } from "./update-notice"

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				wireUpdateNotice(document, {
					container: navigator.serviceWorker,
					registration,
					storage: () => window.sessionStorage,
					reload: () => window.location.reload(),
					defer: (task) => window.setTimeout(task, 0),
				})
			})
			.catch(() => {
				// No service worker is a degraded mode, not an error the visitor can act on.
			})
	})
}
