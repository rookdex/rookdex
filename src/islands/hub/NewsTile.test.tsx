// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { type NewsItem, NewsTile } from "./NewsTile"

const { t } = translator("en")
const news: NewsItem[] = [
	{ id: "rumours/a", kind: "rumour", name: "Online in 2027", date: "2026-11-22" },
	{ id: "facts/b", kind: "confirmed", name: "Preload on 12 November", date: "2026-11-20" },
]
const tile = (items = news) =>
	render(<NewsTile news={items} today="2026-11-22" locale="en" newsHref="/en/news/" t={t} />)

describe("NewsTile (desktop dashboard spec §4.6)", () => {
	it("lists the items in the order given, each with its chip and a link to its News section", () => {
		tile()
		const section = screen.getByRole("region", { name: "Latest news" })
		const rows = within(section).getAllByRole("listitem")
		expect(rows.map((r) => r.querySelector(".news-chip")?.textContent)).toEqual([
			"Rumour",
			"Confirmed",
		])
		expect(within(rows[0]).getByRole("link", { name: "Online in 2027" })).toHaveAttribute(
			"href",
			"/en/news/#rumours"
		)
		expect(within(rows[1]).getByRole("link", { name: "Preload on 12 November" })).toHaveAttribute(
			"href",
			"/en/news/#confirmed"
		)
		expect(within(section).getByRole("link", { name: "All news" })).toHaveAttribute(
			"href",
			"/en/news/"
		)
	})

	it("writes relative dates after mount", () => {
		tile()
		const times = screen.getAllByRole("listitem").map((r) => r.querySelector("time")?.textContent)
		expect(times).toEqual(["today", "2 days ago"])
	})

	it("renders nothing with no items", () => {
		const { container } = tile([])
		expect(container).toBeEmptyDOMElement()
	})

	it("has no axe violations", async () => {
		const { container } = tile()
		expect(await axe(container)).toHaveNoViolations()
	})
})
