// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import type { CategoryRow } from "../../model/dashboard"
import { ANNOUNCE_GAP_MS, Hub } from "./Hub"
import type { LatestItem } from "./Latest"
import type { NewsItem } from "./NewsTile"

const before = "2026-09-10T10:00:00Z" // 70 days to go
const after = "2026-11-22T10:00:00Z" // day 3
const latest: LatestItem[] = [
	{ id: "rumours/online", name: "Online in 2027", added: "2026-11-22" },
	{ id: "rumours/pc", name: "PC timing", added: "2026-09-18" },
]

const categories: CategoryRow[] = [
	{ id: "vehicles", done: 0, total: 8, groups: ["bikes"] },
	{ id: "wildlife", done: 0, total: 23, groups: ["reptiles"] },
]
const news: NewsItem[] = [
	{ id: "facts/preload", kind: "confirmed", name: "Preload on 12 November", date: "2026-09-01" },
]

function StubDashboard() {
	return <p>Dashboard loaded</p>
}
const loaded = () => Promise.resolve({ Dashboard: StubDashboard })

function props(overrides: Partial<ComponentProps<typeof Hub>> = {}): ComponentProps<typeof Hub> {
	return {
		locale: "en",
		initialNow: before,
		guideHref: "/en/guides/before-you-start/",
		trackerHref: "/en/tracker/",
		newsHref: "/en/news/",
		latest,
		categories,
		news,
		mapLink: "https://www.rockstargames.com/VI",
		settingsHref: "/en/settings/",
		firstHourHref: "/en/guides/first-hour/",
		guideTitle: "Before you start",
		firstHourTitle: "Your first hour",
		loadDashboard: loaded,
		...overrides,
	}
}
const hub = (overrides?: Partial<ComponentProps<typeof Hub>>) =>
	render(<Hub {...props(overrides)} />)
const advance = (ms: number) =>
	act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})

/** getByText cannot see the whole sentence once the number is in its own span. */
function daysLine(): HTMLElement {
	const el = document.querySelector<HTMLElement>(".days")
	if (!el) throw new Error("no .days element")
	return el
}

