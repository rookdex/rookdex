import { fill, type Strings } from "../../i18n"
import { Modal } from "./Modal"

interface Props {
	open: boolean
	name: string
	strings: Strings["profile"]
	onExport: () => void
	onDelete: () => void
	onCancel: () => void
}

/** "Export first" is first in DOM order, so `showModal()` focuses it. */
export function DeleteDialog({ open, name, strings, onExport, onDelete, onCancel }: Props) {
	return (
		<Modal open={open} labelledBy="delete-title" onClose={onCancel}>
			<h2 id="delete-title">{fill(strings.deleteTitle, { name })}</h2>
			<p>{strings.deleteBody}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={onExport}>
					{strings.exportFirst}
				</button>
				<button type="button" onClick={onDelete}>
					{strings.confirmDelete}
				</button>
				<button type="button" onClick={onCancel}>
					{strings.cancel}
				</button>
			</div>
		</Modal>
	)
}
