// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { translator } from "../../i18n"
import { SearchBar } from "./SearchBar"

function setup(props: { query?: string; hideFound?: boolean; hiddenCount?: number } = {}) {
	const handlers = { onQuery: vi.fn(), onClear: vi.fn(), onToggleHideFound: vi.fn() }
	const inputRef = createRef<HTMLInputElement>()
	render(
		<SearchBar
			query={props.query ?? ""}
			hideFound={props.hideFound ?? false}
			hiddenCount={props.hiddenCount ?? 0}
			inputRef={inputRef}
			t={translator("en").t}
			{...handlers}
		/>
	)
	return {
		...handlers,
		inputRef,
		field: screen.getByRole("searchbox", { name: "Search the tracker" }),
	}
}

describe("SearchBar (tracker search spec §5)", () => {
	it("is a search landmark with a labelled field", () => {
		const { field, inputRef } = setup()
		expect(screen.getByRole("search")).toContainElement(field)
		expect(field).toHaveAttribute("placeholder", "Name or type, e.g. Tulip or boat")
		expect(field).toHaveAttribute("maxlength", "100")
		expect(field).toHaveAttribute("autocomplete", "off")
		expect(field).toHaveAttribute("enterkeyhint", "search")
		expect(inputRef.current).toBe(field)
	})

	it("reports typing", () => {
		const { field, onQuery } = setup()
		fireEvent.change(field, { target: { value: "boat" } })
		expect(onQuery).toHaveBeenCalledWith("boat")
	})

	it("has no clear button while the field is empty", () => {
		setup()
		expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull()
	})

	it("clears from its button and puts focus back", () => {
		const { field, onClear } = setup({ query: "boat" })
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(onClear).toHaveBeenCalledOnce()
		expect(document.activeElement).toBe(field)
	})

	it("clears on Escape and leaves Enter alone", () => {
		const { field, onClear, onQuery } = setup({ query: "boat" })
		expect(field.closest("form")).toBeNull()
		fireEvent.keyDown(field, { key: "Enter" })
		expect(onClear).not.toHaveBeenCalled()
		// fireEvent returns false when the handler called preventDefault.
		expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(false)
		expect(onClear).toHaveBeenCalledOnce()
		expect(onQuery).not.toHaveBeenCalled()
	})

	it("ignores Escape in an empty field", () => {
		const { field, onClear } = setup()
		fireEvent.keyDown(field, { key: "Escape" })
		expect(onClear).not.toHaveBeenCalled()
	})

	it("is a pressed toggle that shows the hidden count only while on", () => {
		const { onToggleHideFound } = setup()
		const off = screen.getByRole("button", { name: "Hide found" })
		expect(off).toHaveAttribute("aria-pressed", "false")
		expect(off.querySelector(".search-count")).toBeNull()
		fireEvent.click(off)
		expect(onToggleHideFound).toHaveBeenCalledOnce()
	})

	it("names the count on the toggle while on", () => {
		setup({ hideFound: true, hiddenCount: 37 })
		const on = screen.getByRole("button", { name: "Hide found 37 hidden" })
		expect(on).toHaveAttribute("aria-pressed", "true")
		expect(on.querySelector(".search-count")).toHaveTextContent("37")
		expect(on.querySelector(".search-count")).toHaveAttribute("aria-hidden", "true")
	})
})
