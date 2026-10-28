import { useEffect, useState } from "react"
import type { Locale, Translate } from "../../i18n"
import type { CategoryRow } from "../../model/dashboard"
import type { Count } from "../../model/stats"
import { share } from "./StatPair"

/** Our own sun and stripes in the hero's corner. Clips itself; the tile never clips its text. */
export function HeroArt() {
	return (
		<span className="hero-art" aria-hidden="true">
			<span className="art-sun" />
			<span className="art-stripes" />
		</span>
	)
}

/**
 * One segment per category, sized by its total, filled by its share found. Decorative: the bars
 * below carry the same numbers. Segments render only after mount, because the CSP blocks the
 * style attributes a server render would emit, and new elements inside the fixed-height strip
 * shift nothing.
 */
export function SegmentBar({ rows }: { rows: CategoryRow[] }) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	return (
		<span className="seg" aria-hidden="true">
			{mounted &&
				rows.map((row) => (
					<span key={row.id} className="seg-part" style={{ flexGrow: row.total }}>
						<span className="seg-fill" style={{ width: `${Math.round(share(row) * 100)}%` }} />
					</span>
				))}
		</span>
	)
}

interface Props {
	locale: Locale
	overall: Count
	foundToday: number
	/** The closest category's label; undefined with nothing found or everything found. */
	closestLabel?: string
	rows: CategoryRow[]
	t: Translate
}

/** The after-launch hero (desktop dashboard spec §4.2). The profile chip is placed over it by CSS. */
export function Hero({ locale, overall, foundToday, closestLabel, rows, t }: Props) {
	const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 })
	return (
		<div className="tile hero hero-after">
			<HeroArt />
			{/* The hidden h2 above says the same, so the visible label stays out of the reading order. */}
			<p className="tile-label" aria-hidden="true">
				{t("hub.dashboardHeading")}
			</p>
			<div className="hero-body">
				<p className="hero-count">
					<span className="hero-big">{overall.done}</span>{" "}
					<span className="hero-of">{t("hub.foundOf", { total: overall.total })}</span>
				</p>
				<dl className="hero-meta">
					<div>
						<dt>{t("hub.overall")}</dt>
						<dd>{percent.format(share(overall))}</dd>
					</div>
					<div>
						<dt>{t("hub.foundTodayLabel")}</dt>
						<dd>{foundToday}</dd>
					</div>
					<div>
						<dt>{t("hub.closestLabel")}</dt>
						<dd>{closestLabel ?? "–"}</dd>
					</div>
				</dl>
			</div>
			<SegmentBar rows={rows} />
		</div>
	)
}
