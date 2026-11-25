// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PANEL_EDGE, SCROLL_SLACK, usePanel } from "./usePanel"

/** A card with its panel and a second card outside it, the shape ItemRow renders. */
function Card({ onOther }: { onOther: () => void }) {
	const card = useRef<HTMLLIElement>(null)
	const panel = useRef<HTMLDivElement>(null)
	usePanel(panel, card, true)
	return (
		<ul>
			<li ref={card} data-testid="card">
				<div ref={panel} data-testid="panel" popover="auto">
					<button type="button">inside</button>
				</div>
			</li>
			<li>
				<button type="button" onClick={onOther}>
					other
				</button>
			</li>
		</ul>
	)
}

const rect = (top: number, height: number) =>
	({ top, left: 20, width: 300, height, bottom: top + height }) as DOMRect

/** jsdom has no popover, so the toggle events are sent by hand, as the browser would. */
const toggle = (panel: HTMLElement, type: "beforetoggle" | "toggle", newState: string) =>
	panel.dispatchEvent(Object.assign(new Event(type), { newState }))

let hide: ReturnType<typeof vi.fn>

function mount(cardTop = 100, cardHeight = 120, panelHeight = 200) {
	const onOther = vi.fn()
	render(<Card onOther={onOther} />)
	const card = screen.getByTestId("card")
	const panel = screen.getByTestId("panel")
	card.getBoundingClientRect = () => rect(cardTop, cardHeight)
	panel.getBoundingClientRect = () => rect(Number.parseFloat(panel.style.top), panelHeight)
	hide = vi.fn()
	panel.hidePopover = hide as unknown as () => void
	toggle(panel, "beforetoggle", "open")
	toggle(panel, "toggle", "open")
	return { panel, onOther }
}

beforeEach(() => {
	vi.stubGlobal("innerHeight", 800)
	vi.stubGlobal("innerWidth", 390)
	vi.stubGlobal("scrollY", 0)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("usePanel (tracker refresh spec §5.1)", () => {
	it("lays the panel over its card, at the card's place and width", () => {
		const { panel } = mount()
		expect(panel.style.top).toBe("100px")
		expect(panel.style.left).toBe("20px")
		expect(panel.style.width).toBe("300px")
		expect(panel.style.minHeight).toBe("120px")
	})

	it("lifts a panel that would run past the bottom of the screen", () => {
		const { panel } = mount(700, 120, 300)
		// 700 + 300 runs 208 px past 800 - 8, so the panel moves up by that much.
		expect(panel.style.top).toBe(`${800 - PANEL_EDGE - 300}px`)
	})

	it("never lifts a panel above the top edge", () => {
		const { panel } = mount(100, 120, 900)
		expect(panel.style.top).toBe(`${PANEL_EDGE}px`)
	})

	it("stays open through the nudge of a tap, and closes on a real scroll", () => {
		mount()
		vi.stubGlobal("scrollY", SCROLL_SLACK)
		fireEvent.scroll(window)
		expect(hide).not.toHaveBeenCalled()
		vi.stubGlobal("scrollY", SCROLL_SLACK + 1)
		fireEvent.scroll(window)
		expect(hide).toHaveBeenCalledOnce()
	})

	it("closes when the window changes width, and not on a height change alone", () => {
		mount()
		vi.stubGlobal("innerHeight", 700)
		fireEvent(window, new Event("resize"))
		expect(hide).not.toHaveBeenCalled()
		vi.stubGlobal("innerWidth", 768)
		fireEvent(window, new Event("resize"))
		expect(hide).toHaveBeenCalledOnce()
	})

	it("cancels the click of the tap that closes it, so that tap marks nothing", () => {
		const { panel, onOther } = mount()
		const other = screen.getByRole("button", { name: "other" })
		fireEvent.pointerDown(other)
		toggle(panel, "toggle", "closed")
		fireEvent.click(other)
		expect(onOther).not.toHaveBeenCalled()
		// Only that one click: the next tap works again.
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("lets a click inside the panel through", () => {
		mount()
		const inside = screen.getByText("inside")
		const click = vi.fn()
		inside.addEventListener("click", click)
		fireEvent.pointerDown(inside)
		fireEvent.click(inside)
		expect(click).toHaveBeenCalledOnce()
	})

	it("stops watching once closed", () => {
		const { panel, onOther } = mount()
		toggle(panel, "toggle", "closed")
		vi.stubGlobal("scrollY", 400)
		fireEvent.scroll(window)
		const other = screen.getByRole("button", { name: "other" })
		fireEvent.pointerDown(other)
		fireEvent.click(other)
		expect(hide).not.toHaveBeenCalled()
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("ends the wait when the tap turns into a scroll", () => {
		const { onOther } = mount()
		const other = screen.getByRole("button", { name: "other" })
		fireEvent.pointerDown(other)
		fireEvent.pointerCancel(other)
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})
})
