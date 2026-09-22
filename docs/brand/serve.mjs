// Dev-only helper for the banner (spec §8). Serves the repository over HTTP so og.html can load
// the self-hosted faces from node_modules, and accepts the rendered PNG at POST /og.png, which it
// writes to public/og.png. Never deployed: docs/ is not part of the build.
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
	".svg": "image/svg+xml",
}

createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://localhost:${port}`)

	if (req.method === "POST" && url.pathname === "/og.png") {
		const chunks = []
		for await (const chunk of req) chunks.push(chunk)
		const png = Buffer.concat(chunks)
		await writeFile(join(root, "public/og.png"), png)
		res.writeHead(200, { "content-type": "application/json" })
		res.end(JSON.stringify({ bytes: png.length }))
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
