import { type ReactNode, useCallback, useEffect, useState } from "react"
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
	children: (index: SeedIndex) => ReactNode
}

type GateState =
	| { status: "loading" }
	| { status: "ready"; index: SeedIndex }
	| { status: "failed"; reason: ChunkFailure }

/**
 * Loads the seed index file the page names (plan review ruling 3) and renders `children` with it.
 * Until then the fallback; on failure a notice with Try again (offline) or Reload (stale, an old
 * tab after a deploy), spoken once. Try again and the browser's online event both load it again.
 */
export function IndexGate({ fallback, t, say, children }: Props) {
	const [state, setState] = useState<GateState>({ status: "loading" })
	const [attempt, setAttempt] = useState(0)
	const live = useLiveStatus()

	useEffect(() => {
		let current = true
		if (attempt > 0) setState({ status: "loading" })
		void loadSeedIndex(readSeedIndexUrl(), (url, init) => fetch(url, init)).then((outcome) => {
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

	const retry = useCallback(() => setAttempt((n) => n + 1), [])
	const failed = state.status === "failed"
	useEffect(() => {
		if (!failed) return
		window.addEventListener("online", retry)
		return () => window.removeEventListener("online", retry)
	}, [failed, retry])

	const notice =
		state.status === "failed"
			? t(state.reason === "stale" ? "tracker.chunk.stale" : "tracker.index.offline")
			: ""
	// biome-ignore lint/correctness/useExhaustiveDependencies: `live` and `say` may be new each render; only a new text should speak
	useEffect(() => {
		if (notice) (say ?? live.say)(notice)
	}, [notice])

	if (state.status === "ready") return <>{children(state.index)}</>
	return (
		<>
			{state.status === "loading" ? (
				fallback
			) : (
				<p className="hint chunk-notice">
					<span>{notice}</span>{" "}
					{state.reason === "stale" ? (
						<button type="button" onClick={() => window.location.reload()}>
							{t("tracker.chunk.reload")}
						</button>
					) : (
						<button type="button" onClick={retry}>
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
