// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { Hero, SegmentBar } from "./Hero"

const { t } = translator("en")
const rows: CategoryRow[] = [
	{ id: "collectibles", done: 2, total: 5, groups: ["a"] },
	{ id: "wildlife", done: 15, total: 38, groups: ["b"] },
]
const value = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling

describe("Hero (desktop dashboard spec §4.2)", () => {
	it("shows the big count, the total and the three pairs as text", () => {
		render(
			<Hero
				locale="en"
				overall={{ done: 17, total: 43 }}
				foundToday={3}
				closestLabel="Wildlife"
				rows={rows}
				t={t}
			/>
		)
		expect(screen.getByText("17")).toHaveClass("hero-big")
		expect(screen.getByText("/ 43 found")).toBeInTheDocument()
		// 17 of 43 is 39.5 %: rounded down, never up.
		expect(value("Overall")).toHaveTextContent("39%")
		expect(value("Found today")).toHaveTextContent("3")
		expect(value("Closest")).toHaveTextContent("Wildlife")
	})

	it("shows a dash for Closest with nothing found", () => {
		render(<Hero locale="en" overall={{ done: 0, total: 43 }} foundToday={0} rows={rows} t={t} />)
		expect(value("Closest")).toHaveTextContent("–")
	})

	it("has no axe violations", async () => {
		const { container } = render(
			<Hero locale="en" overall={{ done: 0, total: 43 }} foundToday={0} rows={rows} t={t} />
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("SegmentBar", () => {
	it("renders no segment, and so no style attribute, on the server", () => {
		const html = renderToString(<SegmentBar rows={rows} />)
		expect(html).not.toContain("style=")
		expect(html).toContain('aria-hidden="true"')
	})

	it("sizes one segment per category by its total after mount", () => {
		const { container } = render(<SegmentBar rows={rows} />)
		const parts = container.querySelectorAll<HTMLElement>(".seg-part")
		expect(parts).toHaveLength(2)
		expect(parts[1].style.flexGrow).toBe("38")
		expect(parts[1].querySelector<HTMLElement>(".seg-fill")?.style.width).toBe("39%")
	})

	it("rounds a share down, like the hero (2 of 3 is 66 %, not 67 %)", () => {
		const { container } = render(
			<SegmentBar rows={[{ id: "vehicles", done: 2, total: 3, groups: [] }]} />
		)
		expect(container.querySelector<HTMLElement>(".seg-fill")?.style.width).toBe("66%")
	})
})
