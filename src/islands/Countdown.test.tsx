// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { Countdown } from "./Countdown"

const before = "2026-09-10T10:00:00Z" // 70 days to go
const after = "2026-11-22T10:00:00Z" // day 3

/** The one live region. getByText cannot see the whole sentence once the number is in its own span. */
function daysLine(): HTMLElement {
	const el = document.querySelector<HTMLElement>(".days")
	if (!el) throw new Error("no .days element")
	return el
}

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Countdown before launch", () => {
	it("renders the digits with announcements off and the days line polite", () => {
		vi.setSystemTime(new Date(before))
		render(
			<Countdown
				locale="en"
				initialNow={before}
				guideHref="/en/guides/before-you-start/"
				trackerHref="/en/tracker/"
			/>
		)
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
		const digits = screen.getByTestId("countdown-digits")
		expect(digits).toHaveAttribute("aria-live", "off")
		expect(daysLine()).toHaveAttribute("aria-live", "polite")
		expect(daysLine()).toHaveAttribute("aria-atomic", "true")
		expect(daysLine()).toHaveTextContent("70 days to go")
		expect(daysLine().querySelector(".days-number")).toHaveTextContent("70")
		expect(screen.getByRole("link", { name: "Read this before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
	})

	it("says 1 day the evening before", () => {
		const eve = "2026-11-18T20:00:00Z"
		vi.setSystemTime(new Date(eve))
		render(<Countdown locale="en" initialNow={eve} guideHref="#" trackerHref="/en/tracker/" />)
		expect(daysLine()).toHaveTextContent("1 day to go")
		expect(daysLine().querySelector(".days-number")).toHaveTextContent("1")
	})

	it("uses Norwegian strings", () => {
		vi.setSystemTime(new Date(before))
		render(<Countdown locale="no" initialNow={before} guideHref="#" trackerHref="/no/tracker/" />)
		expect(daysLine()).toHaveTextContent("70 dager igjen")
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(before))
		const { container } = render(
			<Countdown locale="en" initialNow={before} guideHref="#" trackerHref="/en/tracker/" />
		)
		// axe-core schedules its own work with setTimeout, so it never resolves under fake timers.
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Countdown after launch", () => {
	it("flips to the launched state from the device clock and links to the tracker", () => {
		vi.setSystemTime(new Date(after))
		// initialNow is the build time (before launch); the device clock decides.
		render(<Countdown locale="en" initialNow={before} guideHref="#" trackerHref="/en/tracker/" />)
		expect(screen.getByText("It is out.")).toBeInTheDocument()
		expect(daysLine()).toHaveTextContent("Day 3 since launch")
		expect(daysLine().querySelector(".days-number")).toHaveTextContent("3")
		expect(screen.queryByTestId("countdown-digits")).not.toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Open the tracker" })).toHaveAttribute(
			"href",
			"/en/tracker/"
		)
	})

	it("keeps the same live region across the flip", () => {
		vi.setSystemTime(new Date("2026-11-18T22:59:59Z"))
		render(<Countdown locale="en" initialNow={before} guideHref="#" trackerHref="/en/tracker/" />)
		const region = daysLine()
		expect(region).toHaveTextContent("1 day to go")
		expect(region).toHaveAttribute("aria-live", "polite")
		act(() => {
			vi.advanceTimersByTime(2_000)
		})
		expect(daysLine()).toBe(region)
		expect(region).toHaveTextContent("Day 0 since launch")
	})
})

describe("Countdown under reduced motion", () => {
	it("hides the seconds", () => {
		vi.setSystemTime(new Date(before))
		const original = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			...original(query),
			matches: query.includes("reduce"),
		}))
		render(<Countdown locale="en" initialNow={before} guideHref="#" trackerHref="/en/tracker/" />)
		expect(screen.queryByText("seconds")).not.toBeInTheDocument()
		expect(screen.getByText("minutes")).toBeInTheDocument()
		window.matchMedia = original
	})
})
