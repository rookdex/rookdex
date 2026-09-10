// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { wireOfflineNotice } from "./offline-notice"

describe("wireOfflineNotice", () => {
	it("announces once when the connection drops and clears when it returns", () => {
		const el = document.createElement("p")
		wireOfflineNotice(el, window, "Offline, showing saved data")
		expect(el.textContent).toBe("")
		window.dispatchEvent(new Event("offline"))
		expect(el.textContent).toBe("Offline, showing saved data")
		expect(el.hidden).toBe(false)
		window.dispatchEvent(new Event("offline"))
		expect(el.textContent).toBe("Offline, showing saved data")
		window.dispatchEvent(new Event("online"))
		expect(el.textContent).toBe("")
		expect(el.hidden).toBe(true)
	})
})
