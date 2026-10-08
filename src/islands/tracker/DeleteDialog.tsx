import type { Translate } from "../../i18n"
import { Modal } from "./Modal"

interface Props {
	open: boolean
	name: string
	t: Translate
	onExport: () => void
	onDelete: () => void
	onCancel: () => void
}

/** "Export first" is first in DOM order, so `showModal()` focuses it. */
export function DeleteDialog({ open, name, t, onExport, onDelete, onCancel }: Props) {
	return (
		<Modal open={open} labelledBy="delete-title" onClose={onCancel}>
			<h2 id="delete-title">{t("profile.deleteTitle", { name })}</h2>
			<p>{t("profile.deleteBody")}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={onExport}>
					{t("profile.exportFirst")}
				</button>
				<button type="button" onClick={onDelete}>
					{t("profile.confirmDelete")}
				</button>
				<button type="button" onClick={onCancel}>
					{t("profile.cancel")}
				</button>
			</div>
		</Modal>
	)
}
