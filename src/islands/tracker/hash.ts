/**
 * The tracker checkbox a `#item-<id>` hash points at, or null (feedback spec §4). Never throws:
 * `decodeURIComponent` throws on a hash like `#item-%`, and `querySelector` would throw on the
 * slash every seed id contains, so this decodes in a try/catch and uses getElementById.
 */
export function hashTarget(hash: string, doc: Document): HTMLInputElement | null {
	let id: string
	try {
		id = decodeURIComponent(hash.slice(1))
	} catch {
		return null
	}
	if (!id.startsWith("item-")) return null
	const el = doc.getElementById(id)
	return el?.tagName === "INPUT" ? (el as HTMLInputElement) : null
}
