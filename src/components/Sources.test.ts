import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import Sources from "./Sources.astro"

describe("guide sources (spec §9)", () => {
	it("is a section labelled by its h2, each outlet link opening in a new tab", async () => {
		const doc = await renderDoc(Sources, {
			props: {
				urls: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
				label: "Kilder",
				locale: "no",
			},
		})
		const section = doc.querySelector("section")
		const heading = doc.getElementById(section?.getAttribute("aria-labelledby") ?? "")
		expect(heading?.tagName).toBe("H2")
		expect(heading?.textContent).toBe("Kilder")
		const links = [...doc.querySelectorAll("section a")].map((a) => [
			a.textContent?.replace(/\s+/g, " ").trim(),
			a.getAttribute("href"),
			a.getAttribute("target"),
		])
		expect(links).toEqual([
			["rockstargames.com (åpnes i ny fane)", "https://www.rockstargames.com/VI", "_blank"],
			["ign.com (åpnes i ny fane)", "https://www.ign.com/articles/x", "_blank"],
		])
	})

	it("renders nothing for a guide without sources", async () => {
		const doc = await renderDoc(Sources, { props: { urls: [], label: "Sources", locale: "en" } })
		expect(doc.querySelector("section")).toBeNull()
	})
})
