// Renders an .astro component through Astro's Container API and parses the HTML. Call it from
// node-environment tests only: under jsdom, Vitest compiles .astro files for the browser and the
// container finds no renderer. React's server renderer is registered for components that render
// a React component without a client directive (the Dex cards' BookIcon); pages with islands need
// the client renderer too and build their own container (tracker-page.test.ts).
import reactRenderer from "@astrojs/react/server.js"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"

type RenderArgs = Parameters<AstroContainer["renderToString"]>

let container: Promise<AstroContainer> | undefined

async function create(): Promise<AstroContainer> {
	const created = await AstroContainer.create()
	created.addServerRenderer({ renderer: reactRenderer })
	return created
}

export async function renderDoc(
	component: RenderArgs[0],
	options?: RenderArgs[1]
): Promise<Document> {
	container ??= create()
	return new JSDOM(await (await container).renderToString(component, options)).window.document
}
