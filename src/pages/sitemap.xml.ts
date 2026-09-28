import { getCollection } from "astro:content"
import { getAbsoluteLocaleUrl } from "astro:i18n"
import { locales } from "../i18n"
import { guideSlugs } from "../model/guides"
import { indexablePaths, sitemapXml } from "../model/seo"

// Prerendered to dist/sitemap.xml. The host serves it as XML from the extension; a static
// endpoint's response headers are dropped at build (SEO spec §4.2).
export async function GET() {
	const paths = indexablePaths(guideSlugs(await getCollection("guides")))
	const urls = locales.flatMap((locale) => paths.map((path) => getAbsoluteLocaleUrl(locale, path)))
	return new Response(sitemapXml(urls))
}
