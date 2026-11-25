import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../../model/seed"
import {
	ActivitiesIcon,
	AllIcon,
	AnimalsIcon,
	AtIcon,
	CameraIcon,
	ChecklistIcon,
	ClockIcon,
	CollectionsIcon,
	categoryIcon,
	FlagIcon,
	guideIcon,
	ImageIcon,
	NewspaperIcon,
	PlacesIcon,
	PlayIcon,
	VehiclesIcon,
} from "./icons"

describe("categoryIcon (tracker refresh spec §4.2)", () => {
	it("gives every category in the seed an icon of its own", () => {
		const ids = categoryIds(seedItems)
		const icons = ids.map(categoryIcon)
		expect(icons).not.toContain(AllIcon)
		expect(new Set(icons).size).toBe(ids.length)
	})

	it("draws the categories the seed has today (category model spec §2)", () => {
		expect(categoryIcon("vehicles")).toBe(VehiclesIcon)
		expect(categoryIcon("animals")).toBe(AnimalsIcon)
		expect(categoryIcon("collections")).toBe(CollectionsIcon)
		expect(categoryIcon("activities")).toBe(ActivitiesIcon)
		expect(categoryIcon("places")).toBe(PlacesIcon)
	})

	it("keeps the Activities icon apart from the Report flag on every row", () => {
		expect(renderToStaticMarkup(<ActivitiesIcon />)).not.toBe(renderToStaticMarkup(<FlagIcon />))
		expect(renderToStaticMarkup(<ActivitiesIcon />)).not.toContain('d="M5 21V4"')
	})

	it("falls back to the All icon for an unknown id, inherited object names included", () => {
		expect(categoryIcon("boats")).toBe(AllIcon)
		expect(categoryIcon("wildlife")).toBe(AllIcon)
		expect(categoryIcon("constructor")).toBe(AllIcon)
		expect(categoryIcon("toString")).toBe(AllIcon)
	})
})

describe("News panel icons (News redesign spec §4)", () => {
	it("gives each launch guide its own icon", () => {
		expect(guideIcon("before-you-start")).toBe(ChecklistIcon)
		expect(guideIcon("first-hour")).toBe(ClockIcon)
	})

	it("falls back to the checklist for a guide it does not know, inherited names included", () => {
		expect(guideIcon("heists")).toBe(ChecklistIcon)
		expect(guideIcon("constructor")).toBe(ChecklistIcon)
		expect(guideIcon("toString")).toBe(ChecklistIcon)
	})

	it.each([
		["newspaper", NewspaperIcon],
		["image", ImageIcon],
		["play", PlayIcon],
		["at", AtIcon],
		["camera", CameraIcon],
		["checklist", ChecklistIcon],
		["clock", ClockIcon],
	])("draws the %s icon as a hidden 22 px outline", (_name, Icon) => {
		const svg = renderToStaticMarkup(<Icon />)
		expect(svg).toContain('viewBox="0 0 24 24"')
		expect(svg).toContain('width="22"')
		expect(svg).toContain('fill="none"')
		expect(svg).toContain('stroke="currentColor"')
		expect(svg).toContain('aria-hidden="true"')
		expect(svg).not.toContain("<image")
	})
})
