// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LATER_KEY, type UpdateEnv, type WorkerLike, wireUpdateNotice } from "./update-notice"

class FakeWorker extends EventTarget implements WorkerLike {
	state = "installing"
	postMessage = vi.fn()
	become(state: string) {
		this.state = state
		this.dispatchEvent(new Event("statechange"))
	}
}

class FakeRegistration extends EventTarget {
	waiting: FakeWorker | null = null
	installing: FakeWorker | null = null
	active: object | null = null
}

class FakeContainer extends EventTarget {
	controller: object | null = null
}

function memoryStorage() {
	const map = new Map<string, string>()
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value)
		},
	}
}

function setup(options: {
	controller?: boolean
	waiting?: boolean
	installing?: boolean
	active?: boolean
	storage?: UpdateEnv["storage"]
	/** Runs after the markup exists and before the script wires, for state the page already had. */
	beforeWire?: () => void
}) {
	document.body.innerHTML = `
		<button id="field">field</button>
		<div data-update-notice data-text="A new version is ready" hidden>
			<p>A new version is ready</p>
			<button type="button" data-update-reload>Reload</button>
			<button type="button" data-update-later>Later</button>
		</div>
		<p role="status" data-update-status></p>`
	document.documentElement.style.removeProperty("--notice-h")
	const container = new FakeContainer()
	container.controller = options.controller === false ? null : {}
	const registration = new FakeRegistration()
	if (options.waiting) registration.waiting = new FakeWorker()
	if (options.installing) registration.installing = new FakeWorker()
	if (options.active) registration.active = {}
	const reload = vi.fn()
	const deferred: (() => void)[] = []
	const store = memoryStorage()
	options.beforeWire?.()
	wireUpdateNotice(document, {
		container,
		registration,
		storage: options.storage ?? (() => store),
		reload,
		defer: (task) => deferred.push(task),
	})
	const card = document.querySelector<HTMLElement>("[data-update-notice]") as HTMLElement
	const live = document.querySelector<HTMLElement>("[data-update-status]") as HTMLElement
	const flush = () => {
		for (const task of deferred.splice(0)) task()
	}
	const click = (selector: string) =>
		(document.querySelector(selector) as HTMLButtonElement).click()
	return { container, registration, reload, card, live, flush, click, store }
}

beforeEach(() => {
	vi.restoreAllMocks()
})

describe("update notice (feedback spec §10.3)", () => {
	it("never shows on a first visit, when no worker controls the page", () => {
		const { card } = setup({ controller: false, waiting: true })
		expect(card.hidden).toBe(true)
	})

	it("shows for a worker already waiting, and announces on the next task", () => {
		const { card, live, flush } = setup({ waiting: true })
		expect(card.hidden).toBe(false)
		expect(live.textContent).toBe("")
		flush()
		expect(live.textContent).toBe("A new version is ready")
	})

	it("shows when a worker that was installing at startup finishes", () => {
		const { card, registration } = setup({ installing: true })
		expect(card.hidden).toBe(true)
		registration.installing?.become("installed")
		expect(card.hidden).toBe(false)
	})

	it("shows when an update is found later", () => {
		const { card, registration } = setup({})
		const worker = new FakeWorker()
		registration.installing = worker
		registration.dispatchEvent(new Event("updatefound"))
		worker.become("installed")
		expect(card.hidden).toBe(false)
	})

	it("never moves focus when it appears", () => {
		const field = () => document.getElementById("field") as HTMLElement
		const { registration } = setup({ installing: true })
		field().focus()
		registration.installing?.become("installed")
		expect(document.activeElement).toBe(field())
	})

	it("posts SKIP_WAITING to the worker waiting at click time, not the one it first saw", () => {
		const { registration, click } = setup({ waiting: true })
		const first = registration.waiting as FakeWorker
		const newer = new FakeWorker()
		registration.waiting = newer
		click("[data-update-reload]")
		expect(newer.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
		expect(first.postMessage).not.toHaveBeenCalled()
	})

	it("reloads at once when another tab already switched", () => {
		const { registration, click, reload } = setup({ waiting: true })
		registration.waiting = null
		click("[data-update-reload]")
		expect(reload).toHaveBeenCalledOnce()
	})

	it("reloads once when the new version takes over", () => {
		const { container, reload } = setup({ waiting: true })
		container.dispatchEvent(new Event("controllerchange"))
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("treats the first install's claim as no update, then reloads on the next change", () => {
		const { container, reload } = setup({ controller: false })
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).not.toHaveBeenCalled()
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("hides on Later for the rest of the tab's session", () => {
		const first = setup({ waiting: true })
		first.flush()
		first.click("[data-update-later]")
		expect(first.card.hidden).toBe(true)
		expect(first.live.textContent).toBe("")
		expect(first.store.getItem(LATER_KEY)).toBe("1")
		const storage = () => first.store
		const again = setup({ waiting: true, storage })
		expect(again.card.hidden).toBe(true)
	})

	it("survives blocked storage: Later still hides, and the notice can return", () => {
		const blocked = () => {
			throw new DOMException("blocked", "SecurityError")
		}
		const first = setup({ waiting: true, storage: blocked })
		expect(first.card.hidden).toBe(false)
		first.click("[data-update-later]")
		expect(first.card.hidden).toBe(true)
		expect(setup({ waiting: true, storage: blocked }).card.hidden).toBe(false)
	})

	it("sends focus back to where it was when Later hides the card", () => {
		setup({ waiting: true })
		const field = document.getElementById("field") as HTMLElement
		const later = document.querySelector<HTMLElement>("[data-update-later]") as HTMLElement
		field.focus()
		later.focus()
		later.click()
		expect(document.activeElement).toBe(field)
	})

	it("sends focus back to a control that already had it when the script wired", () => {
		setup({
			waiting: true,
			beforeWire: () => (document.getElementById("field") as HTMLElement).focus(),
		})
		const field = document.getElementById("field") as HTMLElement
		const later = document.querySelector<HTMLElement>("[data-update-later]") as HTMLElement
		later.focus()
		later.click()
		expect(document.activeElement).toBe(field)
	})

	it("reloads a hard-reloaded tab (no controller, an active worker) when the update takes over", () => {
		const { container, reload } = setup({ controller: false, active: true })
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("sets --notice-h while visible and clears it when hidden (WCAG 2.4.11)", () => {
		const { click } = setup({ waiting: true })
		const root = document.documentElement
		expect(root.style.getPropertyValue("--notice-h")).toMatch(/^\d+px$/)
		click("[data-update-later]")
		expect(root.style.getPropertyValue("--notice-h")).toBe("")
	})
})
