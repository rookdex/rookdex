import type { ReactNode } from "react"

/** The right chevron from Chevron.astro, for the islands. Decorative. */
export function Chev() {
	return (
		<svg
			className="row-chevron"
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
			<path d="m9 6 6 6-6 6" />
		</svg>
	)
}

/**
 * A link tile's title with its icon. The last word and the icon share one unbreakable span, so the
 * icon follows the text on its last line instead of sitting beside the whole wrapped block.
 */
export function TileTitle({ text, children }: { text: string; children: ReactNode }) {
	const cut = text.lastIndexOf(" ") + 1
	return (
		<span className="tile-title">
			{text.slice(0, cut)}
			<span className="tile-title-end">
				{text.slice(cut)}
				{children}
			</span>
		</span>
	)
}
