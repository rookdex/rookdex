import type { Translate, Translator } from "../../i18n"

interface Props {
	/** No finds at all on this profile: the first half is the before-you-start link instead. */
	newcomer: boolean
	foundToday: number
	daysSince: number
	guideHref: string
	t: Translate
	plural: Translator["plural"]
}

/** "N found today · Day N since launch". The newcomer link takes the same slot, so it never shifts. */
export function StatStrip({ newcomer, foundToday, daysSince, guideHref, t, plural }: Props) {
	return (
		<p className="stat-strip">
			<span className="stat-strip-first">
				{newcomer ? (
					<a className="go-link" href={guideHref}>
						{t("hub.newHere")}
					</a>
				) : (
					plural("hub.foundToday", foundToday)
				)}
			</span>
			<span aria-hidden="true">·</span>
			<span>{t("hub.daySince", { n: daysSince })}</span>
		</p>
	)
}
