import { describe, expect, it } from "vitest"
import { findUnsafeLinks } from "./external-links.mjs"

const SITE = "https://rookdex.app"
const safe = (href: string) =>
	`<a href="${href}" target="_blank" rel="noopener noreferrer">x<span class="visually-hidden new-tab-note"> (opens in a new tab)</span></a>`
const check = (body: string) => findUnsafeLinks(`<!doctype html><body>${body}</body>`, SITE)

describe("findUnsafeLinks (feedback spec §11)", () => {
	it("passes a link rendered by ExternalLink", () => {
		expect(check(safe("https://github.com/rookdex/rookdex"))).toEqual([])
	})

	it("fails an external link without target=_blank", () => {
		const html = safe("https://example.com/").replace(' target="_blank"', "")
		expect(check(html)).toEqual([{ href: "https://example.com/", reason: "no target=_blank" }])
	})

	it("fails when rel lacks either token", () => {
		expect(check(safe("https://example.com/").replace("noopener noreferrer", "noopener"))).toEqual([
			{ href: "https://example.com/", reason: "rel lacks noopener or noreferrer" },
		])
		expect(
			check(safe("https://example.com/").replace("noopener noreferrer", "noreferrer"))
		).toEqual([{ href: "https://example.com/", reason: "rel lacks noopener or noreferrer" }])
	})

	it("matches rel tokens case-insensitively and in any spacing", () => {
		const html = safe("https://example.com/").replace(
			'rel="noopener noreferrer"',
			'REL="  NoReferrer   NoOpener "'
		)
		expect(check(html)).toEqual([])
	})

	it("fails without the new-tab note, even with other hidden text", () => {
		const html =
			'<a href="https://example.com/" target="_blank" rel="noopener noreferrer">x<span class="visually-hidden"> (opens in a new tab)</span></a>'
		expect(check(html)).toEqual([{ href: "https://example.com/", reason: "no new-tab note" }])
	})

	it("counts a protocol-relative URL as external", () => {
		expect(check('<a href="//example.com/x">x</a>').map((p) => p.href)).toEqual(["//example.com/x"])
	})

	it.each(["javascript:alert(1)", "data:text/html,x", "http://example.com/", " JavaScript:x"])(
		"fails the scheme of %j",
		(href) => {
			expect(check(`<a href="${href}">x</a>`)).toEqual([{ href, reason: "scheme not allowed" }])
		}
	)

	it("passes mailto, relative, in-page and same-origin links, and anchors without href", () => {
		expect(
			check(
				[
					'<a class="skip" href="#main">Skip</a>',
					'<a href="mailto:legal@rookdex.app">mail</a>',
					'<a href="/en/tracker/">tracker</a>',
					'<a href="../#item-wildlife/pelican">back</a>',
					'<a href="/en/settings/#about">about</a>',
					'<a href="#cat-wildlife">chip</a>',
					'<a href="https://rookdex.app/nb/">home</a>',
					'<a href="//rookdex.app/en/">home</a>',
					"<a>no href</a>",
				].join("")
			)
		).toEqual([])
	})

	it("never checks <link> elements", () => {
		expect(
			findUnsafeLinks(
				'<html><head><link rel="alternate" hreflang="nb" href="https://rookdex.app/nb/"><link rel="canonical" href="http://example.com/"></head></html>',
				SITE
			)
		).toEqual([])
	})
})
