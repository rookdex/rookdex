/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

// getViteConfig hands Vitest the same Vite setup Astro builds with, so imports resolve identically.
export default getViteConfig({
	test: {
		environment: "node",
		setupFiles: ["src/test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}", "integrations/**/*.test.ts"],
	},
})
