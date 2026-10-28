import { seedLabel, type Translate } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import { Chev } from "./Chev"
import { share } from "./StatPair"

interface Props {
	rows: CategoryRow[]
	phase: "before" | "after"
	/** Gets the Closest tag after launch. The dashboard passes it only once something is found. */
	closest?: string
	trackerHref: string
	t: Translate
}

/**
 * One row-as-bar per category (desktop dashboard spec §4.3). The fill sits behind the text. Before
 * launch every fill is 0 and the row emits no style attribute, because this renders on the server.
 */
export function CategoryBars({ rows, phase, closest, trackerHref, t }: Props) {
	return (
		<section className="cat-bars" aria-labelledby="cat-bars-heading">
			<div className="deco">
				<h2 id="cat-bars-heading">{t("hub.categories")}</h2>
			</div>
			<ul className="ledger">
				{rows.map((row) => {
					const left = row.total - row.done
					const status =
						phase === "before"
							? t("hub.toFind", { count: row.total })
							: left === 0
								? t("hub.allFound")
								: t("hub.left", { count: left })
					const tagged = phase === "after" && row.id === closest && left > 0
					// Same rounding as the hero and the segments (share rounds down), so one category never
					// reads 67 % in one place and 66 % in another.
					const percent = Math.round(share(row) * 100)
					return (
						<li key={row.id}>
							<a className="ledger-row" href={`${trackerHref}?show=${row.id}`}>
								<span
									className="ledger-fill"
									aria-hidden="true"
									style={percent > 0 ? { width: `${percent}%` } : undefined}
								/>
								<span className="ledger-name">
									<h3>
										{seedLabel(t, "category", row.id)}
										{tagged && <span className="tag">{t("hub.closestLabel")}</span>}
									</h3>
									<span className="ledger-groups">
										{row.groups.map((g) => seedLabel(t, "group", g)).join(" · ")}
									</span>
								</span>
								<span className="ledger-left">{status}</span>
								<span className="ledger-frac" aria-hidden="true">
									{row.done}
									<em> / {row.total}</em>
								</span>
								<span className="visually-hidden">
									{t("hub.foundCount", { done: row.done, total: row.total })}
								</span>
								<Chev />
							</a>
						</li>
					)
				})}
			</ul>
		</section>
	)
}
