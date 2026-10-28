// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { DayCount } from "../../model/dashboard"
import { FindsByDay, hasChart } from "./FindsByDay"

const { t } = translator("en")
const week = (counts: number[]): DayCount[] =>
	counts.map((count, n) => ({ day: `2026-11-${String(20 + n).padStart(2, "0")}`, count }))

describe("FindsByDay (desktop dashboard spec §4.5)", () => {
	it("hides with one day of finds and shows with two", () => {
		expect(hasChart(week([0, 0, 0, 0, 0, 0, 4]))).toBe(false)
		expect(hasChart(week([0, 0, 1, 0, 0, 0, 4]))).toBe(true)
		const { container } = render(
			<FindsByDay days={week([0, 0, 0, 0, 0, 0, 4])} locale="en" t={t} />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("is an ordered list of 7 days, today last, each with a hidden sentence", () => {
		render(<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />)
		const list = screen.getByRole("list", { name: "Finds by day" })
		expect(list.tagName).toBe("OL")
		const days = within(list).getAllByRole("listitem")
		expect(days).toHaveLength(7)
		expect(days[6]).toHaveTextContent("Today")
		expect(days[6].querySelector(".visually-hidden")).toHaveTextContent("4 found on 26 November")
		expect(days[2].querySelector(".visually-hidden")).toHaveTextContent("1 found on 22 November")
	})

	it("writes the date day first in both languages", () => {
		const nb = translator("nb").t
		render(<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="nb" t={nb} />)
		expect(document.querySelectorAll(".fbd-list .visually-hidden")[2]).toHaveTextContent(
			"22. november"
		)
	})

	it("sizes each bar by its share of the busiest day", () => {
		const { container } = render(
			<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />
		)
		const bars = container.querySelectorAll<HTMLElement>(".fbd-bar")
		expect(bars[6].style.height).toBe("100%")
		expect(bars[2].style.height).toBe("25%")
		expect(bars[0].style.height).toBe("0%")
	})

	it("has no axe violations", async () => {
		const { container } = render(
			<FindsByDay days={week([0, 0, 1, 0, 0, 0, 4])} locale="en" t={t} />
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
