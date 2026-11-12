// Item reports go to a public GitHub issue form (.github/ISSUE_TEMPLATE/item-report.yml), not to email.
// The form's `item` field id matches the query key, so GitHub fills it in.

const ISSUE_FORM = "https://github.com/rookdex/rookdex/issues/new"

/** The prefilled issue form for one tracker item. */
export function itemReportUrl(item: { id: string; name: string }): string {
	const params = new URLSearchParams({
		template: "item-report.yml",
		title: `Item report: ${item.name}`,
		item: item.id,
	})
	return `${ISSUE_FORM}?${params}`
}
