// @ts-check
import { satteri } from "@astrojs/markdown-satteri"
import react from "@astrojs/react"
import { defineConfig } from "astro/config"
import externalLinks from "./integrations/external-links.mjs"
import pricePlugin from "./integrations/markdown-price.mjs"
import precache from "./integrations/precache.mjs"
import seoCheck from "./integrations/seo-check.mjs"

// One list for routing and the price plugin. src/i18n/locales.ts must match it (bundles.test.ts).
const locales = ["en", "nb"]

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	integrations: [react(), precache(), seoCheck(), externalLinks()],
	trailingSlash: "always",
	markdown: {
		// Explicit satteri() uses the same features as Astro's implicit default, so guide HTML is unchanged.
		processor: satteri({ mdastPlugins: [pricePlugin({ locales })] }),
	},
	i18n: {
		defaultLocale: "en",
		locales,
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: false,
		},
	},
	security: {
		csp: {
			directives: [
				"default-src 'self'",
				"img-src 'self' data:",
				"font-src 'self'",
				"connect-src 'self'",
				"manifest-src 'self'",
				"worker-src 'self'",
				"base-uri 'self'",
				"form-action 'self'",
				"object-src 'none'",
			],
			scriptDirective: { resources: ["'self'"] },
			styleDirective: { resources: ["'self'"] },
		},
	},
})
