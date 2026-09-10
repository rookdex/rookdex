// @ts-check
import react from "@astrojs/react"
import { defineConfig } from "astro/config"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	integrations: [react()],
	trailingSlash: "always",
	i18n: {
		defaultLocale: "en",
		locales: ["en", "no"],
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: false,
		},
	},
})
