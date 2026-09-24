import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import Sources from "./Sources.astro"

describe("guide sources (spec §9)", () => {
	it("is a section labelled by its h2, each link showing its outlet", async () => {
		const doc = await renderDoc(Sources, {
			props: {
				urls: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
				label: "Kilder",
			},
		})
		const section = doc.querySelector("section")
		const heading = doc.getElementById(section?.getAttribute("aria-labelledby") ?? "")
		expect(heading?.tagName).toBe("H2")
		expect(heading?.textContent).toBe("Kilder")
		const links = [...doc.querySelectorAll("section a")].map((a) => [
			a.textContent?.trim(),
			a.getAttribute("href"),
			a.getAttribute("rel"),
		])
		expect(links).toEqual([
			["rockstargames.com", "https://www.rockstargames.com/VI", "noopener"],
			["ign.com", "https://www.ign.com/articles/x", "noopener"],
		])
	})

	it("renders nothing for a guide without sources", async () => {
		const doc = await renderDoc(Sources, { props: { urls: [], label: "Sources" } })
		expect(doc.querySelector("section")).toBeNull()
	})
})