beforeEach(() => {
	vi.useFakeTimers()
	window.history.replaceState(null, "", "/en/")
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Hub before launch", () => {
	it("renders the countdown, with the digits silent and the days line not live", () => {
		vi.setSystemTime(new Date(before))
		hub()
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
		expect(screen.getByTestId("countdown-digits")).toHaveAttribute("aria-live", "off")
		expect(daysLine()).not.toHaveAttribute("aria-live")
		expect(daysLine()).toHaveTextContent("70 days to go")
		expect(daysLine().querySelector(".days-number")).toHaveTextContent("70")
		expect(screen.getByRole("link", { name: "Read this before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
		expect(screen.getByRole("link", { name: "Read this before you start" })).toHaveClass("go-link")
		// The status region exists from the start and says nothing on load.
		expect(screen.getByRole("status")).toBeEmptyDOMElement()
	})

	it("says 1 day the evening before", () => {
		const eve = "2026-11-18T20:00:00Z"
		vi.setSystemTime(new Date(eve))
		hub({ initialNow: eve })
		expect(daysLine()).toHaveTextContent("1 day to go")
	})

	it("uses Norwegian strings", () => {
		vi.setSystemTime(new Date(before))
		hub({ locale: "nb" })
		expect(daysLine()).toHaveTextContent("70 dager igjen")
	})

	it("states the price from the price model, formatted for the language", () => {
		vi.setSystemTime(new Date(before))
		hub()
		// textContent, not getByText: Testing Library folds the no-break space into a plain one.
		expect(document.querySelector(".hub-state")?.textContent).toContain(
			"The standard digital edition is NOK 949."
		)
	})

	// The server cannot know the setting, so CSS hides the seconds (hover.test.ts). If the island
	// dropped the unit after hydration instead, the phone grid's columns would shift.
	it("renders the same units as the server HTML under reduced motion", () => {
		vi.setSystemTime(new Date(before))
		const units = (html: string) => html.match(/class="unit[ "]/g)?.length
		const server = renderToString(<Hub {...props()} />)
		const original = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			...original(query),
			matches: query.includes("reduce"),
		}))
		try {
			const { container } = hub()
			expect(units(container.innerHTML)).toBe(units(server))
			expect(screen.getByText("seconds").closest(".unit")).toHaveClass("unit-seconds")
		} finally {
			window.matchMedia = original
		}
	})

	// Vitest runs with import.meta.env.DEV true, so this proves the hub wires the override in;
	// host gating is covered by useHubPhase.test.ts.
	it("honours ?phase=after in dev and ignores ?phase=AFTER", async () => {
		vi.setSystemTime(new Date(before))
		window.history.replaceState(null, "", "/en/?phase=after")
		const { unmount } = hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Your progress" })).toBeInTheDocument()
		unmount()
		window.history.replaceState(null, "", "/en/?phase=AFTER")
		hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(before))
		const { container } = hub()
		// axe-core schedules its own work with setTimeout, so it never resolves under fake timers.
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("desktop dashboard before launch (desktop spec §4)", () => {
	it("renders the checklist, the bars, the news and the tiles before launch", () => {
		vi.setSystemTime(new Date(before))
		hub()
		expect(screen.getByRole("list", { name: "Before launch" })).toBeInTheDocument()
		expect(screen.getByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Vehicles/ })).toHaveTextContent("8 to find")
		expect(screen.getByRole("region", { name: "Latest news" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Leonida on Rockstar's site/ })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Open: Your first hour" })).toHaveAttribute(
			"href",
			"/en/guides/first-hour/"
		)
	})

	it("puts the countdown and the launch date, with no time, in the before hero", () => {
		vi.setSystemTime(new Date(before))
		hub()
		const hero = document.querySelector<HTMLElement>(".hero-before")
		expect(hero).not.toBeNull()
		expect(within(hero as HTMLElement).getByTestId("countdown-digits")).toBeInTheDocument()
		const date = hero?.querySelector(".hero-date")
		expect(date).toHaveTextContent("Thu 19 Nov")
		expect(date?.textContent).not.toMatch(/\d:\d/)
	})

	it("writes the launch date day first in Norwegian too", () => {
		vi.setSystemTime(new Date(before))
		hub({ locale: "nb" })
		expect(document.querySelector(".hero-date")?.textContent).toMatch(/19\. nov/)
	})

	it("emits no style attribute in the server HTML, before or after launch", () => {
		expect(renderToString(<Hub {...props()} />)).not.toContain("style=")
		expect(renderToString(<Hub {...props({ initialNow: after })} />)).not.toContain("style=")
	})

	it("hides news and keeps the tiles when there is no news", () => {
		vi.setSystemTime(new Date(before))
		hub({ news: [] })
		expect(screen.queryByRole("region", { name: "Latest news" })).toBeNull()
		expect(screen.getByRole("link", { name: /^Before you start/ })).toBeInTheDocument()
	})

	it("renders the news tile and the link tiles after launch too, even if the chunk fails", async () => {
		vi.setSystemTime(new Date(after))
		hub({ initialNow: after, loadDashboard: () => Promise.reject(new Error("offline")) })
		await advance(0)
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "Latest news" })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /^Leonida on Rockstar's site/ })).toBeInTheDocument()
	})

	it("moves focus to the dashboard heading when the hub flips with focus in the checklist", async () => {
		// One second before launch, in the device's own clock.
		vi.setSystemTime(new Date("2026-11-18T22:59:59Z"))
		hub()
		const box = screen.getByRole("checkbox", { name: /^Pick your edition/ })
		act(() => box.focus())
		expect(box).toHaveFocus()
		await advance(2_000)
		expect(screen.getByRole("heading", { name: "Your progress" })).toHaveFocus()
	})
})

