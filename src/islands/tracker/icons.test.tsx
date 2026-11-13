import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../../model/seed"
import {
	AllIcon,
	AtIcon,
	CameraIcon,
	ChecklistIcon,
	ClockIcon,
	categoryIcon,
	guideIcon,
	ImageIcon,
	NewspaperIcon,
	PlayIcon,
} from "./icons"

describe("categoryIcon (tracker refresh spec §4.2)", () => {
	it("gives every category in the seed an icon of its own", () => {
		const ids = categoryIds(seedItems)
		const icons = ids.map(categoryIcon)
		expect(icons).not.toContain(AllIcon)
		expect(new Set(icons).size).toBe(ids.length)
	})

	it("falls back to the All icon for an unknown id, inherited object names included", () => {
		expect(categoryIcon("boats")).toBe(AllIcon)
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
