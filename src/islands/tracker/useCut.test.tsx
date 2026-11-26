// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { useCut } from "./useCut"

/** The paragraph ItemRow renders, with the hook's answer on it. */
function Desc({ id, text }: { id: string; text?: string }) {
	const ref = useRef<HTMLParagraphElement>(null)
	const cut = useCut(ref, text)
	return (
		<div data-testid={id} data-cut={cut || undefined}>
			{text && <p ref={ref}>{text}</p>}
		</div>
	)
}

/** jsdom has neither observer. These record what is watched and let a test send the callbacks. */
class FakeIntersectionObserver {
	static made: FakeIntersectionObserver[] = []
	watched = new Set<Element>()
	constructor(
		readonly callback: IntersectionObserverCallback,
		readonly options?: IntersectionObserverInit
	) {
		FakeIntersectionObserver.made.push(this)
	}
	observe(target: Element) {
		this.watched.add(target)
	}
	unobserve(target: Element) {
		this.watched.delete(target)
	}
}

class FakeResizeObserver {
	static made: FakeResizeObserver[] = []
	watched = new Set<Element>()
	/** Newly observed targets: the browser reports each once, after its next layout. */
	unreported = new Set<Element>()
	constructor(readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.made.push(this)
	}
	observe(target: Element) {
		// As in the browser: observing a target that is already watched changes nothing.
		if (!this.watched.has(target)) this.unreported.add(target)
		this.watched.add(target)
	}
	unobserve(target: Element) {
		this.watched.delete(target)
		this.unreported.delete(target)
	}
}

const nearness = () => FakeIntersectionObserver.made[0] as FakeIntersectionObserver
const sizes = () => FakeResizeObserver.made[0] as FakeResizeObserver
const desc = (id: string) => screen.getByTestId(id).querySelector("p") as HTMLParagraphElement

/** jsdom lays nothing out, so a test sets how tall the text is against the two lines shown. */
const reads = new Map<Element, number>()
function setHeights(target: Element, full: number, shown = 42) {
	Object.defineProperty(target, "scrollHeight", {
		configurable: true,
		get() {
			reads.set(target, (reads.get(target) ?? 0) + 1)
			return full
		},
	})
	Object.defineProperty(target, "clientHeight", { configurable: true, value: shown })
}

/** The card scrolls to within a screen of the viewport, or away from it. */
const scroll = (target: Element, near: boolean) =>
	act(() => {
		const entry = { target, isIntersecting: near } as IntersectionObserverEntry
		nearness().callback([entry], nearness() as unknown as IntersectionObserver)
	})

const report = (targets: Element[]) =>
	act(() => {
		const entries = targets.map((target) => ({ target }) as ResizeObserverEntry)
		sizes().callback(entries, sizes() as unknown as ResizeObserver)
	})

const resize = (target: Element) => report([target])

/** The browser lays the page out, and the size observer reports its newly observed targets. */
const layout = () => {
	const targets = [...sizes().unreported]
	sizes().unreported.clear()
	report(targets)
}

/** Resolves `document.fonts.ready`, as the browser does when the first fonts have loaded. */
let fontsReady: () => void
/** How often `document.fonts.ready` was read. The browser lays the whole page out on each read. */
let readyReads = 0

beforeAll(() => {
	// jsdom has no FontFaceSet. The hook reads it once, so it is there before the first mount.
	const ready = new Promise<void>((resolve) => {
		fontsReady = resolve
	})
	const fonts = Object.defineProperty(new EventTarget(), "ready", {
		get() {
			readyReads++
			return ready
		},
	})
	Object.defineProperty(document, "fonts", { configurable: true, value: fonts })
})

beforeEach(() => {
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
	vi.stubGlobal("ResizeObserver", FakeResizeObserver)
})

afterEach(() => {
	vi.unstubAllGlobals()
	reads.clear()
})

