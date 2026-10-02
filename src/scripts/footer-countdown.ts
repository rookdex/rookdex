// The footer's launch chip (feedback spec §6). The page ships the launch date; this swaps in the
// live state once, at load. The templates come from data attributes, so no copy is bundled here,
// which is why the choice between them uses Intl.PluralRules directly (the rule the i18n library's
// plural() uses) instead of importing the bundles.
import { daysToGo, hubPhase } from "../model/launch"

export interface StatusTemplates {
	one: string
	other: string
	out: string
}

export function footerStatus(now: Date, templates: StatusTemplates, lang: string): string {
	if (hubPhase(now) === "after") return templates.out
	const count = daysToGo(now)
	const form = new Intl.PluralRules(lang).select(count) === "one" ? templates.one : templates.other
	return form.replace("{count}", String(count))
}

export function wireFooterStatus(chip: HTMLElement, now: Date): void {
	const text = chip.querySelector<HTMLElement>("[data-status-text]")
	const { one, other, out } = chip.dataset
	if (!text || !one || !other || !out) return
	const lang = chip.ownerDocument.documentElement.lang || "en"
	text.textContent = footerStatus(now, { one, other, out }, lang)
}
