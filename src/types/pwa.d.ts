// Chromium-only event; not in lib.dom. Declared here so the island type-checks.
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface WindowEventMap {
	beforeinstallprompt: BeforeInstallPromptEvent
}
