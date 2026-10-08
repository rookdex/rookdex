import type { RefObject } from "react"
import type { Translate } from "../../i18n"
import type { ExportFile } from "../../model/schema"
import { Modal } from "./Modal"

interface Props {
	file: ExportFile | undefined
	into: string
	t: Translate
	onInto: () => void
	onCreate: () => void
	onCancel: () => void
	/** The menu button: this dialog opens after the file picker, so the opener cannot be inferred. */
	returnTo: RefObject<HTMLElement | null>
}

/** Names both sides so a family member's export never lands in the wrong profile by accident. */
export function ImportDialog({ file, into, t, onInto, onCreate, onCancel, returnTo }: Props) {
	const from = file?.profile_name ?? ""
	return (
		<Modal
			open={file !== undefined}
			labelledBy="import-title"
			onClose={onCancel}
			returnTo={returnTo}
		>
			<h2 id="import-title">{t("profile.importTitle", { from, into })}</h2>
			<p>{t("profile.importBody", { into })}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={onInto}>
					{t("profile.importInto", { into })}
				</button>
				<button type="button" onClick={onCreate}>
					{t("profile.importCreate", { from })}
				</button>
				<button type="button" onClick={onCancel}>
					{t("profile.cancel")}
				</button>
			</div>
		</Modal>
	)
}
