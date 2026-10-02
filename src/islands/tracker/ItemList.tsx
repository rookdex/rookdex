import type { Translate } from "../../i18n"
import type { SeedItem } from "../../model/schema"
import { categoryIds, groupItems } from "../../model/seed"
import type { Records } from "../../model/stats"
import { BookIcon, FlagIcon } from "./icons"

interface Props {
	items: SeedItem[]
	records: Records
	disabled: boolean
	categoryLabel: (id: string) => string
	groupLabel: (id: string) => string
	onToggle: (id: string, done: boolean) => void
	/** The Sources page; each book link adds "#<item id>". */
	sourcesHref: string
	t: Translate
}

/** Sections per category, groups inside, one checkbox row per item. Retired items are hidden. */
export function ItemList({
	items,
	records,
	disabled,
	categoryLabel,
	groupLabel,
	onToggle,
	sourcesHref,
	t,
}: Props) {
	const live = items.filter((item) => !item.retired)
	if (live.length === 0) return <p className="item-empty">{t("tracker.empty")}</p>

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
												sourcesHref={sourcesHref}
												t={t}
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
	sourcesHref: string
	t: Translate
}

/**
 * One card per item (feedback spec §4). The label's ::after covers the card, so a click anywhere
 * toggles the one real checkbox; the corner icons sit above that layer.
 */
function ItemRow({ item, done, disabled, onToggle, sourcesHref, t }: RowProps) {
	// The seed id has exactly one slash (schema), so it is unique as a DOM id as it stands.
	const inputId = `item-${item.id}`
	const tier =
		item.status === "confirmed"
			? t("tracker.confirmed")
			: t("tracker.expectedFrom", { precedent: item.precedent ?? "" })
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
			</div>
			{/* Before the flag in the DOM, so Tab runs top to bottom. It is absolutely positioned, so
			    its place here changes no layout. */}
			<a className="item-icon item-book has-tip tip-end" href={`${sourcesHref}#${item.id}`}>
				<BookIcon />
				<span className="visually-hidden">
					{t("tracker.sources")}: {item.name}
				</span>
				<span className="tip" aria-hidden="true">
					{t("tracker.sources")}
				</span>
			</a>
			<span className="tier" data-status={item.status}>
				{tier}
			</span>
			{item.description && <p className="item-desc">{item.description}</p>}
			<div className="item-foot">
				{/* aria-disabled keeps it focusable, so its tooltip explains it (spec §3.3). */}
				<button type="button" className="item-icon has-tip tip-end" aria-disabled="true">
					<FlagIcon />
					<span className="visually-hidden">{t("tracker.reportSoon")}</span>
					<span className="tip" aria-hidden="true">
						{t("tracker.reportSoon")}
					</span>
				</button>
			</div>
		</li>
	)
}
