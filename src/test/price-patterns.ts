// Price strings that must never sit in copy (locale spec §5.5). A price is a number from
// src/model/prices.ts, formatted at render. Both orders are caught: "949 kr" and "NOK 949".
const CURRENCY = String.raw`(?:kr(?:oner)?\.?(?![a-zæøå])|(?:NOK|SEK|DKK|EUR|USD|GBP)(?![a-zæøå])|[€$£])`
// A plain space, a no-break space or a narrow no-break space, as Intl writes them.
const GAP = String.raw`[\s\u00a0\u202f]*`

export const PRICE_PATTERNS = [
	new RegExp(String.raw`\d${GAP}${CURRENCY}`, "i"),
	new RegExp(String.raw`${CURRENCY}${GAP}\d`, "i"),
	// "949,-", the Norwegian whole-krone form.
	/\d,[-–]/,
]

export function hasPrice(text: string): boolean {
	return PRICE_PATTERNS.some((pattern) => pattern.test(text))
}
