import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { SHORTCUT_TABS, TAB_PATHS } from "../model/tabs"

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")

describe("crawler files (SEO spec §4.3, §4.6)", () => {
	it("robots.txt allows everything and names the sitemap", () => {
		const lines = read("public/robots.txt").split(/\r?\n/)
		expect(lines).toContain("User-agent: *")
		expect(lines).toContain("Allow: /")
		expect(lines).toContain("Sitemap: https://rookdex.app/sitemap.xml")
	})

	it("the IndexNow key is 32 lowercase hex characters and nothing else", () => {
		expect(read("public/indexnow-key.txt")).toMatch(/^[a-f0-9]{32}$/)
	})

	it("keeps line-ending conversion off the key file", () => {
		expect(read(".gitattributes").split(/\r?\n/)).toContain("public/indexnow-key.txt -text")
	})
})

describe("hosts and deploy (SEO spec §4.5, §4.6)", () => {
	it("turns the workers.dev mirror off but keeps version previews", () => {
		// Every comment in wrangler.jsonc sits on its own line; parsing catches a duplicate key or a
		// lost brace that a regex would miss.
		const config = JSON.parse(read("wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""))
		expect(config.workers_dev).toBe(false)
		expect(config.preview_urls).toBe(true)
		expect(config.assets.not_found_handling).toBe("404-page")
	})

	it("sends noindex on every workers.dev host", () => {
		const lines = read("public/_headers").split(/\r?\n/)
		const host = lines.indexOf("https://:version.:subdomain.workers.dev/*")
		expect(host).toBeGreaterThanOrEqual(0)
		expect(lines[host + 1].trim()).toBe("X-Robots-Tag: noindex")
	})

	it("deploys only from main, and the IndexNow ping can't fail the deploy", () => {
		const workflow = read(".github/workflows/deploy.yml").replace(/\r\n/g, "\n")
		const job = workflow.slice(workflow.indexOf("\n  deploy:\n"))
		// The guard sits on the job, not a step, and the ping runs after the deploy it announces.
		expect(job.split("\n    steps:")[0]).toContain("\n    if: github.ref == 'refs/heads/main'")
		expect(job.indexOf("- name: Ping IndexNow")).toBeGreaterThan(job.indexOf("- name: Deploy"))
		const ping = workflow.slice(workflow.indexOf("- name: Ping IndexNow"))
		expect(ping).toContain("continue-on-error: true")
		expect(ping).toContain("timeout-minutes: 2")
		expect(ping).not.toContain("--fail")
		expect(ping).not.toContain("secrets.")
	})
})

interface ManifestIcon {
	src: string
	sizes: string
	type: string
	purpose?: string
}

interface ManifestShortcut {
	name: string
	short_name: string
	url: string
	icons: ManifestIcon[]
}

const manifest = JSON.parse(read("public/manifest.webmanifest"))

/** Width and height from a PNG's IHDR chunk, and whether it has an alpha channel (color type 6). */
function pngHeader(path: string) {
	const bytes = readFileSync(new URL(`../../${path}`, import.meta.url))
	expect(bytes.subarray(1, 4).toString("latin1"), path).toBe("PNG")
	return { size: `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, alpha: bytes[25] === 6 }
}

describe("manifest (locale spec §6.5)", () => {
	it("starts the installed app at the root and keeps its identity", () => {
		expect(manifest.start_url).toBe("/")
		expect(manifest.id).toBe("/")
	})

	it("names only icon files that exist, at the size it gives for them", () => {
		const shortcuts: ManifestShortcut[] = manifest.shortcuts ?? []
		const icons: ManifestIcon[] = [...manifest.icons, ...shortcuts.flatMap((s) => s.icons)]
		for (const icon of icons) {
			expect(icon.type, icon.src).toBe("image/png")
			expect(pngHeader(`public${icon.src}`).size, icon.src).toBe(icon.sizes)
		}
	})

	it("has one monochrome icon with an alpha channel, large enough for Bubblewrap", () => {
		const monochrome = (manifest.icons as ManifestIcon[]).filter((i) => i.purpose === "monochrome")
		expect(monochrome).toHaveLength(1)
		expect(pngHeader(`public${monochrome[0].src}`).alpha).toBe(true)
		// Bubblewrap takes a monochrome icon from 48 px (TwaManifest.ts, MIN_NOTIFICATION_ICON_SIZE).
		expect(Number.parseInt(monochrome[0].sizes, 10)).toBeGreaterThanOrEqual(48)
	})
})

describe("manifest app shortcuts", () => {
	const shortcuts: ManifestShortcut[] = manifest.shortcuts ?? []
	const en = JSON.parse(read("src/locales/en.json"))

	it("has one shortcut per shortcut tab, in order, named like the English tab", () => {
		expect(shortcuts.map((s) => s.url)).toEqual(SHORTCUT_TABS.map((id) => `/?tab=${id}`))
		expect(shortcuts.map((s) => s.name)).toEqual(SHORTCUT_TABS.map((id) => en[`nav.${id}`]))
		// Android's launcher shows three or four, and its menu fits about ten characters a label.
		expect(shortcuts.length).toBeLessThanOrEqual(4)
		for (const shortcut of shortcuts) {
			expect(shortcut.short_name, shortcut.url).toBe(shortcut.name)
			expect(shortcut.name.length, shortcut.name).toBeLessThanOrEqual(10)
		}
	})

	it("stays inside the manifest's scope, on the root page that resolves the language", () => {
		for (const { url } of shortcuts) {
			const resolved = new URL(url, "https://rookdex.app/manifest.webmanifest")
			expect(resolved.origin, url).toBe("https://rookdex.app")
			expect(resolved.pathname, url).toBe(manifest.start_url)
		}
	})

	it("points every shortcut tab at a page that exists", () => {
		for (const id of SHORTCUT_TABS) {
			const page = `src/pages/[locale]/${TAB_PATHS[id]}`
			const found = [`${page}.astro`, `${page}/index.astro`].some((file) =>
				existsSync(new URL(`../../${file}`, import.meta.url))
			)
			expect(found, id).toBe(true)
		}
	})

	it("gives each shortcut a 96 and a 192 px icon, purpose any", () => {
		for (const shortcut of shortcuts) {
			// ShortcutInfo.ts drops a shortcut with no icon of 96 px or more (MIN_SHORTCUT_ICON_SIZE).
			expect(
				shortcut.icons.map((icon) => icon.sizes),
				shortcut.name
			).toEqual(["96x96", "192x192"])
			// A monochrome shortcut icon would be tinted with theme_color, which is black here.
			for (const icon of shortcut.icons) expect(icon.purpose, icon.src).toBeUndefined()
		}
	})
})
