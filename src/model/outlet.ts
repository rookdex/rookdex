// Outlet names for source links. Its own module so the content config can use it without loading
// the allowlist that seed.ts parses at import.

export function normalizeHost(host: string): string {
	return host.toLowerCase().replace(/^www\./, "")
}

/** Host without `www.`: the name a source link shows. */
export function outletOf(urlString: string): string {
	return normalizeHost(new URL(urlString).hostname)
}

/** The first outlet cited twice in `urls`, or undefined when every outlet appears once. */
export function duplicateOutlet(urls: string[]): string | undefined {
	const seen = new Set<string>()
	for (const url of urls) {
		const outlet = outletOf(url)
		if (seen.has(outlet)) return outlet
		seen.add(outlet)
	}
	return undefined
}
