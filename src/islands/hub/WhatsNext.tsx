import { Fragment, type ReactNode, type RefObject, useEffect, useRef, useState } from "react"
import type { Translate } from "../../i18n"
import type { SeedItem } from "../../model/schema"

/** How long the ticked row takes to slide out (spec §6.1 step 4). */
export const LEAVE_MS = 200
/** Ticks are ignored while one is in flight and this long after it lands (spec §6.1 step 1). */
export const LOCK_MS = 400

export const nextBoxId = (itemId: string) => `next-${itemId}`

/** One titled group of rows. */
export interface ShownGroup {
	category: string
	title: string
	items: SeedItem[]
}

interface Props {
	/** Up to three unfound items in at most two titled groups, fresh from the model. */
	groups: ShownGroup[]
	disabled: boolean
	/** Resolves true when the tick was saved. */
	onTick: (id: string) => Promise<boolean>
	t: Translate
	/** The section; the Undo toast inside it pauses while focus is in here. */
	zoneRef: RefObject<HTMLElement | null>
	headingRef: RefObject<HTMLHeadingElement | null>
	/** The Undo toast, straight after the list, so Tab from the last row reaches it. */
	children?: ReactNode
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function WhatsNext({ groups, disabled, onTick, t, zoneRef, headingRef, children }: Props) {
	// While a tick is saving and sliding out, the groups on screen stay as they were.
	const [held, setHeld] = useState<ShownGroup[] | null>(null)
	const [pending, setPending] = useState<string | null>(null)
	const [leaving, setLeaving] = useState<string | null>(null)
	const [entering, setEntering] = useState<string | null>(null)
	const busy = useRef(false)
	const focusAt = useRef<number | null>(null)
	const live = groups.flatMap((g) => g.items)
	const shown = useRef(live.map((item) => item.id))
	const showing = held ?? groups
	const rows = showing.flatMap((g) => g.items)

	async function tick(id: string, index: number) {
		if (busy.current) return
		busy.current = true
		setHeld(groups)
		setPending(id)
		const saved = await onTick(id)
		setPending(null)
		if (!saved) {
			setHeld(null)
			busy.current = false
			return
		}
		const still = reducedMotion()
		if (!still) {
			setLeaving(id)
			await wait(LEAVE_MS)
			setLeaving(null)
		}
		focusAt.current = index
		setHeld(null)
		await wait(still ? LOCK_MS : LOCK_MS - LEAVE_MS)
		busy.current = false
	}

	// A row slides in only when it is the one new row on screen (after a tick, the row that
	// filled the gap). When more than one row is new at once, as on most profile switches, none
	// slides.
	useEffect(() => {
		if (held) return
		const ids = groups.flatMap((g) => g.items.map((item) => item.id))
		const fresh = ids.filter((id) => !shown.current.includes(id))
		shown.current = ids
		if (fresh.length === 1 && !reducedMotion()) setEntering(fresh[0])
	}, [groups, held])

	// After a tick: the row now in the ticked one's place, else the last row, else the heading.
	useEffect(() => {
		if (held || focusAt.current === null) return
		const index = focusAt.current
		focusAt.current = null
		const boxes = zoneRef.current?.querySelectorAll<HTMLInputElement>(".next-list input")
		const target = boxes?.[Math.min(index, boxes.length - 1)]
		if (target) target.focus()
		else headingRef.current?.focus()
	}, [held, zoneRef, headingRef])

	return (
		<section className="whats-next" aria-labelledby="next-heading" ref={zoneRef}>
			<h2 id="next-heading" ref={headingRef} tabIndex={-1}>
				{t("hub.whatsNext")}
			</h2>
			{rows.length === 0 ? (
				<p className="next-done">{t("hub.everythingFound")}</p>
			) : (
				<div className="next-groups">
					{showing.map((group, groupIndex) => {
						// Each row's place in the flat list, so focus after a tick can cross groups.
						const offset = showing
							.slice(0, groupIndex)
							.reduce((sum, earlier) => sum + earlier.items.length, 0)
						return (
							<Fragment key={group.category}>
								<h3 id={`next-group-${group.category}`} className="next-group">
									{group.title}
								</h3>
								<ul className="next-list" aria-labelledby={`next-group-${group.category}`}>
									{group.items.map((item, index) => (
										<li
											key={item.id}
											className="next-row"
											data-leaving={item.id === leaving || undefined}
											data-entering={item.id === entering || undefined}
											onAnimationEnd={() => setEntering(null)}
										>
											<input
												id={nextBoxId(item.id)}
												type="checkbox"
												checked={item.id === pending || item.id === leaving}
												disabled={disabled}
												onChange={() => tick(item.id, offset + index)}
											/>
											<label htmlFor={nextBoxId(item.id)}>{item.name}</label>
										</li>
									))}
								</ul>
							</Fragment>
						)
					})}
				</div>
			)}
			{children}
		</section>
	)
}
