import type { KeyboardEvent, RefObject } from "react"
import type { Translate } from "../../i18n"
import { CloseIcon, EyeOffIcon } from "./icons"

interface Props {
	query: string
	hideFound: boolean
	hiddenCount: number
	inputRef: RefObject<HTMLInputElement | null>
	onQuery: (query: string) => void
	onClear: () => void
	onToggleHideFound: () => void
	t: Translate
}

/** The row above the chips (tracker search spec §3.5, §5). Holds no state of its own. */
export function SearchBar({
	query,
	hideFound,
	hiddenCount,
	inputRef,
	onQuery,
	onClear,
	onToggleHideFound,
	t,
}: Props) {
	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Escape" || query === "") return
		// Mine, not the browser's: a native clear would skip the "Search cleared" line.
		event.preventDefault()
		onClear()
	}

	function clear() {
		onClear()
		inputRef.current?.focus()
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: <search> has no role in aria-query, so Testing Library cannot find it
		<div className="search-row" role="search">
			<div className="search-field">
				<label htmlFor="tracker-search" className="visually-hidden">
					{t("tracker.search.label")}
				</label>
				{/* No form: Enter has nothing to submit, and blurring would lose a keyboard user's place. */}
				<input
					ref={inputRef}
					id="tracker-search"
					type="search"
					value={query}
					placeholder={t("tracker.search.placeholder")}
					maxLength={100}
					autoComplete="off"
					enterKeyHint="search"
					onChange={(event) => onQuery(event.target.value)}
					onKeyDown={onKeyDown}
				/>
				{query !== "" && (
					<button type="button" className="search-clear" onClick={clear}>
						<CloseIcon />
						<span className="visually-hidden">{t("tracker.search.clear")}</span>
					</button>
				)}
			</div>
			<button
				type="button"
				className="search-toggle"
				aria-pressed={hideFound}
				onClick={onToggleHideFound}
			>
				<EyeOffIcon />
				<span className="search-toggle-label">{t("tracker.search.hideFound")}</span>
				{hideFound && (
					<>
						{/* jsdom joins inline spans with no separator, so I add the space myself. */}{" "}
						<span className="search-count" aria-hidden="true">
							{hiddenCount}
						</span>
						<span className="visually-hidden">
							{t("tracker.search.hiddenCount", { count: hiddenCount })}
						</span>
					</>
				)}
			</button>
		</div>
	)
}
