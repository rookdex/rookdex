import { useEffect, useRef, useState } from "react"
import { SETTLE_MS } from "../../model/search"

export { SETTLE_MS }

export interface LiveStatus {
	message: string
	/** Writes now; anything pending is dropped. */
	say(text: string): void
	/** Writes after SETTLE_MS, replacing anything pending. */
	sayLater(text: string): void
	cancel(): void
}

/** The text of the tracker's one polite status region. The last event wins. */
export function useLiveStatus(): LiveStatus {
	const [message, setMessage] = useState("")
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	useEffect(() => () => clearTimeout(timer.current), [])

	function cancel() {
		clearTimeout(timer.current)
		timer.current = undefined
	}

	return {
		message,
		say(text) {
			cancel()
			setMessage(text)
		},
		sayLater(text) {
			cancel()
			timer.current = setTimeout(() => {
				timer.current = undefined
				setMessage(text)
			}, SETTLE_MS)
		},
		cancel,
	}
}
