import type { ReactElement } from "react"
import type { Translate } from "../../i18n"
import type { Count } from "../../model/stats"
import { AllIcon, BookIcon, categoryIcon } from "./icons"

interface Category extends Count {
	id: string
	label: string
}

interface Props {
	categories: Category[]
	/** The whole seed, for the All tile. Counts never follow search or Hide found (spec §2). */
	overall: Count
	selected: string[]
	onSelect: (ids: string[]) => void
	allLabel: string
	navLabel: string
	sources: { href: string; label: string }
	t: Translate
}

interface TileProps {
	label: string
	count: Count
	pressed: boolean
	onClick: () => void
	Icon: () => ReactElement
	t: Translate
}

/**
 * One filter tile (tracker refresh spec §4.1). The name carries the count in words; the digits and
 * the bar repeat it for the eye, so they are hidden. No progressbar role: a button's children are
 * presentational, so the role would be lost anyway.
 */
function Tile({ label, count, pressed, onClick, Icon, t }: TileProps) {
	const percent = count.total === 0 ? 0 : Math.round((count.done / count.total) * 100)
	return (
		<button
			type="button"
			className="tile"
			aria-pressed={pressed}
			aria-label={`${label}, ${t("tracker.count", { done: count.done, total: count.total })}`}
			onClick={onClick}
		>
			<span className="tile-icon" aria-hidden="true">
				<Icon />
			</span>
			<span className="tile-label">{label}</span>
			<span className="tile-count" aria-hidden="true">
				{count.done}
				<small>/{count.total}</small>
			</span>
			<span className="tile-bar" aria-hidden="true">
				{/* React writes this through the CSSOM, which the CSP allows. */}
				<span className="bar-fill" style={{ width: `${percent}%` }} />
			</span>
		</button>
	)
}

/** Multi-select toggles with an explicit All, so a screen reader never hears "all, not pressed". */
export function CategoryNav({
	categories,
	overall,
	selected,
	onSelect,
	allLabel,
	navLabel,
	sources,
	t,
}: Props) {
	function toggle(id: string) {
		const next = new Set(selected)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		onSelect(categories.filter((c) => next.has(c.id)).map((c) => c.id))
	}

	return (
		<nav className="cat-nav" aria-label={navLabel}>
			<ul className="tiles">
				<li className="tile-all">
					<Tile
						label={allLabel}
						count={overall}
						pressed={selected.length === 0}
						onClick={() => onSelect([])}
						Icon={AllIcon}
						t={t}
					/>
				</li>
				{categories.map((c) => (
					<li key={c.id}>
						<Tile
							label={c.label}
							count={c}
							pressed={selected.includes(c.id)}
							onClick={() => toggle(c.id)}
							Icon={categoryIcon(c.id)}
							t={t}
						/>
					</li>
				))}
				{/* A link to another page, not a filter, so it has no aria-pressed. */}
				<li className="tile-sources">
					<a href={sources.href}>
						<BookIcon />
						{sources.label}
					</a>
				</li>
			</ul>
		</nav>
	)
}