describe("Hub after launch", () => {
	it("loads the dashboard and shows Latest with relative dates", async () => {
		vi.setSystemTime(new Date(after))
		hub()
		await advance(0)
		expect(screen.getByRole("heading", { name: "Your progress" })).toBeInTheDocument()
		expect(screen.getByText("Dashboard loaded")).toBeInTheDocument()
		expect(screen.queryByTestId("countdown-digits")).toBeNull()
		expect(screen.getByRole("heading", { name: "Latest" })).toBeInTheDocument()
		// After launch the news tile adds a second "All news" link, so scope to the Latest block.
		const latestBlock = within(screen.getByRole("region", { name: "Latest" }))
		expect(latestBlock.getByRole("link", { name: "All news" })).toHaveAttribute("href", "/en/news/")
		expect(latestBlock.getByRole("link", { name: "All news" })).toHaveClass("go-link")
		const dates = [...document.querySelectorAll(".latest time")].map((el) => el.textContent)
		expect(dates).toEqual(["today", "65 days ago"])
	})

	it("writes Norwegian relative dates", async () => {
		vi.setSystemTime(new Date(after))
		hub({ locale: "nb", newsHref: "/nb/news/" })
		await advance(0)
		// Built from the same API: ICU decides the wording ("døgn" or "dager"), not this test.
		const relative = new Intl.RelativeTimeFormat("nb", { numeric: "auto" })
		expect(relative.format(0, "day")).toBe("i dag")
		const dates = [...document.querySelectorAll(".latest time")].map((el) => el.textContent)
		expect(dates).toEqual([relative.format(0, "day"), relative.format(-65, "day")])
	})

	it("shows the skeleton while the dashboard loads", async () => {
		vi.setSystemTime(new Date(after))
		const { container } = hub({ loadDashboard: () => new Promise(() => {}) })
		await advance(0)
		expect(container.querySelector(".is-skeleton")).not.toBeNull()
	})

	it("shows the load alert when the chunk fails, and Latest still renders", async () => {
		vi.setSystemTime(new Date(after))
		hub({ loadDashboard: () => Promise.reject(new Error("chunk")) })
		await advance(0)
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Your progress couldn't load. Reload the page to try again."
		)
		expect(screen.getByRole("heading", { name: "Latest" })).toBeInTheDocument()
	})

	it("hides Latest when there are no rumours", async () => {
		vi.setSystemTime(new Date(after))
		hub({ latest: [] })
		await advance(0)
		expect(screen.queryByRole("heading", { name: "Latest" })).toBeNull()
	})

	it("writes no relative date into the server HTML, so hydration never mismatches", () => {
		const html = renderToString(<Hub {...props({ initialNow: after })} />)
		expect(html).toContain("Online in 2027")
		// React writes the prop name as is; HTML attribute names are case-insensitive.
		expect(html).toContain('<time dateTime="2026-11-22"></time>')
		expect(html).toContain('<time dateTime="2026-09-18"></time>')
		expect(html).not.toMatch(/days? ago|today|yesterday/)
		expect(html).toContain("is-skeleton")
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(after))
		const { container } = hub()
		await advance(0)
		vi.useRealTimers()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Hub at the flip (dashboard spec §3, §6.4)", () => {
	const eve = "2026-11-18T22:59:59Z"

	it("keeps one status region across the flip and announces the new day line", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const region = screen.getByRole("status")
		await advance(2_000)
		// act renders the flip only when it ends, so the gap timer starts after the 2 s.
		await advance(ANNOUNCE_GAP_MS)
		expect(screen.getByRole("status")).toBe(region)
		expect(region).toHaveTextContent("Launch day")
	})

	it("moves focus to the dashboard heading when focus was inside the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		act(() => screen.getByRole("link", { name: "Read this before you start" }).focus())
		await advance(2_000)
		expect(screen.getByRole("heading", { name: "Your progress" })).toHaveFocus()
	})

	it("leaves focus alone when the player clicked blank space after being in the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const link = screen.getByRole("link", { name: "Read this before you start" })
		act(() => link.focus())
		act(() => link.blur())
		await advance(2_000)
		expect(screen.getByRole("heading", { name: "Your progress" })).not.toHaveFocus()
		expect(document.body).toHaveFocus()
	})

	it("still moves focus when the window lost focus but focus stayed in the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const link = screen.getByRole("link", { name: "Read this before you start" })
		act(() => link.focus())
		// A window blur: focusout with no target while the link stays the active element.
		act(() => {
			link.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }))
		})
		await advance(2_000)
		expect(screen.getByRole("heading", { name: "Your progress" })).toHaveFocus()
	})

	it("leaves focus alone when it was outside the hub", async () => {
		vi.setSystemTime(new Date(eve))
		hub()
		const outside = document.createElement("button")
		outside.textContent = "Outside"
		document.body.append(outside)
		act(() => outside.focus())
		await advance(2_000)
		expect(outside).toHaveFocus()
		outside.remove()
	})
})
