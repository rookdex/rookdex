// The "new version is ready" notice (feedback spec §10.3). The new service worker waits; this
// shows the notice, sends SKIP_WAITING on Reload and reloads every open tab once when the new
// version takes over. Everything the browser owns comes in through `env`, so it is testable.

export const LATER_KEY = "rookdex.update-later"
/** The card's gap to the tab bar or the screen edge, added to its height for scroll padding. */
const GAP = 16

export interface WorkerLike extends EventTarget {
	readonly state: string
	postMessage(message: unknown): void
}

export interface UpdateEnv {
	container: EventTarget & { readonly controller: unknown }
	registration: EventTarget & {
		readonly waiting: WorkerLike | null
		readonly installing: WorkerLike | null
		readonly active: unknown
	}
	storage: () => Pick<Storage, "getItem" | "setItem"> | undefined
	reload: () => void
	defer: (task: () => void) => void
}

export function wireUpdateNotice(doc: Document, env: UpdateEnv): void {
	const card = doc.querySelector<HTMLElement>("[data-update-notice]")
	const live = doc.querySelector<HTMLElement>("[data-update-status]")
	const reloadButton = card?.querySelector<HTMLButtonElement>("[data-update-reload]")
	const laterButton = card?.querySelector<HTMLButtonElement>("[data-update-later]")
	if (!card || !live || !reloadButton || !laterButton) return
	const root = doc.documentElement

	// A first install's clients.claim() also fires controllerchange; only a change after the page
	// already had a controller is an update. This covers a tab kept open from the first install.
	// A hard reload leaves a page without a controller while a worker is active; that page reloads too.
	let hadController = Boolean(env.container.controller || env.registration.active)
	let reloading = false
	const reloadOnce = () => {
		if (reloading) return
		reloading = true
		env.reload()
	}
	env.container.addEventListener("controllerchange", () => {
		if (!hadController) {
			hadController = true
			return
		}
		reloadOnce()
	})

	const laterChosen = () => {
		try {
			return env.storage()?.getItem(LATER_KEY) === "1"
		} catch {
			return false
		}
	}

	// Re-measured on resize: a rotated phone can wrap the card taller than it first was.
	const measure = () => root.style.setProperty("--notice-h", `${card.offsetHeight + GAP}px`)

	const show = () => {
		if (!env.container.controller || laterChosen() || !card.hidden) return
		card.hidden = false
		measure()
		// Filled on the next task, once the region is known to be in the tree, so it is announced
		// once. Showing never moves focus.
		env.defer(() => {
			live.textContent = card.dataset.text ?? ""
		})
	}

	const hide = () => {
		card.hidden = true
		live.textContent = ""
		root.style.removeProperty("--notice-h")
	}

	const watch = (worker: WorkerLike) => {
		worker.addEventListener("statechange", () => {
			if (worker.state === "installed") show()
		})
	}

	if (env.registration.waiting) show()
	// register() resolves after load, so updatefound may already have fired for this worker.
	if (env.registration.installing) watch(env.registration.installing)
	env.registration.addEventListener("updatefound", () => {
		if (env.registration.installing) watch(env.registration.installing)
	})
	doc.defaultView?.addEventListener("resize", () => {
		if (!card.hidden) measure()
	})

	reloadButton.addEventListener("click", () => {
		// Read now: a newer deploy may have replaced the worker the notice first saw.
		const waiting = env.registration.waiting
		if (waiting) waiting.postMessage({ type: "SKIP_WAITING" })
		else reloadOnce()
	})

	// Hiding the focused Later button would drop focus on <body>. Focus goes back to where it was
	// before it entered the card.
	let returnTo: HTMLElement | null = null
	doc.addEventListener("focusin", (event) => {
		const target = event.target as HTMLElement
		if (!card.contains(target)) returnTo = target
	})

	laterButton.addEventListener("click", () => {
		const hadFocus = card.contains(doc.activeElement)
		hide()
		if (hadFocus && returnTo?.isConnected) returnTo.focus()
		try {
			env.storage()?.setItem(LATER_KEY, "1")
		} catch {
			// Blocked storage: the notice can come back on the next page.
		}
	})
}
