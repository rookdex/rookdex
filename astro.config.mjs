// @ts-check
import react from "@astrojs/react"
import { defineConfig } from "astro/config"
import precache from "./integrations/precache.mjs"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	integrations: [react(), precache()],
	trailingSlash: "always",
	i18n: {
		defaultLocale: "en",
		locales: ["en", "no"],
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
