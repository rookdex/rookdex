// Tooltip behaviour CSS can't do alone (feedback spec §3.3). Escape hides the tooltip that is
// showing until the pointer leaves or focus moves (WCAG 1.4.13, dismissible), and a tap on an
// aria-disabled control shows its tooltip for a moment, so a control that does nothing on a phone
// still explains itself. One set of delegated listeners covers every `.has-tip` on the page,
// including the ones an island renders later.

export const TAP_TIP_MS = 2000
const TIP = ".has-tip"

function controlOf(target: EventTarget | null, selector = TIP): Element | null {
	return target instanceof Element ? target.closest(selector) : null
}

export function wireTooltips(doc: Document): () => void {
	const win = doc.defaultView ?? window
	let hovered: Element | null = null
	let timer: number | undefined

	const reset = (control: Element) => {
		control.removeAttribute("data-tip-hidden")
		control.removeAttribute("data-tip-open")
	}

	const onPointerOver = (event: Event) => {
		hovered = controlOf(event.target)
	}

	const onPointerOut = (event: Event) => {
		const control = controlOf(event.target)
		const next = (event as MouseEvent).relatedTarget
		if (!control || (next instanceof Node && control.contains(next))) return
		if (hovered === control) hovered = null
		reset(control)
	}

	const onFocusOut = (event: Event) => {
		const control = controlOf(event.target)
		if (control) reset(control)
	}

	// Never preventDefault: Escape must still close a dialog underneath.
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return
		for (const control of [hovered, controlOf(doc.activeElement)]) {
			if (!control) continue
			control.removeAttribute("data-tip-open")
			control.setAttribute("data-tip-hidden", "")
		}
	}

	const onClick = (event: Event) => {
		const control = controlOf(event.target, `${TIP}[aria-disabled="true"]`)
		if (!control) return
		control.removeAttribute("data-tip-hidden")
		control.setAttribute("data-tip-open", "")
		win.clearTimeout(timer)
		timer = win.setTimeout(() => control.removeAttribute("data-tip-open"), TAP_TIP_MS)
	}

	doc.addEventListener("pointerover", onPointerOver)
	doc.addEventListener("pointerout", onPointerOut)
	doc.addEventListener("focusout", onFocusOut)
	doc.addEventListener("keydown", onKeyDown)
	doc.addEventListener("click", onClick)
	return () => {
		win.clearTimeout(timer)
		doc.removeEventListener("pointerover", onPointerOver)
		doc.removeEventListener("pointerout", onPointerOut)
		doc.removeEventListener("focusout", onFocusOut)
		doc.removeEventListener("keydown", onKeyDown)
		doc.removeEventListener("click", onClick)
	}
}