describe("useCut", () => {
	// First in the file: the hook asks for the fonts once per page.
	it("asks for the fonts at the first scroll report, not while the cards mount", () => {
		render(<Desc id="card" text="A long description." />)
		expect(readyReads).toBe(0)
		scroll(desc("card"), false)
		scroll(desc("card"), true)
		expect(readyReads).toBe(1)
	})

	it("leaves a card far from the screen unmeasured", () => {
		render(<Desc id="far" text="A long description." />)
		setHeights(desc("far"), 63)
		// The browser reports every card once on load, near or not.
		scroll(desc("far"), false)
		expect(nearness().watched).toContain(desc("far"))
		expect(sizes().watched).not.toContain(desc("far"))
		expect(reads.get(desc("far"))).toBeUndefined()
		expect(screen.getByTestId("far")).not.toHaveAttribute("data-cut")
	})

	it("counts a card as near from one screen above to one screen below", () => {
		render(<Desc id="one" text="A long description." />)
		expect(nearness().options).toEqual({ rootMargin: "100% 0px" })
	})

	it("measures a card when it comes near the screen", () => {
		render(
			<>
				<Desc id="long" text="A long description." />
				<Desc id="short" text="Short." />
			</>
		)
		setHeights(desc("long"), 63)
		setHeights(desc("short"), 21, 21)
		scroll(desc("long"), true)
		scroll(desc("short"), true)
		expect(screen.getByTestId("long")).toHaveAttribute("data-cut")
		expect(screen.getByTestId("short")).not.toHaveAttribute("data-cut")
	})

	it("allows one pixel of rounding before it calls the text cut", () => {
		render(<Desc id="edge" text="Two full lines." />)
		setHeights(desc("edge"), 43)
		scroll(desc("edge"), true)
		expect(screen.getByTestId("edge")).not.toHaveAttribute("data-cut")
	})

	it("measures a near card again when its size changes", () => {
		render(<Desc id="card" text="A long description." />)
		setHeights(desc("card"), 63)
		scroll(desc("card"), true)
		expect(sizes().watched).toContain(desc("card"))
		// A wider window: the text now fits on two lines.
		setHeights(desc("card"), 42)
		resize(desc("card"))
		expect(screen.getByTestId("card")).not.toHaveAttribute("data-cut")
	})

	it("keeps a card's answer when it scrolls away and stops following its size", () => {
		render(<Desc id="card" text="A long description." />)
		setHeights(desc("card"), 63)
		scroll(desc("card"), true)
		scroll(desc("card"), false)
		expect(sizes().watched).not.toContain(desc("card"))
		expect(screen.getByTestId("card")).toHaveAttribute("data-cut")
	})

	it("measures a card again each time it comes back near the screen", () => {
		render(<Desc id="card" text="A long description." />)
		setHeights(desc("card"), 63)
		scroll(desc("card"), true)
		scroll(desc("card"), false)
		setHeights(desc("card"), 42)
		scroll(desc("card"), true)
		expect(screen.getByTestId("card")).not.toHaveAttribute("data-cut")
	})

	it("measures the near cards again when the fonts loading at the start are ready", async () => {
		render(<Desc id="card" text="A long description." />)
		setHeights(desc("card"), 42)
		scroll(desc("card"), true)
		layout()
		// The loaded font is wider: the same text now runs to three lines in the same box.
		setHeights(desc("card"), 63)
		reads.clear()
		await act(async () => {
			fontsReady()
		})
		// Not read at once, which would force a layout of the whole page, but after the next one.
		expect(reads.get(desc("card"))).toBeUndefined()
		layout()
		expect(screen.getByTestId("card")).toHaveAttribute("data-cut")
	})

	it("measures the near cards again once a later web font has loaded, and no others", () => {
		render(
			<>
				<Desc id="near" text="A long description." />
				<Desc id="far" text="A long description." />
			</>
		)
		setHeights(desc("near"), 42)
		setHeights(desc("far"), 63)
		scroll(desc("far"), false)
		scroll(desc("near"), true)
		layout()
		setHeights(desc("near"), 63)
		reads.clear()
		act(() => {
			document.fonts.dispatchEvent(new Event("loadingdone"))
		})
		expect(reads.get(desc("near"))).toBeUndefined()
		layout()
		expect(screen.getByTestId("near")).toHaveAttribute("data-cut")
		expect(reads.get(desc("far"))).toBeUndefined()
	})

	it("shares one observer of each kind between every card", () => {
		render(
			<>
				<Desc id="one" text="A long description." />
				<Desc id="two" text="A long description." />
			</>
		)
		scroll(desc("one"), true)
		scroll(desc("two"), true)
		expect(FakeIntersectionObserver.made).toHaveLength(1)
		expect(FakeResizeObserver.made).toHaveLength(1)
	})

	it("stops watching a card that is removed", () => {
		const { unmount } = render(<Desc id="card" text="A long description." />)
		const gone = desc("card")
		setHeights(gone, 63)
		scroll(gone, true)
		unmount()
		expect(nearness().watched).not.toContain(gone)
		expect(sizes().watched).not.toContain(gone)
		reads.clear()
		act(() => {
			document.fonts.dispatchEvent(new Event("loadingdone"))
		})
		layout()
		expect(sizes().watched).not.toContain(gone)
		expect(reads.get(gone)).toBeUndefined()
	})

	it("ignores a card that was removed before its scroll report arrived", () => {
		const { unmount } = render(<Desc id="card" text="A long description." />)
		const gone = desc("card")
		setHeights(gone, 63)
		unmount()
		scroll(gone, true)
		expect(sizes().watched).not.toContain(gone)
		expect(reads.get(gone)).toBeUndefined()
	})

	it("watches nothing for a card with no description", () => {
		render(
			<>
				<Desc id="card" text="A long description." />
				<Desc id="bare" />
			</>
		)
		expect([...nearness().watched]).toEqual([desc("card")])
		expect(screen.getByTestId("bare")).not.toHaveAttribute("data-cut")
	})

	it("drops the chevron when the description is taken away", () => {
		const { rerender } = render(<Desc id="card" text="A long description." />)
		setHeights(desc("card"), 63)
		scroll(desc("card"), true)
		rerender(<Desc id="card" />)
		expect(screen.getByTestId("card")).not.toHaveAttribute("data-cut")
	})

	it("measures on mount in a browser without the observers", () => {
		vi.unstubAllGlobals()
		Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
			configurable: true,
			get: () => 63,
		})
		try {
			render(<Desc id="old" text="A long description." />)
			expect(screen.getByTestId("old")).toHaveAttribute("data-cut")
		} finally {
			Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight")
		}
	})
})
