// Build only: the shipped seed's delivery files (spec §5, data delivery plan). It imports
// seedDelivery.ts and so node:crypto, which is why it is its own file: seed.ts stays free of Node
// code. The chunk endpoint, SeedIndex.astro and the tests import from here. The browser never does
// (src/test/island-imports.test.ts).
import { seedCategories, seedGroups, seedItems } from "./seed"
import { buildChunks, buildIndex, buildIndexFile } from "./seedDelivery"

/** Card text per category, served as /data/<category>.<hash>.json (src/pages/data/[chunk].json.ts). */
export const seedChunks = buildChunks(seedItems)
/** The index the tracker and hub islands fetch. */
export const seedIndex = buildIndex(
	{ categories: seedCategories, groups: seedGroups, items: seedItems },
	seedChunks
)
/** seedIndex as /data/seed-index.<hash>.json. The pages carry only its URL (SeedIndex.astro). */
export const seedIndexFile = buildIndexFile(seedIndex)
