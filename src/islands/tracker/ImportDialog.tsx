import type { RefObject } from "react"
import { fill, type Strings } from "../../i18n"
import type { ExportFile } from "../../model/schema"
import { Modal } from "./Modal"

interface Props {
	file: ExportFile | undefined
	into: string
	strings: Strings["profile"]
	onInto: () => void
	onCreate: () => void
	onCancel: () => void
	/** The menu button: this dialog opens after the file picker, so the opener cannot be inferred. */
	returnTo: RefObject<HTMLElement | null>
}

/** Names both sides so a family member's export never lands in the wrong profile by accident. */
export function ImportDialog({ file, into, strings, onInto, onCreate, onCancel, returnTo }: Props) {
	const from = file?.profile_name ?? ""
	return (
		<Modal
			open={file !== undefined}
			labelledBy="import-title"
			onClose={onCancel}
			returnTo={returnTo}
		>
			<h2 id="import-title">{fill(strings.importTitle, { from, into })}</h2>
			<p>{fill(strings.importBody, { into })}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={onInto}>
					{fill(strings.importInto, { into })}
				</button>
				<button type="button" onClick={onCreate}>
					{fill(strings.importCreate, { from })}
				</button>
				<button type="button" onClick={onCancel}>
					{strings.cancel}
				</button>
			</div>
		</Modal>
	)
}
