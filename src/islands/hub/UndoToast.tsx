import { type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import type { Translate } from "../../i18n"

/** How long the toast stays once the player has moved on (dashboard spec §4). */
export const TOAST_MS = 5_000

interface Props {
	item: { id: string; name: string }
	/** A failed Undo, shown inside the toast. */
	error: string
	onUndo: () => void
	onClose: () => void
	/** What's next, which holds the toast. While focus is in it, the timer waits. */
	zoneRef: RefObject<HTMLElement | null>
	/** Where focus goes when Escape closes the toast from its own Undo button. */
	onEscapeFocus: () => void
	t: Translate
}

/**
 * Undo for the last tick. The 5 s timer runs only while focus is outside What's next and the
 * pointer is off the toast, so a keyboard or screen-reader player always reaches Undo (WCAG
 * 2.2.1). The parent mounts one per tick, keyed, so every toast starts fresh.
 */
export function UndoToast({ item, error, onUndo, onClose, zoneRef, onEscapeFocus, t }: Props) {
	const box = useRef<HTMLDivElement>(null)
	const textId = useId()
	const [focusInside, setFocusInside] = useState(false)
	const [pointerInside, setPointerInside] = useState(false)

	useEffect(() => {
		const inside = (target: EventTarget | null) =>
			target instanceof Node && (zoneRef.current?.contains(target) ?? false)
		const onIn = (event: FocusEvent) => setFocusInside(inside(event.target))
		const onOut = (event: FocusEvent) => setFocusInside(inside(event.relatedTarget))
		setFocusInside(inside(document.activeElement))
		document.addEventListener("focusin", onIn)
		document.addEventListener("focusout", onOut)
		return () => {
			document.removeEventListener("focusin", onIn)
			document.removeEventListener("focusout", onOut)
		}
	}, [zoneRef])

	useEffect(() => {
		if (focusInside || pointerInside) return
		const id = window.setTimeout(onClose, TOAST_MS)
		return () => window.clearTimeout(id)
	}, [focusInside, pointerInside, onClose])

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return
			const active = document.activeElement
			if (!active || !zoneRef.current?.contains(active)) return
			const fromUndo = box.current?.contains(active) ?? false
			onClose()
			if (fromUndo) onEscapeFocus()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [zoneRef, onClose, onEscapeFocus])

	// While open, the page scrolls the focused element clear of the toast (WCAG 2.4.12).
	// biome-ignore lint/correctness/useExhaustiveDependencies: `error` is not read, but the effect must re-run on a new error, whose line changes the toast's height
	useLayoutEffect(() => {
		const root = document.documentElement
		root.style.setProperty(
			"--toast-h",
			`calc(${box.current?.offsetHeight ?? 0}px + var(--space-2))`
		)
		return () => {
			root.style.removeProperty("--toast-h")
		}
	}, [error])

	return (
		<div
			ref={box}
			className="undo-toast"
			onPointerEnter={() => setPointerInside(true)}
			onPointerLeave={() => setPointerInside(false)}
		>
			<p id={textId}>{t("hub.markedFound", { item: item.name })}</p>
			{error && (
				<p className="tracker-alert" role="alert">
					{error}
				</p>
			)}
			{/* Tabbing straight to Undo says what it undoes, not just "Undo, button". */}
			<button type="button" onClick={onUndo} aria-describedby={textId}>
				{t("hub.undo")}
			</button>
		</div>
	)
}
