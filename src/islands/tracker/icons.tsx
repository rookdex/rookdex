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

// News panel icons (News redesign spec §4): muted, footer style, my own geometry. None of them
// is a brand logo; the channel's name is the link text.

export function NewspaperIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M4 4h12v15a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2z" />
			<path d="M16 8h4v11a1 1 0 0 1-1 1h-2" />
			<path d="M8 8h4M8 12h4M8 16h4" />
		</svg>
	)
}

export function ImageIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<circle cx="9" cy="10" r="1.5" />
			<path d="m21 16-5-5-9 8" />
		</svg>
	)
}

export function PlayIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<path d="m10 8.5 5 3.5-5 3.5z" />
		</svg>
	)
}

export function AtIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
		</svg>
	)
}

export function CameraIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<circle cx="12" cy="13" r="3.5" />
		</svg>
	)
}

export function ChecklistIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
			<path d="M11 6h10M11 12h10M11 18h10" />
		</svg>
	)
}

export function ClockIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	)
}

/** "Further down this page": the News jump rows point at the panels below the news. */
export function ArrowDownIcon() {
	return (
		<svg {...common} aria-hidden="true">
			<path d="M12 5v14M6 13l6 6 6-6" />
		</svg>
	)
}

const byGuide: Record<string, () => ReactElement> = {
	"before-you-start": ChecklistIcon,
	"first-hour": ClockIcon,
}

/** The icon for a guide slug. A guide added later gets the checklist until it has its own;
 *  hasOwn keeps "constructor" and friends from returning Object's own functions. */
export function guideIcon(slug: string): () => ReactElement {
	return Object.hasOwn(byGuide, slug) ? byGuide[slug] : ChecklistIcon
}
