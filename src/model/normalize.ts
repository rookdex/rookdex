// Text folding shared by search and the seed build. A leaf module, so seedBuild.ts can use it
// without importing search.ts, which imports stats.ts, which imports seed.ts.

/** NFD with combining marks removed, lowercase, trimmed, inner whitespace collapsed. ø and æ
 *  are letters, not accents, so they stay. */
export function normalize(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")
}
