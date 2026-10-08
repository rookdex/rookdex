// The project's currencies (locale standard §8), shaped like the React scaffold's config. One
// currency, so no currency picker. Languages are not configured here: the bundles in src/locales/
// are the language list.
export interface PreferencesConfig {
	/** ISO 4217 codes the project has prices for. One entry hides the currency picker. */
	readonly currencies: readonly string[]
	/** Used when no navigator.languages entry carries a mapped region. */
	readonly baseCurrency: string
	/** ISO 3166 region to currency. Every value is in `currencies`. */
	readonly regionCurrency: Readonly<Record<string, string>>
}

export const PREFERENCES: PreferencesConfig = {
	currencies: ["NOK"],
	baseCurrency: "NOK",
	regionCurrency: { NO: "NOK" },
}
