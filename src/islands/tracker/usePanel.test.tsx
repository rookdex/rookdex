// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PANEL_EDGE, PANEL_SETTLE_MS, SCROLL_SLACK, usePanel } from "./usePanel"

/** A card with its panel, then a second card and a link, the shape ItemRow renders. */
function Card({ onOther, onLink }: { onOther: () => void; onLink: () => void }) {
	const card = useRef<HTMLLIElement>(null)
	const panel = useRef<HTMLDivElement>(null)
	const open = usePanel(panel, card, true)
	return (
		<ul>
			<li ref={card} className="item" data-testid="card" data-open={open || undefined}>
				<div className="item-foot">
					<button type="button" popoverTarget="panel">
						chevron
					</button>
				</div>
				<div ref={panel} id="panel" data-testid="panel" popover="auto">
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

interface Mount {
	cardTop?: number
	cardHeight?: number
	panelHeight?: number
	/** Opened with Enter or Space on a focused chevron, not a tap. */
	keyboard?: boolean
	/** Leaves the settle window open, as right after a tap. */
	settling?: boolean
}

function mount({
	cardTop = 100,
	cardHeight = 120,
	panelHeight = 200,
	keyboard = false,
	settling = false,
}: Mount = {}) {
	const onOther = vi.fn()
	const onLink = vi.fn()
	render(<Card onOther={onOther} onLink={onLink} />)
	const card = screen.getByTestId("card")
	const panel = screen.getByTestId("panel")
	const at = { top: cardTop }
	card.getBoundingClientRect = () => rect(at.top, cardHeight)
	panel.getBoundingClientRect = () => rect(Number.parseFloat(panel.style.top), panelHeight)
	hide = vi.fn()
	panel.hidePopover = hide as unknown as () => void
	if (keyboard) screen.getByText("chevron").focus()
	toggle(panel, "beforetoggle", "open")
	// jsdom keeps a [popover] display: none; an open one shows, so focus can land inside it.
	panel.style.display = "block"
	act(() => {
		toggle(panel, "toggle", "open")
	})
	// Most tests start after the keyboard settle window, as a user's own scroll or touch ends it.
	if (!settling) fireEvent.wheel(window)
	const other = screen.getByText("other")
	return { panel, onOther, onLink, other, at }
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
		const { panel } = mount({ cardTop: 700, panelHeight: 300 })
		expect(panel.style.top).toBe(`${800 - PANEL_EDGE - 300}px`)
	})

	it("keeps the top on screen when the card starts above it", () => {
		const { panel } = mount({ cardTop: -60, cardHeight: 200 })
		expect(panel.style.top).toBe(`${PANEL_EDGE}px`)
	})

	it("never lifts a panel above the top edge", () => {
		const { panel } = mount({ panelHeight: 900 })
		expect(panel.style.top).toBe(`${PANEL_EDGE}px`)
	})

	it("caps its min-height at the screen, so a taller card's text scrolls inside the panel", () => {
		const { panel } = mount({ cardHeight: 1000 })
		expect(panel.style.minHeight).toBe(`${800 - 2 * PANEL_EDGE}px`)
	})

	it("moves focus to the close button when opened from the keyboard, since the chevron is under it", () => {
		mount({ keyboard: true })
		expect(screen.getByText("inside")).toHaveFocus()
	})

	it("leaves focus alone when opened by a tap, so the phone keyboard stays as it was", () => {
		mount()
		expect(screen.getByText("inside")).not.toHaveFocus()
	})

	it("leaves focus in another field, as Safari does on a tap, which does not focus the button", () => {
		render(<input aria-label="search" />)
		screen.getByLabelText("search").focus()
		mount()
		expect(screen.getByLabelText("search")).toHaveFocus()
	})

	it("reports open until it closes, so the card keeps it mounted meanwhile", () => {
		const { panel } = mount()
		expect(screen.getByTestId("card")).toHaveAttribute("data-open")
		act(() => {
			toggle(panel, "toggle", "closed")
		})
		expect(screen.getByTestId("card")).not.toHaveAttribute("data-open")
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

	it("follows its card instead of closing while the phone keyboard settles", () => {
		vi.useFakeTimers()
		const { panel, at } = mount({ settling: true })
		at.top = 220
		vi.stubGlobal("scrollY", 120)
		fireEvent.scroll(window)
		expect(hide).not.toHaveBeenCalled()
		expect(panel.style.top).toBe("220px")
		act(() => vi.advanceTimersByTime(PANEL_SETTLE_MS))
		vi.stubGlobal("scrollY", 120 + SCROLL_SLACK + 1)
		fireEvent.scroll(window)
		expect(hide).toHaveBeenCalledOnce()
	})

	it.each([
		["a key", () => fireEvent.keyDown(window, { key: "PageDown" })],
		["a press", () => fireEvent.pointerDown(window)],
	])("ends the settle window at %s, such as a keyboard or scrollbar scroll", (_, user) => {
		mount({ settling: true })
		user()
		vi.stubGlobal("scrollY", 60)
		fireEvent.scroll(window)
		expect(hide).toHaveBeenCalledOnce()
	})

	it("ends the settle window at the user's first touch", () => {
		mount({ settling: true })
		fireEvent.touchStart(window)
		vi.stubGlobal("scrollY", 60)
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
		const { panel } = mount({ keyboard: true })
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

	it("ends the wait at a long press's context menu", () => {
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		fireEvent.contextMenu(other)
		fireEvent.click(other)
		expect(onOther).toHaveBeenCalledOnce()
	})

	it("gives up on a press that never ends, so it never eats a later click", () => {
		vi.useFakeTimers()
		const { onOther, other } = mount()
		fireEvent.pointerDown(other, { button: 0, isPrimary: true })
		act(() => vi.advanceTimersByTime(5000))
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
