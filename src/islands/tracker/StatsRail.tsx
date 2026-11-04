import type { Locale, Translate } from "../../i18n"
import { relativeTime } from "../../model/relativeTime"
import type { Count, RecentFind } from "../../model/stats"
import { categoryIcon } from "./icons"
import { useNow } from "./useNow"

interface Props {
	overall: Count
	recent: RecentFind[]
	/** From launch on, Overall links to the hub (dashboard spec §4). */
	hubHref?: string
	locale: Locale
	t: Translate
}

interface BarProps {
	id: string
	label: string
	count: Count
	countText: string
}

export function Bar({ id, label, count, countText }: BarProps) {
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

/** Desktop only (spec §5.2). Not a live region, so the changing times are never announced. */
export function StatsRail({ overall, recent, hubHref, locale, t }: Props) {
	const now = useNow()
	// Rounded down, so 214 of 215 reads 99 %, never 100 % before everything is found.
	const percent = overall.total === 0 ? 0 : Math.floor((overall.done / overall.total) * 100)
	const countText = t("tracker.count", { done: overall.done, total: overall.total })
	return (
		<section className="stats" aria-labelledby="stats-heading">
			<h2 id="stats-heading">
				{hubHref ? (
					<a className="go-link" href={hubHref}>
						{t("tracker.overall")}
					</a>
				) : (
					t("tracker.overall")
				)}
			</h2>
			<p className="stats-percent">
				{percent}
				<small>%</small>
			</p>
			<div
				className="bar"
				role="progressbar"
				aria-labelledby="stats-heading"
				aria-valuemin={0}
				aria-valuemax={overall.total}
				aria-valuenow={overall.done}
				aria-valuetext={countText}
			>
				{/* React writes this through the CSSOM, which the CSP allows. */}
				<span className="bar-fill" style={{ width: `${percent}%` }} />
			</div>
			<h3 id="recent-heading">{t("tracker.recent")}</h3>
			{recent.length === 0 ? (
				<p className="stats-empty">{t("tracker.noRecent")}</p>
			) : (
				<ul className="recent" aria-labelledby="recent-heading">
					{recent.map((find) => {
						const Icon = categoryIcon(find.item.category)
						return (
							<li key={find.item.id}>
								<span className="find-icon" aria-hidden="true">
									<Icon />
								</span>
								<span className="find-text">
									<span className="find-name">{find.item.name}</span>{" "}
									<time className="find-when" dateTime={find.updated_at}>
										{relativeTime(find.updated_at, now, locale)}
									</time>
								</span>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}
