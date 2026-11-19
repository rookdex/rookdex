import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")

/** Crawlers that collect pages to train AI models, spelled the way each operator documents them. */
const TRAINING_CRAWLERS = [
	"GPTBot",
	"ClaudeBot",
	"Applebot-Extended",
	"meta-externalagent",
	"Amazonbot",
	"MistralAI-Training",
	// Common Crawl calls itself an open web corpus. It is here because that corpus is training data.
	"CCBot",
	// The shared "no AI training" preference token. A wildcard group does not match it.
	"__usage_ai-training",
]

/** Search engines and the fetchers that answer a question and link back. No group may name them.
 *  Google-Extended is here on purpose: blocking it also stops Gemini from grounding answers in
 *  the site. */
const WELCOME_CRAWLERS = [
	"Googlebot",
	"Bingbot",
	"Applebot",
	"Google-Extended",
	"OAI-SearchBot",
	"ChatGPT-User",
	"Claude-SearchBot",
	"Claude-User",
	"PerplexityBot",
]

/** The groups of a robots.txt: the user agents each one names and the rules they share. */
function robotsGroups(text: string) {
	const groups: { agents: string[]; rules: string[] }[] = []
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.replace(/#.*$/, "").trim()
		const agent = /^user-agent:\s*(.+)$/i.exec(line)?.[1]
		const last = groups.at(-1)
		if (agent) {
			// A user-agent line after a rule starts the next group; before one, it joins the group.
			if (last && last.rules.length === 0) last.agents.push(agent.toLowerCase())
			else groups.push({ agents: [agent.toLowerCase()], rules: [] })
		} else if (/^(allow|disallow):/i.test(line)) {
			last?.rules.push(line)
		}
	}
	return groups
}

describe("crawler files (SEO spec §4.3, §4.6)", () => {
	// A crawler follows every group that names it, so the rules of all of them count.
	const groupsFor = (agent: string) =>
		robotsGroups(read("public/robots.txt")).filter((group) =>
			group.agents.includes(agent.toLowerCase())
		)
	const rulesFor = (agent: string) => groupsFor(agent).flatMap((group) => group.rules)

	it("robots.txt allows every crawler it does not name and names the sitemap", () => {
		expect(rulesFor("*")).toEqual(["Allow: /"])
		const lines = read("public/robots.txt").split(/\r?\n/)
		expect(lines).toContain("Sitemap: https://rookdex.app/sitemap.xml")
	})

	it.each(TRAINING_CRAWLERS)("robots.txt asks the training crawler %s to stay out", (agent) => {
		expect(rulesFor(agent)).toEqual(["Disallow: /"])
	})

	it.each(WELCOME_CRAWLERS)("robots.txt leaves %s to the wildcard group", (agent) => {
		expect(groupsFor(agent)).toEqual([])
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

describe("manifest (locale spec §6.5)", () => {
	it("starts the installed app at the root and keeps its identity", () => {
		const manifest = JSON.parse(read("public/manifest.webmanifest"))
		expect(manifest.start_url).toBe("/")
		expect(manifest.id).toBe("/")
	})
})
