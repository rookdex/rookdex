// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { en } from "../../i18n/en"
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

describe("StatsRail", () => {
	it("renders labelled progress bars with visible counts", () => {
		render(
			<StatsRail
				overall={{ done: 1, total: 3 }}
				categories={[{ category: "wildlife", label: "Wildlife", done: 1, total: 2 }]}
				recent={[{ item: gator, updated_at: "2026-09-16T10:00:00.000Z" }]}
				strings={en.tracker}
			/>
		)
		const bars = screen.getAllByRole("progressbar")
		expect(bars[0]).toHaveAccessibleName("Overall")
		expect(bars[0]).toHaveAttribute("aria-valuenow", "1")
		expect(bars[0]).toHaveAttribute("aria-valuemax", "3")
		expect(bars[1]).toHaveAccessibleName("Wildlife")
		expect(screen.getByText("1 of 3")).toBeInTheDocument()
		expect(screen.getByText("1 of 2")).toBeInTheDocument()
		expect(screen.getByRole("list", { name: "Recent finds" })).toHaveTextContent(
			"American alligator"
		)
	})

	it("says when nothing is ticked and has no axe violations", async () => {
		const { container } = render(
			<StatsRail overall={{ done: 0, total: 0 }} categories={[]} recent={[]} strings={en.tracker} />
		)
		expect(screen.getByText("Nothing ticked yet.")).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
