import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

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
