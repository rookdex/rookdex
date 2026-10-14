// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { LEAVE_MS, LOCK_MS, WhatsNext } from "./WhatsNext"

const src = { url: "https://www.rockstargames.com/VI", title: "Site", tier: "official" as const }
const item = (name: string): SeedItem => ({
	id: `wildlife/${name.toLowerCase()}`,
	category: "wildlife",
	group: "birds",
	name,
	status: "confirmed",
	sources: [src],
})
const birds = ["Avocet", "Bittern", "Crane", "Dunlin"].map(item)
const { t } = translator("en")

/** What's next over a list the test owns: a saved tick removes the item, as the model would. */
function Harness({
	initial = birds,
	save,
}: {
	initial?: SeedItem[]
	save: (id: string) => Promise<boolean>
}) {
	const [open, setOpen] = useState(initial)
	const zone = useRef<HTMLElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	return (
		<WhatsNext
			items={open.slice(0, 3)}
			disabled={false}
			t={t}
			zoneRef={zone}
			headingRef={heading}
			onTick={async (id) => {
				const saved = await save(id)
				if (saved) setOpen((list) => list.filter((i) => i.id !== id))
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

function reduceMotion() {
	return vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: query.includes("reduce"),
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
		reduceMotion()
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
		render(<Harness initial={[item("Avocet")]} save={async () => true} />)
		fireEvent.click(box("Avocet"))
		await advance(LEAVE_MS)
		expect(screen.getByRole("heading", { name: "What's next" })).toHaveFocus()
		expect(screen.getByText("You've found everything tracked so far.")).toBeInTheDocument()
	})
})
