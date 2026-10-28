import type { Translate } from "../../i18n"
import { NEXT_LIMIT, RECENT_LIMIT } from "./limits"

interface Props {
	categoryCount: number
	t: Translate
}

const keys = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, n) => `${prefix}-${n}`)

/**
 * The dashboard's blocks at their fixed and reserved heights, with the real headings, so swapping
 * it for the dashboard shifts nothing (dashboard spec §4, §10). Hidden from screen readers, which
 * hear the loading line instead.
 */
export function DashboardSkeleton({ categoryCount, t }: Props) {
	return (
		<div className="dashboard is-skeleton">
			<p className="visually-hidden">{t("tracker.loading")}</p>
			<div className="dash-top" aria-hidden="true">
				<span className="dash-day">&nbsp;</span>
				<span className="skeleton skeleton-chip" />
			</div>
			<div className="tile hero hero-after skeleton" aria-hidden="true" />
			{/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a dl is not focusable; the rule misreads it. */}
			<dl className="stat-pair" aria-hidden="true">
				{keys("tile", 2).map((key) => (
					<div key={key} className="stat-tile skeleton">
						<dt>&nbsp;</dt>
						<dd>&nbsp;</dd>
					</div>
				))}
			</dl>
			<p className="stat-strip" aria-hidden="true">
				<span className="stat-strip-first">&nbsp;</span>
				<span>&nbsp;</span>
			</p>
			<p className="tracker-alert" />
			<section className="whats-next" aria-hidden="true">
				<h2>{t("hub.whatsNext")}</h2>
				<div className="next-groups">
					<ul className="next-list">
						{keys("row", NEXT_LIMIT).map((key) => (
							<li key={key} className="next-row skeleton" />
						))}
					</ul>
				</div>
			</section>
			<section className="dash-progress" aria-hidden="true">
				<h2>{t("tracker.progress")}</h2>
				{keys("bar", categoryCount).map((key) => (
					<div key={key} className="progress">
						<div className="progress-label">
							<span>&nbsp;</span>
						</div>
						<div className="bar" />
					</div>
				))}
			</section>
			<section className="cat-bars" aria-hidden="true">
				<div className="deco">
					<h2>{t("hub.categories")}</h2>
				</div>
				<ul className="ledger">
					{keys("cat", categoryCount).map((key) => (
						<li key={key}>
							<span className="ledger-row skeleton" />
						</li>
					))}
				</ul>
			</section>
			<section className="dash-recent" aria-hidden="true">
				<h2>{t("tracker.recent")}</h2>
				<ul className="recent">
					{keys("find", RECENT_LIMIT).map((key) => (
						<li key={key}>&nbsp;</li>
					))}
				</ul>
			</section>
		</div>
	)
}
