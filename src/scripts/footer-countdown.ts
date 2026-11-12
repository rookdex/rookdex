// The footer's launch chip (feedback spec §6). The page ships the launch date; this swaps in the
// live state at load and again at each local midnight until launch. The templates come from data attributes, so no copy is bundled here,
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

/** The next midnight on this device's clock. `new Date(y, m, d + 1)` also handles daylight saving. */
function nextMidnight(now: Date): Date {
	return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

/**
 * Writes the chip's text now and again at each local midnight, so a page left open overnight
 * never shows yesterday's count. One timeout per day, not an interval. A sleeping device can
 * hold the timeout past midnight, so the chip also catches up when the tab is shown again.
 * Everything stops once the chip says "Out now". Returns a function that stops it early.
 */
export function wireFooterStatus(chip: HTMLElement): () => void {
	const text = chip.querySelector<HTMLElement>("[data-status-text]")
	const { one, other, out } = chip.dataset
	if (!text || !one || !other || !out) return () => {}
	const label = text
	const templates = { one, other, out }
	const doc = chip.ownerDocument
	const lang = doc.documentElement.lang || "en"
	let timer: ReturnType<typeof setTimeout> | undefined

	const stop = () => {
		clearTimeout(timer)
		doc.removeEventListener("visibilitychange", update)
	}
	function update() {
		clearTimeout(timer)
		const now = new Date()
		label.textContent = footerStatus(now, templates, lang)
		if (hubPhase(now) === "after") {
			stop()
			return
		}
		timer = setTimeout(update, nextMidnight(now).getTime() - now.getTime())
	}

	doc.addEventListener("visibilitychange", update)
	update()
	return stop
}
