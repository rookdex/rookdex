import { describe, expect, it } from "vitest"
import { seedChunks, seedIndexFile } from "../model/seedDelivered"
import { GET, getStaticPaths } from "../pages/data/[chunk].json"

describe("data endpoint (spec §5)", () => {
	it("builds one route per chunk and one for the index file, each named by its hash", () => {
		const paths = getStaticPaths()
		expect(paths.map((p) => p.params.chunk)).toEqual(
			[...seedChunks, seedIndexFile].map((f) => f.file)
		)
	})

	it("serves each file's exact bytes as JSON", async () => {
		for (const path of getStaticPaths()) {
			// biome-ignore lint/suspicious/noExplicitAny: the endpoint reads only props
			const response = await GET({ props: path.props } as any)
			expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8")
			expect(await response.text()).toBe(path.props.body)
		}
	})
})
