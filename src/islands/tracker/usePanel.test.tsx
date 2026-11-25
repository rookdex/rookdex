// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PANEL_EDGE, SCROLL_SLACK, usePanel } from "./usePanel"

/** A card with its panel, then a second card and a link, the shape ItemRow renders. */
function Card({ onOther, onLink }: { onOther: () => void; onLink: () => void }) {
	const card = useRef<HTMLLIElement>(null)
	const panel = useRef<HTMLDivElement>(null)
	usePanel(panel, card, true)
	return (
		<ul>
			<li ref={card} className="item" data-testid="card">
				<div ref={panel} data-testid="panel" popover="auto">
					<button type="button">inside</button>
				</div>
			</li>
			<li className="item">
				<label>
					<input type="checkbox" onChange={onOther} />
					other
				</label>
				<button type="button" onClick={onLink}>
					more
				</button>
			</li>
			<li>
				<a href="#top">elsewhere</a>
			</li>
		</ul>
	)
}

const rect = (top: number, height: number) =>
	({ top, left: 20, width: 300, height, bottom: top + height }) as DOMRect

/** jsdom has no popover, so the toggle events are sent by hand, as the browser would. */
const toggle = (panel: HTMLElement, type: "beforetoggle" | "toggle", newState: string) =>
	panel.dispatchEvent(Object.assign(new Event(type), { newState }))

/** A real tap: a primary left press, its release, then the click. */
const tap = (target: Element, init: PointerEventInit = {}) => {
	fireEvent.pointerDown(target, { button: 0, isPrimary: true, ...init })
	fireEvent.pointerUp(target, { button: 0, isPrimary: true, ...init })
	fireEvent.click(target)
}

let hide: ReturnType<typeof vi.fn>

function mount(cardTop = 100, cardHeight = 120, panelHeight = 200) {
	const onOther = vi.fn()
	const onLink = vi.fn()
	render(<Card onOther={onOther} onLink={onLink} />)
	const card = screen.getByTestId("card")
	const panel = screen.getByTestId("panel")
	card.getBoundingClientRect = () => rect(cardTop, cardHeight)
	panel.getBoundingClientRect = () => rect(Number.parseFloat(panel.style.top), panelHeight)
	hide = vi.fn()
	panel.hidePopover = hide as unknown as () => void
	toggle(panel, "beforetoggle", "open")
	// jsdom keeps a [popover] display: none; an open one shows, so focus can land inside it.
	panel.style.display = "block"
	toggle(panel, "toggle", "open")
	const other = screen.getByText("other")
	return { panel, onOther, onLink, other }
}

beforeEach(() => {
	vi.stubGlobal("innerHeight", 800)
	vi.stubGlobal("innerWidth", 390)
	vi.stubGlobal("scrollY", 0)
	// The lift runs in the frame before the first paint; here that frame is now.
	vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
		frame(0)
		return 0
	})
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

describe("usePanel placement (tracker refresh spec §5.1)", () => {
	it("lays the panel over its card, at the card's place and width", () => {
		const { panel } = mount()
		expect(panel.style.top).toBe("100px")
		expect(panel.style.left).toBe("20px")
		expect(panel.style.width).toBe("300px")
		expect(panel.style.minHeight).toBe("120px")
	})

	it("lifts a panel that would run past the bottom of the screen", () => {
		const { panel } = mount(700, 120, 300)
		expect(panel.style.top).toBe(`${800 - PANEL_EDGE - 300}px`)
	})

	it("keeps the top on screen when the card starts above it", () => {
		const { panel } = mount(-60, 200, 200)
		expect(panel.style.top).toBe(`${PANEL_EDGE}px`)
	})

	it("never lifts a panel above the top edge", () => {
		const { panel } = mount(100, 120, 900)
		expect(panel.style.top).toBe(`${PANEL_EDGE}px`)
	})

	it("moves focus to the close button, since the chevron is under the panel now", () => {
		mount()
		expect(screen.getByText("inside")).toHaveFocus()
	})
})

describe("usePanel closing (tracker refresh spec §5.1)", () => {
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

	it("closes once focus leaves it, after the focus has landed", () => {
		vi.useFakeTimers()
		const { panel } = mount()
		const link = screen.getByText("elsewhere")
		fireEvent.focusOut(screen.getByText("inside"), { relatedTarget: link })
		expect(hide).not.toHaveBeenCalled()
		act(() => vi.runAllTimers())
		expect(hide).toHaveBeenCalledOnce()
		// Focus moving inside the panel keeps it open.
		hide.mockClear()
		fireEvent.focusOut(panel, { relatedTarget: screen.getByText("inside") })
		act(() => vi.runAllTimers())
		expect(hide).not.toHaveBeenCalled()
	})

	it("stays open when a click on its own text drops focus to the body", () => {
		vi.useFakeTimers()
		mount()
		fireEvent.focusOut(screen.getByText("inside"), { relatedTarget: null })
		act(() => vi.runAllTimers())
		expect(hide).not.toHaveBeenCalled()
	})

	it("stops watching once closed", () => {
		const { panel, onOther, other } = mount()
		toggle(panel, "toggle", "closed")
		vi.stubGlobal("scrollY", 400)
		fireEvent.scroll(window)
		tap(other)
		expect(hide).not.toHaveBeenCalled()
		expect(onOther).toHaveBeenCalledOnce()
	})
})

describe("usePanel's closing tap (tracker refresh spec §5.1)", () => {
	it("cancels the click of the tap on a card that closes it, so that tap marks nothing", () => {
		const { panel, onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		toggle(panel, "toggle", "closed")
		fireEvent.pointerUp(other, { button: 0, isPrimary: true })
		fireEvent.click(other)
		expect(onOther).not.toHaveBeenCalled()
		// Only that one click: the next tap works again.
		tap(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("still cancels it after a long press, since the wait starts at release", () => {
		vi.useFakeTimers()
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		act(() => vi.advanceTimersByTime(3000))
		fireEvent.pointerUp(other, { button: 0, isPrimary: true })
		fireEvent.click(other)
		expect(onOther).not.toHaveBeenCalled()
	})

	it("lets a click long after the release through", () => {
		vi.useFakeTimers()
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		fireEvent.pointerUp(other, { button: 0, isPrimary: true })
		act(() => vi.advanceTimersByTime(1000))
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("lets buttons and links through, so another card's chevron opens on the first tap", () => {
		const { onLink } = mount()
		tap(screen.getByText("more"))
		expect(onLink).toHaveBeenCalledOnce()
		const link = vi.fn((event: Event) => event.preventDefault())
		screen.getByText("elsewhere").addEventListener("click", link)
		tap(screen.getByText("elsewhere"))
		expect(link).toHaveBeenCalledOnce()
	})

	it("ignores a right press, which sends no click", () => {
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 2, isPrimary: true })
		fireEvent.pointerUp(other, { button: 2, isPrimary: true })
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("ends the wait when the tap turns into a scroll", () => {
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		fireEvent.pointerCancel(other)
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("lets a click inside the panel through", () => {
		mount()
		const inside = screen.getByText("inside")
		const click = vi.fn()
		inside.addEventListener("click", click)
		tap(inside)
		expect(click).toHaveBeenCalledOnce()
	})
})
