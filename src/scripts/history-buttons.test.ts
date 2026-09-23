// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { type HistoryWindow, wireHistoryButtons } from "./history-buttons"

interface Options {
	standalone?: boolean
	iosStandalone?: boolean
	navigation?: { canGoBack: boolean; canGoForward: boolean }
}

function setup(options: Options = {}) {
	document.body.innerHTML = `
		<div data-history hidden>
			<button type="button" data-history-back>Back</button>
			<button type="button" data-history-forward>Forward</button>
		</div>`
	const group = document.querySelector("[data-history]") as HTMLElement
	const onPageshow: (() => void)[] = []
	const win: HistoryWindow = {
		matchMedia: (query) => ({
			matches: options.standalone === true && query === "(display-mode: standalone)",
		}),
		navigator: options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone },
		navigation: options.navigation,
		history: { back: vi.fn(), forward: vi.fn() },
		addEventListener: (_type, listener) => {
			onPageshow.push(listener)
		},
	}
	wireHistoryButtons(group, win)
	const [back, forward] = [...group.querySelectorAll("button")]
	const pageshow = () => {
		for (const listener of onPageshow) listener()
	}
	return { group, back, forward, win, pageshow }
}

describe("wireHistoryButtons (spec §4)", () => {
	it("stays hidden in a browser tab", () => {
		expect(setup().group.hidden).toBe(true)
		expect(setup({ iosStandalone: false }).group.hidden).toBe(true)
	})

	it("shows in the installed app and in iOS home-screen mode", () => {
		expect(setup({ standalone: true }).group.hidden).toBe(false)
		expect(setup({ iosStandalone: true }).group.hidden).toBe(false)
	})

	it("disables back and forward from canGoBack and canGoForward", () => {
		const { back, forward } = setup({
			standalone: true,
			navigation: { canGoBack: false, canGoForward: true },
		})
		expect(back.disabled).toBe(true)
		expect(forward.disabled).toBe(false)
	})

	it("reads the state again on pageshow, for pages restored from the back/forward cache", () => {
		const navigation = { canGoBack: true, canGoForward: false }
		const { forward, pageshow } = setup({ standalone: true, navigation })
		expect(forward.disabled).toBe(true)
		navigation.canGoForward = true
		pageshow()
		expect(forward.disabled).toBe(false)
	})

	it("keeps both enabled without the Navigation API and calls history", () => {
		const { back, forward, win } = setup({ standalone: true })
		expect(back.disabled).toBe(false)
		expect(forward.disabled).toBe(false)
		back.click()
		forward.click()
		expect(win.history.back).toHaveBeenCalledOnce()
		expect(win.history.forward).toHaveBeenCalledOnce()
	})
})
