// Dev-only helper for the Play listing (Android spec §5). Screenshots a production build on a
// 360 × 640 phone at device scale 3 (1080 × 1920) in English and Norwegian, with a fresh browser
// profile and a few demo ticks, never real profiles. Run it against `npm run preview` after
// `npm run build`, or pass another origin as the first argument. Never deployed.
// The harness is a copy of docs/readme/capture.mjs on purpose: both are dev-only scripts.
import { spawn } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const browserPath =
	process.env.BROWSER_PATH ?? "C:/Program Files/BraveSoftware/Brave-Origin/Application/brave.exe"

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
const socketUrl = await new Promise((resolve, reject) => {
	browser.on("error", reject)
	browser.stderr.on("data", (chunk) => {
		const match = /ws:\/\/\S+/.exec(String(chunk))
		if (match) resolve(match[0])
	})
})
const targets = await (await fetch(`http://127.0.0.1:${new URL(socketUrl).port}/json/list`)).json()
const socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl)
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
	new Promise((resolve) => {
		nextId += 1
		pending.set(nextId, resolve)
		socket.send(JSON.stringify({ id: nextId, method, params }))
	})
const evaluate = async (expression) =>
	(await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result
		.result.value
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const base = process.argv[2] ?? "http://localhost:8787"
const out = fileURLToPath(new URL("./screenshots/", import.meta.url))
const tickIndexes = [0, 1, 3, 4, 6, 8, 10, 12, 15]
const pages = [
	["1-hub", ""],
	["2-tracker", "tracker/"],
	["3-news", "news/"],
	["4-settings", "settings/"],
]

/** PNG colour type from the IHDR chunk: 2 is RGB, 6 is RGBA. Play takes no alpha. */
const pngColourType = (buffer) => buffer[25]

try {
	await send("Emulation.setDeviceMetricsOverride", {
		width: 360,
		height: 640,
		deviceScaleFactor: 3,
		mobile: true,
	})
	// First visit: let the service worker install, and mark the one-time hints as seen.
	await send("Page.navigate", { url: `${base}/en/` })
	await wait(3000)
	await evaluate(
		`localStorage.setItem("rookdex.install-prompt-seen", "1"); localStorage.setItem("rookdex.persist-hint-seen", "1")`
	)
	mkdirSync(out, { recursive: true })
	for (const locale of ["en", "nb"]) {
		// Each language starts from a fresh profile, so the tracker shows its own default name
		// ("Player 1" / "Spiller 1"). The privacy page opens no database, so the delete is not blocked.
		await send("Page.navigate", { url: `${base}/en/privacy/` })
		await wait(1500)
		await evaluate(`new Promise((resolve) => {
			localStorage.removeItem("rookdex.active-profile")
			const request = indexedDB.deleteDatabase("rookdex")
			request.onsuccess = request.onerror = request.onblocked = () => resolve(true)
		})`)
		await send("Page.navigate", { url: `${base}/${locale}/tracker/` })
		await wait(3000)
		const ticked = await evaluate(`(async () => {
			const boxes = [...document.querySelectorAll("input[type=checkbox]")]
			for (const i of ${JSON.stringify(tickIndexes)}) {
				boxes[i]?.click()
				await new Promise((r) => setTimeout(r, 60))
			}
			return document.querySelectorAll("input[type=checkbox]:checked").length
		})()`)
		console.log(`${locale}: ticked ${ticked} items`)
		for (const [name, path] of pages) {
			await send("Page.navigate", { url: `${base}/${locale}/${path}` })
			await wait(3000)
			await evaluate("window.scrollTo(0, 0)")
			const { result } = await send("Page.captureScreenshot", { format: "png" })
			const png = Buffer.from(result.data, "base64")
			const file = join(out, `${locale}-${name}.png`)
			writeFileSync(file, png)
			const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
			console.log(`${locale}-${name}.png ${size} colour type ${pngColourType(png)}`)
		}
	}
} finally {
	socket.close()
	browser.kill()
	await wait(500)
	rmSync(profile, { recursive: true, force: true })
}
