import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

// Entry ids follow the file path: "en/before-you-start", "no/before-you-start".
const guides = defineCollection({
	loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		updated: z.coerce.date(),
		sources: z.array(z.string().url()).default([]),
	}),
})

export const collections = { guides }
