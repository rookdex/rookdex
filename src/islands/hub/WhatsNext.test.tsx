// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { LEAVE_MS, LOCK_MS, WhatsNext } from "./WhatsNext"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const item = (name: string, category = "wildlife"): SeedItem => ({
	id: `${category}/${name.toLowerCase()}`,
	category,
	group: "g",
	name,
	status: "confirmed",
	sources: [src],
})
const birds = ["Avocet", "Bittern", "Crane", "Dunlin"].map((name) => item(name))
const wildlife = { category: "wildlife", items: birds }
const { t } = translator("en")

interface Open {
	category: string
	items: SeedItem[]
}

/**
 * What's next over categories the test owns. A saved tick removes the item, and the groups are
 * built as the model does: 3 rows from at most 2 categories, titled by what is left.
 */
function Harness({
	initial = [wildlife],
	save,
}: {
	initial?: Open[]
	save: (id: string) => Promise<boolean>
}) {
	const [open, setOpen] = useState(initial)
	const zone = useRef<HTMLElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	const groups = []
	let room = 3
	for (const entry of open.filter((o) => o.items.length > 0).slice(0, 2)) {
		if (room <= 0) break
		const title = t(groups.length === 0 ? "hub.nextGroup" : "hub.nextGroupThen", {
			category: entry.category,
			count: entry.items.length,
		})
		groups.push({ category: entry.category, title, items: entry.items.slice(0, room) })
		room -= entry.items.length
	}
	return (
		<WhatsNext
			groups={groups}
			disabled={false}
			t={t}
			zoneRef={zone}
			headingRef={heading}
			onTick={async (id) => {
				const saved = await save(id)
				if (saved) {
					setOpen((list) => list.map((o) => ({ ...o, items: o.items.filter((i) => i.id !== id) })))
				}
				return saved
			}}
		/>
	)
}

/** Runs due timers and every promise callback queued meanwhile. */
const advance = (ms: number) =>
	act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})
const box = (name: string) => screen.getByRole("checkbox", { name })
const row = (name: string) => box(name).closest("li")

/**
 * The setup file's matchMedia is one shared vi.fn, so `restoreAllMocks` does not undo a stub:
 * every test starts from the full-motion stub instead.
 */
function stubMotion(reduce: boolean) {
	return vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: reduce && query.includes("reduce"),
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => false),
			}) as unknown as MediaQueryList
	)
}

beforeEach(() => {
	vi.useFakeTimers()
	stubMotion(false)
})
afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("What's next (dashboard spec §4, §6.1)", () => {
	it("slides the ticked row out and fills the list, with focus on the row in its place", async () => {
		render(<Harness save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(0)
		expect(row("Avocet")).toHaveAttribute("data-leaving")
		expect(box("Avocet")).toBeChecked()
		await advance(LEAVE_MS)
		expect(screen.queryByRole("checkbox", { name: "Avocet" })).toBeNull()
		expect(screen.getAllByRole("checkbox").map((b) => b.id)).toEqual([
			"next-wildlife/bittern",
			"next-wildlife/crane",
			"next-wildlife/dunlin",
		])
		expect(row("Dunlin")).toHaveAttribute("data-entering")
		expect(box("Bittern")).toHaveFocus()
	})

	it("ignores another tick while one is in flight and for 400 ms after it lands", async () => {
		let land: (saved: boolean) => void = () => {}
		const save = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					land = resolve
				})
		)
		render(<Harness save={save} />)
		fireEvent.click(box("Avocet"))
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(1)
		await act(async () => {
			land(true)
			await vi.advanceTimersByTimeAsync(0)
		})
		await advance(LOCK_MS - 1)
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(1)
		await advance(1)
		fireEvent.click(box("Bittern"))
		expect(save).toHaveBeenCalledTimes(2)
	})

	it("replaces the row in place without sliding under reduced motion", async () => {
		stubMotion(true)
		render(<Harness save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(0)
		expect(screen.queryByRole("checkbox", { name: "Avocet" })).toBeNull()
		expect(document.querySelector("[data-leaving], [data-entering]")).toBeNull()
		expect(box("Bittern")).toHaveFocus()
	})

	it("keeps the row, unticked, when the tick fails", async () => {
		render(<Harness save={async () => false} />)
		fireEvent.click(box("Avocet"))
		await advance(LOCK_MS)
		expect(box("Avocet")).not.toBeChecked()
		expect(screen.getAllByRole("checkbox")).toHaveLength(3)
	})

	it("moves focus to the heading and says so when nothing is left", async () => {
		render(
			<Harness
				initial={[{ category: "wildlife", items: [item("Avocet")] }]}
				save={async () => true}
			/>
		)
		fireEvent.click(box("Avocet"))
		await advance(LEAVE_MS)
		expect(screen.getByRole("heading", { name: "What's next" })).toHaveFocus()
		expect(screen.getByText("You've found everything tracked so far.")).toBeInTheDocument()
	})

	const twoCategories: Open[] = [
		{ category: "wildlife", items: [item("Avocet")] },
		{ category: "vehicles", items: ["Bike", "Car", "Van"].map((n) => item(n, "vehicles")) },
	]

	it("titles each group and labels its list by the title", () => {
		render(<Harness initial={twoCategories} save={async () => true} />)
		const level3 = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
		expect(level3).toEqual(["wildlife · 1 left", "Then: vehicles · 3 left"])
		const first = within(screen.getByRole("list", { name: "wildlife · 1 left" }))
		expect(first.getAllByRole("checkbox").map((b) => b.id)).toEqual(["next-wildlife/avocet"])
		const second = within(screen.getByRole("list", { name: "Then: vehicles · 3 left" }))
		expect(second.getAllByRole("checkbox").map((b) => b.id)).toEqual([
			"next-vehicles/bike",
			"next-vehicles/car",
		])
	})

	it("moves to the next group when its last item is ticked", async () => {
		render(<Harness initial={twoCategories} save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(LEAVE_MS)
		expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
			"vehicles · 3 left",
		])
		expect(screen.getAllByRole("checkbox").map((b) => b.id)).toEqual([
			"next-vehicles/bike",
			"next-vehicles/car",
			"next-vehicles/van",
		])
		expect(row("Van")).toHaveAttribute("data-entering")
		expect(box("Bike")).toHaveFocus()
	})
})
