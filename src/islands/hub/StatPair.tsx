import type { Locale, Translate } from "../../i18n"
import type { Count } from "../../model/stats"

interface Props {
	locale: Locale
	overall: Count
	/** The closest category's count and label; undefined once everything is found. */
	closest: (Count & { label: string }) | undefined
	t: Translate
}

/** Whole percent rounded down, so a tile never says 100 % before the last find. */
export function share(count: Count): number {
	return count.total === 0 ? 0 : Math.floor((count.done * 100) / count.total) / 100
}

/** The big pair: Overall and Closest, each number with its label in text (spec §4, §9). */
export function StatPair({ locale, overall, closest, t }: Props) {
	const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 })
	return (
		<dl className="stat-pair">
			<div className="stat-tile">
				<dt>{t("hub.overall")}</dt>
				<dd>{percent.format(share(overall))}</dd>
			</div>
			<div className="stat-tile">
				<dt>{closest ? t("hub.closest", { category: closest.label }) : t("hub.allFound")}</dt>
				<dd>{percent.format(closest ? share(closest) : 1)}</dd>
			</div>
		</dl>
	)
}
