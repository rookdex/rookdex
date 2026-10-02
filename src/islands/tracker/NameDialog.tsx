import { useState } from "react"
import type { Translate } from "../../i18n"
import { Modal } from "./Modal"

interface Props {
	open: boolean
	title: string
	initial: string
	error: string
	t: Translate
	onSave: (name: string) => void
	onCancel: () => void
}

/** The parent passes a `key` that changes per opening, so the field resets without an effect. */
export function NameDialog({ open, title, initial, error, t, onSave, onCancel }: Props) {
	const [name, setName] = useState(initial)
	return (
		<Modal open={open} labelledBy="name-title" onClose={onCancel}>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					onSave(name)
				}}
			>
				<h2 id="name-title">{title}</h2>
				<label htmlFor="name-input">{t("profile.nameLabel")}</label>
				<input
					id="name-input"
					value={name}
					onChange={(event) => setName(event.target.value)}
					maxLength={40}
					autoComplete="off"
				/>
				<p className="tracker-alert" role="alert">
					{error}
				</p>
				<div className="actions">
					<button type="submit" className="primary">
						{t("profile.save")}
					</button>
					<button type="button" onClick={onCancel}>
						{t("profile.cancel")}
					</button>
				</div>
			</form>
		</Modal>
	)
}
