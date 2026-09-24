// jsdom ships no types, and @types/jsdom would be a new dependency. The markup tests use only this.
declare module "jsdom" {
	export class JSDOM {
		constructor(html?: string)
		readonly window: Window & typeof globalThis
	}
}
