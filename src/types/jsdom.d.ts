// jsdom ships no types, and @types/jsdom would be a new dependency. The markup tests use only this.
declare module "jsdom" {
	/** Swallows the page's console output; the privacy page's axe harness passes a fresh one. */
	export class VirtualConsole {}

	export class JSDOM {
		constructor(
			html?: string,
			options?: { runScripts?: "outside-only" | "dangerously"; virtualConsole?: VirtualConsole }
		)
		readonly window: Window & typeof globalThis
	}
}
