// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { StatsRail } from "./StatsRail"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const gator: SeedItem = {
	id: "wildlife/american-alligator",
	category: "wildlife",
	group: "reptiles",
	name: "American alligator",
	status: "confirmed",
	sources: [src],
}

const t = translator("en").t
const renderRail = (
	overall: { done: number; total: number },
	recent: { item: SeedItem; updated_at: string }[] = [],
	hubHref?: string
) => render(<StatsRail overall={overall} recent={recent} hubHref={hubHref} locale="en" t={t} />)

afterEach(() => {
	vi.useRealTimers()
})

describe("StatsRail (tracker refresh spec §5.2)", () => {
	it("links the Overall heading to the hub when given hubHref", () => {
		renderRail({ done: 0, total: 0 }, [], "/en/")
		const link = screen.getByRole("link", { name: "Overall" })
		expect(link).toHaveAttribute("href", "/en/")
		expect(link).toHaveClass("go-link")
		expect(screen.getByRole("heading", { name: "Overall", level: 2 })).toContainElement(link)
	})

	it("keeps the heading plain without hubHref", () => {
		renderRail({ done: 0, total: 0 })
		expect(screen.queryByRole("link", { name: "Overall" })).toBeNull()
	})

	it("rounds the big percentage down, so nothing reads 100 % early", () => {
		const { container } = renderRail({ done: 214, total: 215 })
		expect(container.querySelector(".stats-percent")).toHaveTextContent("99%")
		const bar = screen.getByRole("progressbar")
		expect(bar).toHaveAccessibleName("Overall")
		expect(bar).toHaveAttribute("aria-valuetext", "214 of 215")
	})

	it("reads 0 % for an empty total and draws one bar, no category bars", () => {
		const { container } = renderRail({ done: 0, total: 0 })
		expect(container.querySelector(".stats-percent")).toHaveTextContent("0%")
		expect(screen.getAllByRole("progressbar")).toHaveLength(1)
	})

	it("lists recent finds with a category icon and a relative time", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-11-20T10:05:00Z"))
		const updated = "2026-11-20T10:00:00.000Z"
		renderRail({ done: 1, total: 3 }, [{ item: gator, updated_at: updated }])
		const list = screen.getByRole("list", { name: "Recent finds" })
		expect(list).toHaveTextContent("American alligator")
		expect(list.querySelector(".find-icon svg")).not.toBeNull()
		const time = list.querySelector("time")
		expect(time).toHaveAttribute("datetime", updated)
		// Five minutes old, so the minute branch; the words come from the browser's CLDR data.
		const expected = new Intl.RelativeTimeFormat("en-GB", {
			numeric: "auto",
			style: "short",
		}).format(-5, "minute")
		expect(time).toHaveTextContent(expected)
	})

	it("says when nothing is ticked and has no axe violations", async () => {
		const { container } = renderRail({ done: 0, total: 0 })
		expect(screen.getByText("Nothing ticked yet.")).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
