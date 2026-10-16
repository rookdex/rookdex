// Dev-only helper for the banner (spec §8) and the Play feature graphic (Android spec §5). Serves
// the repository over HTTP so the sources can load the self-hosted faces from node_modules, and
// accepts each render at a fixed POST path. Never deployed: docs/ is not part of the build.
import { readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const port = 4400
const types = {
	".html": "text/html; charset=utf-8",
	".css": "text/css",
	".woff2": "font/woff2",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
}

/** POST path to the file it writes, relative to the repository root. Nothing else is writable. */
const outputs = {
	"/og.png": "public/og.png",
	"/feature-graphic.jpg": "docs/android/feature-graphic.jpg",
}

createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://localhost:${port}`)

	if (req.method === "POST" && Object.hasOwn(outputs, url.pathname)) {
		const chunks = []
		for await (const chunk of req) chunks.push(chunk)
		const body = Buffer.concat(chunks)
		await writeFile(join(root, outputs[url.pathname]), body)
		res.writeHead(200, { "content-type": "application/json" })
		res.end(JSON.stringify({ bytes: body.length }))
		return
	}

	const file = normalize(join(root, decodeURIComponent(url.pathname)))
	if (!file.startsWith(root)) {
		res.writeHead(403)
		res.end()
		return
	}
	try {
		const body = await readFile(file)
		res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" })
		res.end(body)
	} catch {
		res.writeHead(404)
		res.end()
	}
}).listen(port, "127.0.0.1", () => {
	console.log(`banner source: http://localhost:${port}/docs/brand/og.html`)
})
