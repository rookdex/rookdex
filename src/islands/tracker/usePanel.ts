import { type RefObject, useEffect } from "react"

/** The panel keeps this far from the screen's top and bottom edges. */
export const PANEL_EDGE = 8
/** A tap can nudge the page a few pixels; only a scroll past this closes the panel. */
export const SCROLL_SLACK = 8
/** A tap's click lands within this of its pointerup; a later click belongs to a new tap. */
const CLICK_AFTER_UP_MS = 400

type Toggle = Event & { newState?: string }

/**
 * Lays a card's popover panel over the card (tracker refresh spec §5.1). On open it takes the
 * card's place and width, kept on screen at both edges, and focus moves to its close button. It
 * closes on Escape and on a tap outside (both native to `popover="auto"`), on a scroll past
 * `SCROLL_SLACK`, when the window changes width and when focus leaves it. A tap on another card's
 * body that closes it does nothing else, so closing it never marks that card found. `mounted`
 * re-runs the wiring when the panel comes and goes.
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

		// Set before the panel shows, and lifted in the frame before its first paint, so it never
		// flashes past the bottom edge.
		const place = (event: Toggle) => {
			const card = cardRef.current
			if (event.newState !== "open" || !card) return
			const box = card.getBoundingClientRect()
			panel.style.left = `${box.left}px`
			panel.style.top = `${Math.max(PANEL_EDGE, box.top)}px`
			panel.style.width = `${box.width}px`
			panel.style.minHeight = `${box.height}px`
			requestAnimationFrame(() => {
				const top = Number.parseFloat(panel.style.top)
				const height = panel.getBoundingClientRect().height
				const lowest = window.innerHeight - PANEL_EDGE - height
				panel.style.top = `${Math.max(PANEL_EDGE, Math.min(top, lowest))}px`
			})
		}

		const watch = (event: Toggle) => {
			unwatch()
			if (event.newState !== "open") return
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
				if (down.button !== 0 || !down.isPrimary) return
				const target = down.target as Element
				// Only a card body marks anything; links, buttons and other chevrons work as usual.
				if (panel.contains(target) || !target.closest?.(".item")) return
				if (target.closest("a, button")) return
				swallowNextClick()
			}
			// Only when focus moves to another control (Tab, Shift+Tab). A click on the panel's own text
			// drops focus to the body with no relatedTarget, and must keep it open. Deferred, so focus
			// has landed and hiding never pulls it back to the chevron.
			const onFocusOut = (out: FocusEvent) => {
				const next = out.relatedTarget as Node | null
				if (next && !panel.contains(next)) window.setTimeout(close, 0)
			}
			window.addEventListener("scroll", onScroll, { passive: true })
			window.addEventListener("resize", onResize)
			document.addEventListener("pointerdown", onDown, true)
			panel.addEventListener("focusout", onFocusOut)
			// The chevron sits under the panel now, so focus goes where the reader is.
			panel.querySelector("button")?.focus({ preventScroll: true })
			unwatch = () => {
				window.removeEventListener("scroll", onScroll)
				window.removeEventListener("resize", onResize)
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
