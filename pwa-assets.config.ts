import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config"

// Generates pwa-64/192/512, maskable-icon-512, apple-touch-icon-180 and favicon.ico
// from the rook mark. Black backgrounds so the maskable padding matches the app.
export default defineConfig({
	preset: {
		...minimal2023Preset,
		maskable: {
			sizes: [512],
			padding: 0.3,
			resizeOptions: { background: "#000000" },
		},
		apple: {
			sizes: [180],
			padding: 0.3,
			resizeOptions: { background: "#000000" },
		},
	},
	images: ["public/icon.svg"],
})
