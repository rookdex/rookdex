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
}

/** Multi-select toggles with an explicit All, so a screen reader never hears "all, not pressed". */
export function CategoryNav({ categories, selected, onSelect, allLabel, navLabel }: Props) {
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
			</ul>
		</nav>
	)
}
