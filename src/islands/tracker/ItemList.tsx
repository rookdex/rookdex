import { useRef } from "react"
import type { Translate } from "../../i18n"
import { itemReportUrl } from "../../model/report"
import { type Count, groupKey, type Records } from "../../model/stats"
import { categoryIds, groupItems, type TrackItem } from "../../model/trackItems"
import { GroupChips } from "./GroupChips"
import { BookIcon, ChevronIcon, categoryIcon, FlagIcon } from "./icons"
import { useCut } from "./useCut"
import { usePanel } from "./usePanel"

const none: Count = { done: 0, total: 0 }

interface Props {
	items: TrackItem[]
	records: Records
	disabled: boolean
	categoryLabel: (id: string) => string
	groupLabel: (id: string) => string
	/** Over every item, never the filtered view, so the numbers hold still while typing (spec §2). */
	categoryCounts: Record<string, Count>
	/** Keyed by `groupKey`, also over every item. */
	groupCounts: Record<string, Count>
	onToggle: (id: string, done: boolean) => void
	/** Every category id in seed order, so a category with no card left keeps its place. */
	order: string[]
	/** Per pressed category, its chip groups (`chipGroups`); empty under All. */
	chips: Map<string, string[]>
	/** Pressed chips as `groupKey`s. */
	groups: string[]
	onToggleGroup: (key: string) => void
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
	categoryCounts,
	groupCounts,
	onToggle,
	order,
	chips,
	groups,
	onToggleGroup,
	sourcesHref,
	t,
}: Props) {
	const live = items.filter((item) => !item.retired)
	const withCards = new Set(categoryIds(live))
	// A category with a chip row keeps its title and chips when no card is left (R17), so a chip
	// press never unmounts the chip that has focus.
	const sections = order.filter((id) => withCards.has(id) || chips.has(id))
	if (sections.length === 0) return <p className="item-empty">{t("tracker.empty")}</p>

	const countText = (count: Count = none) =>
		t("tracker.count", { done: count.done, total: count.total })

	return (
		<div className="item-list">
			{sections.map((category) => {
				const Icon = categoryIcon(category)
				const chipRow = chips.get(category)
				return (
					<section key={category} className="item-category" aria-labelledby={`cat-${category}`}>
						{/* The count is the heading's sibling, so the heading's name is the label alone. */}
						<div className="cat-head">
							<span className="cat-icon" aria-hidden="true">
								<Icon />
							</span>
							<h2 id={`cat-${category}`}>{categoryLabel(category)}</h2>
							<span className="cat-count">{countText(categoryCounts[category])}</span>
							<span className="cat-rule" aria-hidden="true" />
						</div>
						{chipRow && (
							<GroupChips
								category={category}
								categoryLabel={categoryLabel(category)}
								groups={chipRow}
								pressed={groups}
								counts={groupCounts}
								groupLabel={groupLabel}
								onToggle={onToggleGroup}
								t={t}
							/>
						)}
						{withCards.has(category) && (
							<div className="item-groups">
								{[...groupItems(live.filter((item) => item.category === category))].map(
									([group, groupList]) => (
										<section
											key={group}
											className="item-group"
											aria-labelledby={`group-${category}/${group}`}
										>
											<div className="group-head">
												{/* A slash is valid in an HTML id and cannot appear in a slug, so no two ids collide. */}
												<h3 id={`group-${category}/${group}`}>{groupLabel(group)}</h3>
												<span className="group-count">
													{countText(groupCounts[groupKey(category, group)])}
												</span>
											</div>
											<ul>
												{groupList.map((item) => (
													<ItemRow
														key={item.id}
														item={item}
														done={records[item.id]?.done ?? false}
														disabled={disabled}
														groupName={groupLabel(group)}
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
						)}
					</section>
				)
			})}
		</div>
	)
}

interface RowProps {
	item: TrackItem
	done: boolean
	disabled: boolean
	groupName: string
	onToggle: (id: string, done: boolean) => void
	sourcesHref: string
	t: Translate
}

/**
 * The icon-lead card (tracker refresh spec §5.1). The label's ::after covers the card, so a tap
 * anywhere toggles the one real checkbox; the footer icons sit above that layer. When the clamp
 * cuts the description, a chevron in the footer opens the full text in a panel over the card.
 */
function ItemRow({ item, done, disabled, groupName, onToggle, sourcesHref, t }: RowProps) {
	const cardRef = useRef<HTMLLIElement>(null)
	const descRef = useRef<HTMLParagraphElement>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const cut = useCut(descRef, item.description)
	// An open panel stays until it closes, even if its text stops being cut meanwhile.
	const shown = usePanel(panelRef, cardRef, cut) || cut
	// The seed id has exactly one slash (schema), so it is unique as a DOM id as it stands.
	const inputId = `item-${item.id}`
	const panelId = `more-${item.id}`
	const Icon = categoryIcon(item.category)
	const tier =
		item.status === "confirmed"
			? t("tracker.confirmed")
			: t("tracker.expectedFrom", { precedent: item.precedent ?? "" })
	return (
		<li ref={cardRef} className={done ? "item found" : "item"}>
			{/* First in the DOM, so Tab runs checkbox, chevron, book, flag. CSS places it top right. */}
			<input
				id={inputId}
				className="item-check"
				type="checkbox"
				checked={done}
				disabled={disabled}
				onChange={(event) => onToggle(item.id, event.target.checked)}
			/>
			<div className="item-main">
				<span className="item-tile" aria-hidden="true">
					<Icon />
				</span>
				<div className="item-text">
					<label htmlFor={inputId}>{item.name}</label>
					<span className="item-meta">
						<span className="item-dot" data-status={item.status} />
						<span className="item-tier">{tier}</span> · {groupName}
					</span>
				</div>
			</div>
			{item.description && (
				<p ref={descRef} className="item-desc">
					{item.description}
				</p>
			)}
			{/* A flex row, so December can add "Entry →" and a star without a new layout. */}
			<div className="item-foot">
				{/* Only when the clamp cuts the text, so a chevron always means there is more to read. */}
				{shown && (
					<button type="button" className="item-icon has-tip tip-end" popoverTarget={panelId}>
						<ChevronIcon />
						<span className="visually-hidden">{t("tracker.moreLabel", { name: item.name })}</span>
						<span className="tip" aria-hidden="true">
							{t("tracker.more")}
						</span>
					</button>
				)}
				<a className="item-icon item-book has-tip tip-end" href={`${sourcesHref}#${item.id}`}>
					<BookIcon />
					<span className="visually-hidden">
						{t("tracker.sources")}: {item.name}
					</span>
					<span className="tip" aria-hidden="true">
						{t("tracker.sources")}
					</span>
				</a>
				<a
					className="item-icon has-tip tip-end"
					href={itemReportUrl(item)}
					target="_blank"
					rel="noopener noreferrer"
				>
					<FlagIcon />
					<span className="visually-hidden">{t("tracker.reportLabel", { name: item.name })}</span>
					<span className="tip" aria-hidden="true">
						{t("tracker.report")}
					</span>
				</a>
			</div>
			{/* The full text, over the card in the top layer, so no card ever changes size. It stays in
			    the DOM while the chevron shows, so the chevron always has its target. tabIndex -1 keeps
			    focus in the panel on a click on its text; otherwise it falls to the results region and
			    usePanel reads that as focus leaving. */}
			{shown && (
				<div ref={panelRef} id={panelId} className="item-panel" popover="auto" tabIndex={-1}>
					<p className="item-panel-name">{item.name}</p>
					<p className="item-panel-desc">{item.description}</p>
					<div className="item-panel-foot">
						<button
							type="button"
							className="item-icon"
							popoverTarget={panelId}
							popoverTargetAction="hide"
						>
							<ChevronIcon up />
							<span className="visually-hidden">{t("tracker.lessLabel", { name: item.name })}</span>
						</button>
					</div>
				</div>
			)}
		</li>
	)
}
