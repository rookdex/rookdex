// Dev-only helper for the README. Screenshots the live site (or the URL given as the first
// argument) on a phone and a desktop viewport, places the shots into screens.html and saves the
// canvas to docs/readme/screens.png at 2x. Drives a headless Chromium browser over the DevTools
// protocol; set BROWSER_PATH if yours is not at the default below. Never deployed: docs/ is not
// part of the build.
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const browserPath =
	process.env.BROWSER_PATH ?? "C:/Program Files/BraveSoftware/Brave-Origin/Application/brave.exe"
const base = process.argv[2] ?? "https://rookdex.app"
const here = fileURLToPath(new URL(".", import.meta.url))

// Ticks a fixed spread of items so the progress bars show colour and the shot is repeatable.
const tickIndexes = [0, 1, 3, 4, 6, 8, 10, 12, 15]
const shots = [
	{ id: "phone-hub", path: "/en/", width: 390, height: 844 },
	{ id: "phone-tracker", path: "/en/tracker/", width: 390, height: 844 },
	{ id: "desktop-tracker", path: "/en/tracker/", width: 1280, height: 800 },
]

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
	pending.get(message.id)?.(message)
	pending.delete(message.id)
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
const viewport = (width, height) =>
	send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 2,
		mobile: width < 768,
	})

try {
	// Mark the first-visit hints as seen so they stay out of the shots.
	await send("Page.navigate", { url: `${base}/en/` })
	await wait(2500)
	await evaluate(
		`localStorage.setItem("rookdex.install-prompt-seen", "1"); localStorage.setItem("rookdex.persist-hint-seen", "1")`
	)

	const images = {}
	let ticked = false
	for (const shot of shots) {
		await viewport(shot.width, shot.height)
		await send("Page.navigate", { url: base + shot.path })
		await wait(3500)
		if (shot.path.includes("tracker") && !ticked) {
			const count = await evaluate(`(async () => {
				const boxes = [...document.querySelectorAll("input[type=checkbox]")]
				for (const i of ${JSON.stringify(tickIndexes)}) {
					boxes[i]?.click()
					await new Promise((r) => setTimeout(r, 60))
				}
				window.scrollTo(0, 0)
				return document.querySelectorAll("input[type=checkbox]:checked").length
			})()`)
			console.log(`ticked ${count} items`)
			ticked = true
			await wait(800)
		}
		const { result } = await send("Page.captureScreenshot", { format: "png" })
		images[shot.id] = `data:image/png;base64,${result.data}`
	}

	await viewport(1280, 600)
	await send("Page.navigate", { url: pathToFileURL(join(here, "screens.html")).href })
	await wait(1000)
	await evaluate(`Promise.all(Object.entries(${JSON.stringify(images)}).map(([id, src]) => {
		const img = document.getElementById(id)
		img.src = src
		return img.decode()
	}))`)
	const { result } = await send("Page.captureScreenshot", {
		format: "png",
		clip: { x: 0, y: 0, width: 1280, height: 600, scale: 1 },
	})
	writeFileSync(join(here, "screens.png"), Buffer.from(result.data, "base64"))
	console.log("wrote docs/readme/screens.png")
} finally {
	socket.close()
	browser.kill()
	await wait(500)
	rmSync(profile, { recursive: true, force: true })
}
