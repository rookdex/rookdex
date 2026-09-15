import "@testing-library/jest-dom/vitest"
import { afterEach, expect, vi } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"

// vitest-axe still augments Vitest's removed `Vi` namespace, so the matcher is declared here instead.
declare module "vitest" {
	// biome-ignore lint/suspicious/noExplicitAny: must match `interface Matchers<T = any>` in @vitest/expect.
	interface Matchers<T = any> {
		toHaveNoViolations(): T
	}
}

expect.extend(axeMatchers)

// jsdom has no matchMedia and no <dialog> methods; stub the parts the islands call.
if (typeof window !== "undefined") {
	// Testing Library only auto-cleans with `globals: true`, which this project does not use.
	const { cleanup } = await import("@testing-library/react")
	afterEach(cleanup)

	window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(() => false),
	}))

	HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
		this.setAttribute("open", "")
	}
	HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
		this.removeAttribute("open")
		this.dispatchEvent(new Event("close"))
	}

	// Node 26 owns a global `localStorage` that stays undefined without --localstorage-file, and it
	// shadows jsdom's. An in-memory Storage keeps the "remember the dismissal" tests honest.
	if (!globalThis.localStorage) {
		const store = new Map<string, string>()
		const storage: Storage = {
			get length() {
				return store.size
			},
			key: (index: number) => [...store.keys()][index] ?? null,
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, String(value))
			},
			removeItem: (key: string) => {
				store.delete(key)
			},
			clear: () => {
				store.clear()
			},
		}
		Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
	}
}
