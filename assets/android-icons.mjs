// Renders the two icon sets the Android wrapper reads from the manifest: the monochrome mark and
// the app shortcut icons. Run with `npm run icons:android`. The sources live here in assets/, so
// only the PNGs are served.
import { fileURLToPath } from "node:url"
import { generateTransparentAsset } from "@vite-pwa/assets-generator/api"

const source = (name) => fileURLToPath(new URL(name, import.meta.url))
const target = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

// The monochrome mark gets the maskable icon's 0.1 padding (pwa-assets.config.ts), so the two
// drawings sit in the same place and the mark stays inside the 204.8 safe radius.
const monochrome = await generateTransparentAsset("png", source("icon-monochrome.svg"), 512, {
	padding: 0.1,
})
await monochrome.toFile(target("monochrome-icon-512x512.png"))

// Two PNGs per shortcut, both sizes from web.dev's "App shortcuts" list: 96 px is the smallest
// Bubblewrap takes, 192 px covers dense screens. The SVGs are drawn on Android's 48 dp shortcut
// grid: a 44 dp disc and a 24 dp glyph, the tab's own icon from TabIcon.astro.
for (const tab of ["tracker", "dex", "news"]) {
	for (const size of [96, 192]) {
		const icon = await generateTransparentAsset("png", source(`shortcut-${tab}.svg`), size, {})
		await icon.toFile(target(`shortcut-${tab}-${size}x${size}.png`))
	}
}
