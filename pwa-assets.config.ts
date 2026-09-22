import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config"

// Generates pwa-64/192/512, maskable-icon-512 and apple-touch-icon-180 from the M2 mark. The
// generator scales the source by (1 - padding): 0.1 keeps the horizon bar's far corner (220.6
// from centre) inside the 204.8 maskable safe radius (spec §5.3). Apple gets 0 because the source
// is already a black rounded square and iOS masks its own corners. favicon.ico is built separately
// by pwa-assets.config.favicon.ts — the palm reads as noise at 16 px.
export default defineConfig({
	preset: {
		...minimal2023Preset,
		transparent: {
			sizes: [64, 192, 512],
			favicons: [],
		},
		maskable: {
			sizes: [512],
			padding: 0.1,
			resizeOptions: { background: "#000000" },
		},
		apple: {
			sizes: [180],
			padding: 0,
			resizeOptions: { background: "#000000" },
		},
	},
	images: ["public/icon.svg"],
})
