import { useRef } from "react"
import { fill, type Strings } from "../../i18n"
import type { Profile } from "../../model/schema"
import { Modal } from "./Modal"

interface Props {
	open: boolean
	profiles: Profile[]
	strings: Strings["profile"]
	onRestore: (id: string) => void
	onClose: () => void
}

export function DeletedDialog({ open, profiles, strings, onRestore, onClose }: Props) {
	const closeButton = useRef<HTMLButtonElement>(null)

	// The restored row disappears with the focused button in it; without this, focus drops to
	// `body` inside the still-open modal.
	function restore(id: string) {
		closeButton.current?.focus()
		onRestore(id)
	}

	return (
		<Modal open={open} labelledBy="deleted-title" onClose={onClose}>
			<h2 id="deleted-title">{strings.deletedTitle}</h2>
			{profiles.length === 0 ? (
				<p>{strings.deletedEmpty}</p>
			) : (
				<ul className="deleted-list">
					{profiles.map((profile) => (
						<li key={profile.id}>
							<span>{profile.name}</span>
							<button type="button" onClick={() => restore(profile.id)}>
								{fill(strings.restore, { name: profile.name })}
							</button>
						</li>
					))}
				</ul>
			)}
			<div className="actions">
				<button ref={closeButton} type="button" onClick={onClose}>
					{strings.close}
				</button>
			</div>
		</Modal>
	)
}
