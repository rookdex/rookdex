/** The seed id in a `#item-<id>` hash, or null. Never throws. */
export function hashItemId(hash: string): string | null {
	let id: string
	try {
		id = decodeURIComponent(hash.slice(1))
	} catch {
		return null
	}
	return id.startsWith("item-") ? id.slice("item-".length) : null
}

/**
 * The tracker checkbox a `#item-<id>` hash points at, or null (feedback spec §4). Never throws:
 * `decodeURIComponent` throws on a hash like `#item-%`, and `querySelector` would throw on the
 * slash every seed id contains, so this decodes in a try/catch and uses getElementById.
 */
export function hashTarget(hash: string, doc: Document): HTMLInputElement | null {
	const id = hashItemId(hash)
	if (id === null) return null
	const el = doc.getElementById(`item-${id}`)
	return el?.tagName === "INPUT" ? (el as HTMLInputElement) : null
}
