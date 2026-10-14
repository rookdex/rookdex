import { type KeyboardEvent, type RefObject, useEffect, useId, useRef, useState } from "react"
import type { Translate } from "../../i18n"
import type { Profile } from "../../model/schema"

interface Props {
	profiles: Profile[]
	current: Profile | undefined
	onSwitch: (id: string) => void
	// The actions are optional: the hub shows the menu in switch mode with none of them
	// (dashboard spec §4). Each one given becomes a menu item.
	onNew?: () => void
	onRename?: () => void
	onExport?: () => void
	onImport?: () => void
	onDelete?: () => void
	onDeleted?: () => void
	/** Adds a "Manage profiles" link under the profiles; the hub points it at the tracker. */
	manageHref?: string
	t: Translate
	/** The parent may own the trigger ref so a dialog opened from the menu can return focus to it. */
	triggerRef?: RefObject<HTMLButtonElement | null>
}

const ITEMS = '[role^="menuitem"]'

/**
 * Menu button (WAI-ARIA pattern): arrows move, Escape closes and returns focus to the trigger,
 * Tab closes and returns focus to the trigger too, so the browser's own Tab moves on from there
 * instead of from `body` (which would land at the top of the page).
 */
export function ProfileMenu({
	profiles,
	current,
	onSwitch,
	onNew,
	onRename,
	onExport,
	onImport,
	onDelete,
	onDeleted,
	manageHref,
	t,
	triggerRef,
}: Props) {
	const [open, setOpen] = useState(false)
	const ownTrigger = useRef<HTMLButtonElement>(null)
	const trigger = triggerRef ?? ownTrigger
	const menu = useRef<HTMLUListElement>(null)
	const menuId = useId()

	function close() {
		setOpen(false)
		trigger.current?.focus()
	}

	function run(action: () => void) {
		close()
		action()
	}

	useEffect(() => {
		if (!open) return
		menu.current?.querySelector<HTMLElement>(ITEMS)?.focus()
		function onPointerDown(event: PointerEvent) {
			const target = event.target as Node
			if (!menu.current?.contains(target) && !trigger.current?.contains(target)) {
				setOpen(false)
			}
		}
		document.addEventListener("pointerdown", onPointerDown)
		return () => document.removeEventListener("pointerdown", onPointerDown)
	}, [open, trigger])

	function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
		const items = [...(menu.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])]
		const index = items.indexOf(document.activeElement as HTMLElement)
		if (event.key === "Escape") {
			event.preventDefault()
			close()
		} else if (event.key === "ArrowDown") {
			event.preventDefault()
			items[(index + 1) % items.length]?.focus()
		} else if (event.key === "ArrowUp") {
			event.preventDefault()
			items[(index - 1 + items.length) % items.length]?.focus()
		} else if (event.key === "Tab") {
			// Not prevented: focus goes back to the trigger and the browser's Tab moves on from there.
			close()
		}
	}

	const actions = (
		[
			[t("profile.new"), onNew],
			[t("profile.rename"), onRename],
			[t("profile.export"), onExport],
			[t("profile.import"), onImport],
			[t("profile.delete"), onDelete],
			[t("profile.deleted"), onDeleted],
		] as const
	).filter((entry): entry is readonly [string, () => void] => entry[1] !== undefined)
	const hasExtras = actions.length > 0 || manageHref !== undefined

	return (
		<div className="profile-menu">
			<button
				ref={trigger}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen((value) => !value)}
			>
				{t("profile.menu", { name: current?.name ?? "" })}
			</button>
			{open && (
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA menu button pattern; the list is the menu and its buttons are the items.
				<ul ref={menu} id={menuId} className="menu" role="menu" onKeyDown={onKeyDown}>
					{profiles.map((profile) => (
						<li key={profile.id} role="none">
							<button
								type="button"
								role="menuitemradio"
								aria-checked={profile.id === current?.id}
								onClick={() => run(() => onSwitch(profile.id))}
							>
								{profile.name}
							</button>
						</li>
					))}
					{hasExtras && (
						<li role="none">
							<hr />
						</li>
					)}
					{actions.map(([label, action]) => (
						<li key={label} role="none">
							<button type="button" role="menuitem" onClick={() => run(action)}>
								{label}
							</button>
						</li>
					))}
					{manageHref && (
						<li role="none">
							<a role="menuitem" href={manageHref}>
								{t("hub.manageProfiles")}
							</a>
						</li>
					)}
				</ul>
			)}
		</div>
	)
}
