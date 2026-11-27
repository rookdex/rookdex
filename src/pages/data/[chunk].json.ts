// The seed's data files (spec §5): one hashed chunk of card text per category, and the hashed seed
// index (plan review ruling 3). The file name carries a hash of the bytes, so public/_headers can
// mark /data/* immutable and the service worker can copy it across deploys.
import type { APIRoute } from "astro"
import { seedChunks, seedIndexFile } from "../../model/seedDelivered"

export function getStaticPaths() {
	return [...seedChunks, seedIndexFile].map((file) => ({
		params: { chunk: file.file },
		props: { body: file.body },
	}))
}

export const GET: APIRoute = ({ props }) =>
	new Response((props as { body: string }).body, {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	})
