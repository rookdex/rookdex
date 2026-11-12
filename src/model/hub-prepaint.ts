import { localLaunchAt } from "./launch"

/**
 * Set on <html> while the hub's static HTML shows the wrong phase for this device. global.css
 * hides `.hub-live` with `visibility: hidden` while it is there, so the space stays reserved and
 * nothing shifts. The Hub island removes it once it renders on the device clock.
 */
export const HUB_PENDING_ATTR = "data-hub-pending"

/**
 * The longest the hub stays hidden. If the island never hydrates, the static hub comes back. A slow
 * phone hydrates in about 1.5 s; 5 s leaves room for a slow network without a late flash.
 */
export const HUB_PENDING_MAX_MS = 5000

/**
 * The home page's inline pre-paint script. The page is built on Oslo's clock, but the game
 * unlocks at each visitor's own midnight, so for a few hours the static hub is the wrong phase
 * west or east of Oslo: the dashboard skeleton for New York after the 00:05 rebuild, the
 * countdown for Tokyo before it. Without this, that state shows until the island hydrates.
 *
 * A classic script placed just before the island, so it runs before the hub is painted. It reads
 * the static phase from its own `data-phase`, which sits inside the build stamp, so the text
 * itself never changes between builds and its CSP hash stays the same. The launch date is written
 * as calendar numbers, read on the device's own clock. ES5 on purpose: it ships exactly as written.
 */
export function hubPrepaintScript(): string {
	const launch = localLaunchAt()
	const date = `${launch.getFullYear()}, ${launch.getMonth()}, ${launch.getDate()}`
	return [
		"(function () {",
		"  var script = document.currentScript;",
		'  if (!script || !script.getAttribute("data-phase")) return;',
		`  var local = Date.now() < new Date(${date}).getTime() ? "before" : "after";`,
		'  if (script.getAttribute("data-phase") === local) return;',
		"  var root = document.documentElement;",
		`  root.setAttribute(${JSON.stringify(HUB_PENDING_ATTR)}, "");`,
		"  setTimeout(function () {",
		`    root.removeAttribute(${JSON.stringify(HUB_PENDING_ATTR)});`,
		`  }, ${HUB_PENDING_MAX_MS});`,
		"})();",
	].join("\n")
}
