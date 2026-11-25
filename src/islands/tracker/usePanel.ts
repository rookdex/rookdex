import { type RefObject, useEffect, useState } from "react"

/** The panel keeps this far from the screen's top and bottom edges. */
export const PANEL_EDGE = 8
/** A tap can nudge the page a few pixels; only a scroll past this closes the panel. */
export const SCROLL_SLACK = 8
/** A tap's click lands within this of its pointerup; a later click belongs to a new tap. */
const CLICK_AFTER_UP_MS = 400
/**
 * A chevron tap blurs the search field, and the phone keyboard closing shifts the page. Until it
 * settles, or the user touches or scrolls the page, a scroll only moves the baseline. Same span as
 * Tracker.tsx's KEYBOARD_SETTLE_MS.
 */
export const PANEL_SETTLE_MS = 1000
const USER_SCROLL = ["touchstart", "wheel"] as const

type Toggle = Event & { newState?: string }

/**
 * Lays a card's popover panel over the card (tracker refresh spec §5.1) and reports whether it is
 * open. On open it takes the card's place and width, kept on screen at both edges. Opened from the
 * keyboard, focus moves to its close button, since the chevron is under the panel. It closes on
 * Escape and on a tap outside (both native to `popover="auto"`), on a scroll past `SCROLL_SLACK`,
 * when the window changes width and when focus moves on. A tap on another card's body that closes
 * it does nothing else, so closing it never marks that card found. `cut` mounts the panel; an open
 * panel stays mounted until it closes, even if its text stops being cut.
 */
export function usePanel(
	panelRef: RefObject<HTMLElement | null>,
	cardRef: RefObject<HTMLElement | null>,
	cut: boolean
): boolean {
	const [open, setOpen] = useState(false)
	const mounted = cut || open
	useEffect(() => {
		const panel = panelRef.current
		if (!mounted || !panel) return
		let unwatch = () => {}

		// Set before the panel shows, and lifted in the frame before its first paint, so it never
		// flashes past the bottom edge. The min-height cap keeps a panel taller than the screen
		// inside it, where its own max-height and scroll apply.
		const place = (event: Toggle) => {
			const card = cardRef.current
			if (event.newState !== "open" || !card) return
			const box = card.getBoundingClientRect()
			panel.style.left = `${box.left}px`
			panel.style.top = `${Math.max(PANEL_EDGE, box.top)}px`
			panel.style.width = `${box.width}px`
			panel.style.minHeight = `${Math.min(box.height, window.innerHeight - 2 * PANEL_EDGE)}px`
			requestAnimationFrame(() => {
				const top = Number.parseFloat(panel.style.top)
				const height = panel.getBoundingClientRect().height
				const lowest = window.innerHeight - PANEL_EDGE - height
				panel.style.top = `${Math.max(PANEL_EDGE, Math.min(top, lowest))}px`
			})
		}

		const watch = (event: Toggle) => {
			unwatch()
			const isOpen = event.newState === "open"
			setOpen(isOpen)
			if (!isOpen) return
			let startY = window.scrollY
			const startWidth = window.innerWidth
			let settling = true
			const settled = () => {
				settling = false
			}
			const settleTimer = window.setTimeout(settled, PANEL_SETTLE_MS)
			const close = () => panel.hidePopover?.()
			const onScroll = () => {
				if (settling) startY = window.scrollY
				else if (Math.abs(window.scrollY - startY) > SCROLL_SLACK) close()
			}
			const onResize = () => {
				if (window.innerWidth !== startWidth) close()
			}
			const onDown = (down: PointerEvent) => {
				if (down.button !== 0 || !down.isPrimary) return
				const target = down.target as Element
				// Only a card body marks anything; links, buttons and other chevrons work as usual.
				if (panel.contains(target) || !target.closest?.(".item")) return
				if (target.closest("a, button")) return
				swallowNextClick()
			}
			// Only when focus moves to another control (Tab, Shift+Tab). A click on the panel's text
			// focuses the panel itself (tabIndex -1). Deferred, so focus has landed and hiding never
			// pulls it back to the chevron.
			const onFocusOut = (out: FocusEvent) => {
				const next = out.relatedTarget as Node | null
				if (next && !panel.contains(next)) window.setTimeout(close, 0)
			}
			window.addEventListener("scroll", onScroll, { passive: true })
			window.addEventListener("resize", onResize)
			for (const type of USER_SCROLL) window.addEventListener(type, settled, { passive: true })
			document.addEventListener("pointerdown", onDown, true)
			panel.addEventListener("focusout", onFocusOut)
			// Only a keyboard opening moves focus. A tap leaves it alone, so it never wakes the phone
			// keyboard, and Safari, which does not focus a tapped button, restores nothing odd.
			if (document.activeElement?.matches(":focus-visible")) {
				panel.querySelector("button")?.focus({ preventScroll: true })
			}
			unwatch = () => {
				window.clearTimeout(settleTimer)
				window.removeEventListener("scroll", onScroll)
				window.removeEventListener("resize", onResize)
				for (const type of USER_SCROLL) window.removeEventListener(type, settled)
				document.removeEventListener("pointerdown", onDown, true)
				panel.removeEventListener("focusout", onFocusOut)
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
	return open
}

/**
 * Cancels the click that follows a tap on a card body outside the open panel. The panel closes on
 * that tap, and without this the same tap would also mark the card found. The wait ends with the
 * gesture: shortly after its pointerup however long the press was, or on `pointercancel` when the
 * tap turns into a scroll and sends no click.
 */
function swallowNextClick(): void {
	let timer = 0
	const swallow = (click: MouseEvent) => {
		click.preventDefault()
		click.stopPropagation()
		done()
	}
	const onUp = () => {
		timer = window.setTimeout(done, CLICK_AFTER_UP_MS)
	}
	const done = () => {
		document.removeEventListener("click", swallow, true)
		document.removeEventListener("pointerup", onUp, true)
		document.removeEventListener("pointercancel", done, true)
		window.clearTimeout(timer)
	}
	document.addEventListener("click", swallow, true)
	document.addEventListener("pointerup", onUp, true)
	document.addEventListener("pointercancel", done, true)
}
