/** One-shot "already shown" flags in localStorage, tolerant of private mode and blocked storage. */
export function readFlag(key: string): boolean {
	try {
		return localStorage.getItem(key) === "1"
	} catch {
		return false
	}
}

export function writeFlag(key: string): void {
	try {
		localStorage.setItem(key, "1")
	} catch {
		// Blocked storage: the prompt or hint simply shows again next visit.
	}
}
