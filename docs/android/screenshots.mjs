// Dev-only helper for the Play listing (Android spec §5). Screenshots a production build on a
// 360 × 640 phone at device scale 3 (1080 × 1920) in English and Norwegian, with a fresh browser
// profile and a few demo ticks, never real profiles. Run it against `npm run preview` after
// `GITHUB_SHA=$(git rev-parse HEAD) npm run build` (so Settings shows a commit, as production
// does, instead of "dev"), or pass another origin as the first argument. Never deployed.
// The harness started as a copy of docs/readme/capture.mjs on purpose: both are dev-only scripts.
// This one waits on page state instead of fixed delays and fails loudly when a shot is wrong.
import { spawn } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const browserPath =
	process.env.BROWSER_PATH ?? "C:/Program Files/BraveSoftware/Brave-Origin/Application/brave.exe"
const base = process.argv[2] ?? "http://localhost:8787"
const out = fileURLToPath(new URL("./screenshots/", import.meta.url))
const tickIndexes = [0, 1, 3, 4, 6, 8, 10, 12, 15]
// Where each shot should sit, tried in order: "top" is the top of the page, a start selector puts
// that block 16 px below the top edge, an end selector puts it 16 px above the tab bar. The first
// framing that pickScroll can make clean, within 40 px, wins.
const pages = [
	["1-hub", "", [{ start: "section.hub-state" }]],
	["2-tracker", "tracker/", [{ start: "top" }, { start: "section.stats" }]],
	["3-news", "news/", [{ start: "top" }, { start: "#rumours" }, { start: ".rumour-list" }]],
	[
		"4-settings",
		"settings/",
		[{ start: "top" }, { start: '[aria-labelledby="settings-data"]' }, { end: ".danger" }],
	],
]
const viewport = { width: 360, height: 640, deviceScaleFactor: 3 }

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const withTimeout = (promise, ms, what) =>
	Promise.race([
		promise,
		wait(ms).then(() => {
			throw new Error(`Timed out after ${ms / 1000} s: ${what}`)
		}),
	])

// Fail before starting a browser if nothing is serving the build.
try {
	const response = await fetch(`${base}/en/`)
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
} catch (error) {
	console.error(`No build at ${base} (${error.message}). Run npm run build, then npm run preview.`)
	process.exit(1)
}

const profile = mkdtempSync(join(tmpdir(), "rookdex-capture-"))
const browser = spawn(browserPath, [
	"--headless",
	"--disable-gpu",
	"--no-first-run",
	"--hide-scrollbars",
	`--user-data-dir=${profile}`,
	"--remote-debugging-port=0",
	"about:blank",
])
let socket

/** PNG colour type from the IHDR chunk: 2 is RGB, 6 is RGBA. Play takes no alpha. */
const pngColourType = (buffer) => buffer[25]

