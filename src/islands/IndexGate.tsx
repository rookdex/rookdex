import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react"
import type { Translate } from "../i18n"
import { type ChunkFailure, loadSeedIndex, readSeedIndexUrl } from "../model/chunks"
import type { SeedIndex } from "../model/trackItems"
import { useLiveStatus } from "./tracker/useLiveStatus"

interface Props {
	/** Shown while the index loads. It holds the island's height, so nothing below it moves. */
	fallback: ReactNode
	t: Translate
	/** Speaks the failure notice. The hub passes its one status region's writer (`announce`). Leave
	 *  undefined to give the gate its own status line (the tracker). */
	say?: (text: string) => void
	/** Where focus goes when a retry started from the notice's button brings the index in. It
	 *  must be in the DOM from the children's first render. Leave undefined to move nothing. */
	focusTarget?: RefObject<HTMLElement | null>
	children: (index: SeedIndex) => ReactNode
}

type GateState =
	/** `retrying`: the failure whose notice stays on screen while it is tried again. */
	| { status: "loading"; retrying?: ChunkFailure }
	| { status: "ready"; index: SeedIndex }
	| { status: "failed"; reason: ChunkFailure }

/**
 * Loads the seed index file the page names (plan review ruling 3) and renders `children` with it.
 * Until then the fallback; on failure a notice with Try again (offline) or Reload (stale, an old
 * tab after a deploy), spoken once. Try again and, after an offline failure, the browser's online
 * event both load it again.
 * The notice stays while a retry runs, its button marked busy, so focus is never dropped to <body>.
 */
export function IndexGate({ fallback, t, say, focusTarget, children }: Props) {
	const [state, setState] = useState<GateState>({ status: "loading" })
	const [attempt, setAttempt] = useState(0)
	const live = useLiveStatus()
	// The notice's button (Try again or Reload). Set when a retry starts from it, by a click or with
	// focus on it: focus then returns to it after a failed retry, or moves to focusTarget.
	const noticeButton = useRef<HTMLButtonElement>(null)
	const focusRetry = useRef(false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: `live` and `say` may be new each render; only a new attempt should load
	useEffect(() => {
		let current = true
		if (attempt > 0) {
			setState((old) =>
				old.status === "failed"
					? { status: "loading", retrying: old.reason }
					: { status: "loading" }
			)
			// Emptied so the same failure text again is a change a screen reader speaks.
			;(say ?? live.say)("")
		}
		let url: string
		try {
			url = readSeedIndexUrl()
		} catch {
			// No index block: an old or broken page, so Reload is the way out.
			setState({ status: "failed", reason: "stale" })
			return
		}
		void loadSeedIndex(url, (url, init) => fetch(url, init)).then((outcome) => {
			if (!current) return
			setState(
				outcome.ok
					? { status: "ready", index: outcome.index }
					: { status: "failed", reason: outcome.reason }
			)
		})
		return () => {
			current = false
		}
	}, [attempt])

	const retry = useCallback(() => {
		if (noticeButton.current && document.activeElement === noticeButton.current) {
			focusRetry.current = true
		}
		setAttempt((n) => n + 1)
	}, [])
	// Only an offline failure can mend when the connection comes back. A stale index is gone from
	// the server, so retrying it would only mark Reload busy and say the same notice again.
	const offline = state.status === "failed" && state.reason === "offline"
	useEffect(() => {
		if (!offline) return
		window.addEventListener("online", retry)
		return () => window.removeEventListener("online", retry)
	}, [offline, retry])

	// biome-ignore lint/correctness/useExhaustiveDependencies: `focusTarget` is a ref, read when the status changes
	useEffect(() => {
		if (state.status === "loading" || !focusRetry.current) return
		focusRetry.current = false
		if (state.status === "failed") noticeButton.current?.focus()
		else focusTarget?.current?.focus()
	}, [state.status])

	const notice =
		state.status === "failed"
			? t(state.reason === "stale" ? "tracker.chunk.stale" : "tracker.index.offline")
			: ""
	// biome-ignore lint/correctness/useExhaustiveDependencies: `live` and `say` may be new each render; only a new text should speak
	useEffect(() => {
		if (notice) (say ?? live.say)(notice)
	}, [notice])

	if (state.status === "ready") return <>{children(state.index)}</>
	// The failure on screen: the last one, or the one being tried again.
	const shown = state.status === "failed" ? state.reason : state.retrying
	const busy = state.status === "loading"
	return (
		<>
			{shown === undefined ? (
				fallback
			) : (
				<p className="hint chunk-notice">
					<span>{t(shown === "stale" ? "tracker.chunk.stale" : "tracker.index.offline")}</span>{" "}
					{shown === "stale" ? (
						<button
							type="button"
							ref={noticeButton}
							aria-disabled={busy || undefined}
							onClick={() => {
								if (!busy) window.location.reload()
							}}
						>
							{t("tracker.chunk.reload")}
						</button>
					) : (
						<button
							type="button"
							ref={noticeButton}
							aria-disabled={busy || undefined}
							onClick={() => {
								if (busy) return
								focusRetry.current = true
								retry()
							}}
						>
							{t("tracker.index.retry")}
						</button>
					)}
				</p>
			)}
			{!say && (
				<p className="visually-hidden" role="status" aria-live="polite">
					{live.message}
				</p>
			)}
		</>
	)
}
