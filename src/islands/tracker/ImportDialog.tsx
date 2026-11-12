import type { RefObject } from "react"
import type { Translate } from "../../i18n"
import { dottedDate } from "../../model/days"
import type { ExportFile } from "../../model/schema"
import { Modal } from "./Modal"

interface Props {
	file: ExportFile | undefined
	into: string
	t: Translate
	onInto: () => void
	onCreate: () => void
	/** A version 2 backup: every profile in the file. */
	onRestore: () => void
	onCancel: () => void
	/** The menu button: this dialog opens after the file picker, so the opener cannot be inferred. */
	returnTo: RefObject<HTMLElement | null>
}

/**
 * Names both sides so a family member's export never lands in the wrong profile by accident. A
 * backup of every profile names the profiles it holds and restores them all, or nothing.
 */
export function ImportDialog({
	file,
	into,
	t,
	onInto,
	onCreate,
	onRestore,
	onCancel,
	returnTo,
}: Props) {
	return (
		<Modal
			open={file !== undefined}
			labelledBy="import-title"
			onClose={onCancel}
			returnTo={returnTo}
		>
			{file?.version === 2 ? (
				<>
					<h2 id="import-title">
						{t("profile.restoreTitle", { date: dottedDate(new Date(file.exported_at)) })}
					</h2>
					<p>{t("profile.restoreBody", { names: file.profiles.map((p) => p.name).join(", ") })}</p>
					<div className="actions">
						<button type="button" className="primary" onClick={onRestore}>
							{t("profile.restoreAll")}
						</button>
						<button type="button" onClick={onCancel}>
							{t("profile.cancel")}
						</button>
					</div>
				</>
			) : (
				<>
					<h2 id="import-title">
						{t("profile.importTitle", { from: file?.profile_name ?? "", into })}
					</h2>
					<p>{t("profile.importBody", { into })}</p>
					<div className="actions">
						<button type="button" className="primary" onClick={onInto}>
							{t("profile.importInto", { into })}
						</button>
						<button type="button" onClick={onCreate}>
							{t("profile.importCreate", { from: file?.profile_name ?? "" })}
						</button>
						<button type="button" onClick={onCancel}>
							{t("profile.cancel")}
						</button>
					</div>
				</>
			)}
		</Modal>
	)
}
