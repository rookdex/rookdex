// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { createProfile } from "../model/profiles"
import { setDone } from "../model/progress"
import { openStore } from "../model/store"
import { categoryIds } from "../model/trackItems"
import {
	deferChunks,
	delivered,
	fixtures,
	installSeed,
	renderReady,
	resetBrowser,
	stubChunks,
	stubIndex,
} from "../test/tracker-fixtures"
import { Dashboard } from "./hub/Dashboard"
import { Tracker } from "./Tracker"

beforeEach(resetBrowser)

const INDEX_OFFLINE = "The list could not load. Check your connection and try again."
const STALE = "Rookdex was updated. Reload to see the new list."
/** Each category's first card in the fixtures. */
const CARD: Record<string, string> = { vehicles: "Bike", animals: "American alligator" }

const failChunks = () =>
	stubChunks(async () => {
		throw new TypeError("Failed to fetch")
	})
const failIndex = () =>
	stubIndex(async () => {
		throw new TypeError("Failed to fetch")
	})
const box = (name: string) => screen.queryByRole("checkbox", { name })
const tile = (name: RegExp) => screen.getByRole("button", { name })
/** The visible notice's text, never the status line (amendment 7). */
const notice = (text: string | RegExp) =>
	screen.findByText(text, { selector: ".chunk-notice > span" })
const liveRegion = (container: HTMLElement) => container.querySelector('p[aria-live="polite"]')
const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))
const precedes = (a: Element, b: Element) =>
	Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe("chunks in the tracker (spec §5, §10)", () => {
	it("shows each card's text from its chunk", async () => {
		await renderReady(<Tracker locale="en" />)
		expect(screen.getByText("Everglades native.")).toBeInTheDocument()
	})

	it("names every category in one message when all chunks fail offline (Review Focus 1)", async () => {
		failChunks()
		const { container } = render(<Tracker locale="en" />)
		const text =
			"Can't load Vehicles and Animals offline yet. Open them once while online and they stay available."
		expect(await notice(text)).toBeInTheDocument()
		await waitFor(() => expect(liveRegion(container)).toHaveTextContent(text))
		expect(screen.queryByRole("checkbox")).toBeNull()
		expect(screen.queryByText("Nothing here yet.")).toBeNull()
	})

	it("asks for a reload when a chunk is gone after an update (Review Focus 2)", async () => {
		stubChunks(async () => new Response("<!doctype html>", { status: 404 }))
		render(<Tracker locale="en" />)
		expect(await notice(STALE)).toBeInTheDocument()
		// The index loaded, so this is the chunk's notice, not the index's: the tracker is on screen.
		expect(await screen.findByRole("button", { name: "Profile: Player 1" })).toBeInTheDocument()
		// jsdom can't reload or spy on `location`; Task 8 clicks it in a real browser.
		expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
	})

	it("says it in Norwegian too", async () => {
		failChunks()
		window.history.replaceState(null, "", "/nb/tracker/?show=animals")
		render(<Tracker locale="nb" />)
		expect(
			await notice(/kan ikke lastes uten nett ennå\. Åpne den én gang på nett/)
		).toBeInTheDocument()
	})

	it("focuses a Sources back link's item once a late chunk lands (Review Focus 3)", async () => {
		const chunks = deferChunks()
		window.history.replaceState(
			null,
			"",
			"/en/tracker/?show=animals#item-wildlife/american-alligator"
		)
		render(<Tracker locale="en" />)
		await waitFor(() => expect(chunks.requested("animals")).toBe(true))
		expect(screen.queryByRole("checkbox")).toBeNull()
		chunks.release("animals")
		const alligator = await screen.findByRole("checkbox", { name: "American alligator" })
		await waitFor(() => expect(alligator).toHaveFocus())
	})

	it("the hub fetches the index file and never a chunk (Review Focus 4)", async () => {
		render(
			<Dashboard
				locale="en"
				today="2026-11-26"
				daysSince={7}
				guideHref="/en/guides/before-you-start/"
				trackerHref="/en/tracker/"
				dexHref="/en/dex/"
				announce={() => {}}
				categoryCount={2}
			/>
		)
		await screen.findByRole("button", { name: /^Profile: / })
		expect(delivered.fetch.mock.calls.map(([url]) => url)).toEqual([delivered.index.url])
	})
})

