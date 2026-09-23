/**
 * The Settings version line: the package version and the commit the build ran on (spec §7.3).
 * GitHub Actions sets GITHUB_SHA on every run; a local build has none and says "dev".
 */
export function appVersion(pkgVersion: string, sha: string | undefined): string {
	return `${pkgVersion} · ${sha ? sha.slice(0, 7) : "dev"}`
}
