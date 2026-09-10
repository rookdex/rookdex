// @ts-check
import { defineConfig } from "astro/config"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	trailingSlash: "always",
})
