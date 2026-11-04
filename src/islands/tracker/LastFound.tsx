import type { Locale, Translate } from "../../i18n"
import { relativeTime } from "../../model/relativeTime"
import type { SeedItem } from "../../model/schema"
import type { RecentFind } from "../../model/stats"
import { categoryIcon } from "./icons"
import { useNow } from "./useNow"

/** The row can jump only when the card is in the list and its checkbox can take focus (a
 *  disabled input cannot). It never changes the user's filters to make room (spec §5.3). */
export function jumpable(
	find: RecentFind | undefined,
	visible: SeedItem[],
	ready: boolean
): boolean {
	return ready && find !== undefined && visible.some((item) => item.id === find.item.id)
}

interface Props {
	find: RecentFind | undefined
	canJump: boolean
	onJump: (id: string) => void
	locale: Locale
	t: Translate
}

/** The phone and tablet stand-in for the rail: the latest find, and a jump to its card. Not a live
 *  region, so the changing time is never announced. */
export function LastFound({ find, canJump, onJump, locale, t }: Props) {
	// Before the early return: hooks run in the same order on every render.
	const now = useNow()
	if (!find) return null
	const Icon = categoryIcon(find.item.category)
	const content = (
		<>
			<span className="last-found-icon" aria-hidden="true">
				<Icon />
			</span>
			<span className="last-found-text">
				<span className="last-found-label">{t("tracker.lastFound")}</span>{" "}
				<span className="last-found-name">{find.item.name}</span>
			</span>{" "}
			<time dateTime={find.updated_at}>{relativeTime(find.updated_at, now, locale)}</time>
		</>
	)
	return canJump ? (
		<button type="button" className="last-found" onClick={() => onJump(find.item.id)}>
			{content}
		</button>
	) : (
		<p className="last-found">{content}</p>
	)
}
