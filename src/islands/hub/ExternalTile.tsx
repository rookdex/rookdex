import type { Translate } from "../../i18n"

interface Props {
	href: string
	label: string
	title: string
	body: string
	t: Translate
}

/**
 * A tile that leaves rookdex.app (desktop dashboard spec §4.7). It emits the same hidden note and
 * `new-tab-note` marker as ExternalLink.astro, so the build's external-link check covers it. The
 * label is hidden from screen readers, so the link's name starts with its title.
 */
export function ExternalTile({ href, label, title, body, t }: Props) {
	if (!href.startsWith("https://")) {
		throw new Error(`ExternalTile needs an https:// href, got "${href}"`)
	}
	return (
		<a className="tile link-tile map-tile" href={href} target="_blank" rel="noopener noreferrer">
			<span className="tile-art" aria-hidden="true">
				<span className="art-sun" />
				<span className="art-stripes" />
				<span className="art-compass" />
			</span>
			<span className="tile-label" aria-hidden="true">
				{label}
			</span>
			<span className="tile-title">
				{title}
				<svg
					className="ext-icon"
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M7 17 17 7M9 7h8v8" />
				</svg>
			</span>
			<span className="tile-body">{body}</span>
			<span className="visually-hidden new-tab-note">{` (${t("newTab")})`}</span>
		</a>
	)
}
