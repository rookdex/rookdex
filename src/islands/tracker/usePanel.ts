import { type RefObject, useEffect, useState } from "react"

/** The panel keeps this far from the screen's top and bottom edges. */
export const PANEL_EDGE = 8
/** A tap can nudge the page a few pixels; only a scroll past this closes the panel. */
export const SCROLL_SLACK = 8
/** A tap's click lands within this of its pointerup; a later click belongs to a new tap. */
const CLICK_AFTER_UP_MS = 400
/** A press that never ends (released outside the window) stops waiting for its click here. */
const CLICK_GIVE_UP_MS = 5000
/**
 * A chevron tap blurs the search field, and the phone keyboard closing shifts the page. Until it
 * settles, or the user acts on the page themselves, the panel follows its card instead of closing.
 * Same span as Tracker.tsx's KEYBOARD_SETTLE_MS.
 */
export const PANEL_SETTLE_MS = 1000
/** Any of these is the user, not the keyboard closing, so the settle window ends. */
const USER_ACTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const

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

		/** Over the card, top and bottom on screen. The min-height cap keeps a panel taller than the
		 * screen inside it, where its own max-height and scroll apply. */
		const cover = (card: HTMLElement, lift: boolean) => {
			const box = card.getBoundingClientRect()
			panel.style.left = `${box.left}px`
			panel.style.top = `${Math.max(PANEL_EDGE, box.top)}px`
			panel.style.width = `${box.width}px`
			panel.style.minHeight = `${Math.min(box.height, window.innerHeight - 2 * PANEL_EDGE)}px`
			if (lift) liftOnScreen()
		}
		const liftOnScreen = () => {
			const top = Number.parseFloat(panel.style.top)
			const lowest = window.innerHeight - PANEL_EDGE - panel.getBoundingClientRect().height
			panel.style.top = `${Math.max(PANEL_EDGE, Math.min(top, lowest))}px`
		}

		// Set before the panel shows, and lifted in the frame before its first paint, so it never
		// flashes past the bottom edge.
		const place = (event: Toggle) => {
			const card = cardRef.current
			if (event.newState !== "open" || !card) return
			cover(card, false)
			requestAnimationFrame(liftOnScreen)
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
				if (!settling) {
					if (Math.abs(window.scrollY - startY) > SCROLL_SLACK) close()
					return
				}
				// The keyboard closing moved the page: follow the card and count from here.
				startY = window.scrollY
				if (cardRef.current) cover(cardRef.current, true)
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
			for (const type of USER_ACTS) window.addEventListener(type, settled, { passive: true })
			document.addEventListener("pointerdown", onDown, true)
			panel.addEventListener("focusout", onFocusOut)
			// Only a keyboard opening moves focus: this card's chevron, focused with its ring. A tap
			// leaves focus alone, so it never wakes the phone keyboard. Safari does not focus a tapped
			// button, and the search field it leaves focused matches :focus-visible too, so the check
			// is on the chevron itself.
			const active = document.activeElement
			const chevron = cardRef.current?.querySelector(".item-foot [popovertarget]")
			if (active && active === chevron && active.matches(":focus-visible")) {
				panel.querySelector("button")?.focus({ preventScroll: true })
			}
			unwatch = () => {
				window.clearTimeout(settleTimer)
				window.removeEventListener("scroll", onScroll)
				window.removeEventListener("resize", onResize)
				for (const type of USER_ACTS) window.removeEventListener(type, settled)
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
 * gesture: shortly after its pointerup however long the press was, on `pointercancel` when the tap
 * turns into a scroll, on `contextmenu` from a long press, and at the latest after
 * `CLICK_GIVE_UP_MS`, so a press released outside the window never eats a later click.
 */
function swallowNextClick(): void {
	let afterUp = 0
	const swallow = (click: MouseEvent) => {
		click.preventDefault()
		click.stopPropagation()
		done()
	}
	const onUp = () => {
		afterUp = window.setTimeout(done, CLICK_AFTER_UP_MS)
	}
	const done = () => {
		document.removeEventListener("click", swallow, true)
		document.removeEventListener("pointerup", onUp, true)
		document.removeEventListener("pointercancel", done, true)
		document.removeEventListener("contextmenu", done, true)
		window.clearTimeout(afterUp)
		window.clearTimeout(giveUp)
	}
	const giveUp = window.setTimeout(done, CLICK_GIVE_UP_MS)
	document.addEventListener("click", swallow, true)
	document.addEventListener("pointerup", onUp, true)
	document.addEventListener("pointercancel", done, true)
	document.addEventListener("contextmenu", done, true)
}
