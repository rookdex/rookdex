import type { Translate } from "../../i18n"
import { type Count, groupKey } from "../../model/stats"

const none: Count = { done: 0, total: 0 }

interface Props {
	category: string
	/** The category's label, for the row's name. */
	categoryLabel: string
	/** This category's chip groups in list order (`chipGroups`). */
	groups: string[]
	/** Every pressed chip as a `groupKey`. */
	pressed: string[]
	/** Keyed by `groupKey`, over every item, never the filtered view (spec §2 Counts). */
	counts: Record<string, Count>
	groupLabel: (id: string) => string
	onToggle: (key: string) => void
	t: Translate
}

/**
 * The chips under a pressed category's title (tracker refresh spec §14.1): multi-select toggles,
 * none pressed shows the whole category. The name carries the count in words, as a tile's does,
 * so the digits are hidden. A fieldset is the group role Biome accepts (R18).
 */
export function GroupChips({
	category,
	categoryLabel,
	groups,
	pressed,
	counts,
	groupLabel,
	onToggle,
	t,
}: Props) {
	return (
		<fieldset
			className="group-chips"
			aria-label={t("tracker.groupChips", { category: categoryLabel })}
		>
			{groups.map((group) => {
				const key = groupKey(category, group)
				const on = pressed.includes(key)
				const count = counts[key] ?? none
				const label = groupLabel(group)
				return (
					<button
						key={key}
						type="button"
						aria-pressed={on}
						aria-label={`${label}, ${t("tracker.count", { done: count.done, total: count.total })}`}
						onClick={() => onToggle(key)}
					>
						{/* Pressed is never told by colour alone. */}
						{on && (
							<span className="chip-check" aria-hidden="true">
								✓
							</span>
						)}
						<span className="chip-name">{label}</span>
						<span className="chip-count" aria-hidden="true">
							{count.done}/{count.total}
						</span>
					</button>
				)
			})}
		</fieldset>
	)
}