try {
	const socketUrl = await withTimeout(
		new Promise((resolve, reject) => {
			browser.on("error", reject)
			browser.on("exit", (code) => reject(new Error(`Browser exited with code ${code}`)))
			browser.stderr.on("data", (chunk) => {
				const match = /ws:\/\/\S+/.exec(String(chunk))
				if (match) resolve(match[0])
			})
		}),
		15_000,
		`starting ${browserPath} (set BROWSER_PATH to another Chromium browser)`
	)
	// The page target can appear a moment after the debugger socket does.
	let target
	for (let attempt = 0; !target; attempt += 1) {
		if (attempt === 50) throw new Error("The browser opened no page to drive")
		const list = await (await fetch(`http://127.0.0.1:${new URL(socketUrl).port}/json/list`)).json()
		target = list.find((entry) => entry.type === "page")
		if (!target) await wait(100)
	}
	socket = new WebSocket(target.webSocketDebuggerUrl)
	await new Promise((resolve) => socket.addEventListener("open", resolve))

	let nextId = 0
	const pending = new Map()
	socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data)
		// Only replies to our own numbered requests resolve; protocol events carry no id.
		if (!Number.isInteger(message.id)) return
		const resolve = pending.get(message.id)
		if (typeof resolve !== "function") return
		pending.delete(message.id)
		resolve(message)
	})
	const send = (method, params = {}) =>
		withTimeout(
			new Promise((resolve, reject) => {
				nextId += 1
				pending.set(nextId, (message) =>
					message.error
						? reject(new Error(`${method}: ${message.error.message}`))
						: resolve(message)
				)
				socket.send(JSON.stringify({ id: nextId, method, params }))
			}),
			30_000,
			method
		)
	const evaluate = async (expression) => {
		const { result } = await send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		})
		if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception.description)
		return result.result.value
	}
	/** Polls a page expression until it is truthy. */
	const waitFor = async (expression, what, ms = 15_000) => {
		const deadline = Date.now() + ms
		while (Date.now() < deadline) {
			if (await evaluate(expression).catch(() => false)) return
			await wait(100)
		}
		throw new Error(`Timed out after ${ms / 1000} s waiting for ${what}`)
	}
	/** Navigates and waits until the page is loaded, its fonts are in and every island hydrated. */
	const open = async (url) => {
		await send("Page.navigate", { url })
		await waitFor(
			`location.href === ${JSON.stringify(url)} && document.readyState === "complete" &&
			document.fonts.status === "loaded" && !document.querySelector("astro-island[ssr]")`,
			url
		)
	}

	await send("Emulation.setDeviceMetricsOverride", { ...viewport, mobile: true })
	// First visit: let the service worker take control, and mark the one-time hints as seen.
	await open(`${base}/en/`)
	await waitFor(
		"navigator.serviceWorker.ready.then((r) => Boolean(r.active))",
		"the service worker"
	)
	await evaluate(
		`localStorage.setItem("rookdex.install-prompt-seen", "1"); localStorage.setItem("rookdex.persist-hint-seen", "1")`
	)
	mkdirSync(out, { recursive: true })
	for (const locale of ["en", "nb"]) {
		// Each language starts from a fresh profile, so the tracker shows its own default name
		// ("Player 1" / "Spiller 1"). The privacy page opens no database, so the delete is not blocked.
		await open(`${base}/en/privacy/`)
		await evaluate(`new Promise((resolve, reject) => {
			localStorage.removeItem("rookdex.active-profile")
			const request = indexedDB.deleteDatabase("rookdex")
			request.onsuccess = () => resolve(true)
			request.onerror = request.onblocked = () => reject(new Error("could not delete the database"))
		})`)
		await open(`${base}/${locale}/tracker/`)
		await waitFor(
			`document.querySelectorAll("input[type=checkbox]:not(:disabled)").length > ${Math.max(...tickIndexes)}`,
			"the tracker's checkboxes"
		)
		const ticked = await evaluate(`(async () => {
			const boxes = [...document.querySelectorAll("input[type=checkbox]")]
			for (const i of ${JSON.stringify(tickIndexes)}) {
				boxes[i].click()
				await new Promise((r) => setTimeout(r, 60))
			}
			return document.querySelectorAll("input[type=checkbox]:checked").length
		})()`)
		if (ticked !== tickIndexes.length) {
			throw new Error(`${locale}: ticked ${ticked} items, expected ${tickIndexes.length}`)
		}
		for (const [name, path, framings] of pages) {
			await open(`${base}/${locale}/${path}`)
			const scroll = await evaluate(`(${pickScroll})(${JSON.stringify(framings)})`)
			await evaluate(`window.scrollTo({ top: ${scroll.top}, behavior: "instant" })`)
			await waitFor(`Math.round(scrollY) === ${scroll.top}`, "the scroll to settle")
			const { result } = await send("Page.captureScreenshot", { format: "png" })
			const png = Buffer.from(result.data, "base64")
			const width = png.readUInt32BE(16)
			const height = png.readUInt32BE(20)
			const file = `${locale}-${name}.png`
			if (width !== 1080 || height !== 1920 || pngColourType(png) !== 2) {
				throw new Error(`${file} is ${width}x${height}, colour type ${pngColourType(png)}`)
			}
			writeFileSync(join(out, file), png)
			console.log(`${file} 1080x1920 RGB, scrolled ${scroll.top} px (${scroll.anchor})`)
		}
	}
} catch (error) {
	console.error(error.message)
	process.exitCode = 1
} finally {
	socket?.close()
	if (browser.exitCode === null) {
		const exited = new Promise((resolve) => browser.once("exit", resolve))
		browser.kill()
		await Promise.race([exited, wait(5000)])
	}
	// Windows can hold the profile's files for a moment after the browser exits.
	rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

/**
 * Runs in the page. Takes the framings for this page and returns the first one it can make
 * clean by moving at most 40 px: the top edge is the top of the page or clear of everything, and
 * the line where the fixed tab bar begins falls in a gap, clear of every text line and control.
 * Without this, the last line of text is cut in half by the tab bar.
 */
function pickScroll(framings) {
	const gap = 16
	const clearance = 4
	const reach = 40
	const tabbar = document.querySelector("nav.tabbar")
	const tabTop = tabbar.getBoundingClientRect().top
	const maxTop = document.documentElement.scrollHeight - innerHeight
	const page = (rect) => ({ top: rect.top + scrollY, bottom: rect.bottom + scrollY })
	const visible = (rect) => rect.width > 1 && rect.height > 1
	// Closed menus and popovers hide with visibility or opacity but keep their boxes.
	const shown = (el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
	// The site header counts as one solid block: cutting through it looks broken too.
	const obstacles = [page(document.querySelector("header.site-header").getBoundingClientRect())]
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
	while (walker.nextNode()) {
		const node = walker.currentNode
		if (!node.textContent.trim() || tabbar.contains(node) || !shown(node.parentElement)) continue
		const range = document.createRange()
		range.selectNodeContents(node)
		for (const rect of range.getClientRects()) if (visible(rect)) obstacles.push(page(rect))
	}
	// Icons and bars always count. A link or button counts as a whole box only when it has a
	// visible border or background (the language button, the footer pill); a plain link is covered
	// by its text. Every drawn top or bottom edge counts too, so an edge never sits in a
	// sliver of card border or right against a row divider.
	const transparent = (colour) => colour === "transparent" || /(,|\/)\s*0\)$/.test(colour)
	for (const el of document.body.querySelectorAll("*")) {
		if (tabbar.contains(el) || !shown(el)) continue
		const rect = el.getBoundingClientRect()
		if (!visible(rect)) continue
		const style = getComputedStyle(el)
		const drawn = (side) =>
			Number.parseFloat(style[`border${side}Width`]) > 0 &&
			!transparent(style[`border${side}Color`])
		const filled = !transparent(style.backgroundColor)
		const painted = filled || ["Top", "Right", "Bottom", "Left"].some(drawn)
		if (
			el.matches("svg, img, [role=progressbar], progress, meter") ||
			(painted && el.matches("a, button, input, select"))
		) {
			obstacles.push(page(rect))
		}
		const box = page(rect)
		if (filled || drawn("Top")) obstacles.push({ top: box.top - 2, bottom: box.top + 2 })
		if (filled || drawn("Bottom")) obstacles.push({ top: box.bottom - 2, bottom: box.bottom + 2 })
	}
	const clear = (y) => obstacles.every((o) => y < o.top - clearance || y > o.bottom + clearance)

	for (const framing of framings) {
		const selector = framing.start ?? framing.end
		let wanted = 0
		if (selector !== "top") {
			const el = document.querySelector(selector)
			if (!el) throw new Error(`${selector} not found on ${location.pathname}`)
			const rect = page(el.getBoundingClientRect())
			wanted = framing.start ? rect.top - gap : rect.bottom + gap - tabTop
		}
		wanted = Math.round(Math.min(Math.max(wanted, 0), maxTop))
		for (let step = 0; step <= 2 * reach; step += 1) {
			const top = wanted + (step % 2 ? -1 : 1) * Math.ceil(step / 2)
			if (top < 0 || top > maxTop) continue
			if ((top === 0 || clear(top)) && clear(top + tabTop)) {
				return { top, anchor: `${framing.start ? "start" : "end"} ${selector}` }
			}
		}
	}
	// Name the clean ranges that do exist, so a new framing is quick to pick.
	const ranges = []
	for (let top = 0; top <= maxTop; top += 1) {
		const ok = (top === 0 || clear(top)) && clear(top + tabTop)
		const last = ranges.at(-1)
		if (ok && last && last[1] === top - 1) last[1] = top
		else if (ok) ranges.push([top, top])
	}
	const where = ranges.map(([from, to]) => `${from}-${to}`).join(", ") || "none"
	throw new Error(`no clean framing on ${location.pathname}; clean scroll ranges: ${where}`)
}
