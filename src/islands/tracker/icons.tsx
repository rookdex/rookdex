import type { ReactElement } from "react"

// Tracker icons (feedback spec §4, §5). Decorative only: every control names itself with hidden
// text, so the SVGs are hidden from assistive tech.
const common = {
	viewBox: "0 0 24 24",
	width: 22,
	height: 22,
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const

export function BookIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
			<path d="M19 19v2H6" />
		</svg>
	)
}

export function FlagIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M5 21V4" />
			<path d="M5 4h11l-2 4 2 4H5" />
		</svg>
	)
}

export function EyeOffIcon() {
	return (
		<svg {...common} aria-hidden="true">
			{/* My own geometry (an eye and a slash), so no icon set's licence or notice applies. */}
			<path d="M2 12c2.5-4.5 6-7 10-7s7.5 2.5 10 7c-2.5 4.5-6 7-10 7s-7.5-2.5-10-7z" />
			<circle cx="12" cy="12" r="3" />
			<path d="M4 4l16 16" />
		</svg>
	)
}

export function CloseIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	)
}

// Category icons (tracker refresh spec §4.2). My own geometry, drawn for the S3 mockup, so no icon
// set's licence applies.
export function AllIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<rect x="4" y="4" width="6" height="6" rx="1" />
			<rect x="14" y="4" width="6" height="6" rx="1" />
			<rect x="4" y="14" width="6" height="6" rx="1" />
			<rect x="14" y="14" width="6" height="6" rx="1" />
		</svg>
	)
}

export function CollectiblesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
		</svg>
	)
}

export function PlacesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
			<circle cx="12" cy="9.5" r="2.5" />
		</svg>
	)
}

export function VehiclesIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M3 16v-3l2-5h14l2 5v3z" />
			<path d="M3 13h18" />
			<circle cx="7.5" cy="16.5" r="1.8" />
			<circle cx="16.5" cy="16.5" r="1.8" />
		</svg>
	)
}

export function WildlifeIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="7" cy="9" r="1.8" />
			<circle cx="12" cy="6.5" r="1.8" />
			<circle cx="17" cy="9" r="1.8" />
			<path d="M12 12c-3 0-5.5 3.5-5.5 5.5 0 1.5 1.5 2.5 3 2l2.5-.8 2.5.8c1.5.5 3-.5 3-2 0-2-2.5-5.5-5.5-5.5z" />
		</svg>
	)
}

const byCategory: Record<string, () => ReactElement> = {
	collectibles: CollectiblesIcon,
	places: PlacesIcon,
	vehicles: VehiclesIcon,
	wildlife: WildlifeIcon,
}

/** The icon for a category id. An id a future seed adds gets the All icon until it has its own;
 *  hasOwn keeps "constructor" and friends from returning Object's own functions. */
export function categoryIcon(id: string): () => ReactElement {
	return Object.hasOwn(byCategory, id) ? byCategory[id] : AllIcon
}
