import type { Translate } from "../../i18n"
import type { CategoryCount, Count, RecentFind } from "../../model/stats"

interface Props {
	overall: Count
	categories: (CategoryCount & { label: string })[]
	recent: RecentFind[]
	t: Translate
}

interface BarProps {
	id: string
	label: string
	count: Count
	countText: string
}

function Bar({ id, label, count, countText }: BarProps) {
	const percent = count.total === 0 ? 0 : Math.round((count.done / count.total) * 100)
	return (
		<div className="progress">
			<div className="progress-label">
				<span id={id}>{label}</span>
				<span>{countText}</span>
			</div>
			<div
				className="bar"
				role="progressbar"
				aria-labelledby={id}
				aria-valuemin={0}
				aria-valuemax={count.total}
				aria-valuenow={count.done}
				aria-valuetext={countText}
			>
				{/* React writes this through the CSSOM, which the CSP allows; no style attribute is emitted server-side. */}
				<span className="bar-fill" style={{ width: `${percent}%` }} />
			</div>
		</div>
	)
}

export function StatsRail({ overall, categories, recent, t }: Props) {
	const text = (count: Count) => t("tracker.count", { done: count.done, total: count.total })
	return (
		<section className="stats" aria-labelledby="stats-heading">
			<h2 id="stats-heading">{t("tracker.progress")}</h2>
			<div className="stats-grid">
				<Bar
					id="progress-overall"
					label={t("tracker.overall")}
					count={overall}
					countText={text(overall)}
				/>
				{categories.map((c) => (
					<Bar
						key={c.category}
						id={`progress-${c.category}`}
						label={c.label}
						count={c}
						countText={text(c)}
					/>
				))}
			</div>
			<h3 id="recent-heading">{t("tracker.recent")}</h3>
			{recent.length === 0 ? (
				<p className="stats-empty">{t("tracker.noRecent")}</p>
			) : (
				<ul className="recent" aria-labelledby="recent-heading">
					{recent.map((find) => (
						<li key={find.item.id}>{find.item.name}</li>
					))}
				</ul>
			)}
		</section>
	)
}
