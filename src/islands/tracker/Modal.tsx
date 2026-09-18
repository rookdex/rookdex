import { type ReactNode, type RefObject, useEffect, useRef } from "react"

interface Props {
	open: boolean
	labelledBy: string
	onClose: () => void
	children: ReactNode
	/**
	 * Where focus goes on close when "whatever was focused when the dialog opened" is wrong —
	 * the import dialog opens after the OS file picker, which leaves the hidden file input or
	 * `body` focused depending on the browser.
	 */
	returnTo?: RefObject<HTMLElement | null>
}

/**
 * Native <dialog>. showModal() traps focus and makes the page inert, Escape fires `close`,
 * and focus returns to `returnTo` or to whatever was focused when the dialog opened.
 */
export function Modal({ open, labelledBy, onClose, children, returnTo }: Props) {
	const ref = useRef<HTMLDialogElement>(null)
	const opener = useRef<HTMLElement | null>(null)

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		if (open && !dialog.open) {
			opener.current = document.activeElement as HTMLElement | null
			dialog.showModal()
		} else if (!open && dialog.open) {
			dialog.close()
		}
	}, [open])

	function handleClose() {
		onClose()
		;(returnTo?.current ?? opener.current)?.focus()
	}

	return (
		<dialog ref={ref} className="modal" aria-labelledby={labelledBy} onClose={handleClose}>
			{open && children}
		</dialog>
	)
}
