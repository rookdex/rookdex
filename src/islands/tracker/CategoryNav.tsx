import { BookIcon } from "./icons"

interface Category {
	id: string
	label: string
}

interface Props {
	categories: Category[]
	selected: string[]
	onSelect: (ids: string[]) => void
	allLabel: string
	navLabel: string
	sources: { href: string; label: string }
}

/** Multi-select toggles with an explicit All, so a screen reader never hears "all, not pressed". */
export function CategoryNav({
	categories,
	selected,
	onSelect,
	allLabel,
	navLabel,
	sources,
}: Props) {
	const allPressed = selected.length === 0

	function toggle(id: string) {
		const next = new Set(selected)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		onSelect(categories.filter((c) => next.has(c.id)).map((c) => c.id))
	}

	return (
		<nav className="cat-nav" aria-label={navLabel}>
			<ul className="chips">
				<li>
					<button type="button" aria-pressed={allPressed} onClick={() => onSelect([])}>
						{allLabel}
					</button>
				</li>
				{categories.map((c) => (
					<li key={c.id}>
						<button
							type="button"
							aria-pressed={selected.includes(c.id)}
							onClick={() => toggle(c.id)}
						>
							{c.label}
						</button>
					</li>
				))}
				{/* A link to another page, not a filter, so it has no aria-pressed (spec §5). */}
				<li>
					<a href={sources.href}>
						<BookIcon />
						{sources.label}
					</a>
				</li>
			</ul>
		</nav>
	)
}
