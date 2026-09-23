// Renders an .astro component through Astro's Container API and parses the HTML. Call it from
// node-environment tests only: under jsdom, Vitest compiles .astro files for the browser and the
// container finds no renderer.
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"

type RenderArgs = Parameters<AstroContainer["renderToString"]>

let container: AstroContainer | undefined

export async function renderDoc(
	component: RenderArgs[0],
	options?: RenderArgs[1]
): Promise<Document> {
	container ??= await AstroContainer.create()
	return new JSDOM(await container.renderToString(component, options)).window.document
}
