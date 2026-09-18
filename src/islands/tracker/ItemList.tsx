import { fill, type Strings } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { categoryIds, groupItems } from "../../model/seed"
import type { Records } from "../../model/stats"

interface Props {
	items: SeedItem[]
	records: Records
	disabled: boolean
	categoryLabel: (id: string) => string
	groupLabel: (id: string) => string
	onToggle: (id: string, done: boolean) => void
	strings: Strings["tracker"]
}

/** Sections per category, groups inside, one checkbox row per item. Retired items are hidden. */
export function ItemList({
	items,
	records,
	disabled,
	categoryLabel,
	groupLabel,
	onToggle,
	strings,
}: Props) {
	const live = items.filter((item) => !item.retired)
	if (live.length === 0) return <p className="item-empty">{strings.empty}</p>

	return (
		<div className="item-list">
			{categoryIds(live).map((category) => (
				<section key={category} className="item-category" aria-labelledby={`cat-${category}`}>
					<h2 id={`cat-${category}`}>{categoryLabel(category)}</h2>
					<div className="item-groups">
						{[...groupItems(live.filter((item) => item.category === category))].map(
							([group, groupList]) => (
								<section
									key={group}
									className="item-group"
									aria-labelledby={`group-${category}/${group}`}
								>
									{/* A slash is valid in an HTML id and cannot appear in a slug, so no two ids collide. */}
									<h3 id={`group-${category}/${group}`}>{groupLabel(group)}</h3>
									<ul>
										{groupList.map((item) => (
											<ItemRow
												key={item.id}
												item={item}
												done={records[item.id]?.done ?? false}
												disabled={disabled}
												onToggle={onToggle}
												strings={strings}
											/>
										))}
									</ul>
								</section>
							)
						)}
					</div>
				</section>
			))}
		</div>
	)
}

interface RowProps {
	item: SeedItem
	done: boolean
	disabled: boolean
	onToggle: (id: string, done: boolean) => void
	strings: Strings["tracker"]
}

function ItemRow({ item, done, disabled, onToggle, strings }: RowProps) {
	// The seed id has exactly one slash (schema), so it is unique as a DOM id as it stands.
	const inputId = `item-${item.id}`
	const tier =
		item.status === "confirmed"
			? strings.confirmed
			: fill(strings.expectedFrom, { precedent: item.precedent ?? "" })
	return (
		<li className="item">
			<div className="item-main">
				<input
					id={inputId}
					type="checkbox"
					checked={done}
					disabled={disabled}
					onChange={(event) => onToggle(item.id, event.target.checked)}
				/>
				<label htmlFor={inputId}>{item.name}</label>
				<span className="tier">{tier}</span>
			</div>
			{item.description && <p className="item-desc">{item.description}</p>}
			<div className="item-foot">
				<ul className="item-sources" aria-label={strings.sources}>
					{item.sources.map((source) => (
						<li key={source.url}>
							<a href={source.url} rel="noopener noreferrer">
								{source.title}
							</a>
						</li>
					))}
				</ul>
				<button type="button" className="report" disabled title={strings.reportSoon}>
					{strings.report}
				</button>
			</div>
		</li>
	)
}
