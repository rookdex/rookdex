// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { CategoryBars } from "./CategoryBars"

const { t } = translator("en")
const rows: CategoryRow[] = [
	{ id: "vehicles", done: 8, total: 8, groups: ["bikes", "cars"] },
	{ id: "wildlife", done: 9, total: 23, groups: ["reptiles", "birds"] },
]
const rowLinks = () => within(screen.getByRole("list")).getAllByRole("link")
const bars = (phase: "before" | "after", closest?: string, list = rows) =>
	render(
		<CategoryBars
			rows={list}
			phase={phase}
			closest={closest}
			trackerHref="/en/tracker/"
			dexHref="/en/dex/"
			t={t}
		/>
	)

describe("CategoryBars (desktop dashboard spec §4.3)", () => {
	it("links each row to the tracker filtered to its category", () => {
		bars("after", "wildlife")
		const links = rowLinks()
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"/en/tracker/?show=vehicles",
			"/en/tracker/?show=wildlife",
		])
	})

	it("names each row with its heading, groups, what is left and the hidden count", () => {
		bars("after", "wildlife")
		const wildlife = rowLinks()[1]
		expect(within(wildlife).getByRole("heading", { level: 3 })).toHaveTextContent(/^Wildlife/)
		expect(wildlife).toHaveTextContent("14 left")
		expect(wildlife.querySelector(".visually-hidden")).toHaveTextContent("9 of 23 found")
		expect(wildlife.querySelector(".ledger-frac")).toHaveAttribute("aria-hidden", "true")
		expect(wildlife.querySelector(".ledger-groups")?.textContent).toMatch(/ · /)
	})

	it("says All found at 100 % and tags only the closest category, after launch", () => {
		bars("after", "wildlife")
		const [vehicles, wildlife] = rowLinks()
		expect(vehicles).toHaveTextContent("All found")
		expect(vehicles.querySelector(".tag")).toBeNull()
		expect(within(wildlife).getByText("Closest")).toHaveClass("tag")
	})

	it("fills a bar to the same rounded-down percent as the hero (2 of 3 is 66 %)", () => {
		bars("after", undefined, [{ id: "wildlife", done: 2, total: 3, groups: [] }])
		expect(document.querySelector<HTMLElement>(".ledger-fill")?.style.width).toBe("66%")
	})

	it("says 'N to find' before launch, with no tag and no style attribute on the server", () => {
		const zero = rows.map((r) => ({ ...r, done: 0 }))
		bars("before", "wildlife", zero)
		expect(rowLinks()[0]).toHaveTextContent("8 to find")
		expect(document.querySelector(".tag")).toBeNull()
		const html = renderToString(
			<CategoryBars
				rows={zero}
				phase="before"
				trackerHref="/en/tracker/"
				dexHref="/en/dex/"
				t={t}
			/>
		)
		expect(html).not.toContain("style=")
	})

	it("links the heading row to the Dex, in both phases", () => {
		for (const phase of ["before", "after"] as const) {
			const { unmount } = bars(phase)
			const link = screen.getByRole("link", { name: "Every item in the Dex" })
			expect(link).toHaveAttribute("href", "/en/dex/")
			expect(link.closest(".deco")).not.toBeNull()
			unmount()
		}
	})

	it("has a Categories heading and no axe violations", async () => {
		const { container } = bars("after", "wildlife")
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
