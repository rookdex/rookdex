import { type RefObject, useEffect } from "react"

/** The panel keeps this far from the screen's top and bottom edges. */
export const PANEL_EDGE = 8
/** A tap can nudge the page a few pixels; only a scroll past this closes the panel. */
export const SCROLL_SLACK = 8
/** A tap's click lands within this of its pointerdown; a later click is a new tap. */
const CLICK_WAIT_MS = 1000

type Toggle = Event & { newState?: string }

/**
 * Lays a card's popover panel over the card (tracker refresh spec §5.1). On open it takes the
 * card's place and width, lifted when it would run past the bottom of the screen. It closes on
 * Escape and on a tap outside (both native to `popover="auto"`), on a scroll past `SCROLL_SLACK`
 * and when the window changes width, since it no longer sits over its card then. The tap that
 * closes it does nothing else, so closing it never marks another card found. `mounted` re-runs the
 * wiring when the panel comes and goes.
 */
export function usePanel(
	panelRef: RefObject<HTMLElement | null>,
	cardRef: RefObject<HTMLElement | null>,
	mounted: boolean
): void {
	useEffect(() => {
		const panel = panelRef.current
		if (!mounted || !panel) return
		let unwatch = () => {}

		const place = (event: Toggle) => {
			const card = cardRef.current
			if (event.newState !== "open" || !card) return
			const box = card.getBoundingClientRect()
			panel.style.left = `${box.left}px`
			panel.style.top = `${box.top}px`
			panel.style.width = `${box.width}px`
			panel.style.minHeight = `${box.height}px`
		}

		const watch = (event: Toggle) => {
			unwatch()
			if (event.newState !== "open") return
			const over = panel.getBoundingClientRect().bottom - (window.innerHeight - PANEL_EDGE)
			if (over > 0) {
				panel.style.top = `${Math.max(PANEL_EDGE, Number.parseFloat(panel.style.top) - over)}px`
			}
			const startY = window.scrollY
			const startWidth = window.innerWidth
			const close = () => panel.hidePopover?.()
			const onScroll = () => {
				if (Math.abs(window.scrollY - startY) > SCROLL_SLACK) close()
			}
			const onResize = () => {
				if (window.innerWidth !== startWidth) close()
			}
			const onDown = (down: PointerEvent) => {
				if (!panel.contains(down.target as Node)) swallowNextClick()
			}
			window.addEventListener("scroll", onScroll, { passive: true })
			window.addEventListener("resize", onResize)
			document.addEventListener("pointerdown", onDown, true)
			unwatch = () => {
				window.removeEventListener("scroll", onScroll)
				window.removeEventListener("resize", onResize)
				document.removeEventListener("pointerdown", onDown, true)
				unwatch = () => {}
			}
		}

		panel.addEventListener("beforetoggle", place)
		panel.addEventListener("toggle", watch)
		return () => {
			unwatch()
			panel.removeEventListener("beforetoggle", place)
			panel.removeEventListener("toggle", watch)
		}
	}, [panelRef, cardRef, mounted])
}

/**
 * Cancels the click that follows a tap outside the open panel. The panel closes on that tap, and
 * without this the same tap would also mark the card under it found. A tap that turns into a
 * scroll sends no click, so `pointercancel` or the timeout ends the wait instead.
 */
function swallowNextClick(): void {
	const swallow = (click: MouseEvent) => {
		click.preventDefault()
		click.stopPropagation()
		done()
	}
	const done = () => {
		document.removeEventListener("click", swallow, true)
		document.removeEventListener("pointercancel", done, true)
		window.clearTimeout(timer)
	}
	const timer = window.setTimeout(done, CLICK_WAIT_MS)
	document.addEventListener("click", swallow, true)
	document.addEventListener("pointercancel", done, true)
}
