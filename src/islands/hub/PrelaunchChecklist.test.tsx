// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { translator } from "../../i18n"
import { CHECKLIST_KEY, type ChecklistId } from "../seenFlag"
import { type ChecklistLink, PrelaunchChecklist } from "./PrelaunchChecklist"

const { t } = translator("en")
const links: Record<ChecklistId, ChecklistLink> = {
	edition: { href: "/en/guides/before-you-start/", page: "Before you start" },
	preload: { href: "/en/news/", page: "News" },
	space: { href: "/en/news/", page: "News" },
	"first-hour": { href: "/en/guides/first-hour/", page: "Your first hour" },
	install: { href: "/en/settings/", page: "Settings" },
}
const list = () => render(<PrelaunchChecklist links={links} t={t} />)
const box = (name: string) => screen.getByRole("checkbox", { name: new RegExp(`^${name}`) })
const stored = () => JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]")

function standalone(on: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({ matches: on && query === "(display-mode: standalone)", media: query }) as MediaQueryList
	)
}

beforeEach(() => {
	localStorage.clear()
	standalone(false)
})
afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe("PrelaunchChecklist (desktop dashboard spec §4.8)", () => {
	it("renders five unticked rows on the server", () => {
		const html = renderToString(<PrelaunchChecklist links={links} t={t} />)
		expect(html.match(/type="checkbox"/g)).toHaveLength(5)
		expect(html).not.toContain("checked")
		expect(html).toContain("0 of 5 done")
	})

	it("ticks, counts and stores; restores the ticks on the next visit", () => {
		const first = list()
		fireEvent.click(box("Pick your edition"))
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
		expect(stored()).toEqual(["edition"])
		first.unmount()

		list()
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
	})

	it("keeps an id another tab added when it writes", () => {
		list()
		localStorage.setItem(CHECKLIST_KEY, '["space"]') // another tab, after this one loaded
		fireEvent.click(box("Pick your edition"))
		expect(stored()).toEqual(["edition", "space"])
		expect(box("Free up console space")).toBeChecked()
	})

	it("shows what another tab stored without a click here", () => {
		list()
		localStorage.setItem(CHECKLIST_KEY, '["space"]')
		fireEvent(window, new StorageEvent("storage", { key: CHECKLIST_KEY }))
		expect(box("Free up console space")).toBeChecked()
		localStorage.removeItem(CHECKLIST_KEY) // Delete all in Settings, in another tab
		fireEvent(window, new StorageEvent("storage", { key: CHECKLIST_KEY }))
		expect(box("Free up console space")).not.toBeChecked()
	})

	it("says so when storage is blocked, and still ticks for this visit", () => {
		vi.stubGlobal("localStorage", {
			getItem() {
				throw new Error("SecurityError")
			},
			setItem() {
				throw new Error("SecurityError")
			},
			removeItem() {},
			clear() {},
		})
		list()
		expect(screen.getByText(/blocks storage here/)).toBeInTheDocument()
		expect(screen.queryByText(/Ticks stay on this device/)).toBeNull()
		fireEvent.click(box("Pick your edition"))
		expect(box("Pick your edition")).toBeChecked()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
	})

	it("puts each Open link outside the label, named after its page", () => {
		list()
		const open = screen.getByRole("link", { name: "Open: Before you start" })
		expect(open).toHaveAttribute("href", "/en/guides/before-you-start/")
		expect(open.closest("label")).toBeNull()
		expect(screen.getAllByRole("link")).toHaveLength(5)
	})

	it("shows the install row ticked and disabled in the installed app, and never stores it", () => {
		standalone(true)
		list()
		const install = box("Install Rookdex")
		expect(install).toBeChecked()
		expect(install).toBeDisabled()
		const row = install.closest("li") as HTMLElement
		expect(within(row).getByText("Installed")).toBeInTheDocument()
		expect(screen.getByText("1 of 5 done")).toBeInTheDocument()
		expect(localStorage.getItem(CHECKLIST_KEY)).toBeNull()
	})

	it("has a labelled list, the device note and no axe violations", async () => {
		const { container } = list()
		expect(screen.getByRole("list", { name: "Before launch" })).toBeInTheDocument()
		expect(screen.getByText(/Ticks stay on this device/)).toBeInTheDocument()
		expect(await axe(container)).toHaveNoViolations()
	})
})