describe("the list while chunks arrive (amendment 6, ruling 9)", () => {
	it("keeps loaded cards mounted while an earlier category loads, then shows it first", async () => {
		const chunks = deferChunks(["animals"])
		window.history.replaceState(null, "", "/en/tracker/?show=animals")
		render(<Tracker locale="en" />)
		const alligator = await screen.findByRole("checkbox", { name: "American alligator" })
		await waitFor(() => expect(alligator).toBeEnabled())
		// The background load (amendment 5) asks for Vehicles once Animals is in; it is held.
		await waitFor(() => expect(chunks.requested("vehicles")).toBe(true))
		expect(box("Bike")).toBeNull()
		fireEvent.click(tile(/^Vehicles,/))
		expect(box("American alligator")).toBe(alligator)
		chunks.release("vehicles")
		const bike = await screen.findByRole("checkbox", { name: "Bike" })
		expect(box("American alligator")).toBe(alligator)
		expect(precedes(bike, alligator)).toBe(true)
	})

	it("shows no heading or chips for a pressed category until its text is in (pre-flight I8)", async () => {
		const chunks = deferChunks(["vehicles"])
		window.history.replaceState(null, "", "/en/tracker/?show=vehicles")
		render(<Tracker locale="en" />)
		const bike = await screen.findByRole("checkbox", { name: "Bike" })
		await waitFor(() => expect(bike).toBeEnabled())
		await waitFor(() => expect(chunks.requested("animals")).toBe(true))
		fireEvent.click(tile(/^Animals,/))
		expect(document.getElementById("cat-animals")).toBeNull()
		expect(screen.queryByRole("button", { name: /^Birds,/ })).toBeNull()
		chunks.release("animals")
		await screen.findByRole("checkbox", { name: "American alligator" })
		expect(document.getElementById("cat-animals")).not.toBeNull()
		expect(screen.getByRole("button", { name: /^Birds,/ })).toBeInTheDocument()
		expect(box("Bike")).toBe(bike)
	})

	it("renders only the pressed category when chunks land in reverse order (spec §10, B3)", async () => {
		const chunks = deferChunks()
		window.history.replaceState(null, "", "/en/tracker/?show=vehicles")
		render(<Tracker locale="en" />)
		await screen.findByRole("button", { name: "Profile: Player 1" })
		await waitFor(() => expect(chunks.requested("vehicles")).toBe(true))
		fireEvent.click(tile(/^Animals,/))
		await waitFor(() => expect(chunks.requested("animals")).toBe(true))
		fireEvent.click(tile(/^Vehicles,/))
		chunks.release("animals")
		await screen.findByRole("checkbox", { name: "American alligator" })
		expect(box("Pelican")).toBeInTheDocument()
		chunks.release("vehicles")
		await wait()
		expect(box("Bike")).toBeNull()
	})

	it("on All, never paints a later category above an earlier one still loading (ruling 9)", async () => {
		const [first, second] = categoryIds(fixtures)
		const chunks = deferChunks()
		render(<Tracker locale="en" />)
		await waitFor(() => expect(chunks.requested(second)).toBe(true))
		chunks.release(second)
		await wait()
		expect(box(CARD[second])).toBeNull()
		chunks.release(first)
		const firstCard = await screen.findByRole("checkbox", { name: CARD[first] })
		const secondCard = screen.getByRole("checkbox", { name: CARD[second] })
		expect(precedes(firstCard, secondCard)).toBe(true)
	})

	it("offers no jump to a last find whose category failed to load (amendment 6)", async () => {
		const db = await openStore(indexedDB)
		await createProfile(db, "Player 1", new Date("2026-11-20T10:00:00Z"), () => "p1")
		await setDone(db, "p1", "wildlife/american-alligator", true, new Date("2026-11-20T11:00:00Z"))
		db.close()
		stubChunks(async (category, url) => {
			if (category === "animals") throw new TypeError("Failed to fetch")
			return delivered.serve(url)
		})
		render(<Tracker locale="en" />)
		expect(
			await notice(
				"Can't load Animals offline yet. Open it once while online and it stays available."
			)
		).toBeInTheDocument()
		await waitFor(() => expect(document.querySelector("p.last-found")).not.toBeNull())
		expect(document.querySelector("button.last-found")).toBeNull()
	})

	it("shows no empty-state text while the list is still loading (pre-flight I9)", async () => {
		const chunks = deferChunks()
		const { container } = render(<Tracker locale="en" />)
		await screen.findByRole("button", { name: "Profile: Player 1" })
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Bike" } })
		const results = container.querySelector(".tracker-results") as HTMLElement
		expect(within(results).queryByText('No match for "Bike".')).toBeNull()
		chunks.release("vehicles")
		chunks.release("animals")
		expect(await screen.findByRole("checkbox", { name: "Bike" })).toBeInTheDocument()
		expect(within(results).queryByText('No match for "Bike".')).toBeNull()
	})
	it("does not speak results for cards the screen does not show (final review F1)", async () => {
		const chunks = deferChunks(["animals"])
		window.history.replaceState(null, "", "/en/tracker/?show=animals")
		const { container } = render(<Tracker locale="en" />)
		await screen.findByRole("checkbox", { name: "American alligator" })
		fireEvent.click(tile(/^Vehicles,/))
		const field = screen.getByRole("searchbox")
		fireEvent.change(field, { target: { value: "Bike" } })
		fireEvent.keyDown(field, { key: "Enter" })
		await wait()
		// Vehicles is still on its way: Bike is not on screen, so no "1 result" and no count.
		expect(liveRegion(container)).not.toHaveTextContent(/result/)
		chunks.release("vehicles")
		await screen.findByRole("checkbox", { name: "Bike" })
		fireEvent.keyDown(field, { key: "Enter" })
		await waitFor(() => expect(liveRegion(container)).toHaveTextContent("1 result"))
	})

	it("does not speak results for a category that failed to load (final review F1)", async () => {
		stubChunks(async (category, url) => {
			if (category === "vehicles") throw new TypeError("Failed to fetch")
			return delivered.serve(url)
		})
		window.history.replaceState(null, "", "/en/tracker/?show=vehicles")
		const { container } = render(<Tracker locale="en" />)
		await notice(/Vehicles/)
		const field = screen.getByRole("searchbox")
		fireEvent.change(field, { target: { value: "Bike" } })
		fireEvent.keyDown(field, { key: "Enter" })
		await wait()
		expect(liveRegion(container)).not.toHaveTextContent(/result/)
		expect(liveRegion(container)).not.toHaveTextContent(/No match/)
	})
})

describe("the seed index file (plan review ruling 3, Review Focus 5)", () => {
	it("shows a notice and Try again when the index fails, and the list once Try again works", async () => {
		failIndex()
		const { container } = render(<Tracker locale="en" />)
		expect(await notice(INDEX_OFFLINE)).toBeInTheDocument()
		await waitFor(() => expect(liveRegion(container)).toHaveTextContent(INDEX_OFFLINE))
		expect(screen.queryByRole("checkbox")).toBeNull()
		installSeed()
		fireEvent.click(screen.getByRole("button", { name: "Try again" }))
		expect(await screen.findByRole("checkbox", { name: "American alligator" })).toBeInTheDocument()
	})

	it("tries the index again when the browser comes back online", async () => {
		failIndex()
		render(<Tracker locale="en" />)
		await notice(INDEX_OFFLINE)
		installSeed()
		window.dispatchEvent(new Event("online"))
		expect(await screen.findByRole("checkbox", { name: "American alligator" })).toBeInTheDocument()
	})

	it("offers a reload when the index file is gone after an update", async () => {
		stubIndex(async () => new Response("Not found", { status: 404 }))
		render(<Tracker locale="en" />)
		expect(await notice(STALE)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
	})
})
