import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { guideSchema } from "./model/guides"

// Entry ids follow the file path: "en/before-you-start", "no/before-you-start".
const guides = defineCollection({
	loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
	schema: guideSchema,
})

export const collections = { guides }
