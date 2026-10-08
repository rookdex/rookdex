// Every price Rookdex shows, as a number (locale spec §5.1). Copy never carries a price: the hub
// passes these to translator().money(), and guides write {price:<id>} (integrations/markdown-price.mjs).
// After changing a price, build with `npx astro build --force`: the content cache doesn't see this file.
export interface Price {
	readonly amount: number
	/** ISO 4217. */
	readonly currency: string
}

export const prices = {
	standard: { amount: 949, currency: "NOK" },
	ultimate: { amount: 1189, currency: "NOK" },
} as const satisfies Record<string, Price>
