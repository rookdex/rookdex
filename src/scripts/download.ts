// Saves text as a file through a temporary link. Shared by the Tracker island and Settings, so it
// stays free of React.

export function downloadJson(filename: string, json: string): void {
	const blob = new Blob([json], { type: "application/json" })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement("a")
	anchor.href = url
	anchor.download = filename
	anchor.click()
	// Revoking synchronously can cancel the download in some browsers.
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
