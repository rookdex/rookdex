import { defineConfig } from "@vite-pwa/assets-generator/config"

// favicon.ico only, from the drawing without the palm: at 16 px the palm is noise (spec §5.3).
// The source lives outside public/ so it is never served. icon.svg and every PNG keep the palm.
// The generator writes its output beside the source (assets/favicon.ico); the npm script moves
// it into public/ afterward.
export default defineConfig({
	preset: {
		transparent: { sizes: [], favicons: [[48, "favicon.ico"]] },
		maskable: { sizes: [] },
		apple: { sizes: [] },
	},
	images: ["assets/favicon-source.svg"],
})
