// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { jumpable, LastFound } from "./LastFound"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const pelican: SeedItem = {
	id: "wildlife/pelican",
	category: "wildlife",
	group: "birds",
	name: "Pelican",
	status: "expected",
	precedent: "GTA V",
	sources: [src],
}
const find = { item: pelican, updated_at: "2026-11-20T10:00:00.000Z" }
const t = translator("en").t

describe("jumpable (tracker refresh spec §5.3)", () => {
	it("is true only when the card is in the view and the tracker is ready", () => {
		expect(jumpable(find, [pelican], true)).toBe(true)
		expect(jumpable(find, [], true)).toBe(false)
		expect(jumpable(find, [pelican], false)).toBe(false)
		expect(jumpable(undefined, [pelican], true)).toBe(false)
	})
})

describe("LastFound (tracker refresh spec §5.3)", () => {
	it("renders nothing with no finds", () => {
		const { container } = render(
			<LastFound find={undefined} canJump={false} onJump={vi.fn()} locale="en" t={t} />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("is a button that names the find and jumps to it", () => {
		const onJump = vi.fn()
		render(<LastFound find={find} canJump onJump={onJump} locale="en" t={t} />)
		const row = screen.getByRole("button", { name: /^Last found Pelican/ })
		expect(row.querySelector("time")).toHaveAttribute("datetime", find.updated_at)
		expect(row.querySelector(".last-found-icon")).toHaveAttribute("aria-hidden", "true")
		fireEvent.click(row)
		expect(onJump).toHaveBeenCalledWith("wildlife/pelican")
	})

	it("is plain text when there is nothing to jump to", () => {
		const { container } = render(
			<LastFound find={find} canJump={false} onJump={vi.fn()} locale="en" t={t} />
		)
		expect(screen.queryByRole("button")).toBeNull()
		expect(container.querySelector("p.last-found")).toHaveTextContent("Pelican")
	})
})
