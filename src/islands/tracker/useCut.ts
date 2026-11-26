import { type RefObject, useEffect, useState } from "react"

/**
 * A card counts as near from one screen above the viewport to one screen below it, so it has its
 * chevron before it scrolls in.
 */
const NEAR_MARGIN = "100% 0px"

/** Every watched description with its measure. */
const measures = new Map<Element, () => void>()
/** The watched descriptions near the screen: the only ones measured and followed for size. */
const near = new Set<Element>()
let watching: { nearness: IntersectionObserver; sizes: ResizeObserver } | undefined

const measure = (desc: Element) => measures.get(desc)?.()

/**
 * One observer of each kind for every card. Both call back after the browser has laid the page
 * out, so reading a height there costs no extra layout.
 */
function startWatching(): NonNullable<typeof watching> {
	const sizes = new ResizeObserver((entries) => {
		for (const entry of entries) measure(entry.target)
	})
	let fontsFollowed = false
	const nearness = new IntersectionObserver(
		(entries) => {
			// From the first report, when the page is laid out, so asking for the fonts is free.
			if (!fontsFollowed) followFonts(sizes)
			fontsFollowed = true
			for (const { target, isIntersecting } of entries) {
				// An entry queued before its card was removed still arrives.
				if (!measures.has(target)) continue
				if (isIntersecting) {
					near.add(target)
					sizes.observe(target)
					measure(target)
				} else {
					near.delete(target)
					sizes.unobserve(target)
				}
			}
		},
		{ rootMargin: NEAR_MARGIN }
	)
	return { nearness, sizes }
}

/**
 * A loaded web font can rewrap the text inside a box that keeps its size. Reading the heights right
 * then would force a layout of the whole page, so the size observer is asked to report the near
 * cards again; it does so after the next layout. `ready` covers the fonts loading now in every
 * browser, `loadingdone` a face that loads later. Reading `ready` forces a layout too, which is why
 * this waits for the first scroll report.
 */
function followFonts(sizes: ResizeObserver): void {
	const reportNear = () => {
		for (const desc of near) {
			sizes.unobserve(desc)
			sizes.observe(desc)
		}
	}
	document.fonts?.ready.then(reportNear)
	document.fonts?.addEventListener("loadingdone", reportNear)
}

/** Runs `onMeasure` while `desc` is near the screen. Returns the function that stops it. */
function watch(desc: Element, onMeasure: () => void): () => void {
	// A browser without the observers measures once, on mount. It has no popovers either, so the
	// stylesheet hides the chevron there anyway.
	if (typeof IntersectionObserver === "undefined" || typeof ResizeObserver === "undefined") {
		onMeasure()
		return () => {}
	}
	measures.set(desc, onMeasure)
	watching ??= startWatching()
	const { nearness, sizes } = watching
	nearness.observe(desc)
	return () => {
		measures.delete(desc)
		near.delete(desc)
		nearness.unobserve(desc)
		sizes.unobserve(desc)
	}
}

/**
 * Whether the two-line clamp cuts the description. Measured only while the card is near the screen:
 * when it comes near, when its paragraph resizes (width, 200 % text) and when a web font has
 * loaded. A card far away keeps its last answer. Measuring every card on load, and adding a
 * chevron and a panel to most of them in the same pass, blocked the page for about 0.3 s longer in
 * Lighthouse's slow-phone run and put the tracker under its 0.9 performance floor.
 */
export function useCut(ref: RefObject<HTMLElement | null>, text: string | undefined): boolean {
	const [cut, setCut] = useState(false)
	useEffect(() => {
		const desc = ref.current
		if (!desc || !text) {
			setCut(false)
			return
		}
		return watch(desc, () => setCut(desc.scrollHeight > desc.clientHeight + 1))
	}, [ref, text])
	return cut
}
