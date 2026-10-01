// The footer's launch chip (feedback spec §6). The page ships the launch date; this swaps in the
// live state once, at load. The templates come from data attributes, so no copy is bundled here.
import { daysToGo, hubPhase } from "../model/launch"

export interface StatusTemplates {
	days: string
	oneDay: string
	out: string
}

export function footerStatus(now: Date, templates: StatusTemplates): string {
	if (hubPhase(now) === "after") return templates.out
	const n = daysToGo(now)
	return (n === 1 ? templates.oneDay : templates.days).replace("{n}", String(n))
}

export function wireFooterStatus(chip: HTMLElement, now: Date): void {
	const text = chip.querySelector<HTMLElement>("[data-status-text]")
	const { days, oneDay, out } = chip.dataset
	if (!text || !days || !oneDay || !out) return
	text.textContent = footerStatus(now, { days, oneDay, out })
}
