// Sätteri mdast plugin (locale spec §5.4). Guides write {price:<id>}; this swaps each token for the
// price from src/model/prices.ts, formatted for the guide's language by the vendored i18n library.
// It only replaces text nodes with text nodes, so a price stays plain text whatever Intl returns.
import { fileURLToPath } from "node:url"
import { createTranslator } from "../src/lib/i18n/index.js"
import { prices } from "../src/model/prices.ts"

const TOKEN = /\{price:([a-z0-9-]+)\}/g
const FOLDER = /[\\/]content[\\/]guides[\\/]([^\\/]+)[\\/]/

/** @param {{ locales: string[] }} options The configured locale tags, default first. */
export default function pricePlugin({ locales }) {
	const i18n = createTranslator(Object.fromEntries(locales.map((tag) => [tag, {}])), {
		fallback: locales[0],
	})

	// Called once per file; returning null skips files without a token.
	return (file) =>
		file.source.includes("{price:")
			? {
					name: "rookdex-price",
					text(node, ctx) {
						if (!node.value.includes("{price:")) return
						const path = ctx.fileURL ? fileURLToPath(ctx.fileURL) : ""
						const folder = FOLDER.exec(path)?.[1]
						if (!folder || !locales.includes(folder)) {
							throw new Error(
								`{price:…} is only allowed in a guide's locale folder; found in "${path}"`
							)
						}
						const lang = i18n.resolveLang(folder)
						const value = node.value.replace(TOKEN, (_match, id) => {
							if (!Object.hasOwn(prices, id)) {
								throw new Error(
									`Unknown price id "${id}" in ${path}; add it to src/model/prices.ts`
								)
							}
							const { amount, currency } = prices[id]
							return i18n.money(lang, amount, currency, { stripWhole: true })
						})
						// An id TOKEN doesn't match (capital, space, underscore) would otherwise ship as raw text.
						if (value.includes("{price:")) {
							throw new Error(
								`{price:…} token is malformed in ${path}; ids are lowercase letters, digits and hyphens`
							)
						}
						ctx.replaceNode(node, { type: "text", value })
					},
				}
			: null
}
