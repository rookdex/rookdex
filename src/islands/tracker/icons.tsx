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
