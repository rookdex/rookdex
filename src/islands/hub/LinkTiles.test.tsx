// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { ExternalTile } from "./ExternalTile"
import { LinkTiles } from "./LinkTiles"

const { t } = translator("en")
const tiles = () =>
	render(
		<LinkTiles
			mapLink="https://www.rockstargames.com/VI"
			guideHref="/en/guides/before-you-start/"
			guideTitle="Before you start"
			settingsHref="/en/settings/"
			t={t}
		/>
	)

describe("LinkTiles (desktop dashboard spec §4.7)", () => {
	it("renders three links, each named by its title first", () => {
		tiles()
		const links = screen.getAllByRole("link")
		expect(links).toHaveLength(3)
		expect(links[0]).toHaveAccessibleName(/^Leonida on Rockstar's site/)
		expect(links[1]).toHaveAccessibleName(/^Before you start/)
		expect(links[1]).toHaveAttribute("href", "/en/guides/before-you-start/")
		expect(links[2]).toHaveAccessibleName(/^Language, updates, your data/)
		expect(links[2]).toHaveAttribute("href", "/en/settings/")
	})

	it("has no axe violations", async () => {
		const { container } = tiles()
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("ExternalTile", () => {
	it("opens in a new tab and carries the new-tab note the build check looks for", () => {
		tiles()
		const map = screen.getAllByRole("link")[0]
		expect(map).toHaveAttribute("target", "_blank")
		expect(map).toHaveAttribute("rel", "noopener noreferrer")
		const note = map.querySelector(".new-tab-note")
		expect(note).toHaveClass("visually-hidden")
		expect(note?.textContent).toBe(" (opens in a new tab)")
		expect(map).toHaveAccessibleName(/\(opens in a new tab\)$/)
	})

	it("refuses a link that isn't https", () => {
		expect(() =>
			render(<ExternalTile href="http://example.com" label="L" title="T" body="B" t={t} />)
		).toThrow(/https/)
	})
})
